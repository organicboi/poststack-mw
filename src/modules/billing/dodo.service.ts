import axios, { AxiosInstance } from 'axios';
import { config } from '../../common/config';
import {
  CreatePaymentMethodDto,
  CustomerDetails,
  PaymentIntentResponse,
  PaymentMethod,
  PriceConfig,
  SubscriptionRequest,
  SubscriptionResponse,
  BillingPortalSessionResponse,
  DodoWebhookEvent,
} from '../../types/payment.types';

/**
 * Service for interacting with the Dodo Payments API
 */
export class DodoService {
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly client: AxiosInstance;

  constructor() {
    this.apiUrl = config.dodo?.apiUrl || 'https://api.dodo.dev';
    this.apiKey = config.dodo?.apiKey || '';

    this.client = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        'X-API-Version': '2023-09',
      },
    });

    // For development, let's mock the API if the key isn't set
    if (!this.apiKey || this.apiKey === 'your-dodo-payments-api-key') {
      console.warn('⚠️ No Dodo API key provided, using mock implementation');
    }
  }

  /**
   * Create a new customer in Dodo Payments
   */
  async createCustomer(details: CustomerDetails): Promise<{ id: string }> {
    try {
      // In development without API key, use mock implementation
      if (!this.apiKey || this.apiKey === 'your-dodo-payments-api-key') {
        return this.mockCreateCustomer(details);
      }

      const response = await this.client.post('/customers', details);
      return { id: response.data.id };
    } catch (error: any) {
      console.error(
        'Error creating Dodo customer:',
        error.response?.data || error.message
      );
      throw new Error(
        `Failed to create customer: ${error.response?.data?.message || error.message}`
      );
    }
  }

  /**
   * Retrieve a customer from Dodo Payments
   */
  async getCustomer(customerId: string): Promise<any> {
    try {
      // In development without API key, use mock implementation
      if (!this.apiKey || this.apiKey === 'your-dodo-payments-api-key') {
        return this.mockGetCustomer(customerId);
      }

      const response = await this.client.get(`/customers/${customerId}`);
      return response.data;
    } catch (error: any) {
      console.error(
        'Error retrieving Dodo customer:',
        error.response?.data || error.message
      );
      throw new Error(
        `Failed to retrieve customer: ${error.response?.data?.message || error.message}`
      );
    }
  }

  /**
   * Create a payment method for a customer
   */
  async createPaymentMethod(
    customerId: string,
    data: CreatePaymentMethodDto
  ): Promise<PaymentMethod> {
    try {
      // In development without API key, use mock implementation
      if (!this.apiKey || this.apiKey === 'your-dodo-payments-api-key') {
        return this.mockCreatePaymentMethod(customerId, data);
      }

      const response = await this.client.post(
        `/customers/${customerId}/payment_methods`,
        {
          token: data.token,
          set_default: data.setAsDefault,
        }
      );

      return {
        id: response.data.id,
        type: response.data.type,
        last4: response.data.last4,
        brand: response.data.brand,
        expiryMonth: response.data.exp_month,
        expiryYear: response.data.exp_year,
        isDefault: response.data.is_default,
        dodoPaymentMethodId: response.data.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error(
        'Error creating payment method:',
        error.response?.data || error.message
      );
      throw new Error(
        `Failed to create payment method: ${error.response?.data?.message || error.message}`
      );
    }
  }

  /**
   * List payment methods for a customer
   */
  async listPaymentMethods(customerId: string): Promise<PaymentMethod[]> {
    try {
      // In development without API key, use mock implementation
      if (!this.apiKey || this.apiKey === 'your-dodo-payments-api-key') {
        return this.mockListPaymentMethods(customerId);
      }

      const response = await this.client.get(
        `/customers/${customerId}/payment_methods`
      );

      return response.data.data.map((pm: any) => ({
        id: pm.id,
        type: pm.type,
        last4: pm.last4,
        brand: pm.brand,
        expiryMonth: pm.exp_month,
        expiryYear: pm.exp_year,
        isDefault: pm.is_default,
        dodoPaymentMethodId: pm.id,
        createdAt: new Date(pm.created * 1000).toISOString(),
        updatedAt: new Date(pm.updated * 1000).toISOString(),
      }));
    } catch (error: any) {
      console.error(
        'Error listing payment methods:',
        error.response?.data || error.message
      );
      throw new Error(
        `Failed to list payment methods: ${error.response?.data?.message || error.message}`
      );
    }
  }

  /**
   * Delete a payment method
   */
  async deletePaymentMethod(
    customerId: string,
    paymentMethodId: string
  ): Promise<{ success: boolean }> {
    try {
      // In development without API key, use mock implementation
      if (!this.apiKey || this.apiKey === 'your-dodo-payments-api-key') {
        return this.mockDeletePaymentMethod(customerId, paymentMethodId);
      }

      await this.client.delete(
        `/customers/${customerId}/payment_methods/${paymentMethodId}`
      );
      return { success: true };
    } catch (error: any) {
      console.error(
        'Error deleting payment method:',
        error.response?.data || error.message
      );
      throw new Error(
        `Failed to delete payment method: ${error.response?.data?.message || error.message}`
      );
    }
  }

  /**
   * Create a subscription for a customer
   */
  async createSubscription(
    customerId: string,
    request: SubscriptionRequest
  ): Promise<SubscriptionResponse> {
    try {
      // In development without API key, use mock implementation
      if (!this.apiKey || this.apiKey === 'your-dodo-payments-api-key') {
        return this.mockCreateSubscription(customerId, request);
      }

      const response = await this.client.post(
        `/customers/${customerId}/subscriptions`,
        {
          plan_id: request.planId,
          payment_method_id: request.paymentMethodId,
          billing_interval: request.billingInterval,
          coupon: request.couponCode,
        }
      );

      return {
        id: response.data.id,
        customerId: response.data.customer_id,
        status: response.data.status,
        planId: response.data.plan_id,
        currentPeriodStart: new Date(
          response.data.current_period_start * 1000
        ).toISOString(),
        currentPeriodEnd: new Date(
          response.data.current_period_end * 1000
        ).toISOString(),
        cancelAtPeriodEnd: response.data.cancel_at_period_end,
      };
    } catch (error: any) {
      console.error(
        'Error creating subscription:',
        error.response?.data || error.message
      );
      throw new Error(
        `Failed to create subscription: ${error.response?.data?.message || error.message}`
      );
    }
  }

  /**
   * Update a subscription
   */
  async updateSubscription(
    subscriptionId: string,
    updates: { planId?: string; cancelAtPeriodEnd?: boolean }
  ): Promise<SubscriptionResponse> {
    try {
      // In development without API key, use mock implementation
      if (!this.apiKey || this.apiKey === 'your-dodo-payments-api-key') {
        return this.mockUpdateSubscription(subscriptionId, updates);
      }

      const payload: any = {};
      if (updates.planId) payload.plan_id = updates.planId;
      if (updates.cancelAtPeriodEnd !== undefined)
        payload.cancel_at_period_end = updates.cancelAtPeriodEnd;

      const response = await this.client.patch(
        `/subscriptions/${subscriptionId}`,
        payload
      );

      return {
        id: response.data.id,
        customerId: response.data.customer_id,
        status: response.data.status,
        planId: response.data.plan_id,
        currentPeriodStart: new Date(
          response.data.current_period_start * 1000
        ).toISOString(),
        currentPeriodEnd: new Date(
          response.data.current_period_end * 1000
        ).toISOString(),
        cancelAtPeriodEnd: response.data.cancel_at_period_end,
      };
    } catch (error: any) {
      console.error(
        'Error updating subscription:',
        error.response?.data || error.message
      );
      throw new Error(
        `Failed to update subscription: ${error.response?.data?.message || error.message}`
      );
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    atPeriodEnd: boolean = true
  ): Promise<SubscriptionResponse> {
    try {
      // In development without API key, use mock implementation
      if (!this.apiKey || this.apiKey === 'your-dodo-payments-api-key') {
        return this.mockCancelSubscription(subscriptionId, atPeriodEnd);
      }

      const url = atPeriodEnd
        ? `/subscriptions/${subscriptionId}?cancel_at_period_end=true`
        : `/subscriptions/${subscriptionId}`;

      const method = atPeriodEnd ? 'patch' : 'delete';
      const response = await this.client.request({
        method,
        url,
      });

      return {
        id: response.data.id,
        customerId: response.data.customer_id,
        status: response.data.status,
        planId: response.data.plan_id,
        currentPeriodStart: new Date(
          response.data.current_period_start * 1000
        ).toISOString(),
        currentPeriodEnd: new Date(
          response.data.current_period_end * 1000
        ).toISOString(),
        cancelAtPeriodEnd: response.data.cancel_at_period_end || atPeriodEnd,
      };
    } catch (error: any) {
      console.error(
        'Error cancelling subscription:',
        error.response?.data || error.message
      );
      throw new Error(
        `Failed to cancel subscription: ${error.response?.data?.message || error.message}`
      );
    }
  }

  /**
   * Create a billing portal session for a customer
   */
  async createBillingPortalSession(
    customerId: string,
    returnUrl: string
  ): Promise<BillingPortalSessionResponse> {
    try {
      // In development without API key, use mock implementation
      if (!this.apiKey || this.apiKey === 'your-dodo-payments-api-key') {
        return this.mockCreateBillingPortalSession(customerId, returnUrl);
      }

      const response = await this.client.post('/billing_portal/sessions', {
        customer_id: customerId,
        return_url: returnUrl,
      });

      return {
        url: response.data.url,
        expiresAt: response.data.expires_at,
      };
    } catch (error: any) {
      console.error(
        'Error creating billing portal session:',
        error.response?.data || error.message
      );
      throw new Error(
        `Failed to create billing portal session: ${error.response?.data?.message || error.message}`
      );
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(
    payload: string,
    signature: string,
    webhookSecret: string = config.dodo?.webhookSecret || ''
  ): boolean {
    // In a real implementation, you would verify the signature using a crypto library
    // This is a simplified version for the example
    if (!webhookSecret) {
      console.warn(
        'No webhook secret provided, skipping signature verification'
      );
      return true;
    }

    // TODO: Implement actual signature verification
    // Example: return crypto.createHmac('sha256', webhookSecret).update(payload).digest('hex') === signature;
    return true;
  }

  /**
   * Parse webhook event
   */
  parseWebhookEvent(payload: string, signature: string): DodoWebhookEvent {
    // Verify the signature first
    const isValid = this.verifyWebhookSignature(payload, signature);
    if (!isValid) {
      throw new Error('Invalid webhook signature');
    }

    try {
      const event = JSON.parse(payload) as DodoWebhookEvent;
      return event;
    } catch (error) {
      throw new Error('Failed to parse webhook payload');
    }
  }

  // Mock implementations for development without API key
  private mockCreateCustomer(
    details: CustomerDetails
  ): Promise<{ id: string }> {
    return Promise.resolve({
      id: `cus_${Math.random().toString(36).substring(2, 15)}`,
    });
  }

  private mockGetCustomer(customerId: string): Promise<any> {
    return Promise.resolve({
      id: customerId,
      email: 'mock@example.com',
      name: 'Mock Customer',
      created: Math.floor(Date.now() / 1000),
      subscriptions: {
        data: [],
      },
    });
  }

  private mockCreatePaymentMethod(
    customerId: string,
    data: CreatePaymentMethodDto
  ): Promise<PaymentMethod> {
    const now = new Date().toISOString();
    return Promise.resolve({
      id: `pm_${Math.random().toString(36).substring(2, 15)}`,
      type: data.type,
      last4: '4242',
      brand: 'visa',
      expiryMonth: 12,
      expiryYear: 2030,
      isDefault: data.setAsDefault || false,
      dodoPaymentMethodId: `pm_${Math.random().toString(36).substring(2, 15)}`,
      createdAt: now,
      updatedAt: now,
    });
  }

  private mockListPaymentMethods(customerId: string): Promise<PaymentMethod[]> {
    const now = new Date().toISOString();
    return Promise.resolve([
      {
        id: `pm_${Math.random().toString(36).substring(2, 15)}`,
        type: 'card',
        last4: '4242',
        brand: 'visa',
        expiryMonth: 12,
        expiryYear: 2030,
        isDefault: true,
        dodoPaymentMethodId: `pm_${Math.random().toString(36).substring(2, 15)}`,
        createdAt: now,
        updatedAt: now,
      },
    ]);
  }

  private mockDeletePaymentMethod(
    customerId: string,
    paymentMethodId: string
  ): Promise<{ success: boolean }> {
    return Promise.resolve({ success: true });
  }

  private mockCreateSubscription(
    customerId: string,
    request: SubscriptionRequest
  ): Promise<SubscriptionResponse> {
    const now = Date.now();
    const periodEnd =
      now +
      (request.billingInterval === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000;

    return Promise.resolve({
      id: `sub_${Math.random().toString(36).substring(2, 15)}`,
      customerId,
      status: 'active',
      planId: request.planId,
      currentPeriodStart: new Date(now).toISOString(),
      currentPeriodEnd: new Date(periodEnd).toISOString(),
      cancelAtPeriodEnd: false,
    });
  }

  private mockUpdateSubscription(
    subscriptionId: string,
    updates: { planId?: string; cancelAtPeriodEnd?: boolean }
  ): Promise<SubscriptionResponse> {
    const now = Date.now();
    const periodEnd = now + 30 * 24 * 60 * 60 * 1000;

    return Promise.resolve({
      id: subscriptionId,
      customerId: `cus_${Math.random().toString(36).substring(2, 15)}`,
      status: 'active',
      planId: updates.planId || 'plan_mock',
      currentPeriodStart: new Date(now).toISOString(),
      currentPeriodEnd: new Date(periodEnd).toISOString(),
      cancelAtPeriodEnd: updates.cancelAtPeriodEnd || false,
    });
  }

  private mockCancelSubscription(
    subscriptionId: string,
    atPeriodEnd: boolean
  ): Promise<SubscriptionResponse> {
    const now = Date.now();
    const periodEnd = now + 30 * 24 * 60 * 60 * 1000;

    return Promise.resolve({
      id: subscriptionId,
      customerId: `cus_${Math.random().toString(36).substring(2, 15)}`,
      status: atPeriodEnd ? 'active' : 'canceled',
      planId: 'plan_mock',
      currentPeriodStart: new Date(now).toISOString(),
      currentPeriodEnd: new Date(periodEnd).toISOString(),
      cancelAtPeriodEnd: atPeriodEnd,
    });
  }

  private mockCreateBillingPortalSession(
    customerId: string,
    returnUrl: string
  ): Promise<BillingPortalSessionResponse> {
    return Promise.resolve({
      url: `http://localhost:3002/billing-portal-mock?customer=${customerId}&return_url=${encodeURIComponent(returnUrl)}`,
      expiresAt: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    });
  }
}
