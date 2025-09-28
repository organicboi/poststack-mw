/**
 * Type guards and validation utilities for the middleware system
 */

import {
  User,
  UserProfile,
  UserPreferences,
  WorkspaceEntity,
  AuthenticationSession,
  SubscriptionPlan,
  PaymentMethod
} from './entity.types';
import {
  SuccessResponse,
  ErrorResponse,
  PaginatedResponse,
  ApiResponse,
  ValidationError
} from './response.types';
import {
  AuthenticatedRequest,
  WorkspaceContext,
  ServiceKeyContext,
  BaseEntity,
  ConfigOption
} from './utility.types';
import { WorkspaceRole } from '../modules/workspace/workspace.types';

/**
 * Type guard to check if a value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Type guard to check if a value is a number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Type guard to check if a value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Type guard to check if a value is an array
 */
export function isArray<T>(value: unknown): value is T[] {
  return Array.isArray(value);
}

/**
 * Type guard to check if a value is an object (not null or array)
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Type guard to check if a value is null or undefined
 */
export function isNullOrUndefined(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Type guard to check if a value is a valid date
 */
export function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

/**
 * Type guard to check if a value is a valid ISO date string
 */
export function isISODateString(value: unknown): value is string {
  if (!isString(value)) return false;
  const date = new Date(value);
  return isValidDate(date) && date.toISOString() === value;
}

/**
 * Type guard to check if a value is a valid email
 */
export function isValidEmail(value: unknown): value is string {
  if (!isString(value)) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

/**
 * Type guard to check if a value is a valid URL
 */
export function isValidUrl(value: unknown): value is string {
  if (!isString(value)) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Type guard to check if a value is a valid UUID
 */
export function isValidUUID(value: unknown): value is string {
  if (!isString(value)) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Type guard to check if a request is authenticated
 */
export function isAuthenticatedRequest(req: any): req is AuthenticatedRequest {
  return isObject(req) && 'user' in req && isValidUser(req.user);
}

/**
 * Type guard to check if a user object is valid
 */
export function isValidUser(user: unknown): user is User {
  return (
    isObject(user) &&
    'id' in user &&
    'email' in user &&
    isValidUUID(user.id) &&
    isValidEmail(user.email)
  );
}

/**
 * Type guard to check if a user profile is valid
 */
export function isValidUserProfile(profile: unknown): profile is UserProfile {
  return (
    isObject(profile) &&
    'id' in profile &&
    'userId' in profile &&
    'createdAt' in profile &&
    'updatedAt' in profile &&
    isValidUUID(profile.id) &&
    isValidUUID(profile.userId) &&
    isISODateString(profile.createdAt) &&
    isISODateString(profile.updatedAt)
  );
}

/**
 * Type guard to check if user preferences are valid
 */
export function isValidUserPreferences(preferences: unknown): preferences is UserPreferences {
  return (
    isObject(preferences) &&
    'id' in preferences &&
    'userId' in preferences &&
    'theme' in preferences &&
    'language' in preferences &&
    'timezone' in preferences &&
    isValidUUID(preferences.id) &&
    isValidUUID(preferences.userId) &&
    ['light', 'dark', 'auto'].includes(preferences.theme as string)
  );
}

/**
 * Type guard to check if a workspace is valid
 */
export function isValidWorkspace(workspace: unknown): workspace is WorkspaceEntity {
  return (
    isObject(workspace) &&
    'id' in workspace &&
    'name' in workspace &&
    'ownerId' in workspace &&
    'createdAt' in workspace &&
    'updatedAt' in workspace &&
    isValidUUID(workspace.id) &&
    isString(workspace.name) &&
    workspace.name.length > 0 &&
    isValidUUID(workspace.ownerId) &&
    isISODateString(workspace.createdAt) &&
    isISODateString(workspace.updatedAt)
  );
}

/**
 * Type guard to check if a workspace context is valid
 */
export function isValidWorkspaceContext(context: unknown): context is WorkspaceContext {
  return (
    isObject(context) &&
    'id' in context &&
    'name' in context &&
    'role' in context &&
    'permissions' in context &&
    isValidUUID(context.id) &&
    isString(context.name) &&
    isValidWorkspaceRole(context.role) &&
    isObject(context.permissions)
  );
}

/**
 * Type guard to check if a workspace role is valid
 */
export function isValidWorkspaceRole(role: unknown): role is WorkspaceRole {
  return isString(role) && ['owner', 'manager', 'editor', 'viewer'].includes(role);
}

/**
 * Type guard to check if an authentication session is valid
 */
export function isValidAuthSession(session: unknown): session is AuthenticationSession {
  return (
    isObject(session) &&
    'access_token' in session &&
    'refresh_token' in session &&
    'expires_at' in session &&
    'user' in session &&
    isString(session.access_token) &&
    isString(session.refresh_token) &&
    isNumber(session.expires_at) &&
    isValidUser(session.user)
  );
}

/**
 * Type guard to check if a service key context is valid
 */
export function isValidServiceKeyContext(context: unknown): context is ServiceKeyContext {
  return (
    isObject(context) &&
    'id' in context &&
    'name' in context &&
    'permissions' in context &&
    isValidUUID(context.id) &&
    isString(context.name) &&
    isArray(context.permissions) &&
    (context.permissions as unknown[]).every(p => isString(p))
  );
}

/**
 * Type guard to check if a subscription plan is valid
 */
export function isValidSubscriptionPlan(plan: unknown): plan is SubscriptionPlan {
  return (
    isObject(plan) &&
    'id' in plan &&
    'name' in plan &&
    'price' in plan &&
    'currency' in plan &&
    'interval' in plan &&
    isValidUUID(plan.id) &&
    isString(plan.name) &&
    isNumber(plan.price) &&
    plan.price >= 0 &&
    isString(plan.currency) &&
    ['day', 'week', 'month', 'year'].includes(plan.interval as string)
  );
}

/**
 * Type guard to check if a payment method is valid
 */
export function isValidPaymentMethod(method: unknown): method is PaymentMethod {
  return (
    isObject(method) &&
    'id' in method &&
    'type' in method &&
    'isDefault' in method &&
    isValidUUID(method.id) &&
    ['card', 'bank', 'paypal', 'other'].includes(method.type as string) &&
    isBoolean(method.isDefault)
  );
}

/**
 * Type guard to check if a response is a success response
 */
export function isSuccessResponse<T>(response: unknown): response is SuccessResponse<T> {
  return (
    isObject(response) &&
    'success' in response &&
    'data' in response &&
    'timestamp' in response &&
    response.success === true &&
    isISODateString(response.timestamp)
  );
}

/**
 * Type guard to check if a response is an error response
 */
export function isErrorResponse(response: unknown): response is ErrorResponse {
  return (
    isObject(response) &&
    'success' in response &&
    'error' in response &&
    'timestamp' in response &&
    response.success === false &&
    isObject(response.error) &&
    'code' in response.error &&
    'message' in response.error &&
    isString((response.error as any).code) &&
    isString((response.error as any).message) &&
    isISODateString(response.timestamp)
  );
}

/**
 * Type guard to check if a response is a paginated response
 */
export function isPaginatedResponse<T>(response: unknown): response is PaginatedResponse<T> {
  return (
    isSuccessResponse(response) &&
    'pagination' in response &&
    isObject(response.pagination) &&
    'page' in response.pagination &&
    'limit' in response.pagination &&
    'total' in response.pagination &&
    'totalPages' in response.pagination &&
    'hasNext' in response.pagination &&
    'hasPrev' in response.pagination &&
    isNumber((response.pagination as any).page) &&
    isNumber((response.pagination as any).limit) &&
    isNumber((response.pagination as any).total) &&
    isNumber((response.pagination as any).totalPages) &&
    isBoolean((response.pagination as any).hasNext) &&
    isBoolean((response.pagination as any).hasPrev) &&
    isArray(response.data)
  );
}

/**
 * Type guard to check if a validation error is valid
 */
export function isValidationError(error: unknown): error is ValidationError {
  return (
    isObject(error) &&
    'field' in error &&
    'message' in error &&
    isString(error.field) &&
    isString(error.message)
  );
}

/**
 * Type guard to check if a base entity is valid
 */
export function isValidBaseEntity(entity: unknown): entity is BaseEntity {
  return (
    isObject(entity) &&
    'id' in entity &&
    'createdAt' in entity &&
    'updatedAt' in entity &&
    isValidUUID(entity.id) &&
    isISODateString(entity.createdAt) &&
    isISODateString(entity.updatedAt)
  );
}

/**
 * Type guard to check if a config option is valid
 */
export function isValidConfigOption(option: unknown): option is ConfigOption {
  return (
    isObject(option) &&
    'key' in option &&
    'value' in option &&
    'type' in option &&
    isString(option.key) &&
    ['string', 'number', 'boolean', 'array', 'object', 'date', 'url', 'email', 'json', 'password', 'enum'].includes(option.type as string)
  );
}

/**
 * Validation utility class for common validations
 */
export class ValidationUtils {
  /**
   * Validate required fields in an object
   */
  static validateRequiredFields<T extends Record<string, unknown>>(
    obj: T,
    requiredFields: (keyof T)[]
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const field of requiredFields) {
      if (isNullOrUndefined(obj[field]) || obj[field] === '') {
        errors.push({
          field: String(field),
          message: `${String(field)} is required`
        });
      }
    }

    return errors;
  }

  /**
   * Validate email format
   */
  static validateEmail(email: unknown, fieldName = 'email'): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!isString(email)) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be a string`
      });
      return errors;
    }

    if (!isValidEmail(email)) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be a valid email address`
      });
    }

    return errors;
  }

  /**
   * Validate UUID format
   */
  static validateUUID(uuid: unknown, fieldName = 'id'): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!isString(uuid)) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be a string`
      });
      return errors;
    }

    if (!isValidUUID(uuid)) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be a valid UUID`
      });
    }

    return errors;
  }

  /**
   * Validate string length
   */
  static validateStringLength(
    value: unknown,
    fieldName: string,
    minLength?: number,
    maxLength?: number
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!isString(value)) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be a string`
      });
      return errors;
    }

    if (minLength !== undefined && value.length < minLength) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be at least ${minLength} characters long`
      });
    }

    if (maxLength !== undefined && value.length > maxLength) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be no more than ${maxLength} characters long`
      });
    }

    return errors;
  }

  /**
   * Validate number range
   */
  static validateNumberRange(
    value: unknown,
    fieldName: string,
    min?: number,
    max?: number
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!isNumber(value)) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be a number`
      });
      return errors;
    }

    if (min !== undefined && value < min) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be at least ${min}`
      });
    }

    if (max !== undefined && value > max) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be no more than ${max}`
      });
    }

    return errors;
  }

  /**
   * Validate array items
   */
  static validateArray<T>(
    value: unknown,
    fieldName: string,
    itemValidator: (item: unknown) => boolean,
    minLength?: number,
    maxLength?: number
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!isArray(value)) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be an array`
      });
      return errors;
    }

    if (minLength !== undefined && value.length < minLength) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must have at least ${minLength} items`
      });
    }

    if (maxLength !== undefined && value.length > maxLength) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must have no more than ${maxLength} items`
      });
    }

    value.forEach((item, index) => {
      if (!itemValidator(item)) {
        errors.push({
          field: `${fieldName}[${index}]`,
          message: `Invalid item at index ${index}`
        });
      }
    });

    return errors;
  }

  /**
   * Validate enum value
   */
  static validateEnum<T extends string | number>(
    value: unknown,
    fieldName: string,
    allowedValues: T[]
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!allowedValues.includes(value as T)) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be one of: ${allowedValues.join(', ')}`
      });
    }

    return errors;
  }

  /**
   * Validate date format
   */
  static validateDate(value: unknown, fieldName: string): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!isString(value)) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be a string`
      });
      return errors;
    }

    if (!isISODateString(value)) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be a valid ISO date string`
      });
    }

    return errors;
  }

  /**
   * Validate URL format
   */
  static validateUrl(value: unknown, fieldName: string): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!isString(value)) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be a string`
      });
      return errors;
    }

    if (!isValidUrl(value)) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be a valid URL`
      });
    }

    return errors;
  }

  /**
   * Validate password strength
   */
  static validatePassword(value: unknown, fieldName = 'password'): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!isString(value)) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be a string`
      });
      return errors;
    }

    if (value.length < 8) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be at least 8 characters long`
      });
    }

    if (!/[A-Z]/.test(value)) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must contain at least one uppercase letter`
      });
    }

    if (!/[a-z]/.test(value)) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must contain at least one lowercase letter`
      });
    }

    if (!/\d/.test(value)) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must contain at least one number`
      });
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?]/.test(value)) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must contain at least one special character`
      });
    }

    return errors;
  }
}