/**
 * Enum definitions for status codes, roles, and other constants
 */

/**
 * HTTP Status Codes
 */
export enum HttpStatusCode {
  // 1xx Informational
  CONTINUE = 100,
  SWITCHING_PROTOCOLS = 101,
  PROCESSING = 102,

  // 2xx Success
  OK = 200,
  CREATED = 201,
  ACCEPTED = 202,
  NON_AUTHORITATIVE_INFORMATION = 203,
  NO_CONTENT = 204,
  RESET_CONTENT = 205,
  PARTIAL_CONTENT = 206,
  MULTI_STATUS = 207,
  ALREADY_REPORTED = 208,
  IM_USED = 226,

  // 3xx Redirection
  MULTIPLE_CHOICES = 300,
  MOVED_PERMANENTLY = 301,
  FOUND = 302,
  SEE_OTHER = 303,
  NOT_MODIFIED = 304,
  USE_PROXY = 305,
  TEMPORARY_REDIRECT = 307,
  PERMANENT_REDIRECT = 308,

  // 4xx Client Error
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  PAYMENT_REQUIRED = 402,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  METHOD_NOT_ALLOWED = 405,
  NOT_ACCEPTABLE = 406,
  PROXY_AUTHENTICATION_REQUIRED = 407,
  REQUEST_TIMEOUT = 408,
  CONFLICT = 409,
  GONE = 410,
  LENGTH_REQUIRED = 411,
  PRECONDITION_FAILED = 412,
  PAYLOAD_TOO_LARGE = 413,
  URI_TOO_LONG = 414,
  UNSUPPORTED_MEDIA_TYPE = 415,
  RANGE_NOT_SATISFIABLE = 416,
  EXPECTATION_FAILED = 417,
  IM_A_TEAPOT = 418,
  MISDIRECTED_REQUEST = 421,
  UNPROCESSABLE_ENTITY = 422,
  LOCKED = 423,
  FAILED_DEPENDENCY = 424,
  TOO_EARLY = 425,
  UPGRADE_REQUIRED = 426,
  PRECONDITION_REQUIRED = 428,
  TOO_MANY_REQUESTS = 429,
  REQUEST_HEADER_FIELDS_TOO_LARGE = 431,
  UNAVAILABLE_FOR_LEGAL_REASONS = 451,

  // 5xx Server Error
  INTERNAL_SERVER_ERROR = 500,
  NOT_IMPLEMENTED = 501,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
  GATEWAY_TIMEOUT = 504,
  HTTP_VERSION_NOT_SUPPORTED = 505,
  VARIANT_ALSO_NEGOTIATES = 506,
  INSUFFICIENT_STORAGE = 507,
  LOOP_DETECTED = 508,
  NOT_EXTENDED = 510,
  NETWORK_AUTHENTICATION_REQUIRED = 511,
}

/**
 * Application Error Codes
 */
export enum ErrorCode {
  // Authentication Errors
  AUTH_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',
  AUTH_TOKEN_EXPIRED = 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_INVALID = 'AUTH_TOKEN_INVALID',
  AUTH_TOKEN_MISSING = 'AUTH_TOKEN_MISSING',
  AUTH_INSUFFICIENT_PERMISSIONS = 'AUTH_INSUFFICIENT_PERMISSIONS',
  AUTH_ACCOUNT_LOCKED = 'AUTH_ACCOUNT_LOCKED',
  AUTH_ACCOUNT_DISABLED = 'AUTH_ACCOUNT_DISABLED',
  AUTH_PASSWORD_EXPIRED = 'AUTH_PASSWORD_EXPIRED',
  AUTH_TWO_FACTOR_REQUIRED = 'AUTH_TWO_FACTOR_REQUIRED',
  AUTH_SESSION_EXPIRED = 'AUTH_SESSION_EXPIRED',

  // Validation Errors
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  VALIDATION_REQUIRED_FIELD = 'VALIDATION_REQUIRED_FIELD',
  VALIDATION_INVALID_FORMAT = 'VALIDATION_INVALID_FORMAT',
  VALIDATION_OUT_OF_RANGE = 'VALIDATION_OUT_OF_RANGE',
  VALIDATION_DUPLICATE_VALUE = 'VALIDATION_DUPLICATE_VALUE',
  VALIDATION_CONSTRAINT_VIOLATION = 'VALIDATION_CONSTRAINT_VIOLATION',

  // Resource Errors
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  RESOURCE_GONE = 'RESOURCE_GONE',
  RESOURCE_LOCKED = 'RESOURCE_LOCKED',
  RESOURCE_ACCESS_DENIED = 'RESOURCE_ACCESS_DENIED',

  // Business Logic Errors
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  INSUFFICIENT_QUOTA = 'INSUFFICIENT_QUOTA',
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',
  PREREQUISITE_NOT_MET = 'PREREQUISITE_NOT_MET',
  LIMIT_EXCEEDED = 'LIMIT_EXCEEDED',

  // System Errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  DEPENDENCY_ERROR = 'DEPENDENCY_ERROR',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',

  // File/Upload Errors
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  FILE_TYPE_NOT_ALLOWED = 'FILE_TYPE_NOT_ALLOWED',
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  STORAGE_FULL = 'STORAGE_FULL',

  // Integration Errors
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  API_KEY_INVALID = 'API_KEY_INVALID',
  WEBHOOK_DELIVERY_FAILED = 'WEBHOOK_DELIVERY_FAILED',
  OAUTH_ERROR = 'OAUTH_ERROR',

  // Unknown/Generic
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * User Roles
 */
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest',
}

/**
 * Workspace Roles
 */
export enum WorkspaceRole {
  OWNER = 'owner',
  MANAGER = 'manager',
  EDITOR = 'editor',
  VIEWER = 'viewer',
}

/**
 * Permission Types
 */
export enum Permission {
  // User Management
  USER_CREATE = 'user:create',
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  USER_LIST = 'user:list',

  // Workspace Management
  WORKSPACE_CREATE = 'workspace:create',
  WORKSPACE_READ = 'workspace:read',
  WORKSPACE_UPDATE = 'workspace:update',
  WORKSPACE_DELETE = 'workspace:delete',
  WORKSPACE_LIST = 'workspace:list',
  WORKSPACE_SWITCH = 'workspace:switch',

  // Member Management
  MEMBER_INVITE = 'member:invite',
  MEMBER_REMOVE = 'member:remove',
  MEMBER_UPDATE_ROLE = 'member:update_role',
  MEMBER_VIEW = 'member:view',
  MEMBER_LIST = 'member:list',

  // Social Account Management
  SOCIAL_ACCOUNT_CONNECT = 'social_account:connect',
  SOCIAL_ACCOUNT_DISCONNECT = 'social_account:disconnect',
  SOCIAL_ACCOUNT_VIEW = 'social_account:view',
  SOCIAL_ACCOUNT_LIST = 'social_account:list',

  // Content Management
  CONTENT_CREATE = 'content:create',
  CONTENT_READ = 'content:read',
  CONTENT_UPDATE = 'content:update',
  CONTENT_DELETE = 'content:delete',
  CONTENT_PUBLISH = 'content:publish',
  CONTENT_SCHEDULE = 'content:schedule',

  // Analytics
  ANALYTICS_VIEW = 'analytics:view',
  ANALYTICS_EXPORT = 'analytics:export',

  // Settings
  SETTINGS_VIEW = 'settings:view',
  SETTINGS_UPDATE = 'settings:update',

  // Billing
  BILLING_VIEW = 'billing:view',
  BILLING_UPDATE = 'billing:update',

  // Admin Functions
  ADMIN_AUDIT_LOGS = 'admin:audit_logs',
  ADMIN_SYSTEM_HEALTH = 'admin:system_health',
  ADMIN_USER_MANAGEMENT = 'admin:user_management',
}

/**
 * Subscription Status
 */
export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELED = 'canceled',
  INCOMPLETE = 'incomplete',
  INCOMPLETE_EXPIRED = 'incomplete_expired',
  PAST_DUE = 'past_due',
  TRIALING = 'trialing',
  UNPAID = 'unpaid',
  PAUSED = 'paused',
}

/**
 * Payment Method Types
 */
export enum PaymentMethodType {
  CARD = 'card',
  BANK = 'bank',
  PAYPAL = 'paypal',
  APPLE_PAY = 'apple_pay',
  GOOGLE_PAY = 'google_pay',
  OTHER = 'other',
}

/**
 * Invoice Status
 */
export enum InvoiceStatus {
  DRAFT = 'draft',
  OPEN = 'open',
  PAID = 'paid',
  VOID = 'void',
  UNCOLLECTIBLE = 'uncollectible',
}

/**
 * OAuth Providers
 */
export enum OAuthProvider {
  GOOGLE = 'google',
  GITHUB = 'github',
  AZURE = 'azure',
  SLACK = 'slack',
  FACEBOOK = 'facebook',
  TWITTER = 'twitter',
  LINKEDIN = 'linkedin',
  DISCORD = 'discord',
}

/**
 * Social Media Platforms
 */
export enum SocialPlatform {
  TWITTER = 'twitter',
  FACEBOOK = 'facebook',
  INSTAGRAM = 'instagram',
  LINKEDIN = 'linkedin',
  YOUTUBE = 'youtube',
  TIKTOK = 'tiktok',
  PINTEREST = 'pinterest',
  SNAPCHAT = 'snapchat',
  REDDIT = 'reddit',
  DISCORD = 'discord',
  TELEGRAM = 'telegram',
  WHATSAPP = 'whatsapp',
}

/**
 * Post Status
 */
export enum PostStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  PUBLISHED = 'published',
  FAILED = 'failed',
  ARCHIVED = 'archived',
  DELETED = 'deleted',
}

/**
 * Content Types
 */
export enum ContentType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  LINK = 'link',
  POLL = 'poll',
  STORY = 'story',
  REEL = 'reel',
  CAROUSEL = 'carousel',
}

/**
 * File Types
 */
export enum FileType {
  // Images
  JPEG = 'image/jpeg',
  PNG = 'image/png',
  GIF = 'image/gif',
  WEBP = 'image/webp',
  SVG = 'image/svg+xml',
  BMP = 'image/bmp',
  TIFF = 'image/tiff',

  // Videos
  MP4 = 'video/mp4',
  AVI = 'video/avi',
  MOV = 'video/quicktime',
  WMV = 'video/x-ms-wmv',
  FLV = 'video/x-flv',
  WEBM = 'video/webm',
  MKV = 'video/x-matroska',

  // Audio
  MP3 = 'audio/mpeg',
  WAV = 'audio/wav',
  OGG = 'audio/ogg',
  AAC = 'audio/aac',
  FLAC = 'audio/flac',

  // Documents
  PDF = 'application/pdf',
  DOC = 'application/msword',
  DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  XLS = 'application/vnd.ms-excel',
  XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  PPT = 'application/vnd.ms-powerpoint',
  PPTX = 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  TXT = 'text/plain',
  RTF = 'application/rtf',

  // Archives
  ZIP = 'application/zip',
  RAR = 'application/x-rar-compressed',
  TAR = 'application/x-tar',
  GZIP = 'application/gzip',

  // Other
  JSON = 'application/json',
  XML = 'application/xml',
  CSV = 'text/csv',
}

/**
 * Log Levels
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  HTTP = 'http',
  VERBOSE = 'verbose',
  DEBUG = 'debug',
  SILLY = 'silly',
}

/**
 * Cache Strategies
 */
export enum CacheStrategy {
  CACHE_FIRST = 'cache_first',
  NETWORK_FIRST = 'network_first',
  CACHE_ONLY = 'cache_only',
  NETWORK_ONLY = 'network_only',
  STALE_WHILE_REVALIDATE = 'stale_while_revalidate',
}

/**
 * Job Status
 */
export enum JobStatus {
  WAITING = 'waiting',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DELAYED = 'delayed',
  PAUSED = 'paused',
}

/**
 * Job Priority
 */
export enum JobPriority {
  LOW = 1,
  NORMAL = 5,
  HIGH = 10,
  CRITICAL = 15,
}

/**
 * Notification Types
 */
export enum NotificationType {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
}

/**
 * Notification Channels
 */
export enum NotificationChannel {
  EMAIL = 'email',
  PUSH = 'push',
  SMS = 'sms',
  SLACK = 'slack',
  DISCORD = 'discord',
  WEBHOOK = 'webhook',
  IN_APP = 'in_app',
}

/**
 * Webhook Events
 */
export enum WebhookEvent {
  USER_CREATED = 'user.created',
  USER_UPDATED = 'user.updated',
  USER_DELETED = 'user.deleted',
  WORKSPACE_CREATED = 'workspace.created',
  WORKSPACE_UPDATED = 'workspace.updated',
  WORKSPACE_DELETED = 'workspace.deleted',
  MEMBER_INVITED = 'member.invited',
  MEMBER_JOINED = 'member.joined',
  MEMBER_LEFT = 'member.left',
  MEMBER_ROLE_UPDATED = 'member.role_updated',
  POST_PUBLISHED = 'post.published',
  POST_FAILED = 'post.failed',
  POST_SCHEDULED = 'post.scheduled',
  SOCIAL_ACCOUNT_CONNECTED = 'social_account.connected',
  SOCIAL_ACCOUNT_DISCONNECTED = 'social_account.disconnected',
  SUBSCRIPTION_CREATED = 'subscription.created',
  SUBSCRIPTION_UPDATED = 'subscription.updated',
  SUBSCRIPTION_CANCELED = 'subscription.canceled',
  INVOICE_CREATED = 'invoice.created',
  INVOICE_PAID = 'invoice.paid',
  INVOICE_FAILED = 'invoice.failed',
}

/**
 * Environment Types
 */
export enum Environment {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
  TEST = 'test',
}

/**
 * Theme Types
 */
export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
  AUTO = 'auto',
}

/**
 * Time Formats
 */
export enum TimeFormat {
  TWELVE_HOUR = '12h',
  TWENTY_FOUR_HOUR = '24h',
}

/**
 * Date Formats
 */
export enum DateFormat {
  MM_DD_YYYY = 'MM/DD/YYYY',
  DD_MM_YYYY = 'DD/MM/YYYY',
  YYYY_MM_DD = 'YYYY-MM-DD',
  DD_MMM_YYYY = 'DD MMM YYYY',
  MMM_DD_YYYY = 'MMM DD, YYYY',
}

/**
 * Language Codes (ISO 639-1)
 */
export enum LanguageCode {
  ENGLISH = 'en',
  SPANISH = 'es',
  FRENCH = 'fr',
  GERMAN = 'de',
  ITALIAN = 'it',
  PORTUGUESE = 'pt',
  RUSSIAN = 'ru',
  CHINESE = 'zh',
  JAPANESE = 'ja',
  KOREAN = 'ko',
  ARABIC = 'ar',
  HINDI = 'hi',
  DUTCH = 'nl',
  SWEDISH = 'sv',
  NORWEGIAN = 'no',
  DANISH = 'da',
  FINNISH = 'fi',
  POLISH = 'pl',
  CZECH = 'cs',
  HUNGARIAN = 'hu',
  ROMANIAN = 'ro',
  TURKISH = 'tr',
  GREEK = 'el',
  HEBREW = 'he',
  THAI = 'th',
  VIETNAMESE = 'vi',
  INDONESIAN = 'id',
  MALAY = 'ms',
  FILIPINO = 'fil',
}

/**
 * Currency Codes (ISO 4217)
 */
export enum CurrencyCode {
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
  JPY = 'JPY',
  CAD = 'CAD',
  AUD = 'AUD',
  CHF = 'CHF',
  CNY = 'CNY',
  SEK = 'SEK',
  NZD = 'NZD',
  MXN = 'MXN',
  SGD = 'SGD',
  HKD = 'HKD',
  NOK = 'NOK',
  KRW = 'KRW',
  TRY = 'TRY',
  RUB = 'RUB',
  INR = 'INR',
  BRL = 'BRL',
  ZAR = 'ZAR',
}

/**
 * Country Codes (ISO 3166-1 alpha-2)
 */
export enum CountryCode {
  US = 'US',
  CA = 'CA',
  GB = 'GB',
  DE = 'DE',
  FR = 'FR',
  IT = 'IT',
  ES = 'ES',
  PT = 'PT',
  NL = 'NL',
  SE = 'SE',
  NO = 'NO',
  DK = 'DK',
  FI = 'FI',
  PL = 'PL',
  CZ = 'CZ',
  HU = 'HU',
  RO = 'RO',
  TR = 'TR',
  GR = 'GR',
  IL = 'IL',
  RU = 'RU',
  CN = 'CN',
  JP = 'JP',
  KR = 'KR',
  IN = 'IN',
  AU = 'AU',
  NZ = 'NZ',
  BR = 'BR',
  MX = 'MX',
  AR = 'AR',
  CL = 'CL',
  CO = 'CO',
  PE = 'PE',
  SG = 'SG',
  HK = 'HK',
  TH = 'TH',
  VN = 'VN',
  ID = 'ID',
  MY = 'MY',
  PH = 'PH',
  ZA = 'ZA',
}

/**
 * Timezone Identifiers (common ones)
 */
export enum Timezone {
  UTC = 'UTC',
  AMERICA_NEW_YORK = 'America/New_York',
  AMERICA_CHICAGO = 'America/Chicago',
  AMERICA_DENVER = 'America/Denver',
  AMERICA_LOS_ANGELES = 'America/Los_Angeles',
  AMERICA_TORONTO = 'America/Toronto',
  AMERICA_SAO_PAULO = 'America/Sao_Paulo',
  EUROPE_LONDON = 'Europe/London',
  EUROPE_PARIS = 'Europe/Paris',
  EUROPE_BERLIN = 'Europe/Berlin',
  EUROPE_ROME = 'Europe/Rome',
  EUROPE_MADRID = 'Europe/Madrid',
  EUROPE_AMSTERDAM = 'Europe/Amsterdam',
  EUROPE_STOCKHOLM = 'Europe/Stockholm',
  EUROPE_MOSCOW = 'Europe/Moscow',
  ASIA_TOKYO = 'Asia/Tokyo',
  ASIA_SHANGHAI = 'Asia/Shanghai',
  ASIA_SEOUL = 'Asia/Seoul',
  ASIA_KOLKATA = 'Asia/Kolkata',
  ASIA_SINGAPORE = 'Asia/Singapore',
  ASIA_HONG_KONG = 'Asia/Hong_Kong',
  AUSTRALIA_SYDNEY = 'Australia/Sydney',
  AUSTRALIA_MELBOURNE = 'Australia/Melbourne',
  PACIFIC_AUCKLAND = 'Pacific/Auckland',
}