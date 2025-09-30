# Phase 3 API Documentation

## Overview

This document covers the new API endpoints implemented in Phase 3 of the middleware integration, which includes:

- Social Tokens & OAuth Integration
- Webhook System
- Postiz Integration
- Enhanced Post Management

## Base URL

All API endpoints are prefixed with `/api` unless otherwise specified.

---

## Social Tokens & OAuth

### OAuth Endpoints

#### Get Supported Platforms
```http
GET /api/oauth/supported-platforms
```

**Response:**
```json
{
  "success": true,
  "data": {
    "platforms": [
      "x", "linkedin", "linkedin-page", "reddit", "instagram",
      "facebook", "threads", "youtube", "tiktok", "pinterest",
      "discord", "slack", "mastodon", "bluesky", "telegram"
    ]
  }
}
```

#### Initiate OAuth Flow
```http
POST /api/oauth/initiate
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "platform": "x",
  "workspaceId": "uuid",
  "returnUrl": "https://yourapp.com/connections",
  "externalUrl": "https://mastodon.social" // For Mastodon-like instances
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "platform": "x",
    "oauthUrl": "https://postiz.com/oauth/redirect...",
    "message": "Redirect user to this URL to authorize x connection"
  }
}
```

#### OAuth Callback
```http
GET /api/oauth/:platform/callback?code=xxx&state=xxx
```

This endpoint handles the OAuth callback from social platforms. Users are redirected here after authorizing the connection.

#### Get User Connections
```http
GET /api/oauth/connections/:userId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "connections": [
      {
        "id": "uuid",
        "platform": "x",
        "integrationId": "postiz_integration_id",
        "platformUsername": "@username",
        "displayName": "Display Name",
        "avatar": "https://...",
        "isActive": true,
        "connectedAt": "2023-12-01T10:00:00Z",
        "lastUpdated": "2023-12-01T10:00:00Z",
        "workspace": {
          "id": "uuid",
          "name": "My Workspace"
        }
      }
    ]
  }
}
```

#### Disconnect Platform
```http
POST /api/oauth/disconnect
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "platform": "x",
  "workspaceId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "x disconnected successfully",
    "platform": "x"
  }
}
```

#### Check Connection Status
```http
GET /api/oauth/connection/:platform/status
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "connected": true,
    "platform": "x",
    "integrationId": "postiz_integration_id",
    "isActive": true,
    "connectedAt": "2023-12-01T10:00:00Z",
    "platformUsername": "@username",
    "displayName": "Display Name"
  }
}
```

### Social Tokens Management

#### Get User Social Tokens
```http
GET /api/social-tokens/:userId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "platform": "x",
      "postizIntegrationId": "integration_id",
      "platformUsername": "@username",
      "displayName": "Display Name",
      "avatar": "https://...",
      "isActive": true,
      "workspaceId": "uuid",
      "workspace": {
        "id": "uuid",
        "name": "My Workspace"
      },
      "connectedAt": "2023-12-01T10:00:00Z",
      "updatedAt": "2023-12-01T10:00:00Z"
    }
  ]
}
```

#### Update Social Account
```http
PUT /api/social-tokens/:id
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "platformUsername": "@newusername",
  "displayName": "New Display Name",
  "isActive": true
}
```

#### Delete Social Account
```http
DELETE /api/social-tokens/:id
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "x connection disconnected successfully",
    "platform": "x"
  }
}
```

#### Get Workspace Social Accounts
```http
GET /api/social-tokens/workspace/:workspaceId
Authorization: Bearer <token>
```

#### Get Publishing Accounts
```http
GET /api/social-tokens/publishing/:userId/:workspaceId?platforms=x,linkedin
Authorization: Bearer <token>
```

#### Check Connected Platforms
```http
GET /api/social-tokens/check/:userId/:workspaceId?platforms=x,linkedin
Authorization: Bearer <token>
```

---

## Webhooks

### Webhook Endpoints

#### Postiz Webhook (Public)
```http
POST /api/webhooks/postiz
Content-Type: application/json
X-Postiz-Signature: sha256=<signature>
```

**Request Body:**
```json
{
  "event": "post.published",
  "data": {
    "externalId": "post_uuid",
    "postizPostId": "postiz_id",
    "platformResults": [...],
    "publishedAt": "2023-12-01T10:00:00Z"
  }
}
```

#### Account Webhook (Public)
```http
POST /api/webhooks/accounts
Content-Type: application/json
```

**Request Body:**
```json
{
  "event": "account.connected",
  "data": {
    "platform": "x",
    "accountId": "account_id",
    "integrationId": "integration_id"
  }
}
```

#### Webhook Health Check (Public)
```http
GET /api/webhooks/health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2023-12-01T10:00:00Z",
    "webhookSecret": "configured",
    "service": "webhooks"
  }
}
```

#### Test Webhook (Public)
```http
POST /api/webhooks/test
Content-Type: application/json
```

#### Get Webhook Logs
```http
GET /api/webhooks/logs?limit=100&offset=0
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "uuid",
        "webhook_type": "postiz",
        "postiz_post_id": "postiz_id",
        "myapp1_post_id": "post_uuid",
        "payload": {...},
        "status": "processed",
        "processed_at": "2023-12-01T10:00:00Z",
        "received_at": "2023-12-01T10:00:00Z"
      }
    ],
    "pagination": {
      "limit": 100,
      "offset": 0,
      "total": 1
    }
  }
}
```

---

## Postiz Integration

### Postiz Endpoints

#### Create Post in Postiz
```http
POST /api/postiz/posts
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "content": "Check out our new product! 🚀",
  "platforms": ["x", "linkedin"],
  "publishDate": "2023-12-01T15:00:00Z",
  "media": ["media_url_1", "media_url_2"],
  "teamContext": "workspace_uuid",
  "metadata": {
    "myAppWorkspaceId": "workspace_uuid",
    "myAppPostId": "post_uuid"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "postiz_post_id",
    "posts": [
      {
        "id": "platform_post_id",
        "platform": "x"
      }
    ],
    "status": "scheduled",
    "message": "Post created successfully"
  },
  "message": "Post created successfully in Postiz"
}
```

#### Get Post Status
```http
GET /api/postiz/posts/:postizPostId/status
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "postiz_post_id",
    "state": "PUBLISHED",
    "publishedPosts": [
      {
        "platform": "x",
        "postId": "platform_post_id",
        "url": "https://twitter.com/user/status/123"
      }
    ]
  }
}
```

#### Get User Integrations
```http
GET /api/postiz/integrations
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "integrations": [
      {
        "id": "integration_id",
        "platform": "x",
        "platformUserId": "platform_user_id",
        "platformUsername": "@username",
        "isActive": true,
        "connectedAt": "2023-12-01T10:00:00Z"
      }
    ]
  }
}
```

#### Get Platform Analytics
```http
GET /api/postiz/analytics/:platform?date=7
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "platform": "x",
    "userId": "user_uuid",
    "dateRange": "7",
    "metrics": {
      "posts": 10,
      "likes": 150,
      "shares": 25,
      "comments": 30,
      "reach": 1500,
      "impressions": 3000
    },
    "posts": [...]
  }
}
```

#### Upload Media
```http
POST /api/postiz/media/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Note:** Currently returns 501 - requires multer dependency to be added.

#### Disconnect Platform
```http
POST /api/postiz/disconnect/:platform
Authorization: Bearer <token>
```

#### Health Check
```http
GET /api/postiz/health
Authorization: Bearer <token>
```

#### Create Post with Social Accounts
```http
POST /api/postiz/posts/social
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "workspaceId": "workspace_uuid",
  "content": "Check out our new product! 🚀",
  "socialAccountIds": ["account_uuid_1", "account_uuid_2"],
  "publishDate": "2023-12-01T15:00:00Z",
  "media": ["media_url_1"]
}
```

---

## Enhanced Posts API

The existing posts API has been enhanced to integrate with Postiz and social accounts.

#### Create Post (Enhanced)
```http
POST /api/posts
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "content": "Check out our new product! 🚀",
  "title": "Product Launch",
  "workspace_id": "workspace_uuid",
  "media_urls": ["https://example.com/image.jpg"],
  "social_account_ids": ["account_uuid_1", "account_uuid_2"],
  "scheduled_for": "2023-12-01T15:00:00Z",
  "settings": {
    "auto_publish": true
  }
}
```

**Enhanced Response:**
```json
{
  "success": true,
  "data": {
    "id": "post_uuid",
    "user_id": "user_uuid",
    "content": "Check out our new product! 🚀",
    "status": "SCHEDULED",
    "postiz_post_id": "postiz_post_id",
    "settings": {
      "postizResponse": {...},
      "socialAccounts": [...]
    },
    "created_at": "2023-12-01T10:00:00Z",
    "updated_at": "2023-12-01T10:00:00Z"
  }
}
```

---

## Error Responses

All endpoints follow a consistent error response format:

```json
{
  "success": false,
  "error": "Error message",
  "details": "Detailed error information (optional)"
}
```

Common HTTP status codes:
- `400` - Bad Request (validation errors, missing required fields)
- `401` - Unauthorized (invalid or missing authentication token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource not found)
- `402` - Payment Required (plan limits reached)
- `500` - Internal Server Error (server-side errors)
- `501` - Not Implemented (feature not yet implemented)

---

## Authentication

All protected endpoints require a Bearer token in the Authorization header:

```http
Authorization: Bearer <your_jwt_token>
```

Tokens can be obtained through the existing authentication endpoints:
- `POST /auth/login`
- `POST /auth/register`

---

## Rate Limiting

The middleware includes rate limiting middleware. Specific limits depend on the user's plan:

- **Free Plan**: Limited requests per hour
- **Paid Plans**: Higher limits based on plan tier

---

## Webhook Security

Webhook endpoints verify signatures using HMAC-SHA256. The signature is provided in the `X-Postiz-Signature` header.

Configure the `WEBHOOK_SECRET` environment variable to enable signature verification.

---

## Environment Variables

New environment variables for Phase 3:

```env
# Postiz Integration
POSTIZ_API_URL=http://localhost:3000
POSTIZ_SERVICE_KEY=your_postiz_service_key

# Webhook Configuration
WEBHOOK_SECRET=your_webhook_secret

# Frontend URL (for OAuth redirects)
FRONTEND_URL=http://localhost:3000
```

---

## Integration Examples

### Complete OAuth Flow

1. **Get supported platforms**
2. **Initiate OAuth** for desired platform
3. **Redirect user** to the returned OAuth URL
4. **Handle callback** (automatically processed)
5. **Verify connection** status
6. **Create posts** using connected accounts

### Post Creation with Social Accounts

1. **Get user's social accounts**
2. **Create post** with `social_account_ids`
3. **Monitor webhook** for status updates
4. **Check post status** via Postiz API

### Webhook Monitoring

1. **Set up webhook endpoints** in Postiz dashboard
2. **Configure webhook secret** in environment
3. **Monitor webhook logs** via API
4. **Handle webhook events** in your application

---

This completes the Phase 3 API documentation. All endpoints are now fully integrated with social tokens, OAuth, webhooks, and Postiz functionality.