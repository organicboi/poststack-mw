import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { config } from '../common/config';
import {
  BaseError,
  InternalServerError,
  isBaseError,
  isOperationalError,
} from '../utils/errors';
import { ErrorCode, ErrorResponse, ErrorContext } from '../types/errors';

// Extend Express Request to include requestId
declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  req.requestId = req.headers['x-request-id'] as string || uuidv4();
  res.setHeader('X-Request-ID', req.requestId);
  next();
};

const createErrorContext = (req: Request, error: Error): ErrorContext => ({
  requestId: req.requestId,
  userId: req.user?.id, // Assuming user is attached by auth middleware
  path: req.path,
  method: req.method,
  userAgent: req.headers['user-agent'],
  ip: req.ip || req.connection.remoteAddress,
  timestamp: new Date(),
});

const sanitizeErrorForProduction = (error: BaseError): Partial<BaseError> => {
  if (config.server.environment === 'production') {
    // Don't expose sensitive information in production
    const sanitized: Partial<BaseError> = {
      message: error.statusCode >= 500 ? 'Internal server error' : error.message,
      statusCode: error.statusCode,
      errorCode: error.errorCode,
      timestamp: error.timestamp,
    };

    // Only include details for client errors (4xx)
    if (error.statusCode < 500) {
      sanitized.details = error.details;
    }

    return sanitized;
  }

  return error;
};

const logError = (error: Error, context: ErrorContext): void => {
  const logData = {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    context,
  };

  if (isBaseError(error)) {
    logData.error = {
      ...logData.error,
      statusCode: error.statusCode,
      errorCode: error.errorCode,
      details: error.details,
      isOperational: error.isOperational,
    };

    // Log level based on error type
    if (error.statusCode >= 500) {
      logger.error('Server Error:', logData);
    } else if (error.statusCode >= 400) {
      logger.warn('Client Error:', logData);
    } else {
      logger.info('Error:', logData);
    }
  } else {
    // Unhandled errors are critical
    logger.error('Unhandled Error:', logData);
  }
};

const createErrorResponse = (
  error: BaseError,
  req: Request
): ErrorResponse => {
  const sanitizedError = sanitizeErrorForProduction(error);

  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      code: sanitizedError.errorCode || ErrorCode.INTERNAL_SERVER_ERROR,
      message: sanitizedError.message || 'An unexpected error occurred',
      details: sanitizedError.details,
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
      path: req.path,
    },
    meta: {
      statusCode: sanitizedError.statusCode || 500,
    },
  };

  // Include stack trace in development
  if (config.server.environment === 'development') {
    errorResponse.meta!.stack = error.stack;
  }

  return errorResponse;
};

// Main error handler middleware
export const errorHandler: ErrorRequestHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Ensure we have a request ID
  if (!req.requestId) {
    req.requestId = uuidv4();
  }

  const context = createErrorContext(req, error);

  // Convert unknown errors to BaseError
  let processedError: BaseError;
  if (isBaseError(error)) {
    processedError = error;
  } else {
    processedError = new InternalServerError(
      config.server.environment === 'production' ? 'Internal server error' : error.message,
      error
    );
  }

  // Log the error
  logError(processedError, context);

  // Don't send error response if headers are already sent
  if (res.headersSent) {
    logger.warn('Headers already sent, delegating to default Express error handler', {
      requestId: req.requestId,
    });
    return next(error);
  }

  // Create and send error response
  const errorResponse = createErrorResponse(processedError, req);
  res.status(errorResponse.meta!.statusCode).json(errorResponse);
};

// Async error wrapper for route handlers
export const asyncHandler = <T extends Request, U extends Response>(
  fn: (req: T, res: U, next: NextFunction) => Promise<void>
) => {
  return (req: T, res: U, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Error boundary for catching unhandled errors
export const setupErrorHandling = (): void => {
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception:', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    });

    // Give time for logger to flush
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });

  process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
    logger.error('Unhandled Rejection:', {
      reason,
      promise,
    });

    // Convert to uncaught exception
    throw reason;
  });
};