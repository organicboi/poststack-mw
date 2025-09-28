import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { config } from '@/config/environment';
import { errorHandler, requestIdMiddleware } from '@/middleware/errorHandler';
import { notFoundHandler } from '@/middleware/notFoundHandler';
import { requestLogger } from '@/middleware/requestLogger';
import { setupRoutes } from '@/routes';

export async function createApp(): Promise<Application> {
  const app = express();

  // Request ID middleware (must be first)
  app.use(requestIdMiddleware);

  // Security middleware
  app.use(helmet());
  app.use(cors(config.cors));

  // Rate limiting
  const limiter = rateLimit(config.rateLimit);
  app.use(limiter);

  // Compression
  app.use(compression());

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Logging
  if (!config.isTest) {
    app.use(morgan(config.log.format));
  }
  app.use(requestLogger);

  // Health check
  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
    });
  });

  // Routes
  await setupRoutes(app);

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}