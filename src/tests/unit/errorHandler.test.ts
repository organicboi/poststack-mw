import request from 'supertest';
import express from 'express';
import { errorHandler, requestIdMiddleware } from '../../middleware/errorHandler';
import { notFoundHandler } from '../../middleware/notFoundHandler';
import {
  ValidationError,
  NotFoundError,
  AuthenticationError,
  InternalServerError,
} from '../../utils/errors';
import { ErrorCode } from '../../types/errors';

describe('Error Handler Middleware', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(requestIdMiddleware);
    app.use(express.json());

    // Test routes
    app.get('/api/example/validation-error', () => {
      throw new ValidationError('Invalid input provided', [
        { field: 'email', value: 'invalid-email', message: 'Invalid email format' },
      ]);
    });

    app.get('/api/example/not-found', () => {
      throw new NotFoundError('User', '123');
    });

    app.get('/api/example/error', () => {
      throw new Error('This is a test error');
    });

    app.get('/api/example/success', (req, res) => {
      res.json({
        success: true,
        message: 'Request processed successfully',
        requestId: req.requestId,
      });
    });

    app.use(notFoundHandler);
    app.use(errorHandler);
  });

  describe('Custom Error Handling', () => {
    it('should handle ValidationError correctly', async () => {
      const response = await request(app)
        .get('/api/example/validation-error')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Invalid input provided',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'email',
              message: 'Invalid email format',
            }),
          ]),
        },
      });

      expect(response.body.error.requestId).toBeDefined();
      expect(response.body.error.timestamp).toBeDefined();
      expect(response.body.error.path).toBe('/api/example/validation-error');
    });

    it('should handle NotFoundError correctly', async () => {
      const response = await request(app)
        .get('/api/example/not-found')
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: ErrorCode.RESOURCE_NOT_FOUND,
          message: "User with identifier '123' not found",
        },
      });
    });

    it('should handle generic errors as InternalServerError', async () => {
      const response = await request(app)
        .get('/api/example/error')
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
        },
      });
    });

    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/non-existent-route')
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: ErrorCode.RESOURCE_NOT_FOUND,
          message: "Route with identifier 'GET /api/non-existent-route' not found",
        },
      });
    });
  });

  describe('Request ID Tracking', () => {
    it('should generate request ID when not provided', async () => {
      const response = await request(app)
        .get('/api/example/success')
        .expect(200);

      expect(response.headers['x-request-id']).toBeDefined();
      expect(response.body.requestId).toBeDefined();
    });

    it('should use provided request ID', async () => {
      const customRequestId = 'custom-request-id-123';

      const response = await request(app)
        .get('/api/example/success')
        .set('X-Request-ID', customRequestId)
        .expect(200);

      expect(response.headers['x-request-id']).toBe(customRequestId);
      expect(response.body.requestId).toBe(customRequestId);
    });
  });

  describe('Error Response Format', () => {
    it('should have consistent error response structure', async () => {
      const response = await request(app)
        .get('/api/example/validation-error')
        .expect(400);

      // Check required fields
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('timestamp');
      expect(response.body.error).toHaveProperty('requestId');
      expect(response.body.error).toHaveProperty('path');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta).toHaveProperty('statusCode');
    });
  });
});