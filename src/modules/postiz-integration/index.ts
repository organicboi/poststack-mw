import { Router } from 'express';
import postizController from './postiz-integration.controller';

const router = Router();

// Postiz integration routes
router.use('/postiz', postizController);

export default router;
export { PostizIntegrationService } from './postiz-integration.service';
export * from './postiz-integration.types';