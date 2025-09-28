import { ValidationError as ClassValidatorError } from 'class-validator';
import { ValidationError, DatabaseError, ExternalServiceError } from './errors';
import { ValidationErrorDetail } from '../types/errors';

/**
 * Converts class-validator errors to our custom ValidationError
 */
export const handleValidationErrors = (
  errors: ClassValidatorError[]
): ValidationError => {
  const validationDetails: ValidationErrorDetail[] = errors.map(error => ({
    field: error.property,
    value: error.value,
    constraints: Object.values(error.constraints || {}),
    message: Object.values(error.constraints || {})[0] || 'Validation failed',
  }));

  return ValidationError.fromValidationErrors(validationDetails);
};

/**
 * Handles database-specific errors and converts them to appropriate error types
 */
export const handleDatabaseError = (error: unknown): DatabaseError => {
  if (error instanceof Error) {
    // Handle specific database error types
    if (error.message.includes('duplicate key')) {
      return new DatabaseError('Resource already exists');
    }

    if (error.message.includes('foreign key')) {
      return new DatabaseError('Referenced resource does not exist');
    }

    if (error.message.includes('not null')) {
      return new DatabaseError('Required field is missing');
    }

    return new DatabaseError(error.message, error);
  }

  return new DatabaseError('Unknown database error');
};

/**
 * Handles Supabase-specific errors
 */
export const handleSupabaseError = (error: unknown): Error => {
  if (typeof error === 'object' && error !== null) {
    const supabaseError = error as {
      message?: string;
      code?: string;
      status?: number;
    };

    switch (supabaseError.code) {
      case 'PGRST301':
        return new DatabaseError('Resource not found');
      case 'PGRST204':
        return new DatabaseError('No content');
      case '23505':
        return new DatabaseError('Duplicate key violation');
      case '23503':
        return new DatabaseError('Foreign key violation');
      case '23502':
        return new DatabaseError('Not null violation');
      default:
        return new ExternalServiceError(
          'Supabase',
          supabaseError.message || 'Database operation failed'
        );
    }
  }

  return new ExternalServiceError('Supabase', 'Unknown database error');
};

/**
 * Handles network/HTTP errors
 */
export const handleNetworkError = (error: unknown): ExternalServiceError => {
  if (error instanceof Error) {
    if (error.message.includes('timeout')) {
      return new ExternalServiceError('Network', 'Request timeout');
    }

    if (error.message.includes('ECONNREFUSED')) {
      return new ExternalServiceError('Network', 'Connection refused');
    }

    if (error.message.includes('ENOTFOUND')) {
      return new ExternalServiceError('Network', 'Host not found');
    }

    return new ExternalServiceError('Network', error.message);
  }

  return new ExternalServiceError('Network', 'Unknown network error');
};

/**
 * Safe error message extraction
 */
export const extractErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (typeof error === 'object' && error !== null) {
    const objError = error as { message?: string };
    return objError.message || 'Unknown error';
  }

  return 'Unknown error occurred';
};

/**
 * Error aggregation for multiple errors
 */
export const aggregateErrors = (errors: Error[]): ValidationError => {
  const details = errors.map(error => ({
    message: error.message,
  }));

  return new ValidationError('Multiple validation errors occurred', details);
};

/**
 * Retry wrapper with exponential backoff
 */
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxRetries) {
        throw lastError;
      }

      // Exponential backoff
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
};