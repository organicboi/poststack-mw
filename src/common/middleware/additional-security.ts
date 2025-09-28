import { Request, Response, NextFunction } from 'express';
import compression from 'compression';
import { v4 as uuidv4 } from 'uuid';
import morgan from 'morgan';
import winston from 'winston';
import cookieParser from 'cookie-parser';

// Extend Request interface to include additional properties
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      startTime?: number;
      user?: {
        id: string;
        email: string;
        role?: string;
        workspaceId?: string;
      };
      rateLimit?: {
        limit: number;
        used: number;
        remaining: number;
        resetTime: Date;
      };
    }
  }
}

// Request ID generation middleware
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Check if request ID is already provided (from load balancer, proxy, etc.)
  const existingRequestId = req.headers['x-request-id'] as string;
  const requestId = existingRequestId || uuidv4();

  // Set request ID on request object
  req.requestId = requestId;

  // Set response header
  res.setHeader('X-Request-ID', requestId);

  // Add to locals for use in templates/logging
  res.locals.requestId = requestId;

  next();
};

// Request timing middleware
export const requestTimingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  req.startTime = Date.now();

  // Override res.end to calculate response time
  const originalEnd = res.end;
  res.end = function (chunk?: any, encoding?: any) {
    const responseTime = Date.now() - (req.startTime || 0);
    res.setHeader('X-Response-Time', `${responseTime}ms`);

    // Log slow requests
    if (responseTime > 5000) { // 5 seconds
      console.warn(`Slow request detected: ${req.method} ${req.path} - ${responseTime}ms`);
    }

    originalEnd.call(this, chunk, encoding);
  };

  next();
};

// Enhanced compression middleware
export const compressionMiddleware = compression({
  // Only compress responses larger than 1KB
  threshold: 1024,

  // Compression level (1-9, 9 is best compression but slowest)
  level: 6,

  // Don't compress already compressed content
  filter: (req: Request, res: Response) => {
    // Don't compress if the request has a Cache-Control: no-transform directive
    if (req.headers['cache-control']?.includes('no-transform')) {
      return false;
    }

    // Don't compress images, videos, or already compressed files
    const contentType = res.getHeader('content-type') as string;
    if (contentType) {
      const skipTypes = [
        'image/',
        'video/',
        'audio/',
        'application/zip',
        'application/gzip',
        'application/x-bzip2',
        'application/x-compressed'
      ];

      if (skipTypes.some(type => contentType.startsWith(type))) {
        return false;
      }
    }

    // Use compression default filter for everything else
    return compression.filter(req, res);
  },

  // Custom compression options
  windowBits: 15,
  memLevel: 8
});

// Enhanced body parsing configuration
export const createBodyParsingMiddleware = () => {
  const express = require('express');

  return [
    // JSON body parser with size limits and custom error handling
    express.json({
      limit: '10mb', // Maximum request body size
      verify: (req: Request, res: Response, buf: Buffer, encoding: string) => {
        // Store raw body for signature verification if needed
        (req as any).rawBody = buf;
      }
    }),

    // URL-encoded body parser
    express.urlencoded({
      extended: true,
      limit: '10mb',
      parameterLimit: 100 // Limit number of parameters
    }),

    // Raw body parser for webhooks
    express.raw({
      limit: '10mb',
      type: ['application/octet-stream', 'text/plain']
    }),

    // Text body parser
    express.text({
      limit: '1mb',
      type: 'text/*'
    }),

    // Cookie parser middleware
    cookieParser(process.env.COOKIE_SECRET || 'your-cookie-secret')
  ];
};

// Request sanitization middleware
export const requestSanitizationMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Remove null bytes from all string inputs
  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return obj.replace(/\0/g, '');
    }

    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }

    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeObject(value);
      }
      return sanitized;
    }

    return obj;
  };

  // Sanitize request body, query, and params
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
};

// Security logging configuration
const createSecurityLogger = () => {
  return winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    defaultMeta: { service: 'postiz-middleware' },
    transports: [
      new winston.transports.File({
        filename: 'logs/security.log',
        level: 'warn',
        maxsize: 5242880, // 5MB
        maxFiles: 5
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
        maxsize: 5242880, // 5MB
        maxFiles: 5
      })
    ]
  });
};

// Enhanced Morgan logging with security considerations
export const createSecurityLogging = () => {
  const logger = createSecurityLogger();

  // Custom token for request ID
  morgan.token('id', (req: Request) => req.requestId || 'unknown');

  // Custom token for user ID
  morgan.token('user', (req: Request) => req.user?.id || 'anonymous');

  // Custom token for response time with color coding
  morgan.token('response-time-colored', (req: Request, res: Response) => {
    const responseTime = parseFloat(morgan['response-time'](req, res) || '0');
    if (responseTime > 1000) return `🔴 ${responseTime}ms`;
    if (responseTime > 500) return `🟡 ${responseTime}ms`;
    return `🟢 ${responseTime}ms`;
  });

  // Production logging format (structured)
  const productionFormat = morgan((tokens, req: Request, res: Response) => {
    const logData = {
      requestId: tokens.id(req, res),
      method: tokens.method(req, res),
      url: tokens.url(req, res),
      status: parseInt(tokens.status(req, res) || '0'),
      contentLength: tokens.res(req, res, 'content-length'),
      responseTime: parseFloat(tokens['response-time'](req, res) || '0'),
      userAgent: tokens['user-agent'](req, res),
      ip: tokens['remote-addr'](req, res),
      userId: req.user?.id || null,
      timestamp: new Date().toISOString()
    };

    // Log to Winston
    if (logData.status >= 400) {
      logger.error('HTTP Error', logData);
    } else {
      logger.info('HTTP Request', logData);
    }

    return JSON.stringify(logData);
  });

  // Development logging format (human readable)
  const developmentFormat = morgan(':id :method :url :status :response-time-colored - :user-agent');

  // Security-focused logging format
  const securityFormat = morgan((tokens, req: Request, res: Response) => {
    const status = parseInt(tokens.status(req, res) || '0');

    // Only log security-relevant requests
    if (
      status >= 400 || // Error responses
      req.path.includes('/auth/') || // Authentication endpoints
      req.path.includes('/admin/') || // Admin endpoints
      req.method === 'DELETE' || // Deletion operations
      req.headers.authorization // Authenticated requests
    ) {
      const logData = {
        requestId: tokens.id(req, res),
        method: tokens.method(req, res),
        url: tokens.url(req, res),
        status,
        ip: tokens['remote-addr'](req, res),
        userAgent: tokens['user-agent'](req, res),
        userId: req.user?.id || null,
        timestamp: new Date().toISOString(),
        securityRelevant: true
      };

      logger.warn('Security Event', logData);
      return JSON.stringify(logData);
    }

    return null; // Skip logging for non-security-relevant requests
  }, {
    skip: (req: Request, res: Response) => {
      // Skip if the log entry would be null
      const status = res.statusCode;
      return !(
        status >= 400 ||
        req.path.includes('/auth/') ||
        req.path.includes('/admin/') ||
        req.method === 'DELETE' ||
        req.headers.authorization
      );
    }
  });

  return {
    production: productionFormat,
    development: developmentFormat,
    security: securityFormat
  };
};

// Request size limiting middleware
export const requestSizeLimitMiddleware = (maxSize: string = '10mb') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    const maxSizeBytes = parseSize(maxSize);

    if (contentLength > maxSizeBytes) {
      return res.status(413).json({
        success: false,
        message: 'Request entity too large',
        maxSize,
        receivedSize: contentLength,
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
};

// Helper function to parse size strings like '10mb', '500kb'
const parseSize = (size: string): number => {
  const units: { [key: string]: number } = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024
  };

  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/);
  if (!match) return 0;

  const value = parseFloat(match[1]);
  const unit = match[2] || 'b';

  return Math.floor(value * units[unit]);
};

// Timeout middleware
export const timeoutMiddleware = (timeoutMs: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          message: 'Request timeout',
          timeout: timeoutMs,
          timestamp: new Date().toISOString()
        });
      }
    }, timeoutMs);

    // Clear timeout when response is sent
    const originalEnd = res.end;
    res.end = function (chunk?: any, encoding?: any) {
      clearTimeout(timeout);
      originalEnd.call(this, chunk, encoding);
    };

    next();
  };
};