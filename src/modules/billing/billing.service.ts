import {
  BillingInfo,
  PlanConfig,
  PlanLimits,
} from '../../types/core-modules.types';
import {
  CreatePaymentMethodDto,
  PaymentMethod,
  SubscriptionRequest,
  SubscriptionResponse,
  BillingPortalSessionResponse,
} from '../../types/payment.types';
import { db } from '../../database/database.service';
import { DodoService } from './dodo.service';
import { config } from '../../common/config';

// Plan configurations
const PLAN_CONFIGS: Record<string, PlanConfig> = {
  FREE: {
    id: 'FREE',
    name: 'Free',
    priceMonthly: 0,
    priceYearly: 0,
    limits: {
      maxPosts: 10,
      maxWorkspaces: 1,
      maxSocialAccounts: 2,
      maxWorkspaceMembers: 2,
    },
    features: [
      'Basic posting',
      '2 social accounts',
      '1 workspace',
      'Basic analytics',
    ],
  },
  STARTER: {
    id: 'STARTER',
    name: 'Starter',
    priceMonthly: 9.99,
    priceYearly: 99.99,
    limits: {
      maxPosts: 100,
      maxWorkspaces: 3,
      maxSocialAccounts: 5,
      maxWorkspaceMembers: 5,
    },
    features: [
      '100 posts/month',
      '5 social accounts',
      '3 workspaces',
      'Enhanced analytics',
      'Email support',
    ],
  },
  PROFESSIONAL: {
    id: 'PROFESSIONAL',
    name: 'Professional',
    priceMonthly: 29.99,
    priceYearly: 299.99,
    limits: {
      maxPosts: 500,
      maxWorkspaces: 10,
      maxSocialAccounts: 15,
      maxWorkspaceMembers: 15,
    },
    features: [
      '500 posts/month',
      '15 social accounts',
      '10 workspaces',
      'Team collaboration',
      'Advanced analytics',
      'Priority support',
      'Custom branding',
    ],
  },
  ENTERPRISE: {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    priceMonthly: 99.99,
    priceYearly: 999.99,
    limits: {
      maxPosts: -1, // Unlimited
      maxWorkspaces: -1,
      maxSocialAccounts: -1,
      maxWorkspaceMembers: -1,
    },
    features: [
      'Unlimited posts',
      'Unlimited accounts',
      'Unlimited workspaces',
      'Priority support',
      'Custom integrations',
      'Dedicated account manager',
      'SLA guarantees',
    ],
  },
};

/**
 * Billing service for managing subscription plans and usage
 */
export class BillingService {
  private dodoService: DodoService;

  constructor() {
    // Initialize Dodo payment service
    this.dodoService = new DodoService();
  }

  /**
   * Get billing information for a user
   */
  async getBillingInfo(userId: string): Promise<BillingInfo> {
    let billingInfo = await db.findBillingInfo(userId);

    if (!billingInfo) {
      // Initialize billing info for existing users
      billingInfo = await db.createBillingInfo({
        user_id: userId,
        current_plan: 'FREE',
        posts_used_this_month: 0,
        workspaces_used: 0,
        social_accounts_used: 0,
        cancel_at_period_end: false,
      });
    }

    return billingInfo;
  }

  /**
   * Get available plans
   */
  async getAvailablePlans(userId?: string): Promise<PlanConfig[]> {
    const plans = Object.values(PLAN_CONFIGS);

    if (userId) {
      const billingInfo = await this.getBillingInfo(userId);
      return plans.map(plan => ({
        ...plan,
        isCurrent: plan.id === billingInfo.current_plan,
      }));
    }

    return plans;
  }

  /**
   * Check if user can create a new post based on their plan limits
   */
  async canCreatePost(
    userId: string
  ): Promise<{ canCreate: boolean; reason?: string }> {
    const billingInfo = await this.getBillingInfo(userId);
    const planConfig =
      PLAN_CONFIGS[billingInfo.current_plan] || PLAN_CONFIGS.FREE;

    if (planConfig.limits.maxPosts === -1) return { canCreate: true };

    const canCreate =
      billingInfo.posts_used_this_month < planConfig.limits.maxPosts;
    return {
      canCreate,
      reason: canCreate
        ? undefined
        : `You have reached your monthly post limit of ${planConfig.limits.maxPosts}. Please upgrade your plan.`,
    };
  }

  /**
   * Check if user can create a new workspace based on their plan limits
   */
  async canCreateWorkspace(
    userId: string
  ): Promise<{ canCreate: boolean; reason?: string }> {
    const billingInfo = await this.getBillingInfo(userId);
    const planConfig =
      PLAN_CONFIGS[billingInfo.current_plan] || PLAN_CONFIGS.FREE;

    if (planConfig.limits.maxWorkspaces === -1) return { canCreate: true };

    const canCreate =
      billingInfo.workspaces_used < planConfig.limits.maxWorkspaces;
    return {
      canCreate,
      reason: canCreate
        ? undefined
        : `You have reached your workspace limit of ${planConfig.limits.maxWorkspaces}. Please upgrade your plan.`,
    };
  }

  /**
   * Check if user can add a new social account based on their plan limits
   */
  async canAddSocialAccount(
    userId: string
  ): Promise<{ canCreate: boolean; reason?: string }> {
    const billingInfo = await this.getBillingInfo(userId);
    const planConfig =
      PLAN_CONFIGS[billingInfo.current_plan] || PLAN_CONFIGS.FREE;

    if (planConfig.limits.maxSocialAccounts === -1) return { canCreate: true };

    const canCreate =
      billingInfo.social_accounts_used < planConfig.limits.maxSocialAccounts;
    return {
      canCreate,
      reason: canCreate
        ? undefined
        : `You have reached your social account limit of ${planConfig.limits.maxSocialAccounts}. Please upgrade your plan.`,
    };
  }

  /**
   * Increment post usage count
   */
  async incrementPostUsage(userId: string): Promise<void> {
    const billingInfo = await this.getBillingInfo(userId);
    await db.updateBillingInfo(userId, {
      posts_used_this_month: billingInfo.posts_used_this_month + 1,
    });
  }

  /**
   * Increment workspace usage count
   */
  async incrementWorkspaceUsage(userId: string): Promise<void> {
    const billingInfo = await this.getBillingInfo(userId);
    await db.updateBillingInfo(userId, {
      workspaces_used: billingInfo.workspaces_used + 1,
    });
  }

  /**
   * Increment social account usage count
   */
  async incrementSocialAccountUsage(userId: string): Promise<void> {
    const billingInfo = await this.getBillingInfo(userId);
    await db.updateBillingInfo(userId, {
      social_accounts_used: billingInfo.social_accounts_used + 1,
    });
  }

  /**
   * Get plan limits for a user
   */
  async getPlanLimits(
    userId: string
  ): Promise<PlanLimits & { usage: Record<string, number> }> {
    const billingInfo = await this.getBillingInfo(userId);
    const planConfig =
      PLAN_CONFIGS[billingInfo.current_plan] || PLAN_CONFIGS.FREE;

    return {
      ...planConfig.limits,
      usage: {
        posts: billingInfo.posts_used_this_month,
        workspaces: billingInfo.workspaces_used,
        socialAccounts: billingInfo.social_accounts_used,
      },
    };
  }

  /**
   * Update user plan
   * This integrates with Dodo Payments API
   */
  async updatePlan(
    userId: string,
    planId: 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE',
    billingInterval: 'monthly' | 'yearly' = 'monthly',
    paymentMethodId?: string
  ): Promise<BillingInfo> {
    if (!PLAN_CONFIGS[planId]) {
      throw new Error(`Invalid plan: ${planId}`);
    }

    // Free plan doesn't require payment processing
    if (planId === 'FREE') {
      return await db.updateBillingInfo(userId, {
        current_plan: planId,
        subscription_status: 'active',
        billing_interval: null,
        updated_at: new Date().toISOString(),
      });
    }

    // Get user billing info
    const billingInfo = await this.getBillingInfo(userId);

    // If user doesn't have a Dodo customer ID, create one
    if (!billingInfo.dodo_billing_customer_id) {
      const user = await db.findUser(userId);
      const { id: customerId } = await this.dodoService.createCustomer({
        email: user.email,
        name: user.name || undefined,
        metadata: {
          userId,
        },
      });

      await db.updateBillingInfo(userId, {
        dodo_billing_customer_id: customerId,
        updated_at: new Date().toISOString(),
      });

      billingInfo.dodo_billing_customer_id = customerId;
    }

    // Determine Dodo plan ID from config
    const dodoPlanId = config.dodo.planIds[planId]?.[billingInterval];
    if (!dodoPlanId && planId !== 'FREE') {
      throw new Error(
        `No Dodo plan ID found for ${planId} with ${billingInterval} interval`
      );
    }

    // Create or update subscription
    const subscriptionRequest: SubscriptionRequest = {
      planId: dodoPlanId,
      billingInterval,
    };

    if (paymentMethodId) {
      subscriptionRequest.paymentMethodId = paymentMethodId;
    }

    const subscription = await this.dodoService.createSubscription(
      billingInfo.dodo_billing_customer_id!,
      subscriptionRequest
    );

    // Update billing info in database
    return await db.updateBillingInfo(userId, {
      current_plan: planId,
      subscription_status: subscription.status,
      billing_interval: billingInterval,
      current_period_start: subscription.currentPeriodStart,
      current_period_end: subscription.currentPeriodEnd,
      cancel_at_period_end: subscription.cancelAtPeriodEnd,
      updated_at: new Date().toISOString(),
    });
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    userId: string,
    atPeriodEnd: boolean = true
  ): Promise<BillingInfo> {
    // Get user billing info
    const billingInfo = await this.getBillingInfo(userId);

    // Can't cancel if no subscription or Free plan
    if (
      billingInfo.current_plan === 'FREE' ||
      !billingInfo.dodo_billing_customer_id
    ) {
      return billingInfo;
    }

    // Get customer subscriptions
    const customer = await this.dodoService.getCustomer(
      billingInfo.dodo_billing_customer_id
    );

    // If there's an active subscription, cancel it
    if (customer.subscriptions?.data?.length > 0) {
      const subscription = customer.subscriptions.data[0];
      await this.dodoService.cancelSubscription(subscription.id, atPeriodEnd);

      // If cancelling immediately (not at period end), downgrade to FREE
      if (!atPeriodEnd) {
        return await db.updateBillingInfo(userId, {
          current_plan: 'FREE',
          subscription_status: 'cancelled',
          updated_at: new Date().toISOString(),
        });
      }

      // Otherwise mark as cancelling at period end
      return await db.updateBillingInfo(userId, {
        cancel_at_period_end: true,
        updated_at: new Date().toISOString(),
      });
    }

    return billingInfo;
  }

  /**
   * Add payment method
   */
  async addPaymentMethod(
    userId: string,
    paymentMethodData: CreatePaymentMethodDto
  ): Promise<PaymentMethod> {
    // Get user billing info
    const billingInfo = await this.getBillingInfo(userId);

    // If user doesn't have a Dodo customer ID, create one
    if (!billingInfo.dodo_billing_customer_id) {
      const user = await db.findUser(userId);
      const { id: customerId } = await this.dodoService.createCustomer({
        email: user.email,
        name: user.name || undefined,
        metadata: {
          userId,
        },
      });

      await db.updateBillingInfo(userId, {
        dodo_billing_customer_id: customerId,
        updated_at: new Date().toISOString(),
      });

      billingInfo.dodo_billing_customer_id = customerId;
    }

    // Add payment method
    return await this.dodoService.createPaymentMethod(
      billingInfo.dodo_billing_customer_id!,
      paymentMethodData
    );
  }

  /**
   * List payment methods
   */
  async listPaymentMethods(userId: string): Promise<PaymentMethod[]> {
    // Get user billing info
    const billingInfo = await this.getBillingInfo(userId);

    // If user doesn't have a Dodo customer ID, they have no payment methods
    if (!billingInfo.dodo_billing_customer_id) {
      return [];
    }

    // Get payment methods
    return await this.dodoService.listPaymentMethods(
      billingInfo.dodo_billing_customer_id
    );
  }

  /**
   * Delete payment method
   */
  async deletePaymentMethod(
    userId: string,
    paymentMethodId: string
  ): Promise<boolean> {
    // Get user billing info
    const billingInfo = await this.getBillingInfo(userId);

    // If user doesn't have a Dodo customer ID, they have no payment methods
    if (!billingInfo.dodo_billing_customer_id) {
      throw new Error('User has no payment methods');
    }

    // Delete payment method
    const result = await this.dodoService.deletePaymentMethod(
      billingInfo.dodo_billing_customer_id,
      paymentMethodId
    );

    return result.success;
  }

  /**
   * Create a billing portal session URL for the user
   */
  async createBillingPortalSession(
    userId: string,
    returnUrl: string
  ): Promise<BillingPortalSessionResponse> {
    // Get user billing info
    const billingInfo = await this.getBillingInfo(userId);

    // If user doesn't have a Dodo customer ID, they can't access billing portal
    if (!billingInfo.dodo_billing_customer_id) {
      throw new Error('User has no subscription');
    }

    // Create session
    return await this.dodoService.createBillingPortalSession(
      billingInfo.dodo_billing_customer_id,
      returnUrl
    );
  }

  /**
   * Reset monthly usage counters
   * This would typically be run by a cron job at the beginning of each month
   */
  async resetMonthlyUsage(userId: string): Promise<void> {
    await db.updateBillingInfo(userId, {
      posts_used_this_month: 0,
      updated_at: new Date().toISOString(),
    });
  }
}
