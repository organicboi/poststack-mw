import { Router } from 'express';
import { authenticateUser } from '../../auth/auth.middleware';
import billingRoutes from './billing.controller';
import { BillingService } from './billing.service';

// Create a new router
const billingController = Router();

// Apply authentication middleware to all billing routes
billingController.use(authenticateUser);

// Mount the billing routes
billingController.use('/', billingRoutes);

export { billingController, BillingService };

export default billingController;
