/**
 * Entity interfaces for User, Workspace, Authentication, and API responses
 */

import { User as SupabaseUser, Session as SupabaseSession } from '@supabase/supabase-js';

/**
 * Enhanced User interface extending Supabase User
 */
export interface User extends SupabaseUser {
  profile?: UserProfile;
  preferences?: UserPreferences;
  subscription?: UserSubscription;
  permissions?: string[];
  lastLoginAt?: string;
  loginCount?: number;
  isActive?: boolean;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  twoFactorEnabled?: boolean;
  termsAcceptedAt?: string;
  privacyAcceptedAt?: string;
}

/**
 * User profile information
 */
export interface UserProfile {
  id: string;
  userId: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  company?: string;
  jobTitle?: string;
  department?: string;
  location?: string;
  timezone?: string;
  locale?: string;
  website?: string;
  socialLinks?: {
    linkedin?: string;
    twitter?: string;
    github?: string;
    instagram?: string;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * User preferences and settings
 */
export interface UserPreferences {
  id: string;
  userId: string;
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  notifications: {
    email: NotificationPreferences;
    push: NotificationPreferences;
    inApp: NotificationPreferences;
    sms?: NotificationPreferences;
  };
  privacy: {
    profileVisibility: 'public' | 'private' | 'workspace';
    showEmail: boolean;
    showPhone: boolean;
    allowAnalytics: boolean;
    allowMarketing: boolean;
  };
  accessibility: {
    highContrast: boolean;
    reducedMotion: boolean;
    screenReader: boolean;
    fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  };
  dashboard: {
    defaultWorkspace?: string;
    layout: 'grid' | 'list';
    itemsPerPage: number;
    showWelcome: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Notification preferences
 */
export interface NotificationPreferences {
  enabled: boolean;
  workspaceInvites: boolean;
  workspaceUpdates: boolean;
  accountUpdates: boolean;
  securityAlerts: boolean;
  systemMaintenance: boolean;
  productUpdates: boolean;
  marketing: boolean;
  frequency: 'immediate' | 'daily' | 'weekly' | 'never';
  quietHours?: {
    enabled: boolean;
    startTime: string; // HH:mm format
    endTime: string; // HH:mm format
    timezone: string;
  };
}

/**
 * User subscription information
 */
export interface UserSubscription {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  cancelAt?: string;
  canceledAt?: string;
  trialStart?: string;
  trialEnd?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  paymentMethod?: PaymentMethod;
  usage?: SubscriptionUsage;
  createdAt: string;
  updatedAt: string;
}

/**
 * Subscription plan details
 */
export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: 'day' | 'week' | 'month' | 'year';
  intervalCount: number;
  trialPeriodDays?: number;
  features: PlanFeature[];
  limits: PlanLimits;
  isActive: boolean;
  stripePriceId?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Plan feature definition
 */
export interface PlanFeature {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  unlimited?: boolean;
  limit?: number;
  unit?: string;
}

/**
 * Plan limits and quotas
 */
export interface PlanLimits {
  workspaces: number | 'unlimited';
  members: number | 'unlimited';
  socialAccounts: number | 'unlimited';
  postsPerMonth: number | 'unlimited';
  scheduledPosts: number | 'unlimited';
  analyticsRetention: number; // days
  storageGB: number | 'unlimited';
  apiRequests: number | 'unlimited';
  customBranding: boolean;
  prioritySupport: boolean;
  ssoEnabled: boolean;
  auditLogs: boolean;
}

/**
 * Subscription status enumeration
 */
export type SubscriptionStatus =
  | 'active'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'past_due'
  | 'trialing'
  | 'unpaid'
  | 'paused';

/**
 * Payment method information
 */
export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank' | 'paypal' | 'other';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  stripePaymentMethodId?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Subscription usage tracking
 */
export interface SubscriptionUsage {
  period: {
    start: string;
    end: string;
  };
  metrics: {
    workspacesUsed: number;
    membersAdded: number;
    socialAccountsConnected: number;
    postsPublished: number;
    postsScheduled: number;
    storageUsedGB: number;
    apiRequestsMade: number;
  };
  lastUpdated: string;
}

/**
 * Enhanced Workspace entity
 */
export interface WorkspaceEntity {
  id: string;
  name: string;
  slug: string;
  description?: string;
  avatarUrl?: string;
  coverImageUrl?: string;
  ownerId: string;
  planId?: string;
  settings: WorkspaceSettings;
  billing?: WorkspaceBilling;
  stats?: WorkspaceStats;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

/**
 * Workspace settings
 */
export interface WorkspaceSettings {
  general: {
    timezone: string;
    locale: string;
    dateFormat: string;
    timeFormat: '12h' | '24h';
    weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday, 1 = Monday, etc.
  };
  branding: {
    primaryColor?: string;
    secondaryColor?: string;
    logoUrl?: string;
    faviconUrl?: string;
    customDomain?: string;
  };
  posting: {
    defaultSchedule: WeeklySchedule;
    autoApprove: boolean;
    requireApproval: string[]; // array of post types that require approval
    allowSchedulingPastDate: boolean;
    maxScheduledPosts: number;
    defaultHashtags: string[];
  };
  notifications: {
    email: WorkspaceNotificationSettings;
    slack?: SlackIntegrationSettings;
    discord?: DiscordIntegrationSettings;
    webhook?: WebhookSettings;
  };
  security: {
    requireTwoFactor: boolean;
    allowedDomains: string[];
    sessionTimeout: number; // minutes
    passwordPolicy: PasswordPolicy;
    ipWhitelist: string[];
  };
  integrations: {
    analytics: AnalyticsSettings;
    storage: StorageSettings;
    ai: AISettings;
  };
}

/**
 * Weekly schedule configuration
 */
export interface WeeklySchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

/**
 * Day schedule configuration
 */
export interface DaySchedule {
  enabled: boolean;
  times: string[]; // Array of time strings in HH:mm format
}

/**
 * Workspace notification settings
 */
export interface WorkspaceNotificationSettings {
  enabled: boolean;
  memberJoined: boolean;
  memberLeft: boolean;
  postPublished: boolean;
  postFailed: boolean;
  scheduleCompleted: boolean;
  mentionsReceived: boolean;
  lowBalance: boolean;
  planExpiring: boolean;
  recipientEmails: string[];
}

/**
 * Slack integration settings
 */
export interface SlackIntegrationSettings {
  enabled: boolean;
  webhookUrl: string;
  channel: string;
  username?: string;
  iconEmoji?: string;
  events: string[];
}

/**
 * Discord integration settings
 */
export interface DiscordIntegrationSettings {
  enabled: boolean;
  webhookUrl: string;
  username?: string;
  avatarUrl?: string;
  events: string[];
}

/**
 * Webhook settings
 */
export interface WebhookSettings {
  enabled: boolean;
  url: string;
  secret?: string;
  events: string[];
  headers?: Record<string, string>;
  retries: number;
  timeout: number;
}

/**
 * Password policy configuration
 */
export interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  forbiddenWords: string[];
  preventReuse: number; // Number of previous passwords to check
  maxAge: number; // Days before password expires
}

/**
 * Analytics settings
 */
export interface AnalyticsSettings {
  enabled: boolean;
  provider: 'google' | 'adobe' | 'mixpanel' | 'custom';
  trackingId?: string;
  customEvents: boolean;
  dataRetention: number; // days
}

/**
 * Storage settings
 */
export interface StorageSettings {
  provider: 'supabase' | 'aws' | 'gcp' | 'azure';
  bucket: string;
  maxFileSize: number; // bytes
  allowedFileTypes: string[];
  compression: boolean;
  cdn?: {
    enabled: boolean;
    domain: string;
  };
}

/**
 * AI settings
 */
export interface AISettings {
  enabled: boolean;
  provider: 'openai' | 'anthropic' | 'custom';
  features: {
    contentGeneration: boolean;
    hashtagSuggestions: boolean;
    sentimentAnalysis: boolean;
    imageAltText: boolean;
    translations: boolean;
  };
  limits: {
    requestsPerDay: number;
    tokensPerRequest: number;
  };
}

/**
 * Workspace billing information
 */
export interface WorkspaceBilling {
  subscriptionId?: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  nextBillingDate?: string;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
  currency: string;
  paymentMethod?: PaymentMethod;
  billingAddress?: BillingAddress;
  invoices?: Invoice[];
}

/**
 * Billing address
 */
export interface BillingAddress {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  taxId?: string;
}

/**
 * Invoice information
 */
export interface Invoice {
  id: string;
  number: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  amount: number;
  currency: string;
  dueDate: string;
  paidAt?: string;
  downloadUrl?: string;
  items: InvoiceItem[];
  createdAt: string;
}

/**
 * Invoice item
 */
export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  period?: {
    start: string;
    end: string;
  };
}

/**
 * Workspace statistics
 */
export interface WorkspaceStats {
  members: {
    total: number;
    active: number;
    invited: number;
  };
  socialAccounts: {
    total: number;
    connected: number;
    byProvider: Record<string, number>;
  };
  posts: {
    total: number;
    published: number;
    scheduled: number;
    draft: number;
    failed: number;
    thisMonth: number;
    lastMonth: number;
  };
  engagement: {
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    averageEngagementRate: number;
  };
  storage: {
    used: number; // bytes
    limit: number; // bytes
    percentage: number;
  };
  lastUpdated: string;
}

/**
 * Enhanced Authentication Session
 */
export interface AuthenticationSession extends SupabaseSession {
  workspace?: {
    id: string;
    name: string;
    role: string;
    permissions: string[];
  };
  device?: DeviceInfo;
  location?: LocationInfo;
  isActive: boolean;
  lastActivity: string;
  createdAt: string;
  expiresAt: string;
}

/**
 * Device information for sessions
 */
export interface DeviceInfo {
  userAgent: string;
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  device: string;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  fingerprint?: string;
}

/**
 * Location information for sessions
 */
export interface LocationInfo {
  ip: string;
  country?: string;
  region?: string;
  city?: string;
  timezone?: string;
  isp?: string;
  lat?: number;
  lon?: number;
}

/**
 * API response metadata
 */
export interface ApiResponseMetadata {
  requestId: string;
  timestamp: string;
  version: string;
  duration: number;
  rateLimitRemaining?: number;
  rateLimitReset?: number;
  cacheStatus?: 'hit' | 'miss' | 'stale';
  deprecationWarnings?: DeprecationWarning[];
}

/**
 * Deprecation warning
 */
export interface DeprecationWarning {
  message: string;
  deprecatedAt: string;
  removalDate?: string;
  replacement?: string;
  documentationUrl?: string;
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  id: string;
  workspaceId: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  changes?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
  };
  metadata?: {
    ip: string;
    userAgent: string;
    source: 'web' | 'api' | 'mobile' | 'webhook';
    apiKey?: string;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
}

/**
 * Activity log entry
 */
export interface ActivityLogEntry {
  id: string;
  userId: string;
  workspaceId?: string;
  type: 'login' | 'logout' | 'create' | 'update' | 'delete' | 'view' | 'export' | 'import';
  description: string;
  metadata?: Record<string, any>;
  createdAt: string;
}