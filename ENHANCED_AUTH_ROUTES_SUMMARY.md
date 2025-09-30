# Enhanced Authentication Routes Summary

## New Auth Routes Available

The enhanced authentication system now provides comprehensive REST API endpoints for user management, authentication, and administration.

### 📝 **Public Routes** (No authentication required)

#### 1. **User Registration**

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword",
  "first_name": "John",
  "last_name": "Doe",
  "plan_tier": "STARTER"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "...", ... },
    "token": "jwt_token_here",
    "expires_in": 3600
  }
}
```

#### 2. **User Login**

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "...", ... },
    "token": "jwt_token_here",
    "refresh_token": "refresh_token_here",
    "expires_in": 3600
  }
}
```

#### 3. **Password Reset Request**

```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### 4. **Password Reset Confirmation**

```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "reset_token",
  "new_password": "newpassword"
}
```

### 🔐 **Protected Routes** (Requires authentication)

All protected routes need the Authorization header:

```
Authorization: Bearer <jwt_token>
```

#### 5. **Refresh Token**

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refresh_token": "refresh_token_here"
}
```

#### 6. **Get User Profile**

```http
GET /api/auth/profile
```

**Response:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "plan_tier": "STARTER",
      "is_active": true,
      "created_at": "...",
      "updated_at": "..."
    }
  }
}
```

#### 7. **Update User Profile**

```http
PUT /api/auth/profile
Content-Type: application/json

{
  "first_name": "John",
  "last_name": "Smith",
  "avatar": "https://example.com/avatar.jpg"
}
```

#### 8. **Change Password**

```http
PUT /api/auth/change-password
Content-Type: application/json

{
  "current_password": "currentpass",
  "new_password": "newpass"
}
```

#### 9. **User Logout**

```http
POST /api/auth/logout
```

#### 10. **Delete Account**

```http
DELETE /api/auth/account
Content-Type: application/json

{
  "password": "currentpassword"
}
```

### 👑 **Admin Routes** (Requires ENTERPRISE plan)

#### 11. **Deactivate User**

```http
PUT /api/auth/admin/deactivate/:userId
Content-Type: application/json

{
  "reason": "Terms violation"
}
```

#### 12. **List All Users**

```http
GET /api/auth/admin/users?page=1&limit=50
```

### 🔗 **Webhook Routes**

#### 13. **Authentication Webhook**

```http
POST /api/auth/webhook
Content-Type: application/json

{
  "event": "user.created",
  "user_id": "...",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## 🛡️ **Middleware Usage**

The enhanced middleware provides several authentication layers:

### Basic Authentication

```typescript
import { enhancedAuthenticate } from '../auth/enhanced-auth.middleware';

// Require authentication
app.get('/protected', enhancedAuthenticate, (req, res) => {
  const user = req.enhancedUser; // EnhancedUser object available
  res.json({ user });
});
```

### Optional Authentication

```typescript
import { enhancedOptionalAuthenticate } from '../auth/enhanced-auth.middleware';

// Authentication optional
app.get('/public', enhancedOptionalAuthenticate, (req, res) => {
  const user = req.enhancedUser; // undefined if not authenticated
  res.json({ user: user || null });
});
```

### Plan-Based Access Control

```typescript
import { enhancedRequirePlan } from '../auth/enhanced-auth.middleware';

// Require PROFESSIONAL plan or higher
app.get(
  '/premium-feature',
  enhancedAuthenticate,
  enhancedRequirePlan('PROFESSIONAL'),
  (req, res) => {
    res.json({ message: 'Premium feature accessed' });
  }
);
```

### Feature-Based Access Control

```typescript
import { enhancedRequireFeature } from '../auth/enhanced-auth.middleware';

// Require specific feature access
app.post(
  '/bulk-upload',
  enhancedAuthenticate,
  enhancedRequireFeature('bulk_posting'),
  (req, res) => {
    res.json({ message: 'Bulk upload allowed' });
  }
);
```

### Rate Limiting

```typescript
import { enhancedRateLimit } from '../auth/enhanced-auth.middleware';

// Limit to 100 requests per minute per user
app.post(
  '/api-endpoint',
  enhancedAuthenticate,
  enhancedRateLimit(100),
  (req, res) => {
    res.json({ message: 'API call successful' });
  }
);
```

### Admin Access

```typescript
import { enhancedRequireAdmin } from '../auth/enhanced-auth.middleware';

// Require admin (ENTERPRISE plan)
app.get(
  '/admin/dashboard',
  enhancedAuthenticate,
  enhancedRequireAdmin,
  (req, res) => {
    res.json({ message: 'Admin dashboard' });
  }
);
```

## 🎯 **Integration Example**

To integrate the enhanced auth routes into your main application:

```typescript
// In your main app.ts or index.ts
import express from 'express';
import enhancedAuthRoutes from './routes/enhanced-auth.routes';

const app = express();

// Mount enhanced auth routes
app.use('/api/auth', enhancedAuthRoutes);

// Use middleware in other routes
import {
  enhancedAuthenticate,
  enhancedRequirePlan,
  getEnhancedUser,
} from './auth/enhanced-auth.middleware';

app.get('/api/posts', enhancedAuthenticate, (req, res) => {
  const user = getEnhancedUser(req);

  // User is guaranteed to exist due to middleware
  console.log(`Posts requested by user: ${user!.email}`);

  res.json({ posts: [], user_plan: user!.plan_tier });
});

app.post(
  '/api/premium-posts',
  enhancedAuthenticate,
  enhancedRequirePlan('PROFESSIONAL'),
  (req, res) => {
    const user = getEnhancedUser(req);
    res.json({
      message: 'Premium posting available',
      user_id: user!.id,
    });
  }
);
```

## 🔧 **Configuration**

Make sure you have the following environment variables configured:

```env
JWT_SECRET=your-secret-key-here
JWT_EXPIRY=1h
JWT_REFRESH_EXPIRY=7d
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## ✅ **Next Steps**

1. **Integrate routes**: Mount the enhanced-auth.routes.ts in your main app
2. **Update existing routes**: Use enhanced middleware for authentication
3. **Test endpoints**: Use the provided examples to test functionality
4. **Implement API key validation**: Complete the validateApiKey method if needed
5. **Add role management**: Consider adding a separate roles table if complex permissions are needed

The enhanced authentication system is now ready and provides comprehensive user management with plan-based access control, feature gating, and admin capabilities!
