import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../auth/auth.service';
import { User } from '@supabase/supabase-js';
import { asyncHandler } from '../../utils/async-handler';

const authService = new AuthService();

export interface AuthenticatedRequest extends Request {
  user?: User;
}

/**
 * Authentication middleware for workspace routes
 * Validates JWT token and adds user to request object
 */
export const authenticateWorkspaceRequest = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const token =
      req.cookies?.auth || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'NO_TOKEN',
      });
    }

    const user = await authService.validateToken(token);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token',
        error: 'INVALID_TOKEN',
      });
    }

    req.user = user;
    next();
  }
);

/**
 * Validation middleware for workspace ID parameter
 */
export const validateWorkspaceId = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: 'Workspace ID is required',
      error: 'MISSING_WORKSPACE_ID',
    });
  }

  // Basic UUID validation
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid workspace ID format',
      error: 'INVALID_WORKSPACE_ID',
    });
  }

  next();
};

/**
 * Validation middleware for user ID parameter
 */
export const validateUserId = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: 'User ID is required',
      error: 'MISSING_USER_ID',
    });
  }

  // Basic UUID validation
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid user ID format',
      error: 'INVALID_USER_ID',
    });
  }

  next();
};

/**
 * Validation middleware for account ID parameter
 */
export const validateAccountId = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { accountId } = req.params;

  if (!accountId) {
    return res.status(400).json({
      success: false,
      message: 'Account ID is required',
      error: 'MISSING_ACCOUNT_ID',
    });
  }

  // Basic UUID validation
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(accountId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid account ID format',
      error: 'INVALID_ACCOUNT_ID',
    });
  }

  next();
};

/**
 * Validation middleware for workspace creation/update data
 */
export const validateWorkspaceData = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { name } = req.body;

  if (!name || typeof name !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Workspace name is required and must be a string',
      error: 'INVALID_WORKSPACE_NAME',
    });
  }

  if (name.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Workspace name cannot be empty',
      error: 'EMPTY_WORKSPACE_NAME',
    });
  }

  if (name.length > 100) {
    return res.status(400).json({
      success: false,
      message: 'Workspace name cannot exceed 100 characters',
      error: 'WORKSPACE_NAME_TOO_LONG',
    });
  }

  // Sanitize the name
  req.body.name = name.trim();

  next();
};

/**
 * Validation middleware for member invitation data
 */
export const validateMemberInviteData = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { email, role } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Email is required and must be a string',
      error: 'INVALID_EMAIL',
    });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid email format',
      error: 'INVALID_EMAIL_FORMAT',
    });
  }

  if (!role || !['owner', 'manager', 'editor', 'viewer'].includes(role)) {
    return res.status(400).json({
      success: false,
      message:
        'Role is required and must be one of: owner, manager, editor, viewer',
      error: 'INVALID_ROLE',
    });
  }

  next();
};

/**
 * Validation middleware for member role update data
 */
export const validateMemberRoleData = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { role } = req.body;

  if (!role || !['owner', 'manager', 'editor', 'viewer'].includes(role)) {
    return res.status(400).json({
      success: false,
      message:
        'Role is required and must be one of: owner, manager, editor, viewer',
      error: 'INVALID_ROLE',
    });
  }

  next();
};

/**
 * Validation middleware for social account linking data
 */
export const validateSocialAccountData = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { accountId } = req.body;

  if (!accountId || typeof accountId !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Account ID is required and must be a string',
      error: 'INVALID_ACCOUNT_ID',
    });
  }

  // Basic UUID validation
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(accountId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid account ID format',
      error: 'INVALID_ACCOUNT_ID_FORMAT',
    });
  }

  next();
};

/**
 * Error handling middleware for workspace operations
 */
export const handleWorkspaceError = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Workspace operation error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    params: req.params,
    body: req.body,
    user: (req as any).user?.id,
  });

  // Handle specific error types
  if (error.message.includes('Access denied')) {
    return res.status(403).json({
      success: false,
      message: error.message,
      error: 'ACCESS_DENIED',
    });
  }

  if (error.message.includes('not found')) {
    return res.status(404).json({
      success: false,
      message: error.message,
      error: 'RESOURCE_NOT_FOUND',
    });
  }

  if (
    error.message.includes('already exists') ||
    error.message.includes('already a member') ||
    error.message.includes('already linked')
  ) {
    return res.status(409).json({
      success: false,
      message: error.message,
      error: 'RESOURCE_CONFLICT',
    });
  }

  if (error.message.includes('Invalid') || error.message.includes('required')) {
    return res.status(400).json({
      success: false,
      message: error.message,
      error: 'VALIDATION_ERROR',
    });
  }

  // Generic server error
  return res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: 'INTERNAL_ERROR',
    details: error.message,
  });
};

/**
 * Request logging middleware for workspace operations
 */
export const logWorkspaceRequest = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();
  const originalSend = res.send;

  res.send = function (data) {
    const duration = Date.now() - startTime;
    console.log(
      `${new Date().toISOString()} - WORKSPACE ${req.method} ${req.path} - ${
        res.statusCode
      } - ${duration}ms - User: ${req.user?.id || 'anonymous'}`
    );
    return originalSend.call(this, data);
  };

  next();
};

/**
 * Rate limiting middleware for workspace operations
 */
export const rateLimitWorkspaceRequests = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Simple rate limiting implementation
  // In production, use redis-based rate limiting
  const userRequests = (global as any).userRequests || {};
  const userId = (req as any).user?.id;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 100; // 100 requests per minute

  if (!userId) {
    return next();
  }

  if (!userRequests[userId]) {
    userRequests[userId] = [];
  }

  // Clean old requests
  userRequests[userId] = userRequests[userId].filter(
    (time: number) => now - time < windowMs
  );

  if (userRequests[userId].length >= maxRequests) {
    return res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again later.',
      error: 'RATE_LIMIT_EXCEEDED',
    });
  }

  userRequests[userId].push(now);
  (global as any).userRequests = userRequests;

  next();
};
