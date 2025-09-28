import helmet from 'helmet';
import cors from 'cors';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

export interface SecurityConfig {
  environment: 'development' | 'production' | 'test';
  allowedOrigins: string[];
  cspDirectives?: Record<string, string[]>;
  enableHSTS?: boolean;
  enableDNSPrefetchControl?: boolean;
  enableFrameguard?: boolean;
  enableXSSFilter?: boolean;
}

// Enhanced CORS configuration
export const createCorsMiddleware = (allowedOrigins: string[] = []) => {
  const origins = allowedOrigins.length > 0 ? allowedOrigins : [
    config.cors.origin as string,
    config.frontend.url,
    config.backend.url,
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002'
  ];

  return cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // Check if origin is in allowed list
      if (origins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked request from origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: config.cors.credentials,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-API-Key',
      'X-Service-Key',
      'X-Request-ID',
      'X-Forwarded-For',
      'X-Real-IP'
    ],
    exposedHeaders: [
      'X-Request-ID',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset'
    ],
    maxAge: 86400, // 24 hours
    optionsSuccessStatus: 200
  });
};

// Content Security Policy configuration
export const createCSPDirectives = (environment: string) => {
  const baseDirectives = {
    defaultSrc: ["'self'"],
    styleSrc: [
      "'self'",
      "'unsafe-inline'", // Allow inline styles for development
      'https://fonts.googleapis.com',
      'https://cdn.jsdelivr.net'
    ],
    scriptSrc: [
      "'self'",
      ...(environment === 'development' ? ["'unsafe-eval'", "'unsafe-inline'"] : []),
      'https://cdn.jsdelivr.net',
      'https://unpkg.com'
    ],
    fontSrc: [
      "'self'",
      'https://fonts.gstatic.com',
      'https://cdn.jsdelivr.net',
      'data:'
    ],
    imgSrc: [
      "'self'",
      'data:',
      'blob:',
      'https:',
      'http://localhost:*' // Allow images from localhost in development
    ],
    connectSrc: [
      "'self'",
      'https://api.supabase.io',
      'https://*.supabase.co',
      ...(environment === 'development' ? ['http://localhost:*', 'ws://localhost:*'] : [])
    ],
    frameSrc: ["'none'"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'", 'blob:', 'data:'],
    childSrc: ["'none'"],
    workerSrc: ["'self'", 'blob:'],
    manifestSrc: ["'self'"],
    baseUri: ["'self'"],
    formAction: ["'self'"]
  };

  return baseDirectives;
};

// Helmet security configuration
export const createHelmetMiddleware = (securityConfig: SecurityConfig) => {
  const { environment, cspDirectives, enableHSTS = true, enableDNSPrefetchControl = true, enableFrameguard = true, enableXSSFilter = true } = securityConfig;

  return helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: cspDirectives || createCSPDirectives(environment),
      reportOnly: environment === 'development'
    },

    // HTTP Strict Transport Security
    hsts: enableHSTS && environment === 'production' ? {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    } : false,

    // DNS Prefetch Control
    dnsPrefetchControl: enableDNSPrefetchControl ? {
      allow: false
    } : false,

    // Frameguard (prevent clickjacking)
    frameguard: enableFrameguard ? {
      action: 'deny'
    } : false,

    // X-Content-Type-Options
    noSniff: true,

    // X-XSS-Protection
    xssFilter: enableXSSFilter,

    // Referrer Policy
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin'
    },

    // Permissions Policy (formerly Feature Policy)
    permittedCrossDomainPolicies: false,

    // Cross-Origin-Embedder-Policy
    crossOriginEmbedderPolicy: environment === 'production' ? {
      policy: 'require-corp'
    } : false,

    // Cross-Origin-Opener-Policy
    crossOriginOpenerPolicy: {
      policy: 'same-origin'
    },

    // Cross-Origin-Resource-Policy
    crossOriginResourcePolicy: {
      policy: 'cross-origin'
    },

    // Hide X-Powered-By header
    hidePoweredBy: true
  });
};

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Custom security headers
  res.setHeader('X-Request-ID', req.headers['x-request-id'] || 'unknown');
  res.setHeader('X-Response-Time', Date.now().toString());

  // Additional security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Download-Options', 'noopen');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

  // Cache control for sensitive endpoints
  if (req.path.includes('/auth/') || req.path.includes('/admin/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  next();
};

// Environment-specific security configuration
export const getSecurityConfig = (): SecurityConfig => {
  const environment = config.server.environment as 'development' | 'production' | 'test';

  const baseConfig: SecurityConfig = {
    environment,
    allowedOrigins: []
  };

  switch (environment) {
    case 'production':
      return {
        ...baseConfig,
        allowedOrigins: [
          config.frontend.url,
          config.backend.url
        ],
        enableHSTS: true,
        enableDNSPrefetchControl: true,
        enableFrameguard: true,
        enableXSSFilter: true
      };

    case 'development':
      return {
        ...baseConfig,
        allowedOrigins: [
          'http://localhost:3000',
          'http://localhost:3001',
          'http://localhost:3002',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:3001',
          'http://127.0.0.1:3002'
        ],
        enableHSTS: false,
        enableDNSPrefetchControl: false,
        enableFrameguard: false,
        enableXSSFilter: true
      };

    case 'test':
      return {
        ...baseConfig,
        allowedOrigins: ['http://localhost:*'],
        enableHSTS: false,
        enableDNSPrefetchControl: false,
        enableFrameguard: false,
        enableXSSFilter: false
      };

    default:
      return baseConfig;
  }
};

// CORS error handler
export const corsErrorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS policy violation: Origin not allowed',
      timestamp: new Date().toISOString(),
      path: req.path,
      origin: req.headers.origin
    });
  }
  next(err);
};

// Security middleware factory
export const createSecurityMiddleware = (customConfig?: Partial<SecurityConfig>) => {
  const securityConfig = { ...getSecurityConfig(), ...customConfig };

  return [
    createCorsMiddleware(securityConfig.allowedOrigins),
    createHelmetMiddleware(securityConfig),
    securityHeaders,
    corsErrorHandler
  ];
};

// Trusted proxy configuration
export const configureTrustedProxies = (app: any) => {
  // Trust first proxy (for Heroku, AWS ELB, etc.)
  app.set('trust proxy', 1);

  // Custom trusted proxy configuration
  if (process.env.TRUSTED_PROXIES) {
    const proxies = process.env.TRUSTED_PROXIES.split(',').map(p => p.trim());
    app.set('trust proxy', proxies);
  }
};