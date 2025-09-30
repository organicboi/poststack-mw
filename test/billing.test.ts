import { BillingService } from '../src/modules/billing/billing.service';
import { DodoService } from '../src/modules/billing/dodo.service';

/**
 * This test file provides simple tests for the Dodo payment integration.
 * It can be run to validate that the basic functionality is working.
 */

// Mock the database service
jest.mock('../src/database/database.service', () => ({
  db: {
    findBillingInfo: jest.fn().mockResolvedValue({
      id: 'test-billing-id',
      user_id: 'test-user-id',
      dodo_billing_customer_id: 'cus_test123',
      current_plan: 'FREE',
      posts_used_this_month: 0,
      workspaces_used: 0,
      social_accounts_used: 0,
      cancel_at_period_end: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
    createBillingInfo: jest.fn().mockImplementation(data =>
      Promise.resolve({
        ...data,
        id: 'new-billing-id',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    ),
    updateBillingInfo: jest.fn().mockImplementation((userId, data) =>
      Promise.resolve({
        id: 'test-billing-id',
        user_id: userId,
        dodo_billing_customer_id: 'cus_test123',
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    ),
    findUser: jest.fn().mockResolvedValue({
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      plan_tier: 'FREE',
      is_active: true,
      created_at: new Date().toISOString(),
    }),
  },
}));

// Spy on DodoService methods
jest.mock('../src/modules/billing/dodo.service');

describe('Billing Service with Dodo Integration', () => {
  let billingService: BillingService;
  let mockDodoService: jest.Mocked<DodoService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDodoService = new DodoService() as jest.Mocked<DodoService>;

    // Setup mock implementation for Dodo methods
    mockDodoService.createCustomer = jest
      .fn()
      .mockResolvedValue({ id: 'cus_new123' });
    mockDodoService.getCustomer = jest.fn().mockResolvedValue({
      id: 'cus_test123',
      email: 'test@example.com',
      subscriptions: { data: [] },
    });
    mockDodoService.createPaymentMethod = jest.fn().mockResolvedValue({
      id: 'pm_test123',
      type: 'card',
      last4: '4242',
      brand: 'visa',
      expiryMonth: 12,
      expiryYear: 2030,
      isDefault: true,
      dodoPaymentMethodId: 'pm_test123',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    mockDodoService.listPaymentMethods = jest.fn().mockResolvedValue([
      {
        id: 'pm_test123',
        type: 'card',
        last4: '4242',
        brand: 'visa',
        expiryMonth: 12,
        expiryYear: 2030,
        isDefault: true,
        dodoPaymentMethodId: 'pm_test123',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);
    mockDodoService.deletePaymentMethod = jest
      .fn()
      .mockResolvedValue({ success: true });
    mockDodoService.createSubscription = jest.fn().mockResolvedValue({
      id: 'sub_test123',
      customerId: 'cus_test123',
      status: 'active',
      planId: 'plan_starter_monthly',
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ).toISOString(),
      cancelAtPeriodEnd: false,
    });
    mockDodoService.createBillingPortalSession = jest.fn().mockResolvedValue({
      url: 'https://billing.dodo.dev/portal/test',
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
    });

    // Return the mock instance when the service is constructed
    (DodoService as jest.MockedClass<typeof DodoService>).mockImplementation(
      () => mockDodoService
    );

    billingService = new BillingService();
  });

  test('should get billing info', async () => {
    const result = await billingService.getBillingInfo('test-user-id');
    expect(result).toBeDefined();
    expect(result.user_id).toBe('test-user-id');
  });

  test('should get available plans', async () => {
    const plans = await billingService.getAvailablePlans();
    expect(plans).toBeDefined();
    expect(plans.length).toBeGreaterThan(0);
    expect(plans[0].id).toBe('FREE');
  });

  test('should check if user can create post', async () => {
    const result = await billingService.canCreatePost('test-user-id');
    expect(result).toBeDefined();
    expect(result.canCreate).toBe(true);
  });

  test('should update plan to paid tier', async () => {
    const result = await billingService.updatePlan(
      'test-user-id',
      'STARTER',
      'monthly',
      'pm_test123'
    );
    expect(result).toBeDefined();
    expect(result.current_plan).toBe('STARTER');
    expect(mockDodoService.createSubscription).toHaveBeenCalled();
  });

  test('should cancel subscription at period end', async () => {
    // Setup customer with subscription
    mockDodoService.getCustomer = jest.fn().mockResolvedValue({
      id: 'cus_test123',
      email: 'test@example.com',
      subscriptions: {
        data: [
          {
            id: 'sub_test123',
            status: 'active',
          },
        ],
      },
    });

    const result = await billingService.cancelSubscription(
      'test-user-id',
      true
    );
    expect(result).toBeDefined();
    expect(result.cancel_at_period_end).toBe(true);
    expect(mockDodoService.cancelSubscription).toHaveBeenCalled();
  });

  test('should add payment method', async () => {
    const paymentMethod = await billingService.addPaymentMethod(
      'test-user-id',
      {
        token: 'tok_visa',
        type: 'card',
        setAsDefault: true,
      }
    );

    expect(paymentMethod).toBeDefined();
    expect(paymentMethod.type).toBe('card');
    expect(mockDodoService.createPaymentMethod).toHaveBeenCalled();
  });

  test('should list payment methods', async () => {
    const paymentMethods =
      await billingService.listPaymentMethods('test-user-id');
    expect(paymentMethods).toBeDefined();
    expect(paymentMethods.length).toBe(1);
    expect(mockDodoService.listPaymentMethods).toHaveBeenCalled();
  });

  test('should create billing portal session', async () => {
    const session = await billingService.createBillingPortalSession(
      'test-user-id',
      'http://localhost:3001/account'
    );

    expect(session).toBeDefined();
    expect(session.url).toBeTruthy();
    expect(mockDodoService.createBillingPortalSession).toHaveBeenCalled();
  });
});
