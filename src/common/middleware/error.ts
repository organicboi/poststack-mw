import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { ValidationError } from 'class-validator';
import { ValidationErrorTransformer } from '../utils/validation-error-transformer';

class CustomValidationError extends Error {
  public status = 400;
  public errors: ValidationError[];

  constructor(errors: ValidationError[]) {
    super('Validation failed');
    this.errors = errors;
    this.name = 'ValidationError';
  }
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Handle validation errors from class-validator
  if (err instanceof CustomValidationError || err.name === 'ValidationError') {
    const errorResponse = ValidationErrorTransformer.transform(err.errors || [], req.path);
    return res.status(400).json(errorResponse);
  }

  // Handle other known error types
  let status = err.status || err.statusCode || 500;
  let message = err.message || 'Internal server error';

  // Handle specific error types
  switch (err.name) {
    case 'CastError':
      status = 400;
      message = 'Invalid ID format';
      break;
    case 'ValidationError':
      status = 400;
      message = 'Validation failed';
      break;
    case 'UnauthorizedError':
    case 'JsonWebTokenError':
      status = 401;
      message = 'Unauthorized - Invalid token';
      break;
    case 'TokenExpiredError':
      status = 401;
      message = 'Unauthorized - Token expired';
      break;
    case 'MulterError':
      status = 400;
      message = `File upload error: ${err.message}`;
      break;
  }

  // Log error
  console.error(`[ERROR] ${req.method} ${req.path} - ${status} ${message}`);
  if (err.stack && config.server.environment === 'development') {
    console.error(err.stack);
  }

  // Create error response
  const errorResponse: any = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
    path: req.path
  };

  // Add stack trace in development
  if (config.server.environment === 'development') {
    errorResponse.stack = err.stack;
  }

  // Add error details if available
  if (err.details) {
    errorResponse.details = err.details;
  }

  res.status(status).json(errorResponse);
};
