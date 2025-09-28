import { Application } from 'express';
import { asyncHandler } from '@/middleware/errorHandler';
import { ValidationError, NotFoundError } from '@/utils/errors';

export async function setupRoutes(app: Application): Promise<void> {
  // Example route demonstrating error handling
  app.get('/api/example/error', asyncHandler(async (req, res) => {
    throw new Error('This is a test error');
  }));

  // Example route demonstrating validation error
  app.get('/api/example/validation-error', asyncHandler(async (req, res) => {
    throw new ValidationError('Invalid input provided', [
      { field: 'email', value: 'invalid-email', message: 'Invalid email format' },
    ]);
  }));

  // Example route demonstrating not found error
  app.get('/api/example/not-found', asyncHandler(async (req, res) => {
    throw new NotFoundError('User', '123');
  }));

  // Example successful route
  app.get('/api/example/success', asyncHandler(async (req, res) => {
    res.json({
      success: true,
      message: 'Request processed successfully',
      requestId: req.requestId,
    });
  }));

  // API routes will be added here as the application grows
  // Example structure:
  // app.use('/api/auth', authRoutes);
  // app.use('/api/users', userRoutes);
  // app.use('/api/data', dataRoutes);
}