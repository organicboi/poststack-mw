/**
 * Utility types for Request extensions, Database entities, and Configuration options
 */

import { Request, Response, NextFunction } from 'express';
import { User, AuthenticationSession } from './entity.types';
import { WorkspaceRole, WorkspacePermissions } from '../modules/workspace/workspace.types';

/**
 * Extended Express Request interface with authentication and workspace context
 */
export interface AuthenticatedRequest extends Request {
  user?: User;
  session?: AuthenticationSession;
  workspace?: WorkspaceContext;
  permissions?: string[];
  serviceKey?: ServiceKeyContext;
  rateLimitInfo?: RateLimitInfo;
  requestId?: string;
  startTime?: number;
  clientInfo?: ClientInfo;
}

/**
 * Workspace context attached to requests
 */
export interface WorkspaceContext {
  id: string;
  name: string;
  role: WorkspaceRole;
  permissions: WorkspacePermissions;
  isDefault: boolean;
  settings?: Record<string, any>;
  subscription?: {
    plan: string;
    status: string;
    limits: Record<string, any>;
  };
}

/**
 * Service key context for API authentication
 */
export interface ServiceKeyContext {
  id: string;
  name: string;
  permissions: string[];
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
  allowedOrigins?: string[];
  metadata?: Record<string, any>;
}

/**
 * Rate limiting information
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

/**
 * Client information extracted from request
 */
export interface ClientInfo {
  ip: string;
  userAgent: string;
  browser?: string;
  os?: string;
  device?: string;
  country?: string;
  region?: string;
  city?: string;
}

/**
 * Extended Express Response interface with custom methods
 */
export interface CustomResponse extends Response {
  success: <T>(data: T, message?: string, meta?: Record<string, any>) => void;
  error: (code: string, message: string, details?: Record<string, any>) => void;
  paginated: <T>(
    data: T[],
    page: number,
    limit: number,
    total: number,
    message?: string
  ) => void;
  cached: (data: any, ttl?: number) => void;
}

/**
 * Middleware function type with custom request/response
 */
export type CustomMiddleware = (
  req: AuthenticatedRequest,
  res: CustomResponse,
  next: NextFunction
) => void | Promise<void>;

/**
 * Database entity base interface
 */
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  version?: number;
  metadata?: Record<string, any>;
}

/**
 * Soft delete entity interface
 */
export interface SoftDeleteEntity extends BaseEntity {
  isDeleted: boolean;
  deletedBy?: string;
  deletedReason?: string;
}

/**
 * Auditable entity interface
 */
export interface AuditableEntity extends BaseEntity {
  createdBy: string;
  updatedBy: string;
  auditLog?: AuditEntry[];
}

/**
 * Audit entry for entity changes
 */
export interface AuditEntry {
  action: 'create' | 'update' | 'delete' | 'restore';
  userId: string;
  timestamp: string;
  changes?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
  };
  metadata?: Record<string, any>;
}

/**
 * Timestamped entity interface
 */
export interface TimestampedEntity {
  createdAt: string;
  updatedAt: string;
}

/**
 * Versioned entity interface
 */
export interface VersionedEntity {
  version: number;
  previousVersions?: EntityVersion[];
}

/**
 * Entity version information
 */
export interface EntityVersion {
  version: number;
  data: Record<string, any>;
  createdAt: string;
  createdBy: string;
  changeReason?: string;
}

/**
 * Database query options
 */
export interface QueryOptions {
  select?: string[];
  where?: WhereClause;
  orderBy?: OrderByClause[];
  limit?: number;
  offset?: number;
  include?: string[];
  exclude?: string[];
  withDeleted?: boolean;
  transaction?: any;
}

/**
 * Where clause for database queries
 */
export type WhereClause = {
  [key: string]: any | {
    $eq?: any;
    $ne?: any;
    $gt?: any;
    $gte?: any;
    $lt?: any;
    $lte?: any;
    $in?: any[];
    $nin?: any[];
    $like?: string;
    $ilike?: string;
    $null?: boolean;
    $and?: WhereClause[];
    $or?: WhereClause[];
  };
};

/**
 * Order by clause for database queries
 */
export interface OrderByClause {
  field: string;
  direction: 'asc' | 'desc';
  nulls?: 'first' | 'last';
}

/**
 * Database transaction options
 */
export interface TransactionOptions {
  isolationLevel?: 'READ_UNCOMMITTED' | 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE';
  readOnly?: boolean;
  deferrable?: boolean;
  timeout?: number;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

/**
 * Sorting parameters
 */
export interface SortingParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Filtering parameters
 */
export interface FilteringParams {
  search?: string;
  filters?: Record<string, any>;
  dateRange?: {
    start: string;
    end: string;
  };
}

/**
 * Query parameters combining pagination, sorting, and filtering
 */
export interface QueryParams extends PaginationParams, SortingParams, FilteringParams {
  include?: string[];
  exclude?: string[];
  withDeleted?: boolean;
}

/**
 * Configuration option base interface
 */
export interface ConfigOption<T = any> {
  key: string;
  value: T;
  type: ConfigOptionType;
  description?: string;
  defaultValue?: T;
  required?: boolean;
  validation?: ConfigValidation<T>;
  category?: string;
  tags?: string[];
  deprecated?: boolean;
  deprecationMessage?: string;
  replacedBy?: string;
  environment?: string[];
  sensitive?: boolean;
}

/**
 * Configuration option types
 */
export type ConfigOptionType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'array'
  | 'object'
  | 'date'
  | 'url'
  | 'email'
  | 'json'
  | 'password'
  | 'enum';

/**
 * Configuration validation rules
 */
export interface ConfigValidation<T> {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  enum?: T[];
  custom?: (value: T) => boolean | string;
  required?: boolean;
}

/**
 * Environment configuration
 */
export interface EnvironmentConfig {
  [key: string]: ConfigOption;
}

/**
 * Feature flag configuration
 */
export interface FeatureFlagConfig {
  name: string;
  enabled: boolean;
  description?: string;
  rolloutPercentage?: number;
  targetUsers?: string[];
  targetWorkspaces?: string[];
  conditions?: FeatureFlagCondition[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

/**
 * Feature flag condition
 */
export interface FeatureFlagCondition {
  type: 'user' | 'workspace' | 'subscription' | 'location' | 'time' | 'custom';
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'greater_than' | 'less_than' | 'contains';
  field: string;
  value: any;
}

/**
 * Cache configuration
 */
export interface CacheOptions {
  key: string;
  ttl?: number;
  tags?: string[];
  namespace?: string;
  compress?: boolean;
  serialize?: boolean;
  fallback?: () => Promise<any>;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  keys: number;
  memory: number;
  evictions: number;
  errors: number;
}

/**
 * Job queue configuration
 */
export interface JobConfig {
  name: string;
  data: Record<string, any>;
  options?: JobOptions;
}

/**
 * Job execution options
 */
export interface JobOptions {
  priority?: number;
  delay?: number;
  repeat?: {
    cron?: string;
    every?: number;
    limit?: number;
    endDate?: Date;
  };
  attempts?: number;
  backoff?: {
    type: 'fixed' | 'exponential';
    delay: number;
  };
  lifo?: boolean;
  timeout?: number;
  removeOnComplete?: boolean | number;
  removeOnFail?: boolean | number;
}

/**
 * Job status information
 */
export interface JobStatus {
  id: string;
  name: string;
  data: Record<string, any>;
  progress: number;
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'paused';
  result?: any;
  error?: string;
  createdAt: string;
  processedAt?: string;
  finishedAt?: string;
  attempts: number;
  maxAttempts: number;
}

/**
 * Webhook configuration
 */
export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret?: string;
  headers?: Record<string, string>;
  timeout: number;
  retries: number;
  retryDelay: number;
  isActive: boolean;
  lastTriggered?: string;
  lastStatus?: number;
  metadata?: Record<string, any>;
}

/**
 * Webhook delivery information
 */
export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  payload: Record<string, any>;
  status: 'pending' | 'success' | 'failed' | 'retrying';
  httpStatus?: number;
  response?: string;
  error?: string;
  attempts: number;
  maxAttempts: number;
  nextRetryAt?: string;
  createdAt: string;
  deliveredAt?: string;
}

/**
 * Search configuration
 */
export interface SearchConfig {
  query: string;
  fields?: string[];
  filters?: Record<string, any>;
  sort?: SortingParams[];
  facets?: string[];
  highlight?: boolean;
  fuzzy?: boolean;
  boost?: Record<string, number>;
  pagination?: PaginationParams;
}

/**
 * Search result
 */
export interface SearchResult<T = any> {
  data: T[];
  total: number;
  facets?: Record<string, SearchFacet>;
  aggregations?: Record<string, any>;
  suggestions?: string[];
  took: number;
}

/**
 * Search facet
 */
export interface SearchFacet {
  field: string;
  values: SearchFacetValue[];
}

/**
 * Search facet value
 */
export interface SearchFacetValue {
  value: string;
  count: number;
  selected?: boolean;
}

/**
 * Notification configuration
 */
export interface NotificationConfig {
  id: string;
  type: 'email' | 'push' | 'sms' | 'slack' | 'webhook';
  template: string;
  recipients: string[];
  data: Record<string, any>;
  priority: 'low' | 'normal' | 'high' | 'critical';
  scheduledAt?: string;
  expiresAt?: string;
  metadata?: Record<string, any>;
}

/**
 * Notification delivery status
 */
export interface NotificationDelivery {
  id: string;
  notificationId: string;
  recipient: string;
  channel: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';
  error?: string;
  deliveredAt?: string;
  openedAt?: string;
  clickedAt?: string;
  metadata?: Record<string, any>;
}

/**
 * Utility type for making all properties optional
 */
export type Partial<T> = {
  [P in keyof T]?: T[P];
};

/**
 * Utility type for making all properties required
 */
export type Required<T> = {
  [P in keyof T]-?: T[P];
};

/**
 * Utility type for picking specific properties
 */
export type Pick<T, K extends keyof T> = {
  [P in K]: T[P];
};

/**
 * Utility type for omitting specific properties
 */
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

/**
 * Utility type for creating types with specific properties as optional
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Utility type for creating types with specific properties as required
 */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/**
 * Utility type for deep partial
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Utility type for deep required
 */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

/**
 * Utility type for creating a type with nullable properties
 */
export type Nullable<T> = {
  [P in keyof T]: T[P] | null;
};

/**
 * Utility type for creating a type without null properties
 */
export type NonNullable<T> = {
  [P in keyof T]: NonNullable<T[P]>;
};

/**
 * Utility type for creating update payloads
 */
export type UpdatePayload<T> = Partial<Omit<T, 'id' | 'createdAt' | 'createdBy'>>;

/**
 * Utility type for creating create payloads
 */
export type CreatePayload<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Utility type for database entity without timestamps
 */
export type WithoutTimestamps<T> = Omit<T, 'createdAt' | 'updatedAt'>;

/**
 * Utility type for database entity with timestamps
 */
export type WithTimestamps<T> = T & TimestampedEntity;

/**
 * Utility type for API response data
 */
export type ResponseData<T> = T extends Array<infer U> ? U[] : T;

/**
 * Utility type for extracting promise return type
 */
export type PromiseType<T> = T extends Promise<infer U> ? U : never;

/**
 * Utility type for function parameters
 */
export type Parameters<T extends (...args: any) => any> = T extends (...args: infer P) => any ? P : never;

/**
 * Utility type for function return type
 */
export type ReturnType<T extends (...args: any) => any> = T extends (...args: any) => infer R ? R : any;