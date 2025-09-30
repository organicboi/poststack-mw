// Core modules types for Phase 2

// Base response types
export interface BaseResponse {
  success: boolean;
  message?: string;
}

export interface SuccessResponse<T = any> extends BaseResponse {
  success: true;
  data: T;
}

export interface ErrorResponse extends BaseResponse {
  success: false;
  error: string;
  details?: string;
}

export interface PaginatedResponse<T> extends SuccessResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// User types
export interface ExtendedUser {
  id: string;
  email: string;
  name?: string;
  display_name?: string;
  plan_tier: 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  is_active: boolean;
  avatar?: string;
  bio?: string;
  created_at: string;
  updated_at?: string;
}

export interface UserProfile
  extends Omit<ExtendedUser, 'id' | 'email' | 'plan_tier' | 'is_active'> {
  userId: string;
}

export interface UpdateUserDto {
  name?: string;
  display_name?: string;
  avatar?: string;
  bio?: string;
}

// Post types
export interface Post {
  id: string;
  user_id: string;
  workspace_id?: string;
  postiz_post_id?: string;
  title?: string;
  content?: string;
  media_urls: string[];
  status:
    | 'DRAFT'
    | 'SCHEDULED'
    | 'PUBLISHING'
    | 'PUBLISHED'
    | 'FAILED'
    | 'CANCELLED';
  scheduled_for?: string;
  published_at?: string;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CreatePostDto {
  content: string;
  title?: string;
  workspace_id?: string;
  media_urls?: string[];
  social_account_ids: string[];
  scheduled_for?: string;
  settings?: Record<string, any>;
}

export interface UpdatePostDto {
  content?: string;
  title?: string;
  media_urls?: string[];
  status?: 'DRAFT' | 'SCHEDULED' | 'CANCELLED';
  scheduled_for?: string;
  settings?: Record<string, any>;
}

// Social account types
export interface SocialAccount {
  id: string;
  user_id: string;
  workspace_id?: string;
  platform: string;
  postiz_integration_id: string;
  platform_user_id?: string;
  platform_username?: string;
  display_name?: string;
  avatar?: string;
  is_active: boolean;
  connection_metadata: Record<string, any>;
  connected_at: string;
  updated_at: string;
}

// Billing types
export interface BillingInfo {
  id: string;
  user_id: string;
  dodo_billing_customer_id?: string;
  current_plan: 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  billing_interval?: 'monthly' | 'yearly';
  subscription_status?: 'active' | 'cancelled' | 'past_due';
  current_period_start?: string;
  current_period_end?: string;
  cancel_at_period_end: boolean;
  posts_used_this_month: number;
  workspaces_used: number;
  social_accounts_used: number;
  created_at: string;
  updated_at: string;
}

export interface PlanLimits {
  maxPosts: number;
  maxWorkspaces: number;
  maxSocialAccounts: number;
  maxWorkspaceMembers: number;
}

export interface PlanConfig {
  id: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  limits: PlanLimits;
  features: string[];
  dodoPlanId?: string;
  isCurrent?: boolean;
}

// Import existing AuthenticatedRequest from workspace middleware
import { AuthenticatedRequest } from '../workspace/workspace.middleware';
export type { AuthenticatedRequest };

// Pagination
export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
