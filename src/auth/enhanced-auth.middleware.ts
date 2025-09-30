import { Request, Response, NextFunction } from 'express';
import { authService } from './enhanced-auth.service';
import { EnhancedUser, PlanTier } from '../types/enhanced.types';
import {
  AuthenticationError,
  AuthorizationError,
  asyncHandler,
} from '../utils/error-handler';

// Create custom interface without conflicting with existing Request interface
export interface EnhancedAuthRequest extends Request {
  enhancedUser?: EnhancedUser;
  requestId?: string;
}

/**
 * Enhanced authentication middleware that verifies JWT tokens and attaches user data
 */
export const enhancedAuthenticate = asyncHandler(
  async (req: EnhancedAuthRequest, _res: Response, next: NextFunction) => {
    const token = extractToken(req);

    if (!token) {
      throw new AuthenticationError('Access token is required');
    }

    try {
      const user = await authService.verifyToken(token);

      if (!user) {
        throw new AuthenticationError('Invalid or expired token');
      }

      // Attach enhanced user to request
      req.enhancedUser = user;
      req.requestId = generateRequestId();

      next();
    } catch (error) {
      throw new AuthenticationError('Token verification failed');
    }
  }
);

/**
 * Optional authentication middleware - doesn't throw if no token provided
 */
export const enhancedOptionalAuthenticate = asyncHandler(
  async (req: EnhancedAuthRequest, _res: Response, next: NextFunction) => {
    const token = extractToken(req);

    if (!token) {
      // No token provided, continue without user
      next();
      return;
    }

    try {
      const user = await authService.verifyToken(token);
      if (user) {
        req.enhancedUser = user;
        req.requestId = generateRequestId();
      }
    } catch (error) {
      // Token invalid but optional, continue without user
      console.warn('Optional auth failed:', error);
    }

    next();
  }
);

/**
 * Require specific plan tier middleware
 */
export const enhancedRequirePlan = (minPlan: PlanTier) => {
  return asyncHandler(
    async (req: EnhancedAuthRequest, _res: Response, next: NextFunction) => {
      const user = req.enhancedUser;

      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      const planHierarchy = ['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'];
      const userPlanIndex = planHierarchy.indexOf(user.plan_tier);
      const requiredPlanIndex = planHierarchy.indexOf(minPlan);

      if (userPlanIndex === -1 || userPlanIndex < requiredPlanIndex) {
        throw new AuthorizationError(
          `Plan ${minPlan} or higher required. Current plan: ${user.plan_tier}`
        );
      }

      next();
    }
  );
};

/**
 * Require active account middleware
 */
export const enhancedRequireActiveAccount = asyncHandler(
  async (req: EnhancedAuthRequest, _res: Response, next: NextFunction) => {
    const user = req.enhancedUser;

    if (!user) {
      throw new AuthenticationError('Authentication required');
    }

    if (!user.is_active) {
      throw new AuthorizationError('Account is deactivated');
    }

    // Note: suspension logic would be implemented based on billing_info table
    // if needed in the future

    next();
  }
);

/**
 * Require specific feature access
 */
export const enhancedRequireFeature = (featureId: string) => {
  return asyncHandler(
    async (req: EnhancedAuthRequest, _res: Response, next: NextFunction) => {
      const user = req.enhancedUser;

      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      // Check if user's plan has this feature
      const hasFeature = checkFeatureAccess(user.plan_tier, featureId);

      if (!hasFeature) {
        throw new AuthorizationError(
          `Feature '${featureId}' not available in ${user.plan_tier} plan`
        );
      }

      // Check feature limits if applicable
      const limitExceeded = await checkFeatureLimits(user, featureId);
      if (limitExceeded) {
        throw new AuthorizationError(
          `Feature limit exceeded for '${featureId}'`
        );
      }

      next();
    }
  );
};

/**
 * Validate API key middleware for external integrations
 */
export const enhancedValidateApiKey = asyncHandler(
  async (req: EnhancedAuthRequest, _res: Response, _next: NextFunction) => {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      throw new AuthenticationError('API key is required');
    }

    // Note: API key validation would need to be implemented
    // For now, just throw an error
    throw new AuthenticationError('API key validation not implemented yet');
  }
);

/**
 * Admin-only middleware
 */
export const enhancedRequireAdmin = asyncHandler(
  async (req: EnhancedAuthRequest, _res: Response, next: NextFunction) => {
    const user = req.enhancedUser;

    if (!user) {
      throw new AuthenticationError('Authentication required');
    }

    // Note: Role-based access would be implemented based on plan_tier or separate role field
    // For now, check if user has enterprise plan
    if (user.plan_tier !== 'ENTERPRISE') {
      throw new AuthorizationError(
        'Admin privileges required (Enterprise plan)'
      );
    }

    next();
  }
);

/**
 * Rate limiting middleware by user
 */
export const enhancedRateLimit = (requestsPerMinute: number = 60) => {
  const userRequestCounts = new Map<
    string,
    { count: number; resetTime: number }
  >();

  return asyncHandler(
    async (req: EnhancedAuthRequest, res: Response, next: NextFunction) => {
      const user = req.enhancedUser;

      if (!user) {
        throw new AuthenticationError(
          'Authentication required for rate limiting'
        );
      }

      const now = Date.now();
      const windowStart = Math.floor(now / 60000) * 60000; // 1-minute window
      const userId = user.id;

      const userLimit = userRequestCounts.get(userId);

      if (!userLimit || userLimit.resetTime !== windowStart) {
        // New window or first request
        userRequestCounts.set(userId, { count: 1, resetTime: windowStart });
      } else if (userLimit.count >= requestsPerMinute) {
        // Rate limit exceeded
        const resetIn = (windowStart + 60000 - now) / 1000;
        res.set({
          'X-RateLimit-Limit': requestsPerMinute.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Math.ceil(resetIn).toString(),
        });

        throw new AuthorizationError(
          `Rate limit exceeded. Try again in ${Math.ceil(resetIn)} seconds.`
        );
      } else {
        // Increment counter
        userLimit.count++;
        userRequestCounts.set(userId, userLimit);
      }

      // Set rate limit headers
      const remaining = Math.max(
        0,
        requestsPerMinute - (userLimit?.count || 0)
      );
      res.set({
        'X-RateLimit-Limit': requestsPerMinute.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': '60',
      });

      next();
    }
  );
};

// Helper functions
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Also check for token in cookies
  const cookieToken = req.cookies?.access_token;
  if (cookieToken) {
    return cookieToken;
  }

  return null;
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function checkFeatureAccess(planTier: PlanTier, featureId: string): boolean {
  const features = {
    FREE: ['basic_posting', 'single_account'],
    STARTER: [
      'basic_posting',
      'single_account',
      'scheduling',
      'analytics_basic',
    ],
    PROFESSIONAL: [
      'basic_posting',
      'multiple_accounts',
      'scheduling',
      'analytics_pro',
      'team_collaboration',
    ],
    ENTERPRISE: [
      'all_features',
      'custom_integrations',
      'priority_support',
      'advanced_analytics',
    ],
  };

  const planFeatures = features[planTier] || [];
  return (
    planFeatures.includes(featureId) || planFeatures.includes('all_features')
  );
}

async function checkFeatureLimits(
  _user: EnhancedUser,
  _featureId: string
): Promise<boolean> {
  // This would typically check database for current usage
  // For now, return false (no limits exceeded)
  return false;
}

// Export middleware with clear names to avoid conflicts
export {
  enhancedAuthenticate as authenticate,
  enhancedOptionalAuthenticate as optionalAuthenticate,
  enhancedRequirePlan as requirePlan,
  enhancedRequireActiveAccount as requireActiveAccount,
  enhancedRequireFeature as requireFeature,
  enhancedValidateApiKey as validateApiKey,
  enhancedRequireAdmin as requireAdmin,
  enhancedRateLimit as rateLimit,
};

// Type guard for checking if request has enhanced user
export function hasEnhancedUser(req: Request): req is EnhancedAuthRequest {
  return 'enhancedUser' in req;
}

// Utility to get enhanced user from request
export function getEnhancedUser(req: Request): EnhancedUser | undefined {
  if (hasEnhancedUser(req)) {
    return req.enhancedUser;
  }
  return undefined;
}
