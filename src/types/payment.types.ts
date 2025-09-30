// Payment types for Dodo Payment integration

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank' | 'paypal' | 'other';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  dodoPaymentMethodId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentMethodDto {
  type: 'card' | 'bank' | 'paypal' | 'other';
  token: string;
  setAsDefault?: boolean;
}

export interface SubscriptionRequest {
  planId: string;
  paymentMethodId?: string;
  billingInterval: 'monthly' | 'yearly';
  couponCode?: string;
}

export interface SubscriptionResponse {
  id: string;
  customerId: string;
  status: 'active' | 'canceled' | 'incomplete' | 'past_due';
  planId: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

export interface PaymentIntentResponse {
  id: string;
  clientSecret: string;
  status:
    | 'requires_payment_method'
    | 'requires_confirmation'
    | 'requires_action'
    | 'processing'
    | 'succeeded'
    | 'canceled';
  amount: number;
  currency: string;
}

export interface DodoWebhookEvent {
  id: string;
  type: string;
  data: {
    object: any;
  };
  created: number;
}

export interface BillingPortalSessionResponse {
  url: string;
  expiresAt: number;
}

// Customer details for Dodo Payments
export interface CustomerDetails {
  email: string;
  name?: string;
  metadata?: Record<string, string>;
}

// Dodo price configuration
export interface PriceConfig {
  id: string;
  planId: string;
  amount: number;
  currency: string;
  interval: 'month' | 'year';
  nickname?: string;
}
