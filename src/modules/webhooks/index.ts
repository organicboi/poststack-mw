import { Router } from 'express';
import webhooksController from './webhooks.controller';

const router = Router();

// Webhook routes
router.use('/webhooks', webhooksController);

export default router;
export { WebhooksService } from './webhooks.service';
export * from './webhooks.types';