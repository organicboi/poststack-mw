import { Router, Response, Request } from 'express';
import { BillingService } from './billing.service';
import { asyncHandler } from '../../utils/async-handler';

// The auth middleware adds user to request
interface AuthenticatedRequest extends Request {
  user?: any;
}

const router = Router();
const billingService = new BillingService();

// Get available plans
router.get(
  '/plans',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const plans = await billingService.getAvailablePlans(req.user.id);

    return res.json({
      success: true,
      data: plans,
    });
  })
);

// Get public plan information (no auth required)
router.get(
  '/public-plans',
  asyncHandler(async (_req, res: Response) => {
    const plans = await billingService.getAvailablePlans();

    return res.json({
      success: true,
      data: plans,
    });
  })
);

// Get current subscription
router.get(
  '/subscription',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const billingInfo = await billingService.getBillingInfo(req.user.id);

    return res.json({
      success: true,
      data: {
        currentPlan: billingInfo.current_plan,
        status: billingInfo.subscription_status || 'inactive',
        currentPeriodEnd: billingInfo.current_period_end,
        cancelAtPeriodEnd: billingInfo.cancel_at_period_end,
      },
    });
  })
);

// Get usage statistics
router.get(
  '/usage',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const planLimits = await billingService.getPlanLimits(req.user.id);

    return res.json({
      success: true,
      data: {
        limits: {
          maxPosts: planLimits.maxPosts,
          maxWorkspaces: planLimits.maxWorkspaces,
          maxSocialAccounts: planLimits.maxSocialAccounts,
          maxWorkspaceMembers: planLimits.maxWorkspaceMembers,
        },
        usage: planLimits.usage,
      },
    });
  })
);

// Check if user can create post
router.get(
  '/can-create-post',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const result = await billingService.canCreatePost(req.user.id);

    return res.json({
      success: true,
      data: result,
    });
  })
);

// Check if user can create workspace
router.get(
  '/can-create-workspace',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const result = await billingService.canCreateWorkspace(req.user.id);

    return res.json({
      success: true,
      data: result,
    });
  })
);

// Update plan with payment integration
router.post(
  '/update-plan',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { planId, billingInterval, paymentMethodId } = req.body;

    if (
      !planId ||
      typeof planId !== 'string' ||
      !['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'].includes(planId)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Valid planId is required',
      });
    }

    if (planId !== 'FREE' && !billingInterval) {
      return res.status(400).json({
        success: false,
        message: 'Billing interval is required for paid plans',
      });
    }

    try {
      const updatedBillingInfo = await billingService.updatePlan(
        req.user.id,
        planId as 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE',
        billingInterval as 'monthly' | 'yearly',
        paymentMethodId
      );

      return res.json({
        success: true,
        data: updatedBillingInfo,
        message: `Successfully updated to ${planId} plan`,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to update plan',
      });
    }
  })
);

// Cancel subscription
router.post(
  '/cancel-subscription',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { atPeriodEnd = true } = req.body;

    try {
      const updatedBillingInfo = await billingService.cancelSubscription(
        req.user.id,
        atPeriodEnd
      );

      return res.json({
        success: true,
        data: updatedBillingInfo,
        message: atPeriodEnd
          ? 'Subscription will be cancelled at the end of the current billing period'
          : 'Subscription has been cancelled immediately',
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to cancel subscription',
      });
    }
  })
);

// Get payment methods
router.get(
  '/payment-methods',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    try {
      const paymentMethods = await billingService.listPaymentMethods(
        req.user.id
      );

      return res.json({
        success: true,
        data: paymentMethods,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to retrieve payment methods',
      });
    }
  })
);

// Add payment method
router.post(
  '/payment-methods',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { token, type, setAsDefault } = req.body;

    if (!token || !type) {
      return res.status(400).json({
        success: false,
        message: 'Payment token and type are required',
      });
    }

    try {
      const paymentMethod = await billingService.addPaymentMethod(req.user.id, {
        token,
        type,
        setAsDefault,
      });

      return res.json({
        success: true,
        data: paymentMethod,
        message: 'Payment method added successfully',
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to add payment method',
      });
    }
  })
);

// Delete payment method
router.delete(
  '/payment-methods/:id',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const paymentMethodId = req.params.id;

    try {
      const success = await billingService.deletePaymentMethod(
        req.user.id,
        paymentMethodId
      );

      return res.json({
        success: true,
        message: 'Payment method deleted successfully',
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to delete payment method',
      });
    }
  })
);

// Create billing portal session
router.post(
  '/portal',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { returnUrl } = req.body;

    if (!returnUrl) {
      return res.status(400).json({
        success: false,
        message: 'Return URL is required',
      });
    }

    try {
      const session = await billingService.createBillingPortalSession(
        req.user.id,
        returnUrl
      );

      return res.json({
        success: true,
        data: session,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to create billing portal session',
      });
    }
  })
);

export { router as billingRoutes };
export default router;
