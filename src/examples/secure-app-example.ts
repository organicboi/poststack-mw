import express from 'express';
import { config } from '../common/config';

// Import all security components
import {
  setupCompleteSecurity,
  productionConfig,
  developmentConfig,
  testingConfig
} from './security-configuration';

import { validateBody, validateQuery, validateParams } from '../common/middleware/validation';
import { RegisterDto, LoginDto } from '../modules/auth/auth.dto';
import { CreateWorkspaceDto, WorkspaceParamsDto } from '../modules/workspace/workspace.dto';
import { securityLogger } from '../common/logging/security-logger';

// Create Express application
const app = express();

// Determine configuration based on environment
const getEnvironmentConfig = () => {
  switch (config.server.environment) {
    case 'production':
      return productionConfig;
    case 'test':
      return testingConfig;
    case 'development':
    default:
      return developmentConfig;
  }
};

// Setup complete security middleware
const { securityLogger: logger, config: securityConfig } = setupCompleteSecurity(
  app,
  getEnvironmentConfig()
);

// Example: Secure authentication routes
app.post('/auth/register',
  validateBody(RegisterDto),
  async (req, res, next) => {
    try {
      const { email, password, fullName } = req.validatedBody!;

      // Your registration logic here
      console.log('Registering user:', { email, fullName });

      // Log successful registration
      securityLogger.logEvent({
        type: 'auth_success' as any,
        severity: 'low' as any,
        message: 'User registered successfully',
        requestId: req.requestId,
        email,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        path: req.path,
        method: req.method
      });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: { email, fullName }
      });
    } catch (error) {
      next(error);
    }
  }
);

app.post('/auth/login',
  validateBody(LoginDto),
  async (req, res, next) => {
    try {
      const { email, password } = req.validatedBody!;

      // Simulate authentication logic
      const isValidCredentials = email === 'user@example.com' && password === 'SecurePassword123!';

      if (!isValidCredentials) {
        // Log authentication failure
        securityLogger.logAuthFailure(req, email, 'Invalid credentials');

        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Log successful authentication
      securityLogger.logAuthSuccess(req, 'user123', email);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          token: 'jwt-token-here',
          user: { id: 'user123', email }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Example: Secure workspace routes
app.post('/api/workspaces',
  validateBody(CreateWorkspaceDto),
  async (req, res, next) => {
    try {
      const { name, settings } = req.validatedBody!;

      // Your workspace creation logic here
      console.log('Creating workspace:', { name });

      res.status(201).json({
        success: true,
        message: 'Workspace created successfully',
        data: {
          id: 'workspace123',
          name,
          settings
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

app.get('/api/workspaces/:workspaceId',
  validateParams(WorkspaceParamsDto),
  async (req, res, next) => {
    try {
      const { workspaceId } = req.validatedParams!;

      // Your workspace retrieval logic here
      console.log('Fetching workspace:', workspaceId);

      res.json({
        success: true,
        data: {
          id: workspaceId,
          name: 'Example Workspace',
          created_at: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Example: Admin routes with additional security
app.use('/admin', (req, res, next) => {
  // Simulate admin authentication check
  const adminToken = req.headers.authorization;

  if (!adminToken || adminToken !== 'Bearer admin-token') {
    securityLogger.logEvent({
      type: 'authz_failure' as any,
      severity: 'high' as any,
      message: 'Unauthorized admin access attempt',
      requestId: req.requestId,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      path: req.path,
      method: req.method,
      details: { provided_token: adminToken }
    });

    return res.status(403).json({
      success: false,
      message: 'Admin access denied'
    });
  }

  // Set admin user for logging
  req.user = { id: 'admin', email: 'admin@example.com', role: 'admin' };
  next();
});

app.get('/admin/dashboard', (req, res) => {
  res.json({
    success: true,
    message: 'Admin dashboard',
    data: {
      totalUsers: 150,
      activeWorkspaces: 75,
      securityEvents: securityLogger.getSecurityMetrics().totalEvents
    }
  });
});

// Security monitoring endpoints
app.get('/security/metrics', (req, res) => {
  const metrics = securityLogger.getSecurityMetrics({
    start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
    end: new Date()
  });

  res.json({
    success: true,
    data: metrics
  });
});

app.get('/security/events/recent', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const events = securityLogger.getRecentEvents(limit);

  res.json({
    success: true,
    data: events
  });
});

app.get('/security/events/high-risk', (req, res) => {
  const events = securityLogger.getHighRiskEvents();

  res.json({
    success: true,
    data: events
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  const securityMetrics = securityLogger.getSecurityMetrics({
    start: new Date(Date.now() - 60 * 60 * 1000), // Last hour
    end: new Date()
  });

  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.server.environment,
    security: {
      eventsLastHour: securityMetrics.totalEvents,
      criticalEvents: securityMetrics.eventsBySeverity.critical || 0,
      highEvents: securityMetrics.eventsBySeverity.high || 0,
      authFailures: securityMetrics.eventsByType.auth_failure || 0,
      rateLimitViolations: securityMetrics.eventsByType.rate_limit_exceeded || 0
    },
    performance: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      pid: process.pid
    }
  };

  // Determine health status based on security metrics
  if (health.security.criticalEvents > 5 || health.security.authFailures > 20) {
    health.status = 'degraded';
  }

  res.json(health);
});

// Example: File upload with security
app.post('/upload',
  // File upload would be handled by multer or similar
  (req, res) => {
    // Simulate file upload security check
    const fileType = req.headers['content-type'];

    if (!fileType || !['image/jpeg', 'image/png', 'application/pdf'].includes(fileType)) {
      securityLogger.logEvent({
        type: 'file_upload_violation' as any,
        severity: 'medium' as any,
        message: `Invalid file type uploaded: ${fileType}`,
        requestId: req.requestId,
        userId: req.user?.id,
        ip: req.ip,
        path: req.path,
        details: { contentType: fileType }
      });

      return res.status(400).json({
        success: false,
        message: 'Invalid file type'
      });
    }

    res.json({
      success: true,
      message: 'File uploaded successfully',
      data: { filename: 'secure-filename.jpg' }
    });
  }
);

// Example: Webhook endpoint with signature verification
app.post('/webhook',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const signature = req.headers['x-signature'] as string;
    const expectedSignature = 'webhook-signature'; // In real app, verify HMAC signature

    if (signature !== expectedSignature) {
      securityLogger.logEvent({
        type: 'suspicious_activity' as any,
        severity: 'high' as any,
        message: 'Invalid webhook signature',
        requestId: req.requestId,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        path: req.path,
        details: { providedSignature: signature }
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid signature'
      });
    }

    res.json({ success: true, message: 'Webhook processed' });
  }
);

// Start the server
const PORT = config.server.port || 3002;

app.listen(PORT, () => {
  console.log(`🚀 Secure server running on port ${PORT}`);
  console.log(`📊 Environment: ${config.server.environment}`);
  console.log(`🔒 Security configuration: ${JSON.stringify(securityConfig, null, 2)}`);
  console.log(`📝 Security logging enabled: ${securityConfig.logging.enableSecurity}`);

  // Log server startup
  securityLogger.logEvent({
    type: 'suspicious_activity' as any, // In real app, you might have a SERVER_START event type
    severity: 'low' as any,
    message: 'Server started successfully',
    ip: 'localhost',
    details: {
      port: PORT,
      environment: config.server.environment,
      securityConfig: securityConfig
    }
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received, shutting down gracefully');

  securityLogger.logEvent({
    type: 'suspicious_activity' as any, // In real app, SERVER_SHUTDOWN event type
    severity: 'low' as any,
    message: 'Server shutting down',
    ip: 'localhost',
    details: { reason: 'SIGTERM' }
  });

  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🔄 SIGINT received, shutting down gracefully');

  securityLogger.logEvent({
    type: 'suspicious_activity' as any,
    severity: 'low' as any,
    message: 'Server shutting down',
    ip: 'localhost',
    details: { reason: 'SIGINT' }
  });

  process.exit(0);
});

export { app };