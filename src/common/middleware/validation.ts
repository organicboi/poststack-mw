import { Request, Response, NextFunction } from 'express';
import { validate, ValidationError } from 'class-validator';
import { plainToClass, Transform, ClassConstructor } from 'class-transformer';
import { ValidationErrorTransformer } from '../utils/validation-error-transformer';

export interface ValidationOptions {
  skipMissingProperties?: boolean;
  whitelist?: boolean;
  forbidNonWhitelisted?: boolean;
  transform?: boolean;
}

export interface ValidatedRequest<T = any> extends Request {
  validatedBody?: T;
  validatedQuery?: T;
  validatedParams?: T;
}

class CustomValidationError extends Error {
  public status = 400;
  public errors: ValidationError[];

  constructor(errors: ValidationError[]) {
    super('Validation failed');
    this.errors = errors;
    this.name = 'ValidationError';
  }
}


export const validateBody = <T extends object>(
  dto: ClassConstructor<T>,
  options: ValidationOptions = {}
) => {
  return async (req: ValidatedRequest<T>, res: Response, next: NextFunction) => {
    try {
      const defaultOptions: ValidationOptions = {
        skipMissingProperties: false,
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        ...options
      };

      const instance = plainToClass(dto, req.body, {
        excludeExtraneousValues: defaultOptions.whitelist
      });

      const errors = await validate(instance, {
        skipMissingProperties: defaultOptions.skipMissingProperties,
        whitelist: defaultOptions.whitelist,
        forbidNonWhitelisted: defaultOptions.forbidNonWhitelisted
      });

      if (errors.length > 0) {
        const customError = new CustomValidationError(errors);
        return next(customError);
      }

      req.validatedBody = instance;
      next();
    } catch (error) {
      next(error);
    }
  };
};

export const validateQuery = <T extends object>(
  dto: ClassConstructor<T>,
  options: ValidationOptions = {}
) => {
  return async (req: ValidatedRequest<T>, res: Response, next: NextFunction) => {
    try {
      const defaultOptions: ValidationOptions = {
        skipMissingProperties: true,
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
        ...options
      };

      const instance = plainToClass(dto, req.query, {
        excludeExtraneousValues: defaultOptions.whitelist
      });

      const errors = await validate(instance, {
        skipMissingProperties: defaultOptions.skipMissingProperties,
        whitelist: defaultOptions.whitelist,
        forbidNonWhitelisted: defaultOptions.forbidNonWhitelisted
      });

      if (errors.length > 0) {
        const customError = new CustomValidationError(errors);
        return next(customError);
      }

      req.validatedQuery = instance;
      next();
    } catch (error) {
      next(error);
    }
  };
};

export const validateParams = <T extends object>(
  dto: ClassConstructor<T>,
  options: ValidationOptions = {}
) => {
  return async (req: ValidatedRequest<T>, res: Response, next: NextFunction) => {
    try {
      const defaultOptions: ValidationOptions = {
        skipMissingProperties: false,
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        ...options
      };

      const instance = plainToClass(dto, req.params, {
        excludeExtraneousValues: defaultOptions.whitelist
      });

      const errors = await validate(instance, {
        skipMissingProperties: defaultOptions.skipMissingProperties,
        whitelist: defaultOptions.whitelist,
        forbidNonWhitelisted: defaultOptions.forbidNonWhitelisted
      });

      if (errors.length > 0) {
        const customError = new CustomValidationError(errors);
        return next(customError);
      }

      req.validatedParams = instance;
      next();
    } catch (error) {
      next(error);
    }
  };
};

export const validationErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof CustomValidationError) {
    const errorResponse = ValidationErrorTransformer.transform(err.errors, req.path);
    return res.status(400).json(errorResponse);
  }

  next(err);
};