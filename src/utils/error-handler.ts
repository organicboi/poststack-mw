import { Request, Response, NextFunction } from 'express';

// =============================================================================
// ERROR TYPES AND CLASSES
// =============================================================================

export enum ErrorCode {
  // Authentication Errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',

  // Authorization Errors
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',

  // Validation Errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  // Resource Errors
  NOT_FOUND = 'NOT_FOUND',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  DUPLICATE_RESOURCE = 'DUPLICATE_RESOURCE',

  // Business Logic Errors
  PLAN_LIMIT_EXCEEDED = 'PLAN_LIMIT_EXCEEDED',
  FEATURE_NOT_AVAILABLE = 'FEATURE_NOT_AVAILABLE',
  BILLING_ERROR = 'BILLING_ERROR',

  // External Service Errors
  POSTIZ_ERROR = 'POSTIZ_ERROR',
  SUPABASE_ERROR = 'SUPABASE_ERROR',
  DODO_BILLING_ERROR = 'DODO_BILLING_ERROR',

  // System Errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: ErrorCode;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, any>;
  public readonly timestamp: Date;
  public readonly requestId?: string;

  constructor(
    message: string,
    statusCode: number,
    errorCode: ErrorCode,
    isOperational: boolean = true,
    details?: Record<string, any>,
    requestId?: string
  ) {
    super(message);

    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = isOperational;
    this.details = details || undefined;
    this.timestamp = new Date();
    this.requestId = requestId || undefined;

    // Ensure the name of this error is the same as the class name
    this.name = this.constructor.name;

    // This clips the constructor invocation from the stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

// =============================================================================
// SPECIFIC ERROR CLASSES
// =============================================================================

export class AuthenticationError extends AppError {
  constructor(
    message: string = 'Authentication failed',
    details?: Record<string, any>,
    requestId?: string
  ) {
    super(message, 401, ErrorCode.UNAUTHORIZED, true, details, requestId);
  }
}

export class AuthorizationError extends AppError {
  constructor(
    message: string = 'Access forbidden',
    details?: Record<string, any>,
    requestId?: string
  ) {
    super(message, 403, ErrorCode.FORBIDDEN, true, details, requestId);
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    errors: Record<string, string[]> = {},
    requestId?: string
  ) {
    super(
      message,
      400,
      ErrorCode.VALIDATION_ERROR,
      true,
      { errors },
      requestId
    );
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource', requestId?: string) {
    super(
      `${resource} not found`,
      404,
      ErrorCode.NOT_FOUND,
      true,
      { resource },
      requestId
    );
  }
}

export class PlanLimitError extends AppError {
  constructor(
    feature: string,
    currentUsage: number,
    limit: number,
    requestId?: string
  ) {
    super(
      `Plan limit exceeded for ${feature}. Current usage: ${currentUsage}, Limit: ${limit}`,
      403,
      ErrorCode.PLAN_LIMIT_EXCEEDED,
      true,
      { feature, currentUsage, limit },
      requestId
    );
  }
}

export class ExternalServiceError extends AppError {
  constructor(
    service: string,
    message: string,
    details?: Record<string, any>,
    requestId?: string
  ) {
    super(
      `${service} service error: ${message}`,
      503,
      ErrorCode.POSTIZ_ERROR,
      true,
      { service, ...details },
      requestId
    );
  }
}

// =============================================================================
// ERROR RESPONSE INTERFACE
// =============================================================================

export interface ErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, any>;
    timestamp: string;
    requestId?: string;
    stack?: string; // Only in development
  };
}

// =============================================================================
// ERROR LOGGER
// =============================================================================

class Logger {
  private static isDevelopment = process.env.NODE_ENV === 'development';

  static log(error: Error, req?: Request): void {
    const timestamp = new Date().toISOString();
    const requestId = req?.headers['x-request-id'] as string;

    const errorData: any = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };

    if (error instanceof AppError) {
      errorData.statusCode = error.statusCode;
      errorData.errorCode = error.errorCode;
      errorData.isOperational = error.isOperational;
      errorData.details = error.details;
    }

    const logData = {
      timestamp,
      requestId,
      error: errorData,
      request: req
        ? {
            method: req.method,
            url: req.url,
            userAgent: req.get('User-Agent'),
            ip: req.ip,
            userId: (req as any).user?.id,
          }
        : undefined,
    };

    // Log to console (in production, this should go to a proper logging service)
    if (this.isDevelopment) {
      console.error('ERROR:', JSON.stringify(logData, null, 2));
    } else {
      console.error('ERROR:', JSON.stringify(logData));
    }
  }
}

// =============================================================================
// MIDDLEWARE
// =============================================================================

/**
 * Request ID middleware - adds unique ID to each request
 */
export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const requestId =
    (req.headers['x-request-id'] as string) ||
    `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};

/**
 * Global error handler middleware
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const requestId = req.headers['x-request-id'] as string;

  // Log the error
  Logger.log(err, req);

  // Don't expose internal errors in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (err instanceof AppError) {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: err.errorCode,
        message: err.message,
        ...(err.details && { details: err.details }),
        timestamp: err.timestamp.toISOString(),
        ...(requestId && { requestId }),
        ...(isDevelopment && { stack: err.stack }),
      },
    };

    res.status(err.statusCode).json(response);
    return;
  }

  // Handle Supabase errors
  if (err.message?.includes('supabase') || err.message?.includes('PGRST')) {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: ErrorCode.SUPABASE_ERROR,
        message: isDevelopment ? err.message : 'Database operation failed',
        timestamp: new Date().toISOString(),
        requestId,
        ...(isDevelopment && { stack: err.stack }),
      },
    };

    res.status(500).json(response);
    return;
  }

  // Handle validation errors from express-validator
  if (err.name === 'ValidationError') {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Validation failed',
        details: { errors: err.message },
        timestamp: new Date().toISOString(),
        requestId,
        ...(isDevelopment && { stack: err.stack }),
      },
    };

    res.status(400).json(response);
    return;
  }

  // Default error response
  const response: ErrorResponse = {
    success: false,
    error: {
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message: isDevelopment ? err.message : 'Internal server error',
      timestamp: new Date().toISOString(),
      requestId,
      ...(isDevelopment && { stack: err.stack }),
    },
  };

  res.status(500).json(response);
};

/**
 * 404 handler middleware
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  const requestId = req.headers['x-request-id'] as string;

  const response: ErrorResponse = {
    success: false,
    error: {
      code: ErrorCode.NOT_FOUND,
      message: `Route ${req.method} ${req.path} not found`,
      timestamp: new Date().toISOString(),
      requestId,
    },
  };

  res.status(404).json(response);
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Async wrapper to catch errors in async route handlers
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Create a standardized success response
 */
export const createSuccessResponse = <T>(
  data: T,
  message?: string,
  meta?: Record<string, any>
) => ({
  success: true as const,
  data,
  ...(message && { message }),
  ...(meta && { meta }),
});

/**
 * Assert that a condition is true, throw error if not
 */
export const assert = (
  condition: boolean,
  error: AppError | string,
  requestId?: string
): void => {
  if (!condition) {
    if (typeof error === 'string') {
      throw new AppError(
        error,
        400,
        ErrorCode.VALIDATION_ERROR,
        true,
        undefined,
        requestId
      );
    }
    throw error;
  }
};

/**
 * Validate that required fields are present
 */
export const validateRequired = (
  data: Record<string, any>,
  fields: string[],
  requestId?: string
): void => {
  const missing = fields.filter(field => !data[field]);
  if (missing.length > 0) {
    const errors: Record<string, string[]> = {};
    missing.forEach(field => {
      errors[field] = ['This field is required'];
    });

    throw new ValidationError(
      `Missing required fields: ${missing.join(', ')}`,
      errors,
      requestId
    );
  }
};

/**
 * Check if user can perform action based on plan
 */
export const checkPlanLimit = (
  featureId: string,
  currentUsage: number,
  planLimit: number,
  requestId?: string
): void => {
  if (planLimit !== -1 && currentUsage >= planLimit) {
    throw new PlanLimitError(featureId, currentUsage, planLimit, requestId);
  }
};

// =============================================================================
// ERROR MONITORING
// =============================================================================

class Monitor {
  private static errorCounts: Map<ErrorCode, number> = new Map();
  private static lastReset: Date = new Date();

  static incrementError(errorCode: ErrorCode): void {
    const current = this.errorCounts.get(errorCode) || 0;
    this.errorCounts.set(errorCode, current + 1);
  }

  static getErrorStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    this.errorCounts.forEach((count, code) => {
      stats[code] = count;
    });
    return stats;
  }

  static resetStats(): void {
    this.errorCounts.clear();
    this.lastReset = new Date();
  }

  static getStatsWithMetadata(): {
    stats: Record<string, number>;
    lastReset: Date;
    totalErrors: number;
  } {
    const stats = this.getErrorStats();
    const totalErrors = Object.values(stats).reduce(
      (sum, count) => sum + count,
      0
    );

    return {
      stats,
      lastReset: this.lastReset,
      totalErrors,
    };
  }
}

// Export the classes with different names to avoid conflicts
export const ErrorLogger = Logger;
export const ErrorMonitor = Monitor;

export default AppError;
