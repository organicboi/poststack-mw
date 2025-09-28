/**
 * Comprehensive response type interfaces for the middleware system
 */

/**
 * Generic success response wrapper
 */
export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
  requestId?: string;
  meta?: {
    version?: string;
    duration?: number;
    source?: string;
  };
}

/**
 * Generic error response wrapper
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    validationErrors?: ValidationError[];
    stack?: string; // Only in development
  };
  timestamp: string;
  requestId?: string;
  meta?: {
    version?: string;
    duration?: number;
    source?: string;
  };
}

/**
 * Validation error details
 */
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
  constraint?: string;
}

/**
 * Paginated response wrapper for list endpoints
 */
export interface PaginatedResponse<T = any> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  message?: string;
  timestamp: string;
  requestId?: string;
  meta?: {
    version?: string;
    duration?: number;
    source?: string;
    filters?: Record<string, any>;
    sorting?: {
      field: string;
      direction: 'asc' | 'desc';
    };
  };
}

/**
 * Base API response type (union of success and error)
 */
export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse;

/**
 * Helper function to create standardized success responses
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  meta?: SuccessResponse['meta']
): SuccessResponse<T> {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    requestId: generateRequestId(),
    meta,
  };
}

/**
 * Helper function to create standardized error responses
 */
export function createErrorResponse(
  code: string,
  message: string,
  details?: Record<string, any>,
  validationErrors?: ValidationError[]
): ErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
      validationErrors,
    },
    timestamp: new Date().toISOString(),
    requestId: generateRequestId(),
  };
}

/**
 * Helper function to create standardized paginated responses
 */
export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
  message?: string,
  meta?: Omit<PaginatedResponse['meta'], 'version' | 'duration' | 'source'>
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / limit);

  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
    message,
    timestamp: new Date().toISOString(),
    requestId: generateRequestId(),
    meta,
  };
}

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Type guard to check if response is successful
 */
export function isSuccessResponse<T>(response: ApiResponse<T>): response is SuccessResponse<T> {
  return response.success === true;
}

/**
 * Type guard to check if response is an error
 */
export function isErrorResponse(response: ApiResponse): response is ErrorResponse {
  return response.success === false;
}

/**
 * Type guard to check if response is paginated
 */
export function isPaginatedResponse<T>(
  response: ApiResponse<T[] | T>
): response is PaginatedResponse<T> {
  return (
    isSuccessResponse(response) &&
    'pagination' in response &&
    Array.isArray(response.data)
  );
}