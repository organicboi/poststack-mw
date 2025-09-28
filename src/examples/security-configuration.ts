import express from 'express';
import { Application } from 'express';

// Security middleware imports
import {
  generalRateLimit,
  authRateLimit,
  sensitiveRateLimit,
  apiRateLimit,
  uploadRateLimit,
  createCustomRateLimit
} from '../common/middleware/rate-limiting';

import {
  createSecurityMiddleware,
  configureTrustedProxies,
  getSecurityConfig
} from '../common/middleware/security-headers';

import {
  requestIdMiddleware,
  requestTimingMiddleware,
  compressionMiddleware,
  createBodyParsingMiddleware,
  requestSanitizationMiddleware,
  createSecurityLogging,
  requestSizeLimitMiddleware,
  timeoutMiddleware
} from '../common/middleware/additional-security';

import {
  createSecurityUtils,
  SecurityUtilsConfig
} from '../common/utils/security-utils';

import {
  securityLogger,
  securityEventMiddleware
} from '../common/logging/security-logger';

import { validationErrorHandler } from '../common/middleware/validation';
import { errorHandler } from '../common/middleware/error';

// Security configuration interface
export interface AppSecurityConfig {
  rateLimit: {
    enableGeneral: boolean;
    enableAuth: boolean;
    enableSensitive: boolean;
    enableAPI: boolean;
    enableUpload: boolean;
    customLimits?: Array<{
      path: string;
      windowMs: number;
      max: number;
    }>;
  };
  security: {
    enableIPFiltering: boolean;
    enableInputSanitization: boolean;
    blockedIPs?: string[];
    allowedIPs?: string[];
    maxStringLength?: number;
  };
  logging: {
    enableSecurity: boolean;
    enableMorgan: boolean;
    logLevel: 'development' | 'production' | 'security';
  };
  performance: {
    enableCompression: boolean;
    enableTimeout: boolean;
    timeoutMs?: number;
    maxRequestSize?: string;
  };
}

// Default security configuration
export const defaultSecurityConfig: AppSecurityConfig = {
  rateLimit: {
    enableGeneral: true,
    enableAuth: true,
    enableSensitive: true,
    enableAPI: true,
    enableUpload: true
  },
  security: {
    enableIPFiltering: false,
    enableInputSanitization: true,
    maxStringLength: 1000
  },
  logging: {
    enableSecurity: true,
    enableMorgan: true,
    logLevel: 'production'
  },
  performance: {
    enableCompression: true,
    enableTimeout: true,
    timeoutMs: 30000,
    maxRequestSize: '10mb'
  }
};

// Security middleware setup function
export const setupSecurityMiddleware = (app: Application, config: AppSecurityConfig = defaultSecurityConfig) => {
  console.log('🔒 Setting up security middleware...');

  // 1. Configure trusted proxies
  configureTrustedProxies(app);

  // 2. Request ID and timing (should be first)
  app.use(requestIdMiddleware);
  app.use(requestTimingMiddleware);

  // 3. Security headers and CORS
  const securityMiddleware = createSecurityMiddleware();
  securityMiddleware.forEach(middleware => app.use(middleware));

  // 4. Security event logging
  if (config.logging.enableSecurity) {
    app.use(securityEventMiddleware);
  }

  // 5. Body parsing with security limits
  if (config.performance.maxRequestSize) {
    app.use(requestSizeLimitMiddleware(config.performance.maxRequestSize));
  }
  const bodyParsers = createBodyParsingMiddleware();
  bodyParsers.forEach(parser => app.use(parser));

  // 6. Compression
  if (config.performance.enableCompression) {
    app.use(compressionMiddleware);
  }

  // 7. Request timeout
  if (config.performance.enableTimeout) {
    app.use(timeoutMiddleware(config.performance.timeoutMs));
  }

  // 8. Input sanitization
  if (config.security.enableInputSanitization) {
    app.use(requestSanitizationMiddleware);
  }

  // 9. Security utilities (IP filtering, input sanitization)
  const securityUtils = createSecurityUtils({
    enableIPFiltering: config.security.enableIPFiltering,
    enableInputSanitization: config.security.enableInputSanitization,
    blockedIPs: config.security.blockedIPs,
    allowedIPs: config.security.allowedIPs,
    maxStringLength: config.security.maxStringLength
  });

  if (config.security.enableIPFiltering) {
    app.use(securityUtils.ipFiltering);
  }

  app.use(securityUtils.inputSanitization);

  // 10. Morgan logging
  if (config.logging.enableMorgan) {
    const loggers = createSecurityLogging();
    switch (config.logging.logLevel) {
      case 'development':
        app.use(loggers.development);
        break;
      case 'production':
        app.use(loggers.production);
        break;
      case 'security':
        app.use(loggers.security);
        break;
    }
  }

  // 11. General rate limiting (applied to all routes)
  if (config.rateLimit.enableGeneral) {
    app.use(generalRateLimit);
  }

  console.log('✅ Security middleware setup complete');
};

// Route-specific security configurations
export const applyRouteSpecificSecurity = (app: Application, config: AppSecurityConfig = defaultSecurityConfig) => {
  // Authentication routes
  if (config.rateLimit.enableAuth) {
    app.use('/auth', authRateLimit);
    app.use('/api/auth', authRateLimit);
  }

  // Sensitive operations
  if (config.rateLimit.enableSensitive) {
    app.use('/auth/reset-password', sensitiveRateLimit);
    app.use('/auth/verify-email', sensitiveRateLimit);
    app.use('/api/auth/reset-password', sensitiveRateLimit);
  }

  // API routes
  if (config.rateLimit.enableAPI) {
    app.use('/api', apiRateLimit);
  }

  // Upload routes
  if (config.rateLimit.enableUpload) {
    app.use('/upload', uploadRateLimit);
    app.use('/api/upload', uploadRateLimit);
  }

  // Custom rate limits
  if (config.rateLimit.customLimits) {
    config.rateLimit.customLimits.forEach(limit => {
      const customLimit = createCustomRateLimit({
        windowMs: limit.windowMs,
        max: limit.max
      });
      app.use(limit.path, customLimit);
    });
  }
};

// Error handlers (should be last)
export const setupErrorHandlers = (app: Application) => {
  // Validation error handler
  app.use(validationErrorHandler);

  // General error handler
  app.use(errorHandler);
};

// Complete security setup function
export const setupCompleteSecurity = (app: Application, customConfig?: Partial<AppSecurityConfig>) => {
  const config = { ...defaultSecurityConfig, ...customConfig };

  setupSecurityMiddleware(app, config);
  applyRouteSpecificSecurity(app, config);
  setupErrorHandlers(app);

  return {
    securityLogger,
    config
  };
};

// Example usage in main app
export const createSecureApp = (customConfig?: Partial<AppSecurityConfig>) => {
  const app = express();

  // Setup security
  const { securityLogger: logger, config } = setupCompleteSecurity(app, customConfig);

  // Example routes with different security levels
  setupExampleRoutes(app);

  return { app, securityLogger: logger, config };
};

// Example routes with security configurations
const setupExampleRoutes = (app: Application) => {
  // Public routes (with general rate limiting)
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Auth routes (with auth rate limiting)
  app.post('/auth/login', (req, res) => {
    // Login logic here
    securityLogger.logAuthSuccess(req, 'user123', 'user@example.com');
    res.json({ success: true, message: 'Login successful' });
  });

  app.post('/auth/register', (req, res) => {
    // Registration logic here
    res.json({ success: true, message: 'Registration successful' });
  });

  // Sensitive routes (with strict rate limiting)
  app.post('/auth/reset-password', (req, res) => {
    // Password reset logic
    res.json({ success: true, message: 'Password reset email sent' });
  });

  // API routes (with API rate limiting)
  app.get('/api/users', (req, res) => {
    // Users API logic
    res.json({ users: [] });
  });

  // Upload routes (with upload rate limiting)
  app.post('/upload', (req, res) => {
    // File upload logic
    res.json({ success: true, message: 'File uploaded' });
  });

  // Admin routes (with additional security)
  app.use('/admin', (req, res, next) => {
    // Additional admin security checks
    if (!req.user || req.user.role !== 'admin') {
      securityLogger.logEvent({
        type: 'authz_failure' as any,
        severity: 'high' as any,
        message: 'Unauthorized admin access attempt',
        requestId: req.requestId,
        userId: req.user?.id,
        ip: req.ip,
        path: req.path
      });
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  });

  app.get('/admin/dashboard', (req, res) => {
    res.json({ message: 'Admin dashboard' });
  });
};

// Development-specific configuration
export const developmentConfig: Partial<AppSecurityConfig> = {
  rateLimit: {
    enableGeneral: false, // Disable for easier development
    enableAuth: true,
    enableSensitive: true,
    enableAPI: false,
    enableUpload: true
  },
  security: {
    enableIPFiltering: false,
    enableInputSanitization: true
  },
  logging: {
    enableSecurity: true,
    enableMorgan: true,
    logLevel: 'development'
  },
  performance: {
    enableCompression: false, // Disable for easier debugging
    enableTimeout: false,
    maxRequestSize: '50mb' // Higher limit for development
  }
};

// Production-specific configuration
export const productionConfig: Partial<AppSecurityConfig> = {
  rateLimit: {
    enableGeneral: true,
    enableAuth: true,
    enableSensitive: true,
    enableAPI: true,
    enableUpload: true,
    customLimits: [
      { path: '/api/webhook', windowMs: 60000, max: 100 }, // Webhooks
      { path: '/search', windowMs: 60000, max: 200 } // Search endpoints
    ]
  },
  security: {
    enableIPFiltering: true,
    enableInputSanitization: true,
    blockedIPs: [
      // Add known malicious IPs
      '192.168.1.100/32',
      '10.0.0.0/8'
    ],
    maxStringLength: 500 // Stricter in production
  },
  logging: {
    enableSecurity: true,
    enableMorgan: true,
    logLevel: 'production'
  },
  performance: {
    enableCompression: true,
    enableTimeout: true,
    timeoutMs: 30000,
    maxRequestSize: '10mb'
  }
};

// Testing-specific configuration
export const testingConfig: Partial<AppSecurityConfig> = {
  rateLimit: {
    enableGeneral: false,
    enableAuth: false,
    enableSensitive: false,
    enableAPI: false,
    enableUpload: false
  },
  security: {
    enableIPFiltering: false,
    enableInputSanitization: false
  },
  logging: {
    enableSecurity: false,
    enableMorgan: false,
    logLevel: 'development'
  },
  performance: {
    enableCompression: false,
    enableTimeout: false,
    maxRequestSize: '100mb'
  }
};