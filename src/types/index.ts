/**
 * Main index file for TypeScript types and interfaces
 * Exports all types from the middleware system
 */

// Response Types
export * from './response.types';

// Configuration Types
export * from './config.types';

// Entity Types
export * from './entity.types';

// Utility Types
export * from './utility.types';

// Type Guards and Validation
export * from './guards.types';

// Enums and Constants
export * from './enums.types';

// Re-export from existing modules for backward compatibility
export * from '../modules/auth/auth.types';
export * from '../modules/workspace/workspace.types';

/**
 * Common type aliases for convenience
 */

// Generic API Response
export type { ApiResponse } from './response.types';

// Request/Response types
export type { AuthenticatedRequest, CustomResponse, CustomMiddleware } from './utility.types';

// Configuration types
export type { MiddlewareConfig, ProxyConfig, ServiceKeyConfig } from './config.types';

// Entity types
export type { User, WorkspaceEntity, AuthenticationSession } from './entity.types';

// Commonly used enums
export { HttpStatusCode, ErrorCode, WorkspaceRole as WRole, Permission } from './enums.types';