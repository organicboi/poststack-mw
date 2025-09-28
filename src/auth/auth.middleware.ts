import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { isBaseError } from '../utils/errors';
import { ErrorCode } from '../types/errors';
import { AuthContext, AuthUser } from '../modules/auth/auth.types';

// Extend Express Request interface to include user and auth context
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      authContext?: AuthContext;
      isAuthenticated?: boolean;
    }
  }
}

class AuthMiddleware {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  // Required authentication middleware
  authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = this.extractToken(req);

      if (!token) {
        res.status(401).json({
          success: false,
          error: {
            code: ErrorCode.UNAUTHORIZED,
            message: 'Authentication token is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const validationResult = await this.authService.validateToken(token);

      if (!validationResult.isValid) {
        const statusCode = this.getStatusCodeFromError(validationResult.error?.code);
        res.status(statusCode).json({
          success: false,
          error: {
            code: validationResult.error?.code || ErrorCode.AUTHENTICATION_ERROR,
            message: validationResult.error?.message || 'Authentication failed',
            shouldRefresh: validationResult.error?.shouldRefresh,
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Attach user and authentication context to request
      req.user = validationResult.user as AuthUser;
      req.isAuthenticated = true;
      req.authContext = {
        user: req.user,
        isAuthenticated: true,
        permissions: req.user.user_metadata?.permissions || [],
        role: req.user.user_metadata?.role || 'user'
      };

      next();
    } catch (error) {
      this.handleMiddlewareError(error, res);
    }
  };

  // Optional authentication middleware - doesn't fail if no token
  optionalAuthenticate = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = this.extractToken(req);

      if (!token) {
        req.isAuthenticated = false;
        req.authContext = {
          isAuthenticated: false
        };
        next();
        return;
      }

      const validationResult = await this.authService.validateToken(token);

      if (validationResult.isValid && validationResult.user) {
        req.user = validationResult.user as AuthUser;
        req.isAuthenticated = true;
        req.authContext = {
          user: req.user,
          isAuthenticated: true,
          permissions: req.user.user_metadata?.permissions || [],
          role: req.user.user_metadata?.role || 'user'
        };
      } else {
        req.isAuthenticated = false;
        req.authContext = {
          isAuthenticated: false
        };
      }

      next();
    } catch (error) {
      // For optional auth, we continue even if there's an error
      req.isAuthenticated = false;
      req.authContext = {
        isAuthenticated: false
      };
      next();
    }
  };

  // Role-based authorization middleware
  requireRole = (requiredRole: string) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.isAuthenticated || !req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: ErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const userRole = req.user.user_metadata?.role || 'user';
      if (userRole !== requiredRole && userRole !== 'admin') {
        res.status(403).json({
          success: false,
          error: {
            code: ErrorCode.INSUFFICIENT_PERMISSIONS,
            message: `Access denied. Required role: ${requiredRole}`,
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      next();
    };
  };

  // Permission-based authorization middleware
  requirePermission = (requiredPermission: string) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.isAuthenticated || !req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: ErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const userPermissions = req.user.user_metadata?.permissions || [];
      const userRole = req.user.user_metadata?.role || 'user';

      // Admin users have all permissions
      if (userRole === 'admin') {
        next();
        return;
      }

      if (!userPermissions.includes(requiredPermission)) {
        res.status(403).json({
          success: false,
          error: {
            code: ErrorCode.INSUFFICIENT_PERMISSIONS,
            message: `Access denied. Required permission: ${requiredPermission}`,
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      next();
    };
  };

  // Multiple permissions (any one is sufficient)
  requireAnyPermission = (requiredPermissions: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.isAuthenticated || !req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: ErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const userPermissions = req.user.user_metadata?.permissions || [];
      const userRole = req.user.user_metadata?.role || 'user';

      // Admin users have all permissions
      if (userRole === 'admin') {
        next();
        return;
      }

      const hasAnyPermission = requiredPermissions.some(permission =>
        userPermissions.includes(permission)
      );

      if (!hasAnyPermission) {
        res.status(403).json({
          success: false,
          error: {
            code: ErrorCode.INSUFFICIENT_PERMISSIONS,
            message: `Access denied. Required permissions: ${requiredPermissions.join(' or ')}`,
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      next();
    };
  };

  // Extract token from cookies or Authorization header
  private extractToken(req: Request): string | null {
    // Priority: Authorization header > cookies > query params
    if (req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7).trim();
      }
    }

    // Check cookies
    if (req.cookies?.access_token) {
      return req.cookies.access_token;
    }

    if (req.cookies?.auth_token) {
      return req.cookies.auth_token;
    }

    if (req.cookies?.auth) {
      return req.cookies.auth;
    }

    // Check query params (for some OAuth callbacks)
    if (req.query?.access_token && typeof req.query.access_token === 'string') {
      return req.query.access_token;
    }

    return null;
  }

  // Map error codes to HTTP status codes
  private getStatusCodeFromError(errorCode?: string): number {
    switch (errorCode) {
      case 'TOKEN_EXPIRED':
        return 401;
      case 'TOKEN_INVALID':
        return 401;
      case 'TOKEN_MISSING':
        return 401;
      case 'INSUFFICIENT_PERMISSIONS':
        return 403;
      case 'FORBIDDEN':
        return 403;
      default:
        return 401;
    }
  }

  // Handle middleware errors
  private handleMiddlewareError(error: unknown, res: Response): void {
    console.error('Auth middleware error:', error);

    if (isBaseError(error)) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.errorCode,
          message: 'Authentication failed',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Authentication service error',
        timestamp: new Date().toISOString()
      }
    });
  }
}

// Create singleton instance
const authMiddleware = new AuthMiddleware();

// Export middleware functions
export const authenticateUser = authMiddleware.authenticate;
export const optionalAuthenticateUser = authMiddleware.optionalAuthenticate;
export const requireRole = authMiddleware.requireRole;
export const requirePermission = authMiddleware.requirePermission;
export const requireAnyPermission = authMiddleware.requireAnyPermission;

// Export the class for dependency injection
export { AuthMiddleware };