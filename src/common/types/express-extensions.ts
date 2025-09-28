import { Request, Response } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';

// Enhanced type-safe Express interfaces
export interface TypedRequest<
  TBody = any,
  TParams = ParamsDictionary,
  TQuery = any
> extends Request<TParams, any, TBody, TQuery> {
  validatedBody?: TBody;
  validatedParams?: TParams;
  validatedQuery?: TQuery;
}

export interface TypedResponse<TData = any> extends Response {
  json(body: ApiResponse<TData>): this;
}

export interface ApiResponse<TData = any> {
  success: boolean;
  message: string;
  data?: TData;
  errors?: any[];
  pagination?: PaginationInfo;
  timestamp?: string;
  path?: string;
}

export interface PaginationInfo {
  page?: number;
  limit?: number;
  offset?: number;
  total?: number;
  totalPages?: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

export interface ErrorResponse {
  success: false;
  message: string;
  errors: ValidationErrorDetail[];
  timestamp: string;
  path?: string;
  stack?: string;
}

export interface ValidationErrorDetail {
  field: string;
  message: string;
  value: any;
  code: string;
}

// Type-safe request handlers
export type TypedRequestHandler<
  TBody = any,
  TParams = ParamsDictionary,
  TQuery = any,
  TData = any
> = (
  req: TypedRequest<TBody, TParams, TQuery>,
  res: TypedResponse<TData>,
  next: NextFunction
) => void | Promise<void>;

export type TypedMiddleware<
  TBody = any,
  TParams = ParamsDictionary,
  TQuery = any
> = (
  req: TypedRequest<TBody, TParams, TQuery>,
  res: Response,
  next: NextFunction
) => void | Promise<void>;

// Helper type for creating type-safe controllers
export interface TypedController {
  [key: string]: TypedRequestHandler<any, any, any, any>;
}

// Utility types for common patterns
export type AuthenticatedRequest<
  TBody = any,
  TParams = ParamsDictionary,
  TQuery = any
> = TypedRequest<TBody, TParams, TQuery> & {
  user?: {
    id: string;
    email: string;
    role?: string;
    workspaceId?: string;
  };
};

export type WorkspaceRequest<
  TBody = any,
  TQuery = any
> = TypedRequest<TBody, { workspaceId: string }, TQuery> & {
  workspace?: {
    id: string;
    name: string;
    role: string;
  };
};

// Response helper functions
export class ResponseHelper {
  static success<TData>(
    res: TypedResponse<TData>,
    data: TData,
    message = 'Success',
    statusCode = 200
  ) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  static created<TData>(
    res: TypedResponse<TData>,
    data: TData,
    message = 'Created successfully'
  ) {
    return this.success(res, data, message, 201);
  }

  static error(
    res: Response,
    message: string,
    statusCode = 500,
    errors: any[] = []
  ) {
    return res.status(statusCode).json({
      success: false,
      message,
      errors,
      timestamp: new Date().toISOString()
    });
  }

  static badRequest(
    res: Response,
    message = 'Bad Request',
    errors: any[] = []
  ) {
    return this.error(res, message, 400, errors);
  }

  static unauthorized(
    res: Response,
    message = 'Unauthorized'
  ) {
    return this.error(res, message, 401);
  }

  static forbidden(
    res: Response,
    message = 'Forbidden'
  ) {
    return this.error(res, message, 403);
  }

  static notFound(
    res: Response,
    message = 'Not Found'
  ) {
    return this.error(res, message, 404);
  }

  static paginated<TData>(
    res: TypedResponse<TData[]>,
    data: TData[],
    pagination: PaginationInfo,
    message = 'Success'
  ) {
    return res.json({
      success: true,
      message,
      data,
      pagination,
      timestamp: new Date().toISOString()
    });
  }
}

// Async handler wrapper for type safety
export const asyncHandler = <
  TBody = any,
  TParams = ParamsDictionary,
  TQuery = any,
  TData = any
>(
  fn: TypedRequestHandler<TBody, TParams, TQuery, TData>
) => {
  return (
    req: TypedRequest<TBody, TParams, TQuery>,
    res: TypedResponse<TData>,
    next: NextFunction
  ) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Import NextFunction for completeness
import { NextFunction } from 'express';