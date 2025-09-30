# Frontend Integration Guide: Dodo Payment Integration

This document provides guidance for frontend developers on how to integrate with the middleware's payment processing capabilities.

## Overview

The middleware now supports Dodo Payments integration for handling subscriptions, payment methods, and billing management. The backend is ready with all necessary endpoints to support a complete payment flow.

## Available API Endpoints

### Plans and Subscriptions

#### 1. Get Available Plans

```
GET /api/billing/plans
```

**Authentication**: Required  
**Response**: List of available subscription plans with pricing and features

#### 2. Get Public Plan Information

```
GET /api/billing/public-plans
```

**Authentication**: None  
**Response**: List of plans for public display (marketing pages)

#### 3. Get Current Subscription

```
GET /api/billing/subscription
```

**Authentication**: Required  
**Response**: Details about the user's current subscription

#### 4. Update Plan / Subscribe

```
POST /api/billing/update-plan
```

**Authentication**: Required  
**Request Body**:

```json
{
  "planId": "STARTER", // "FREE", "STARTER", "PROFESSIONAL", "ENTERPRISE"
  "billingInterval": "monthly", // "monthly" or "yearly"
  "paymentMethodId": "pm_123456" // optional, if user has saved methods
}
```

**Response**: Updated billing information

#### 5. Cancel Subscription

```
POST /api/billing/cancel-subscription
```

**Authentication**: Required  
**Request Body**:

```json
{
  "atPeriodEnd": true // whether to cancel immediately or at period end
}
```

**Response**: Updated billing information

### Payment Methods

#### 1. List Payment Methods

```
GET /api/billing/payment-methods
```

**Authentication**: Required  
**Response**: List of saved payment methods

#### 2. Add Payment Method

```
POST /api/billing/payment-methods
```

**Authentication**: Required  
**Request Body**:

```json
{
  "token": "tok_visa_123", // token from Dodo.js
  "type": "card", // "card", "bank", "paypal", "other"
  "setAsDefault": true // optional, whether to set as default
}
```

**Response**: Newly created payment method

#### 3. Delete Payment Method

```
DELETE /api/billing/payment-methods/:id
```

**Authentication**: Required  
**Response**: Success message

### Billing Portal

#### 1. Create Billing Portal Session

```
POST /api/billing/portal
```

**Authentication**: Required  
**Request Body**:

```json
{
  "returnUrl": "http://example.com/account" // URL to return to after portal session
}
```

**Response**: Portal session with URL to redirect the user to

### Usage Checks

#### 1. Check If User Can Create Post

```
GET /api/billing/can-create-post
```

**Authentication**: Required  
**Response**: Boolean indicating if user can create post, with reason if not

#### 2. Check If User Can Create Workspace

```
GET /api/billing/can-create-workspace
```

**Authentication**: Required  
**Response**: Boolean indicating if user can create workspace, with reason if not

## Integration Flow

### 1. Payment Method Management

1. **Display Saved Payment Methods**:
   - Call `GET /api/billing/payment-methods`
   - Show a list of saved payment methods to the user
   - Display card brand, last 4 digits, expiry date, etc.

2. **Add New Payment Method**:
   - Include Dodo.js in your frontend application
   - Create a payment form that collects card details
   - Use Dodo.js to tokenize the card: `dodo.createToken(cardElement)`
   - Send the token to the backend: `POST /api/billing/payment-methods`
   - Display the newly added payment method in the list

3. **Delete Payment Method**:
   - Add a delete button next to each payment method
   - Send a request to delete it: `DELETE /api/billing/payment-methods/:id`
   - Remove the payment method from the UI on success

### 2. Subscription Management

1. **Display Available Plans**:
   - Call `GET /api/billing/plans`
   - Show a list of plans with features and pricing
   - Highlight the user's current plan

2. **Subscribe to a Plan**:
   - When a user selects a plan, show a payment form if they have no payment methods
   - Allow them to select an existing payment method or add a new one
   - Submit the subscription request: `POST /api/billing/update-plan`
   - Handle success/error responses and update the UI accordingly

3. **Cancel Subscription**:
   - Add a "Cancel Subscription" button in the account settings
   - Display a confirmation dialog with the option to cancel at period end
   - Submit the cancellation request: `POST /api/billing/cancel-subscription`
   - Update the UI to show the subscription status

### 3. Billing Portal

1. **Access Billing Portal**:
   - Add a "Manage Billing" button in the account settings
   - When clicked, request a portal session: `POST /api/billing/portal`
   - Redirect the user to the URL returned in the response
   - The portal will handle payment updates, invoices, etc.

### 4. Usage Limits

1. **Check Usage Before Actions**:
   - Before allowing a user to create a post: `GET /api/billing/can-create-post`
   - Before allowing a user to create a workspace: `GET /api/billing/can-create-workspace`
   - Show appropriate messages if the user has reached their limit
   - Provide an upgrade option if they've reached their limit

## Implementation Example: Subscription Flow

```javascript
// Example React component for plan selection
function PlanSelection() {
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingInterval, setBillingInterval] = useState('monthly');
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load plans and payment methods
  useEffect(() => {
    async function loadData() {
      try {
        const [plansResponse, paymentMethodsResponse] = await Promise.all([
          fetch('/api/billing/plans', { credentials: 'include' }),
          fetch('/api/billing/payment-methods', { credentials: 'include' })
        ]);

        const plansData = await plansResponse.json();
        const paymentMethodsData = await paymentMethodsResponse.json();

        setPlans(plansData.data);
        setPaymentMethods(paymentMethodsData.data);

        // Select current plan if any
        const currentPlan = plansData.data.find(plan => plan.isCurrent);
        if (currentPlan) {
          setSelectedPlan(currentPlan.id);
        }
      } catch (err) {
        setError('Failed to load data');
        console.error(err);
      }
    }

    loadData();
  }, []);

  // Handle subscription
  async function handleSubscribe() {
    if (!selectedPlan) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/billing/update-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          planId: selectedPlan,
          billingInterval,
          paymentMethodId: selectedPaymentMethod
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message);
      }

      // Handle successful subscription
      alert('Subscription updated successfully!');
      window.location.href = '/account';
    } catch (err) {
      setError(err.message || 'Failed to update subscription');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="plan-selection">
      <h2>Choose a Plan</h2>

      {/* Billing interval toggle */}
      <div className="billing-toggle">
        <button
          className={billingInterval === 'monthly' ? 'active' : ''}
          onClick={() => setBillingInterval('monthly')}
        >
          Monthly
        </button>
        <button
          className={billingInterval === 'yearly' ? 'active' : ''}
          onClick={() => setBillingInterval('yearly')}
        >
          Yearly (Save 15%)
        </button>
      </div>

      {/* Plan cards */}
      <div className="plan-cards">
        {plans.map(plan => (
          <div
            key={plan.id}
            className={`plan-card ${selectedPlan === plan.id ? 'selected' : ''}`}
            onClick={() => setSelectedPlan(plan.id)}
          >
            <h3>{plan.name}</h3>
            <div className="price">
              ${billingInterval === 'monthly' ? plan.priceMonthly : plan.priceYearly}
              <span className="interval">/{billingInterval === 'monthly' ? 'month' : 'year'}</span>
            </div>
            <ul className="features">
              {plan.features.map((feature, i) => (
                <li key={i}>{feature}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Payment method selection (only if not FREE plan) */}
      {selectedPlan !== 'FREE' && (
        <div className="payment-methods">
          <h3>Payment Method</h3>

          {paymentMethods.length > 0 ? (
            <div className="saved-methods">
              {paymentMethods.map(method => (
                <div
                  key={method.id}
                  className={`payment-method ${selectedPaymentMethod === method.id ? 'selected' : ''}`}
                  onClick={() => setSelectedPaymentMethod(method.id)}
                >
                  <div className="card-brand">{method.brand}</div>
                  <div className="card-last4">•••• {method.last4}</div>
                  <div className="card-expiry">Expires {method.expiryMonth}/{method.expiryYear}</div>
                </div>
              ))}
              <button onClick={() => /* Show add payment form */}>Add New Payment Method</button>
            </div>
          ) : (
            <div className="add-payment-form">
              {/* Payment form would go here using Dodo.js */}
            </div>
          )}
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      <button
        className="subscribe-button"
        disabled={loading || !selectedPlan}
        onClick={handleSubscribe}
      >
        {loading ? 'Processing...' : 'Confirm Subscription'}
      </button>
    </div>
  );
}
```

## Notes

1. **Development Mode**: The middleware has a mock implementation for development that doesn't require actual Dodo API keys. This allows frontend developers to integrate with the payment system without needing real API credentials.

2. **Error Handling**: All endpoints return consistent error responses with `success: false` and a `message` explaining the error. The frontend should display these messages to users.

3. **Security**: Never store payment information (like card numbers) in your frontend. Always use Dodo.js for tokenization.

4. **Testing**: For testing purposes, Dodo.js supports test card numbers like `4242424242424242` (Visa) that will always succeed.

5. **Webhooks**: The middleware handles Dodo payment webhooks for events like successful payments, subscription updates, etc. Frontend doesn't need to handle these events directly.

For questions or additional integration support, contact the middleware team.
