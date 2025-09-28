import { ValidationError } from 'class-validator';

export interface FormattedValidationError {
  property: string;
  value: any;
  constraints: Record<string, string>;
  children?: FormattedValidationError[];
}

export interface ValidationErrorResponse {
  success: false;
  message: string;
  errors: FormattedValidationError[];
  details: ValidationErrorDetail[];
  timestamp: string;
  path?: string;
}

export interface ValidationErrorDetail {
  field: string;
  message: string;
  value: any;
  code: string;
}

export class ValidationErrorTransformer {
  static transform(errors: ValidationError[], requestPath?: string): ValidationErrorResponse {
    const formattedErrors = this.formatErrors(errors);
    const details = this.createDetails(formattedErrors);

    return {
      success: false,
      message: 'Validation failed',
      errors: formattedErrors,
      details,
      timestamp: new Date().toISOString(),
      ...(requestPath && { path: requestPath })
    };
  }

  private static formatErrors(errors: ValidationError[]): FormattedValidationError[] {
    return errors.map(error => this.formatSingleError(error));
  }

  private static formatSingleError(error: ValidationError): FormattedValidationError {
    const result: FormattedValidationError = {
      property: error.property,
      value: error.value,
      constraints: error.constraints || {}
    };

    if (error.children && error.children.length > 0) {
      result.children = error.children.map(child => this.formatSingleError(child));
    }

    return result;
  }

  private static createDetails(errors: FormattedValidationError[], parentPath = ''): ValidationErrorDetail[] {
    const details: ValidationErrorDetail[] = [];

    for (const error of errors) {
      const fieldPath = parentPath ? `${parentPath}.${error.property}` : error.property;

      if (error.constraints) {
        for (const [code, message] of Object.entries(error.constraints)) {
          details.push({
            field: fieldPath,
            message,
            value: error.value,
            code
          });
        }
      }

      if (error.children) {
        details.push(...this.createDetails(error.children, fieldPath));
      }
    }

    return details;
  }

  static getFirstErrorMessage(errors: ValidationError[]): string {
    if (errors.length === 0) return 'Validation failed';

    const firstError = errors[0];

    if (firstError.constraints) {
      const firstConstraint = Object.values(firstError.constraints)[0];
      return firstConstraint;
    }

    if (firstError.children && firstError.children.length > 0) {
      return this.getFirstErrorMessage(firstError.children);
    }

    return 'Validation failed';
  }

  static getErrorsByField(errors: ValidationError[]): Record<string, string[]> {
    const errorsByField: Record<string, string[]> = {};

    const processError = (error: ValidationError, parentPath = '') => {
      const fieldPath = parentPath ? `${parentPath}.${error.property}` : error.property;

      if (error.constraints) {
        errorsByField[fieldPath] = Object.values(error.constraints);
      }

      if (error.children) {
        error.children.forEach(child => processError(child, fieldPath));
      }
    };

    errors.forEach(error => processError(error));
    return errorsByField;
  }

  static createCustomErrorResponse(
    message: string,
    field: string,
    value: any,
    code: string = 'CUSTOM_VALIDATION_ERROR'
  ): ValidationErrorResponse {
    return {
      success: false,
      message,
      errors: [{
        property: field,
        value,
        constraints: { [code]: message }
      }],
      details: [{
        field,
        message,
        value,
        code
      }],
      timestamp: new Date().toISOString()
    };
  }
}