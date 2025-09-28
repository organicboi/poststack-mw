import { ErrorCode, ErrorDetails, ValidationErrorDetail } from '../types/errors';

export abstract class BaseError extends Error {
  public readonly isOperational: boolean = true;
  public readonly statusCode: number;
  public readonly errorCode: ErrorCode;
  public readonly details?: ErrorDetails[];
  public readonly timestamp: Date;

  constructor(
    message: string,
    statusCode: number,
    errorCode: ErrorCode,
    details?: ErrorDetails[]
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.timestamp = new Date();

    Error.captureStackTrace(this, this.constructor);
  }

  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      errorCode: this.errorCode,
      details: this.details,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    };
  }
}

export class ValidationError extends BaseError {
  constructor(
    message: string = 'Validation failed',
    details?: ErrorDetails[]
  ) {
    super(message, 400, ErrorCode.VALIDATION_ERROR, details);
  }

  static fromValidationErrors(
    validationErrors: ValidationErrorDetail[]
  ): ValidationError {
    const details: ErrorDetails[] = validationErrors.map(error => ({
      field: error.field,
      value: error.value,
      message: error.message,
      constraint: error.constraints.join(', '),
    }));

    return new ValidationError('Input validation failed', details);
  }
}

export class AuthenticationError extends BaseError {
  constructor(
    message: string = 'Authentication failed',
    errorCode: ErrorCode = ErrorCode.AUTHENTICATION_ERROR
  ) {
    super(message, 401, errorCode);
  }
}

export class AuthorizationError extends BaseError {
  constructor(
    message: string = 'Access forbidden',
    errorCode: ErrorCode = ErrorCode.FORBIDDEN
  ) {
    super(message, 403, errorCode);
  }
}

export class NotFoundError extends BaseError {
  constructor(
    resource: string = 'Resource',
    identifier?: string | number
  ) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;

    super(message, 404, ErrorCode.RESOURCE_NOT_FOUND);
  }
}

export class ConflictError extends BaseError {
  constructor(
    message: string = 'Resource conflict',
    details?: ErrorDetails[]
  ) {
    super(message, 409, ErrorCode.RESOURCE_CONFLICT, details);
  }
}

export class BusinessLogicError extends BaseError {
  constructor(
    message: string,
    errorCode: ErrorCode = ErrorCode.BUSINESS_LOGIC_ERROR,
    statusCode: number = 422
  ) {
    super(message, statusCode, errorCode);
  }
}

export class ExternalServiceError extends BaseError {
  constructor(
    service: string,
    message: string = 'External service error',
    originalError?: Error
  ) {
    const fullMessage = `${service}: ${message}`;
    super(fullMessage, 502, ErrorCode.EXTERNAL_SERVICE_ERROR);

    if (originalError) {
      this.stack = originalError.stack;
    }
  }
}

export class DatabaseError extends BaseError {
  constructor(
    message: string = 'Database operation failed',
    originalError?: Error
  ) {
    super(message, 500, ErrorCode.DATABASE_ERROR);

    if (originalError) {
      this.stack = originalError.stack;
    }
  }
}

export class RateLimitError extends BaseError {
  constructor(
    message: string = 'Rate limit exceeded',
    retryAfter?: number
  ) {
    super(message, 429, ErrorCode.RATE_LIMIT_EXCEEDED);

    if (retryAfter) {
      this.details = [{ message: `Retry after ${retryAfter} seconds` }];
    }
  }
}

export class InternalServerError extends BaseError {
  constructor(
    message: string = 'Internal server error',
    originalError?: Error
  ) {
    super(message, 500, ErrorCode.INTERNAL_SERVER_ERROR);

    if (originalError) {
      this.stack = originalError.stack;
    }
  }
}

// Error factory functions for common scenarios
export const createValidationError = (
  field: string,
  value: unknown,
  message: string
): ValidationError => {
  return new ValidationError('Validation failed', [
    { field, value, message },
  ]);
};

export const createNotFoundError = (
  resource: string,
  identifier?: string | number
): NotFoundError => {
  return new NotFoundError(resource, identifier);
};

export const createUnauthorizedError = (
  message?: string
): AuthenticationError => {
  return new AuthenticationError(
    message || 'Authentication required',
    ErrorCode.UNAUTHORIZED
  );
};

export const createForbiddenError = (
  message?: string
): AuthorizationError => {
  return new AuthorizationError(
    message || 'Insufficient permissions',
    ErrorCode.INSUFFICIENT_PERMISSIONS
  );
};

// Type guards
export const isBaseError = (error: unknown): error is BaseError => {
  return error instanceof BaseError;
};

export const isOperationalError = (error: unknown): boolean => {
  return isBaseError(error) && error.isOperational;
};