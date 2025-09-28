# Validation System Documentation

## Overview

This validation system provides robust, type-safe validation for Express middleware using `class-validator` and `class-transformer`. It includes comprehensive DTOs, error handling, and type safety integration.

## Features

- **Type-safe validation** with TypeScript support
- **Comprehensive DTOs** for Authentication and Workspace management
- **Flexible validation middleware** for body, query, and parameters
- **Enhanced error handling** with detailed error messages
- **Custom error transformation** utilities
- **Full integration** with Express request/response types

## Quick Start

### 1. Basic Usage

```typescript
import { Router } from 'express';
import { validateBody, validationErrorHandler } from '../common/middleware/validation';
import { RegisterDto } from '../modules/auth/auth.dto';

const router = Router();

// Apply validation middleware
router.post('/register',
  validateBody(RegisterDto),
  (req: ValidatedRequest<RegisterDto>, res: Response) => {
    // Type-safe access to validated data
    const { email, password, fullName } = req.validatedBody!;

    // Your logic here
    res.json({ success: true, data: { email, fullName } });
  }
);

// Add error handler at the end
router.use(validationErrorHandler);
```

### 2. Available Validation Middleware

#### `validateBody<T>(dto: ClassConstructor<T>, options?: ValidationOptions)`
Validates request body against a DTO class.

#### `validateQuery<T>(dto: ClassConstructor<T>, options?: ValidationOptions)`
Validates query parameters against a DTO class.

#### `validateParams<T>(dto: ClassConstructor<T>, options?: ValidationOptions)`
Validates route parameters against a DTO class.

### 3. Validation Options

```typescript
interface ValidationOptions {
  skipMissingProperties?: boolean;   // Skip validation for missing properties
  whitelist?: boolean;               // Remove non-whitelisted properties
  forbidNonWhitelisted?: boolean;    // Throw error for non-whitelisted properties
  transform?: boolean;               // Transform plain objects to class instances
}
```

## Available DTOs

### Authentication DTOs

#### `RegisterDto`
```typescript
{
  email: string;           // Valid email, automatically lowercased
  password: string;        // Min 8 chars, complex password requirements
  fullName?: string;       // Optional, max 100 chars
  redirectTo?: string;     // Optional valid URL
}
```

#### `LoginDto`
```typescript
{
  email: string;           // Valid email, automatically lowercased
  password: string;        // Required
  redirectTo?: string;     // Optional valid URL
}
```

#### `ResetPasswordDto`
```typescript
{
  email: string;           // Valid email, automatically lowercased
  redirectTo?: string;     // Optional valid URL
}
```

#### `OAuthLoginDto`
```typescript
{
  provider: string;        // One of: 'google', 'github', 'microsoft', 'facebook'
  redirectTo?: string;     // Optional valid URL
  scopes?: string;         // Optional scopes
}
```

### Workspace DTOs

#### `CreateWorkspaceDto`
```typescript
{
  name: string;            // Required, 1-100 chars
  settings?: object;       // Optional settings object
  is_default?: boolean;    // Optional default flag
}
```

#### `UpdateWorkspaceDto`
```typescript
{
  name?: string;           // Optional, 1-100 chars
  settings?: object;       // Optional settings object
  is_active?: boolean;     // Optional active flag
}
```

#### `InviteMemberDto`
```typescript
{
  email: string;           // Valid email, automatically lowercased
  role: string;            // One of: 'owner', 'manager', 'editor', 'viewer'
  customMessage?: string;  // Optional, max 500 chars
}
```

#### Parameter DTOs
- `WorkspaceParamsDto` - For `{ workspaceId: string }`
- `MemberParamsDto` - For `{ workspaceId: string, memberId: string }`

#### Query DTOs
- `WorkspaceQueryDto` - For workspace filtering and pagination
- `MemberQueryDto` - For member filtering and pagination

## Type Safety Integration

### Using TypedRequest

```typescript
import { TypedRequest, TypedResponse } from '../common/types/express-extensions';

// Type-safe request handler
const createWorkspace = async (
  req: TypedRequest<CreateWorkspaceDto>,
  res: TypedResponse<{ id: string; name: string }>
) => {
  // TypeScript knows the exact shape of validated data
  const { name, settings } = req.validatedBody!;

  // TypeScript knows the response shape
  return res.json({
    success: true,
    message: 'Workspace created',
    data: { id: '123', name }
  });
};
```

### Using ResponseHelper

```typescript
import { ResponseHelper } from '../common/types/express-extensions';

// Standardized responses
ResponseHelper.success(res, userData, 'User created');
ResponseHelper.created(res, workspaceData, 'Workspace created');
ResponseHelper.error(res, 'Something went wrong', 500);
ResponseHelper.badRequest(res, 'Invalid input');
ResponseHelper.unauthorized(res);
ResponseHelper.notFound(res, 'Workspace not found');
```

## Error Handling

### Validation Error Response Format

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "property": "email",
      "value": "invalid-email",
      "constraints": {
        "isEmail": "Please provide a valid email address"
      }
    }
  ],
  "details": [
    {
      "field": "email",
      "message": "Please provide a valid email address",
      "value": "invalid-email",
      "code": "isEmail"
    }
  ],
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/auth/register"
}
```

### Custom Error Transformation

```typescript
import { ValidationErrorTransformer } from '../common/utils/validation-error-transformer';

// Transform validation errors
const errorResponse = ValidationErrorTransformer.transform(errors, req.path);

// Get first error message
const firstError = ValidationErrorTransformer.getFirstErrorMessage(errors);

// Get errors grouped by field
const errorsByField = ValidationErrorTransformer.getErrorsByField(errors);

// Create custom error response
const customError = ValidationErrorTransformer.createCustomErrorResponse(
  'Custom validation failed',
  'customField',
  'invalidValue',
  'CUSTOM_ERROR'
);
```

## Advanced Usage

### Multiple Validation Types

```typescript
router.put('/workspaces/:workspaceId/members/:memberId',
  validateParams(MemberParamsDto),
  validateBody(UpdateMemberRoleDto),
  validateQuery(MemberQueryDto),
  async (req: ValidatedRequest, res: Response) => {
    const params = req.validatedParams as MemberParamsDto;
    const body = req.validatedBody as UpdateMemberRoleDto;
    const query = req.validatedQuery as MemberQueryDto;

    // All validated data available with proper types
  }
);
```

### Custom Validation Options

```typescript
router.post('/flexible-endpoint',
  validateBody(SomeDto, {
    skipMissingProperties: true,    // Allow partial updates
    forbidNonWhitelisted: false,    // Allow extra properties
    transform: true                 // Transform types
  }),
  handler
);
```

### Async Handler Wrapper

```typescript
import { asyncHandler } from '../common/types/express-extensions';

const createUser = asyncHandler<RegisterDto, any, any, { id: string }>(
  async (req, res) => {
    // Automatically catches and forwards errors to error handler
    const userData = req.validatedBody!;
    const user = await userService.create(userData);

    return ResponseHelper.created(res, { id: user.id }, 'User created');
  }
);

router.post('/users', validateBody(RegisterDto), createUser);
```

## Integration with Existing Code

### 1. Add to your Express app

```typescript
import { validationErrorHandler } from './common/middleware/validation';
import { errorHandler } from './common/middleware/error';

// Add validation error handler before general error handler
app.use(validationErrorHandler);
app.use(errorHandler);
```

### 2. Use in controllers

```typescript
import { validateBody, ValidatedRequest } from './common/middleware/validation';
import { RegisterDto } from './modules/auth/auth.dto';

export class AuthController {
  static register = [
    validateBody(RegisterDto),
    async (req: ValidatedRequest<RegisterDto>, res: Response) => {
      const { email, password, fullName } = req.validatedBody!;
      // Implementation here
    }
  ];
}
```

### 3. Route registration

```typescript
router.post('/auth/register', ...AuthController.register);
```

## Best Practices

1. **Always use type-safe interfaces** - Use `TypedRequest` and `TypedResponse` for full type safety
2. **Validate at the edge** - Apply validation middleware as early as possible in your route handlers
3. **Use appropriate DTOs** - Create specific DTOs for different use cases rather than reusing generic ones
4. **Handle errors consistently** - Use the provided error handler and response helpers
5. **Leverage TypeScript** - Take advantage of compile-time type checking for better developer experience
6. **Document your DTOs** - Add clear validation messages to help API consumers understand requirements

## Testing

```typescript
import request from 'supertest';
import { app } from '../app';

describe('Validation', () => {
  it('should validate registration data', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send({
        email: 'invalid-email',
        password: '123'
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.errors).toHaveLength(2);
  });

  it('should accept valid registration data', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send({
        email: 'user@example.com',
        password: 'SecurePassword123!',
        fullName: 'John Doe'
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });
});
```

This validation system provides a robust foundation for handling all input validation needs in your Express middleware with full type safety and comprehensive error handling.