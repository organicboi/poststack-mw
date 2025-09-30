// Enhanced TypeScript interfaces for the merged middleware
// Phase 1: Foundation interfaces and types

// =============================================================================
// PLAN AND BILLING TYPES
// =============================================================================

export type PlanTier = 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
export type BillingInterval = 'monthly' | 'yearly';
export type SubscriptionStatus =
  | 'active'
  | 'cancelled'
  | 'past_due'
  | 'trialing'
  | 'incomplete';

// Plan feature configuration
export interface PlanFeature {
  id: string;
  feature_id: string;
  feature_name: string;
  description?: string;
  category: string;
  is_popular: boolean;
  available_in_plans: PlanTier[];
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

// Plan limits configuration
export interface PlanLimits {
  posts_per_month: number;
  social_accounts: number;
  workspaces: number;
  team_members: number;
  features: string[];
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  FREE: {
    posts_per_month: 10,
    social_accounts: 2,
    workspaces: 1,
    team_members: 1,
    features: ['basic_posting', 'social_accounts_basic', 'usage_tracking'],
  },
  STARTER: {
    posts_per_month: 100,
    social_accounts: 5,
    workspaces: 3,
    team_members: 3,
    features: [
      'basic_posting',
      'post_scheduling',
      'social_accounts_basic',
      'team_workspaces',
      'basic_analytics',
      'postiz_integration',
      'email_support',
      'usage_tracking',
      'usage_alerts',
      'billing_management',
    ],
  },
  PROFESSIONAL: {
    posts_per_month: 500,
    social_accounts: 15,
    workspaces: 10,
    team_members: 10,
    features: [
      'basic_posting',
      'post_scheduling',
      'bulk_posting',
      'post_templates',
      'social_accounts_basic',
      'advanced_oauth',
      'team_workspaces',
      'team_roles',
      'workspace_analytics',
      'basic_analytics',
      'advanced_analytics',
      'postiz_integration',
      'webhook_support',
      'api_access',
      'email_support',
      'priority_support',
      'usage_tracking',
      'usage_alerts',
      'billing_management',
    ],
  },
  ENTERPRISE: {
    posts_per_month: -1, // unlimited
    social_accounts: -1, // unlimited
    workspaces: -1, // unlimited
    team_members: -1, // unlimited
    features: [
      'basic_posting',
      'post_scheduling',
      'bulk_posting',
      'post_templates',
      'social_accounts_basic',
      'unlimited_accounts',
      'advanced_oauth',
      'team_workspaces',
      'unlimited_workspaces',
      'team_roles',
      'workspace_analytics',
      'basic_analytics',
      'advanced_analytics',
      'custom_reports',
      'postiz_integration',
      'webhook_support',
      'api_access',
      'custom_integrations',
      'email_support',
      'priority_support',
      'dedicated_support',
      'usage_tracking',
      'usage_alerts',
      'billing_management',
    ],
  },
};

// =============================================================================
// ENHANCED USER INTERFACES
// =============================================================================

export interface EnhancedUser {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  avatar?: string;
  plan_tier: PlanTier;
  is_active: boolean;
  password_hash?: string; // For JWT auth compatibility
  created_at: Date;
  updated_at: Date;

  // Computed properties
  full_name?: string;
  display_name?: string;
}

export interface BillingInfo {
  id: string;
  user_id: string;
  dodo_billing_customer_id?: string;
  current_plan: PlanTier;
  billing_interval?: BillingInterval;
  subscription_status?: SubscriptionStatus;
  current_period_start?: Date;
  current_period_end?: Date;
  cancel_at_period_end: boolean;

  // Usage tracking
  posts_used_this_month: number;
  teams_used: number;
  social_accounts_used: number;

  // Timestamps
  created_at: Date;
  updated_at: Date;
}

// =============================================================================
// SOCIAL MEDIA AND POSTING INTERFACES
// =============================================================================

export type SocialPlatform =
  | 'x'
  | 'twitter'
  | 'linkedin'
  | 'linkedin-page'
  | 'reddit'
  | 'instagram'
  | 'instagram-standalone'
  | 'facebook'
  | 'threads'
  | 'youtube'
  | 'tiktok'
  | 'pinterest'
  | 'dribbble'
  | 'discord'
  | 'slack'
  | 'mastodon'
  | 'bluesky'
  | 'lemmy'
  | 'farcaster'
  | 'telegram'
  | 'nostr'
  | 'vk';

export type PostStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'PUBLISHING'
  | 'PUBLISHED'
  | 'FAILED'
  | 'CANCELLED';
export type PostPlatformStatus =
  | 'PENDING'
  | 'SCHEDULED'
  | 'PUBLISHING'
  | 'PUBLISHED'
  | 'FAILED'
  | 'CANCELLED';

export interface SocialAccount {
  id: string;
  user_id: string;
  workspace_id?: string;
  platform: SocialPlatform;
  postiz_integration_id: string;
  platform_user_id?: string;
  platform_username?: string;
  display_name?: string;
  avatar?: string;
  follower_count: number;
  is_active: boolean;
  expires_at?: Date;
  last_sync_at?: Date;
  connection_metadata?: Record<string, any>;
  connected_at: Date;
  updated_at: Date;
}

export interface Post {
  id: string;
  user_id: string;
  workspace_id?: string;
  postiz_post_id?: string;
  title?: string;
  content: string;
  media_urls: string[];
  status: PostStatus;
  scheduled_for?: Date;
  published_at?: Date;
  settings?: Record<string, any>;
  error_message?: string;
  postiz_response?: Record<string, any>;
  created_at: Date;
  updated_at: Date;

  // Related data (joined from other tables)
  social_accounts?: PostPlatform[];
}

export interface PostPlatform {
  id: string;
  post_id: string;
  social_account_id: string;
  status: PostPlatformStatus;
  postiz_post_id?: string;
  platform_post_id?: string;
  error_message?: string;
  published_at?: Date;
  created_at: Date;

  // Joined data
  social_account?: SocialAccount;
}

// =============================================================================
// WORKSPACE AND TEAM INTERFACES
// =============================================================================

export interface EnhancedWorkspace {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  created_by: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;

  // Computed properties
  member_count?: number;
  social_accounts_count?: number;
  posts_count?: number;
}

export interface WorkspaceMembership {
  id: string;
  workspace_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  is_active: boolean;
  joined_at: Date;

  // Joined data
  user?: EnhancedUser;
  workspace?: EnhancedWorkspace;
}

export interface WorkspaceSocialAccount {
  id: string;
  workspace_id: string;
  social_account_id: string;
  is_active: boolean;
  linked_by: string;
  linked_at: Date;

  // Joined data
  social_account?: SocialAccount;
  workspace?: EnhancedWorkspace;
  linked_by_user?: EnhancedUser;
}

// =============================================================================
// WEBHOOK AND INTEGRATION INTERFACES
// =============================================================================

export type WebhookType =
  | 'post.created'
  | 'post.updated'
  | 'post.scheduled'
  | 'post.published'
  | 'post.failed'
  | 'post.cancelled'
  | 'social_account.connected'
  | 'social_account.disconnected'
  | 'billing.updated'
  | 'user.updated';

export type WebhookStatus = 'pending' | 'processed' | 'failed' | 'ignored';

export interface WebhookLog {
  id: string;
  webhook_type: WebhookType;
  source: string;
  postiz_post_id?: string;
  myapp1_post_id?: string;
  payload: Record<string, any>;
  status: WebhookStatus;
  processed_at?: Date;
  error_message?: string;
  retry_count: number;
  received_at: Date;

  // Joined data
  related_post?: Post;
}

// =============================================================================
// REQUEST/RESPONSE INTERFACES
// =============================================================================

// Auth interfaces
export interface AuthRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: EnhancedUser;
  token: string;
  expires_in: number;
  refresh_token?: string;
}

export interface RegisterRequest extends AuthRequest {
  first_name?: string;
  last_name?: string;
}

// Post creation interfaces
export interface CreatePostRequest {
  title?: string;
  content: string;
  media_urls?: string[];
  scheduled_for?: string;
  social_account_ids: string[];
  settings?: Record<string, any>;
  workspace_id?: string;
}

export interface UpdatePostRequest {
  title?: string;
  content?: string;
  media_urls?: string[];
  scheduled_for?: string;
  social_account_ids?: string[];
  settings?: Record<string, any>;
  status?: PostStatus;
}

export interface PostResponse {
  post: Post;
  social_accounts: PostPlatform[];
}

// Social account connection
export interface ConnectSocialAccountRequest {
  platform: SocialPlatform;
  workspace_id?: string;
  postiz_integration_id: string;
  platform_username?: string;
  display_name?: string;
  avatar?: string;
  follower_count?: number;
  connection_metadata?: Record<string, any>;
}

// Workspace interfaces
export interface CreateWorkspaceRequest {
  name: string;
  description?: string;
  avatar?: string;
}

export interface UpdateWorkspaceRequest {
  name?: string;
  description?: string;
  avatar?: string;
  is_active?: boolean;
}

export interface InviteToWorkspaceRequest {
  email: string;
  role: 'admin' | 'member';
}

// Billing interfaces
export interface UpdateBillingRequest {
  plan: PlanTier;
  billing_interval: BillingInterval;
}

export interface BillingUsageResponse {
  billing_info: BillingInfo;
  current_usage: {
    posts_this_month: number;
    social_accounts: number;
    workspaces: number;
    team_members: number;
  };
  plan_limits: PlanLimits;
  usage_percentages: {
    posts: number;
    social_accounts: number;
    workspaces: number;
    team_members: number;
  };
}

// =============================================================================
// API RESPONSE INTERFACES
// =============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    total_pages?: number;
  };
}

export interface PaginatedResponse<T = any> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next_page: boolean;
    has_prev_page: boolean;
  };
}

// Query interfaces
export interface QueryParams {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, any>;
}

export interface PostQueryParams extends QueryParams {
  status?: PostStatus;
  workspace_id?: string;
  platform?: SocialPlatform;
  scheduled_from?: string;
  scheduled_to?: string;
}

export interface SocialAccountQueryParams extends QueryParams {
  platform?: SocialPlatform;
  workspace_id?: string;
  is_active?: boolean;
}

// =============================================================================
// ERROR INTERFACES
// =============================================================================

export interface ApiError extends Error {
  status_code: number;
  error_code?: string;
  details?: Record<string, any>;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// =============================================================================
// POSTIZ INTEGRATION INTERFACES
// =============================================================================

export interface PostizIntegration {
  id: string;
  name: string;
  platform: SocialPlatform;
  username: string;
  avatar: string;
  disabled: boolean;
  inBetweenSteps?: boolean;
  refreshNeeded?: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  type?: string;
}

export interface PostizCreatePostRequest {
  content: string;
  title?: string;
  media?: string[];
  integrations: string[];
  settings?: {
    schedule?: string;
    timezone?: string;
  };
}

export interface PostizWebhookPayload {
  id: string;
  status: 'published' | 'failed' | 'cancelled';
  publishDate: string;
  content: string;
  integrations: PostizIntegration[];
  error?: string;
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type CreateRequest<T> = Omit<T, 'id' | 'created_at' | 'updated_at'>;
export type UpdateRequest<T> = DeepPartial<
  Omit<T, 'id' | 'created_at' | 'updated_at'>
>;

// Type guards
export function isPlanTier(value: string): value is PlanTier {
  return ['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'].includes(value);
}

export function isSocialPlatform(value: string): value is SocialPlatform {
  const platforms: SocialPlatform[] = [
    'x',
    'twitter',
    'linkedin',
    'linkedin-page',
    'reddit',
    'instagram',
    'instagram-standalone',
    'facebook',
    'threads',
    'youtube',
    'tiktok',
    'pinterest',
    'dribbble',
    'discord',
    'slack',
    'mastodon',
    'bluesky',
    'lemmy',
    'farcaster',
    'telegram',
    'nostr',
    'vk',
  ];
  return platforms.includes(value as SocialPlatform);
}

export function isPostStatus(value: string): value is PostStatus {
  return [
    'DRAFT',
    'SCHEDULED',
    'PUBLISHING',
    'PUBLISHED',
    'FAILED',
    'CANCELLED',
  ].includes(value);
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const SOCIAL_PLATFORM_DISPLAY_NAMES: Record<SocialPlatform, string> = {
  x: 'X (Twitter)',
  twitter: 'Twitter',
  linkedin: 'LinkedIn',
  'linkedin-page': 'LinkedIn Page',
  reddit: 'Reddit',
  instagram: 'Instagram',
  'instagram-standalone': 'Instagram Business',
  facebook: 'Facebook',
  threads: 'Threads',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  pinterest: 'Pinterest',
  dribbble: 'Dribbble',
  discord: 'Discord',
  slack: 'Slack',
  mastodon: 'Mastodon',
  bluesky: 'BlueSky',
  lemmy: 'Lemmy',
  farcaster: 'Farcaster',
  telegram: 'Telegram',
  nostr: 'Nostr',
  vk: 'VKontakte',
};

export const PLAN_DISPLAY_NAMES: Record<PlanTier, string> = {
  FREE: 'Free',
  STARTER: 'Starter',
  PROFESSIONAL: 'Professional',
  ENTERPRISE: 'Enterprise',
};

export const POST_STATUS_COLORS: Record<PostStatus, string> = {
  DRAFT: '#6B7280',
  SCHEDULED: '#3B82F6',
  PUBLISHING: '#F59E0B',
  PUBLISHED: '#10B981',
  FAILED: '#EF4444',
  CANCELLED: '#6B7280',
};
