import { Router, Request, Response } from 'express';
import { WebhooksService } from './webhooks.service';
import { authenticateUser } from '../../auth/auth.middleware';
import { asyncHandler } from '../../utils/async-handler';
import { WebhookPayload } from './webhooks.types';

const router = Router();
const webhooksService = new WebhooksService();

// Raw body parser middleware for webhook signature verification
const rawBodyMiddleware = (req: Request, res: Response, next: any) => {
  let data = '';
  req.setEncoding('utf8');
  req.on('data', (chunk) => {
    data += chunk;
  });
  req.on('end', () => {
    (req as any).rawBody = data;
    next();
  });
};

// Postiz webhook endpoint (public, no auth required)
router.post('/postiz',
  rawBodyMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const payload: WebhookPayload = req.body;
      const signature = req.headers['x-postiz-signature'] as string;

      console.log('Received Postiz webhook', {
        event: payload.event,
        hasSignature: !!signature
      });

      const result = await webhooksService.handlePostizWebhook(payload, signature);

      if (result.success) {
        console.log('Postiz webhook processed successfully');
        res.json(result);
      } else {
        console.error('Failed to process Postiz webhook:', result.error);
        res.status(400).json(result);
      }

    } catch (error: any) {
      console.error('Failed to process Postiz webhook:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error processing webhook',
        message: error.message
      });
    }
  })
);

// Account webhook endpoint (public, no auth required)
router.post('/accounts',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const payload: WebhookPayload = req.body;

      console.log('Received account webhook', { event: payload.event });

      const result = await webhooksService.handleAccountWebhook(payload);

      if (result.success) {
        console.log('Account webhook processed successfully');
        res.json(result);
      } else {
        console.error('Failed to process account webhook:', result.error);
        res.status(400).json(result);
      }

    } catch (error: any) {
      console.error('Failed to process account webhook:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error processing webhook',
        message: error.message
      });
    }
  })
);

// Webhook health check (public)
router.get('/health', (req: Request, res: Response) => {
  const health = webhooksService.getWebhookHealth();
  res.json({
    success: true,
    data: health
  });
});

// Test webhook endpoint for development (public)
router.post('/test',
  asyncHandler(async (req: Request, res: Response) => {
    console.log('Test webhook received:', req.body);

    res.json({
      success: true,
      message: 'Test webhook received successfully',
      receivedAt: new Date().toISOString(),
      payload: req.body,
    });
  })
);

// Get webhook logs (requires authentication)
router.get('/logs',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;

      const logs = await webhooksService.getWebhookLogs(limit, offset);

      res.json({
        success: true,
        data: {
          logs,
          pagination: {
            limit,
            offset,
            total: logs.length
          }
        }
      });

    } catch (error: any) {
      console.error('Failed to get webhook logs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve webhook logs',
        message: error.message
      });
    }
  })
);

export default router;