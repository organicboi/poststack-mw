# Comprehensive Security Middleware Documentation

## Overview

This security middleware provides enterprise-grade protection for Express.js applications including rate limiting, security headers, input sanitization, IP filtering, comprehensive logging, and more.

## Features

- **🚦 Advanced Rate Limiting** - Different limits for auth, API, and general endpoints with Redis support
- **🛡️ Security Headers** - Helmet integration with CSP, CORS, and protection against common attacks
- **🔍 Input Sanitization** - SQL injection, XSS, and malicious pattern detection
- **📍 IP Filtering** - Whitelist/blacklist support with CIDR ranges
- **📊 Security Logging** - Comprehensive event logging with metrics and alerting
- **⚡ Performance** - Compression, body parsing, and request optimization
- **🎯 Type Safety** - Full TypeScript support with comprehensive typing

## Quick Start

### Basic Setup

```typescript
import express from 'express';
import { setupCompleteSecurity } from './examples/security-configuration';

const app = express();

// Apply all security middleware
const { securityLogger, config } = setupCompleteSecurity(app);

// Your routes here
app.get('/', (req, res) => {
  res.json({ message: 'Secure app running!' });
});

app.listen(3000, () => {
  console.log('Secure server running on port 3000');
});
```

### Environment-Specific Configuration

```typescript
import { createSecureApp, developmentConfig, productionConfig } from './examples/security-configuration';

// Development
const { app: devApp } = createSecureApp(developmentConfig);

// Production
const { app: prodApp } = createSecureApp(productionConfig);
```

## Rate Limiting

### Available Rate Limiters

#### 1. General Rate Limiting
```typescript
import { generalRateLimit } from './common/middleware/rate-limiting';

app.use(generalRateLimit); // 1000 requests per 15 minutes
```

#### 2. Authentication Rate Limiting
```typescript
import { authRateLimit } from './common/middleware/rate-limiting';

app.use('/auth', authRateLimit); // 50 requests per 15 minutes
```

#### 3. Sensitive Operations
```typescript
import { sensitiveRateLimit } from './common/middleware/rate-limiting';

app.use('/auth/reset-password', sensitiveRateLimit); // 5 requests per hour
```

#### 4. API Rate Limiting
```typescript
import { apiRateLimit } from './common/middleware/rate-limiting';

app.use('/api', apiRateLimit); // 2000 for authenticated, 500 for anonymous
```

#### 5. Upload Rate Limiting
```typescript
import { uploadRateLimit } from './common/middleware/rate-limiting';

app.use('/upload', uploadRateLimit); // 100 uploads per hour
```

### Custom Rate Limiting

```typescript
import { createCustomRateLimit } from './common/middleware/rate-limiting';

const customLimit = createCustomRateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Custom rate limit exceeded',
  keyGenerator: (req) => `${req.ip}:${req.user?.id || 'anonymous'}`
});

app.use('/api/search', customLimit);
```

### Redis Support for Distributed Environments

```typescript
import Redis from 'redis';
import { createRedisRateLimit } from './common/middleware/rate-limiting';

const redisClient = Redis.createClient();

const distributedRateLimit = createRedisRateLimit(redisClient, {
  windowMs: 15 * 60 * 1000,
  max: 1000
});

app.use(distributedRateLimit);
```

## Security Headers

### Helmet Configuration

```typescript
import { createSecurityMiddleware } from './common/middleware/security-headers';

// Auto-configured based on environment
const securityMiddleware = createSecurityMiddleware();
securityMiddleware.forEach(middleware => app.use(middleware));
```

### Custom CSP Configuration

```typescript
import { createHelmetMiddleware } from './common/middleware/security-headers';

const helmetMiddleware = createHelmetMiddleware({
  environment: 'production',
  cspDirectives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    imgSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'", 'https://api.example.com']
  }
});

app.use(helmetMiddleware);
```

### CORS Configuration

```typescript
import { createCorsMiddleware } from './common/middleware/security-headers';

const corsMiddleware = createCorsMiddleware([
  'https://yourdomain.com',
  'https://app.yourdomain.com'
]);

app.use(corsMiddleware);
```

## Input Sanitization & Security Utils

### Automatic Input Sanitization

```typescript
import { inputSanitizationMiddleware } from './common/utils/security-utils';

app.use(inputSanitizationMiddleware({
  enableInputSanitization: true,
  maxStringLength: 1000
}));
```

### Manual Sanitization

```typescript
import { InputSanitizer } from './common/utils/security-utils';

// Sanitize string
const clean = InputSanitizer.sanitizeString(userInput, 500);

// Sanitize object
const cleanData = InputSanitizer.sanitizeObject(req.body);

// Check for malicious patterns
if (InputSanitizer.containsMaliciousPatterns(userInput)) {
  // Handle malicious input
}
```

### IP Filtering

```typescript
import { ipFilteringMiddleware, IPUtils } from './common/utils/security-utils';

// Block specific IPs
app.use(ipFilteringMiddleware({
  enableIPFiltering: true,
  blockedIPs: [
    '192.168.1.100',
    '10.0.0.0/8', // CIDR range
    '172.16.0.0/12'
  ]
}));

// Whitelist only specific IPs
app.use(ipFilteringMiddleware({
  enableIPFiltering: true,
  allowedIPs: [
    '203.0.113.0/24',
    '198.51.100.0/24'
  ]
}));
```

## Security Event Logging

### Automatic Security Logging

```typescript
import { securityLogger, securityEventMiddleware } from './common/logging/security-logger';

// Add security event middleware
app.use(securityEventMiddleware);

// Access the logger anywhere in your app
securityLogger.logAuthFailure(req, 'user@example.com', 'Invalid password');
```

### Manual Security Event Logging

```typescript
import { securityLogger, SecurityEventType, SecuritySeverity } from './common/logging/security-logger';

// Log authentication events
securityLogger.logAuthSuccess(req, 'user123', 'user@example.com');
securityLogger.logAuthFailure(req, 'user@example.com', 'Account locked');

// Log security violations
securityLogger.logMaliciousInput(req, 'body', 'SQL injection attempt');
securityLogger.logRateLimitExceeded(req, 'auth');
securityLogger.logBruteForceAttempt(req, 'user@example.com', 15);

// Log custom security events
securityLogger.logEvent({
  type: SecurityEventType.SUSPICIOUS_ACTIVITY,
  severity: SecuritySeverity.HIGH,
  message: 'Unusual API access pattern detected',
  ip: req.ip,
  userId: req.user?.id,
  details: { pattern: 'rapid_endpoint_scanning' }
});
```

### Security Analytics

```typescript
// Get security metrics
const metrics = securityLogger.getSecurityMetrics({
  start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
  end: new Date()
});

console.log('Security Overview:', {
  totalEvents: metrics.totalEvents,
  highRiskEvents: metrics.eventsBySeverity.high + metrics.eventsBySeverity.critical,
  topAttackerIPs: metrics.topIPs.slice(0, 5)
});

// Get recent high-risk events
const highRiskEvents = securityLogger.getHighRiskEvents(50);

// Get events by type
const authFailures = securityLogger.getEventsByType(SecurityEventType.AUTHENTICATION_FAILURE);
```

## Performance & Additional Security

### Request Tracking

```typescript
import { requestIdMiddleware, requestTimingMiddleware } from './common/middleware/additional-security';

app.use(requestIdMiddleware); // Adds unique request ID
app.use(requestTimingMiddleware); // Tracks response time
```

### Compression & Body Parsing

```typescript
import { compressionMiddleware, createBodyParsingMiddleware } from './common/middleware/additional-security';

app.use(compressionMiddleware); // Smart compression

// Body parsing with security limits
const bodyParsers = createBodyParsingMiddleware();
bodyParsers.forEach(parser => app.use(parser));
```

### Request Size & Timeout Control

```typescript
import { requestSizeLimitMiddleware, timeoutMiddleware } from './common/middleware/additional-security';

app.use(requestSizeLimitMiddleware('10mb')); // Max request size
app.use(timeoutMiddleware(30000)); // 30 second timeout
```

## Advanced Usage

### Custom Security Configuration

```typescript
import { AppSecurityConfig } from './examples/security-configuration';

const customConfig: AppSecurityConfig = {
  rateLimit: {
    enableGeneral: true,
    enableAuth: true,
    enableSensitive: true,
    enableAPI: true,
    enableUpload: true,
    customLimits: [
      { path: '/api/heavy-operation', windowMs: 60000, max: 10 },
      { path: '/api/webhook', windowMs: 60000, max: 1000 }
    ]
  },
  security: {
    enableIPFiltering: true,
    enableInputSanitization: true,
    blockedIPs: ['192.168.1.0/24'],
    allowedIPs: ['203.0.113.0/24'],
    maxStringLength: 500
  },
  logging: {
    enableSecurity: true,
    enableMorgan: true,
    logLevel: 'production'
  },
  performance: {
    enableCompression: true,
    enableTimeout: true,
    timeoutMs: 45000,
    maxRequestSize: '15mb'
  }
};
```

### Route-Specific Security

```typescript
// Apply different security levels to different routes
app.use('/public', generalRateLimit);
app.use('/auth', authRateLimit);
app.use('/admin',
  sensitiveRateLimit,
  ipFilteringMiddleware({
    enableIPFiltering: true,
    allowedIPs: ['203.0.113.0/24'] // Admin IPs only
  })
);
```

### Security Middleware Chain

```typescript
// Custom security chain for sensitive endpoints
const sensitiveSecurityChain = [
  sensitiveRateLimit,
  ipFilteringMiddleware({
    enableIPFiltering: true,
    allowedIPs: ['203.0.113.0/24']
  }),
  inputSanitizationMiddleware({
    enableInputSanitization: true,
    maxStringLength: 200
  }),
  (req, res, next) => {
    // Custom security logic
    securityLogger.logEvent({
      type: SecurityEventType.SENSITIVE_OPERATION,
      severity: SecuritySeverity.HIGH,
      message: 'Sensitive endpoint accessed',
      ip: req.ip,
      userId: req.user?.id,
      path: req.path
    });
    next();
  }
];

app.use('/admin/sensitive', ...sensitiveSecurityChain);
```

## Security Monitoring & Alerting

### Real-time Security Monitoring

```typescript
// Monitor security events in real-time
setInterval(() => {
  const recentEvents = securityLogger.getRecentEvents(100);
  const criticalEvents = recentEvents.filter(e => e.severity === 'critical');

  if (criticalEvents.length > 0) {
    // Send alert to monitoring system
    console.error('CRITICAL SECURITY ALERT:', criticalEvents);
  }
}, 60000); // Check every minute
```

### Security Health Check

```typescript
app.get('/security/health', (req, res) => {
  const metrics = securityLogger.getSecurityMetrics({
    start: new Date(Date.now() - 60 * 60 * 1000), // Last hour
    end: new Date()
  });

  const health = {
    status: 'ok',
    security: {
      events_last_hour: metrics.totalEvents,
      critical_events: metrics.eventsBySeverity.critical || 0,
      high_events: metrics.eventsBySeverity.high || 0,
      rate_limit_violations: metrics.eventsByType.rate_limit_exceeded || 0,
      auth_failures: metrics.eventsByType.auth_failure || 0
    },
    timestamp: new Date().toISOString()
  };

  // Alert if too many security events
  if (health.security.critical_events > 10 || health.security.high_events > 50) {
    health.status = 'warning';
  }

  res.json(health);
});
```

## Environment-Specific Configurations

### Development

```typescript
const { app } = createSecureApp({
  rateLimit: { enableGeneral: false }, // Easier development
  security: { enableIPFiltering: false },
  logging: { logLevel: 'development' },
  performance: { enableCompression: false }
});
```

### Production

```typescript
const { app } = createSecureApp({
  rateLimit: { enableGeneral: true, enableAuth: true },
  security: {
    enableIPFiltering: true,
    blockedIPs: ['known.bad.ip.range/24']
  },
  logging: { logLevel: 'production' },
  performance: { enableCompression: true }
});
```

### Testing

```typescript
const { app } = createSecureApp({
  rateLimit: { enableGeneral: false }, // No rate limiting in tests
  security: { enableInputSanitization: false },
  logging: { enableSecurity: false },
  performance: { enableTimeout: false }
});
```

## File Security

### File Upload Security

```typescript
import { FileSecurityUtils } from './common/utils/security-utils';

app.post('/upload', upload.single('file'), (req, res) => {
  const file = req.file;

  // Validate file type by content
  const detectedType = FileSecurityUtils.getFileTypeFromContent(file.buffer);

  if (!FileSecurityUtils.isAllowedFileType(file.originalname, ['jpg', 'png', 'pdf'])) {
    return res.status(400).json({ error: 'File type not allowed' });
  }

  // Generate secure filename
  const secureFilename = FileSecurityUtils.generateSecureFilename(file.originalname);

  // Save file with secure name
  res.json({ filename: secureFilename });
});
```

## Best Practices

1. **Layer Security** - Use multiple security layers (rate limiting + input validation + logging)
2. **Monitor Actively** - Set up real-time monitoring and alerting
3. **Update Regularly** - Keep security configurations updated based on threat landscape
4. **Test Security** - Include security testing in your CI/CD pipeline
5. **Log Everything** - Comprehensive logging helps with incident response
6. **Environment-Specific** - Use different configurations for different environments
7. **Regular Review** - Periodically review security logs and adjust configurations

## Security Checklist

- ✅ Rate limiting implemented for all endpoint types
- ✅ Security headers configured with Helmet
- ✅ CORS properly configured for your domains
- ✅ Input sanitization enabled
- ✅ Security event logging active
- ✅ Request/response monitoring in place
- ✅ File upload security implemented
- ✅ IP filtering configured if needed
- ✅ Error handling doesn't leak sensitive information
- ✅ Regular security monitoring and alerting set up

This comprehensive security middleware provides enterprise-level protection while maintaining flexibility and performance. Adjust configurations based on your specific security requirements and threat model.