import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
  onLimitReached?: (req: Request, res: Response) => void;
}

const DEFAULT_ERROR_RESPONSE = {
  success: false,
  message: 'Too many requests, please try again later.',
  timestamp: new Date().toISOString()
};

const createRateLimitErrorHandler = (customMessage?: string) => {
  return (req: Request, res: Response) => {
    const rateLimitInfo = {
      limit: req.rateLimit?.limit,
      current: req.rateLimit?.used,
      remaining: req.rateLimit?.remaining,
      resetTime: req.rateLimit?.resetTime
    };

    res.status(429).json({
      ...DEFAULT_ERROR_RESPONSE,
      message: customMessage || DEFAULT_ERROR_RESPONSE.message,
      rateLimitInfo,
      path: req.path
    });
  };
};

// General API rate limiting
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use combination of IP and user ID if available for authenticated requests
    const userKey = req.user?.id || '';
    return `${req.ip}:${userKey}`;
  },
  handler: createRateLimitErrorHandler(),
  onLimitReached: (req: Request, res: Response) => {
    console.warn(`Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}, User: ${req.user?.id || 'anonymous'}`);
  }
});

// Strict rate limiting for authentication endpoints
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 auth requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  keyGenerator: (req: Request) => {
    // Use IP + email for auth attempts if available
    const email = req.body?.email || '';
    return `auth:${req.ip}:${email}`;
  },
  handler: createRateLimitErrorHandler('Too many authentication attempts from this IP, please try again later.'),
  onLimitReached: (req: Request, res: Response) => {
    console.error(`Auth rate limit exceeded for IP: ${req.ip}, Email: ${req.body?.email || 'unknown'}, Path: ${req.path}`);
  }
});

// Very strict rate limiting for password reset and sensitive operations
export const sensitiveRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Only 5 sensitive operations per hour
  message: 'Too many sensitive requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  keyGenerator: (req: Request) => {
    const email = req.body?.email || '';
    return `sensitive:${req.ip}:${email}`;
  },
  handler: createRateLimitErrorHandler('Too many sensitive operations attempted, please try again in an hour.'),
  onLimitReached: (req: Request, res: Response) => {
    console.error(`Sensitive operation rate limit exceeded for IP: ${req.ip}, Email: ${req.body?.email || 'unknown'}, Path: ${req.path}`);
  }
});

// Rate limiting for API endpoints (higher limits for authenticated users)
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req: Request) => {
    // Higher limits for authenticated users
    return req.user ? 2000 : 500;
  },
  message: 'API rate limit exceeded, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const userKey = req.user?.id || 'anonymous';
    return `api:${req.ip}:${userKey}`;
  },
  handler: createRateLimitErrorHandler('API rate limit exceeded, please try again later.'),
  onLimitReached: (req: Request, res: Response) => {
    console.warn(`API rate limit exceeded for IP: ${req.ip}, User: ${req.user?.id || 'anonymous'}, Path: ${req.path}`);
  }
});

// Rate limiting for file uploads
export const uploadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 uploads per hour
  message: 'Upload rate limit exceeded, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const userKey = req.user?.id || 'anonymous';
    return `upload:${req.ip}:${userKey}`;
  },
  handler: createRateLimitErrorHandler('Upload rate limit exceeded, please try again later.'),
  onLimitReached: (req: Request, res: Response) => {
    console.warn(`Upload rate limit exceeded for IP: ${req.ip}, User: ${req.user?.id || 'anonymous'}`);
  }
});

// Custom rate limiter factory for specific use cases
export const createCustomRateLimit = (config: RateLimitConfig) => {
  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    message: config.message || DEFAULT_ERROR_RESPONSE.message,
    standardHeaders: config.standardHeaders ?? true,
    legacyHeaders: config.legacyHeaders ?? false,
    skipSuccessfulRequests: config.skipSuccessfulRequests ?? false,
    skipFailedRequests: config.skipFailedRequests ?? false,
    keyGenerator: config.keyGenerator || ((req: Request) => req.ip),
    handler: createRateLimitErrorHandler(config.message),
    onLimitReached: config.onLimitReached || ((req: Request, res: Response) => {
      console.warn(`Custom rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
    })
  });
};

// Redis store configuration for distributed environments
export const createRedisRateLimit = (redisClient: any, config: RateLimitConfig) => {
  // Note: This requires 'rate-limit-redis' package to be installed
  // npm install rate-limit-redis
  try {
    const RedisStore = require('rate-limit-redis');

    return rateLimit({
      store: new RedisStore({
        sendCommand: (...args: string[]) => redisClient.call(...args),
      }),
      windowMs: config.windowMs,
      max: config.max,
      message: config.message || DEFAULT_ERROR_RESPONSE.message,
      standardHeaders: config.standardHeaders ?? true,
      legacyHeaders: config.legacyHeaders ?? false,
      keyGenerator: config.keyGenerator || ((req: Request) => req.ip),
      handler: createRateLimitErrorHandler(config.message)
    });
  } catch (error) {
    console.warn('Redis rate limiting not available, falling back to memory store');
    return createCustomRateLimit(config);
  }
};

// Rate limit bypass for internal services
export const createBypassRateLimit = (serviceKey: string) => {
  return (req: Request, res: Response, next: Function) => {
    const authHeader = req.headers.authorization;
    const serviceKeyHeader = req.headers['x-service-key'];

    if (authHeader === `Bearer ${serviceKey}` || serviceKeyHeader === serviceKey) {
      // Bypass rate limiting for internal services
      return next();
    }

    // Apply general rate limiting
    return generalRateLimit(req, res, next);
  };
};