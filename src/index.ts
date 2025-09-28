import 'reflect-metadata';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './common/config';
import { errorHandler, requestIdMiddleware, setupErrorHandling } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { requestLogger } from './middleware/requestLogger';

// Import route controllers
import authController from './modules/auth';
import workspaceController from './modules/workspace';
import proxyController from './modules/proxy';
import { backendProxy } from './modules/proxy/backend.proxy';

// Setup global error handling
setupErrorHandling();

// Create Express app
const app = express();

// Request ID middleware (must be first)
app.use(requestIdMiddleware);

// Apply security middleware
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

// Configure CORS
app.use(
  cors({
    origin: config.cors.origin,
    credentials: config.cors.credentials,
  })
);

// Parse request body
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Request logging
app.use(requestLogger);

// Health check endpoint
app.get('/health', (_, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.server.environment,
  });
});

// Apply API routes
app.use('/auth', authController);
app.use('/workspaces', workspaceController);

// Define specific calendar API routes before general proxy routes
// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Calendar controller test route works!' });
});

// Calendar API routes with service key authentication
app.get('/api/postiz/posts', (req, res) => {
  console.log('Processing calendar posts request');
  return backendProxy.proxyRequestWithServiceKey(req, res);
});

app.get('/api/auth/session', (req, res) => {
  console.log('Processing auth session request');
  return backendProxy.proxyRequestWithServiceKey(req, res);
});

app.get('/api/postiz/integrations/list', (req, res) => {
  console.log('Processing integrations list request');
  return backendProxy.proxyRequestWithServiceKey(req, res);
});

app.get('/api/postiz/posts/tags', (req, res) => {
  console.log('Processing tags list request');
  return backendProxy.proxyRequestWithServiceKey(req, res);
});

// All other API routes (require authentication)
app.use('/api', proxyController);

// Apply error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const PORT = config.server.port || 5000;
app.listen(PORT, () => {
  console.log(`
  ┌─────────────────────────────────────────────────┐
  │                                                 │
  │   Middleware Server running in ${config.server.environment} mode          │
  │   http://localhost:${PORT}                          │
  │                                                 │
  └─────────────────────────────────────────────────┘
  `);

  console.log(`🔗 Backend URL: ${config.backend.url}`);
  console.log(`🌐 Frontend URL: ${config.frontend.url}`);

  if (config.serviceRole.key) {
    console.log(
      `🔑 SERVICE_ROLE_KEY loaded: ${config.serviceRole.key.substring(
        0,
        10
      )}...`
    );
  } else {
    console.warn('⚠️ SERVICE_ROLE_KEY is NOT set in middleware .env');
  }
});
