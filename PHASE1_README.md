# Phase 1 Implementation Guide: Foundation Layer

This document provides step-by-step instructions for implementing Phase 1 of the middleware merge, focusing on the foundation layer including database schema, TypeScript interfaces, service abstractions, and error handling system.

## 🎯 Phase 1 Overview

Phase 1 establishes the core foundation for the merged middleware system:

- **Database Schema Migration**: Enhanced Supabase tables for posts, billing, social accounts
- **TypeScript Interfaces**: Comprehensive type definitions for all entities
- **Service Abstraction**: SupabaseService for database operations
- **Error Handling System**: Centralized error management with logging
- **Enhanced Authentication**: Hybrid JWT + Supabase auth system

## 📋 Prerequisites

- Node.js 18+ and npm 9+
- Supabase project with admin access
- Basic understanding of TypeScript and Express.js

## 🚀 Quick Start

1. **Run the setup script:**

   ```bash
   pwsh -File setup-phase1.ps1
   ```

2. **Configure environment variables:**

   ```bash
   cp .env.phase1 .env
   # Edit .env with your actual values
   ```

3. **Run database migration:**
   - Open Supabase dashboard → SQL Editor
   - Run the `database-schema.sql` file

4. **Start the application:**
   ```bash
   npm run dev
   ```

## 🗄️ Database Schema Migration

The `database-schema.sql` file contains comprehensive database migrations:

### New Tables Created:

- **Enhanced users table**: Added plan_tier, is_active, password_hash, avatar fields
- **posts**: Social media post management
- **social_accounts**: OAuth social media integrations
- **post_platforms**: Junction table for post-to-platform relationships
- **billing_info**: Subscription and usage tracking
- **webhook_logs**: Postiz webhook processing logs
- **workspace_social_accounts**: Team social account sharing
- **plan_features**: Feature management system

### Security Features:

- Row Level Security (RLS) policies
- Performance indexes
- Data validation constraints
- Automated timestamp triggers

### Run the Migration:

1. Open your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste the entire `database-schema.sql` content
4. Execute the script
5. Verify all tables are created successfully

## 🎨 TypeScript Interfaces

The `src/types/enhanced.types.ts` file provides comprehensive type definitions:

### Key Interfaces:

- `EnhancedUser`: Extended user with plan and billing info
- `Post`: Social media post entity
- `SocialAccount`: OAuth social media connections
- `BillingInfo`: Subscription and usage data
- `PlanFeature`: Feature management system
- API request/response interfaces

### Plan System:

```typescript
type PlanTier = 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';

const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  FREE: { posts_per_month: 10, social_accounts: 2 },
  // ... other plans
};
```

## 🔧 Service Abstraction Layer

The `SupabaseService` provides a clean abstraction over Supabase operations:

### Key Features:

- Centralized database operations
- Automatic data transformation
- Pagination support
- Error handling
- RLS context management

### Usage Examples:

```typescript
import { supabaseService } from '../services/supabase.service';

// Get user with enhanced data
const user = await supabaseService.getUser(userId);

// Create a post with social accounts
const post = await supabaseService.createPost({
  user_id: userId,
  content: 'Hello world!',
  status: 'DRAFT',
});

// Get paginated posts
const posts = await supabaseService.getUserPosts(userId, {
  page: 1,
  limit: 20,
  status: 'PUBLISHED',
});
```

## 🚨 Error Handling System

The enhanced error handling system provides:

### Error Classes:

```typescript
import {
  AuthenticationError,
  ValidationError,
  NotFoundError,
  PlanLimitError,
  ExternalServiceError,
} from '../utils/error-handler';

// Usage
throw new PlanLimitError('posts', currentUsage, limit);
```

### Middleware Integration:

```typescript
import {
  errorHandler,
  notFoundHandler,
  requestIdMiddleware,
} from '../utils/error-handler';

app.use(requestIdMiddleware);
app.use(errorHandler);
app.use(notFoundHandler);
```

### Features:

- Request ID tracking
- Structured error responses
- Development vs production error handling
- Error logging with context
- Error monitoring and statistics

## 🔐 Enhanced Authentication System

The authentication system supports both JWT and Supabase auth:

### JWT Authentication:

```typescript
import { authService } from '../auth/enhanced-auth.service';

// Register with JWT
const authResponse = await authService.registerWithJWT({
  email: 'user@example.com',
  password: 'secure-password',
  first_name: 'John',
  last_name: 'Doe',
});

// Login with JWT
const loginResponse = await authService.loginWithJWT({
  email: 'user@example.com',
  password: 'secure-password',
});
```

### Supabase Authentication:

```typescript
// Authenticate with Supabase session
const user = await authService.authenticateWithSupabase(accessToken);
```

### Hybrid Authentication:

```typescript
// Try both JWT and Supabase
const user = await authService.authenticateHybrid(token);
```

### Middleware Usage:

```typescript
import {
  authenticate,
  requirePlan,
  requireFeature,
} from '../auth/enhanced-auth.middleware';

// Require authentication
app.use('/api/protected', authenticate);

// Require specific plan
app.use('/api/premium', requirePlan('PROFESSIONAL'));

// Require specific feature
app.use('/api/analytics', requireFeature('advanced_analytics'));
```

## 🌍 Environment Configuration

Key environment variables for Phase 1:

### Required:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# JWT
JWT_SECRET=your-32-character-secret-key
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_EXPIRES_IN=7d

# Security
ADMIN_EMAILS=admin@yourcompany.com
FRONTEND_URL=http://localhost:3001
```

### Optional:

```env
# Webhooks
POSTIZ_WEBHOOK_SECRET=webhook-secret
INTERNAL_API_KEY=api-key

# Development
NODE_ENV=development
ENABLE_DEBUG_ROUTES=true
```

## 🧪 Testing Phase 1

### 1. Database Health Check:

```bash
curl http://localhost:3000/health
```

### 2. Authentication Test:

```bash
# Register user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","first_name":"Test"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### 3. Protected Route Test:

```bash
curl -X GET http://localhost:3000/api/user/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🐛 Common Issues and Solutions

### 1. Database Connection Issues:

- Verify Supabase URL and keys in `.env`
- Check network connectivity
- Ensure service role key has proper permissions

### 2. JWT Token Issues:

- Verify JWT_SECRET is set and consistent
- Check token expiration settings
- Validate token format (should start with 'Bearer ')

### 3. TypeScript Compilation Errors:

- Run `npm run build` to check for type errors
- Ensure all dependencies are installed
- Check tsconfig.json configuration

### 4. RLS (Row Level Security) Issues:

- Verify RLS policies are created correctly
- Check user authentication context
- Test with service role for debugging

## 📊 Phase 1 Success Criteria

- ✅ Database schema migration completed successfully
- ✅ All TypeScript interfaces compile without errors
- ✅ SupabaseService methods work correctly
- ✅ Error handling system catches and formats errors
- ✅ JWT authentication works for login/register
- ✅ Supabase authentication integrates properly
- ✅ Environment configuration is properly set up
- ✅ Application starts without errors

## 🔄 Next Steps (Phase 2)

After completing Phase 1, you'll be ready for Phase 2:

- Core business logic modules (Posts, Social Accounts, Billing)
- Advanced authentication features
- Webhook processing system
- API route implementations

## 📞 Support

If you encounter issues during Phase 1 implementation:

1. Check the error logs in the console
2. Verify your `.env` configuration
3. Test database connectivity with Supabase dashboard
4. Review the COMPREHENSIVE_MERGE_GUIDE.md for detailed troubleshooting

---

**Phase 1 Complete**: Foundation layer successfully implemented! 🎉
