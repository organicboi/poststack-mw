/**
 * Service configuration interfaces for the middleware system
 */

/**
 * Service key configuration for authentication
 */
export interface ServiceKeyConfig {
  key: string;
  name: string;
  description?: string;
  permissions: string[];
  isActive: boolean;
  expiresAt?: Date;
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
  allowedOrigins?: string[];
  allowedIps?: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Proxy configuration for backend communication
 */
export interface ProxyConfig {
  target: string;
  changeOrigin: boolean;
  timeout: number;
  retries: number;
  retryDelay: number;
  headers?: Record<string, string>;
  pathRewrite?: Record<string, string>;
  onProxyReq?: (proxyReq: any, req: any, res: any) => void;
  onProxyRes?: (proxyRes: any, req: any, res: any) => void;
  onError?: (err: any, req: any, res: any) => void;
  auth?: {
    username: string;
    password: string;
  };
  secure?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'silent';
  cookieDomainRewrite?: string | Record<string, string>;
  cookiePathRewrite?: string | Record<string, string>;
}

/**
 * Complete middleware configuration
 */
export interface MiddlewareConfig {
  server: ServerConfig;
  database: DatabaseConfig;
  authentication: AuthenticationConfig;
  cors: CorsConfig;
  security: SecurityConfig;
  logging: LoggingConfig;
  proxy: ProxyRouteConfig[];
  cache: CacheConfig;
  rateLimit: RateLimitConfig;
  monitoring: MonitoringConfig;
  features: FeatureFlags;
  environment: EnvironmentConfig;
}

/**
 * Server configuration
 */
export interface ServerConfig {
  port: number;
  host: string;
  environment: 'development' | 'staging' | 'production' | 'test';
  ssl?: {
    enabled: boolean;
    cert?: string;
    key?: string;
    ca?: string;
  };
  compression: {
    enabled: boolean;
    level?: number;
    threshold?: number;
  };
  bodyParser: {
    jsonLimit: string;
    urlEncodedLimit: string;
    extended: boolean;
  };
  timeout: number;
  keepAliveTimeout: number;
  headersTimeout: number;
}

/**
 * Database configuration
 */
export interface DatabaseConfig {
  supabase: {
    url: string;
    anonKey: string;
    serviceKey: string;
    schema?: string;
    maxConnections?: number;
    connectionTimeout?: number;
    requestTimeout?: number;
    retryAttempts?: number;
    retryDelay?: number;
  };
  redis?: {
    url: string;
    host?: string;
    port?: number;
    password?: string;
    database?: number;
    maxRetries?: number;
    retryDelayOnFailover?: number;
    enableOfflineQueue?: boolean;
    family?: 4 | 6;
    keepAlive?: number;
    connectTimeout?: number;
    lazyConnect?: boolean;
  };
}

/**
 * Authentication configuration
 */
export interface AuthenticationConfig {
  jwt: {
    secret?: string;
    expiresIn: string;
    refreshExpiresIn: string;
    algorithm: 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512';
    issuer?: string;
    audience?: string;
  };
  session: {
    secret: string;
    name: string;
    resave: boolean;
    saveUninitialized: boolean;
    cookie: {
      secure: boolean;
      httpOnly: boolean;
      maxAge: number;
      sameSite: 'strict' | 'lax' | 'none';
      domain?: string;
    };
  };
  oauth: {
    google?: OAuthProviderConfig;
    github?: OAuthProviderConfig;
    azure?: OAuthProviderConfig;
    slack?: OAuthProviderConfig;
  };
  passwordPolicy: {
    minLength: number;
    requireNumbers: boolean;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireSpecialChars: boolean;
    forbiddenPasswords?: string[];
  };
  lockout: {
    maxAttempts: number;
    lockoutDuration: number;
    resetTime: number;
  };
}

/**
 * OAuth provider configuration
 */
export interface OAuthProviderConfig {
  clientId: string;
  clientSecret: string;
  scope: string[];
  callbackUrl: string;
  authorizationUrl?: string;
  tokenUrl?: string;
  userInfoUrl?: string;
  enabled: boolean;
}

/**
 * CORS configuration
 */
export interface CorsConfig {
  origin: string | string[] | boolean | ((origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => void);
  credentials: boolean;
  optionsSuccessStatus: number;
  preflightContinue: boolean;
  methods: string[];
  allowedHeaders: string[];
  exposedHeaders?: string[];
  maxAge?: number;
}

/**
 * Security configuration
 */
export interface SecurityConfig {
  helmet: {
    enabled: boolean;
    contentSecurityPolicy?: any;
    crossOriginEmbedderPolicy?: boolean;
    crossOriginOpenerPolicy?: any;
    crossOriginResourcePolicy?: any;
    dnsPrefetchControl?: any;
    frameguard?: any;
    hidePoweredBy?: boolean;
    hsts?: any;
    ieNoOpen?: boolean;
    noSniff?: boolean;
    originAgentCluster?: boolean;
    permittedCrossDomainPolicies?: any;
    referrerPolicy?: any;
    xssFilter?: boolean;
  };
  rateLimiting: {
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests: boolean;
    skipFailedRequests: boolean;
    keyGenerator?: (req: any) => string;
  };
  encryption: {
    algorithm: string;
    keyLength: number;
    ivLength: number;
  };
}

/**
 * Logging configuration
 */
export interface LoggingConfig {
  level: 'error' | 'warn' | 'info' | 'verbose' | 'debug' | 'silly';
  format: 'json' | 'simple' | 'combined';
  transports: LogTransportConfig[];
  colorize: boolean;
  timestamp: boolean;
  prettyPrint: boolean;
  showLevel: boolean;
  maxSize?: string;
  maxFiles?: number;
  datePattern?: string;
  zippedArchive?: boolean;
}

/**
 * Log transport configuration
 */
export interface LogTransportConfig {
  type: 'console' | 'file' | 'http' | 'stream';
  level?: string;
  filename?: string;
  handleExceptions?: boolean;
  handleRejections?: boolean;
  maxsize?: number;
  maxFiles?: number;
  colorize?: boolean;
  timestamp?: boolean;
  json?: boolean;
  url?: string;
  host?: string;
  port?: number;
  path?: string;
}

/**
 * Proxy route configuration
 */
export interface ProxyRouteConfig {
  path: string;
  target: string;
  pathRewrite?: Record<string, string>;
  changeOrigin: boolean;
  timeout: number;
  retries: number;
  auth?: {
    type: 'bearer' | 'basic' | 'apikey';
    token?: string;
    username?: string;
    password?: string;
    apiKey?: string;
    apiKeyHeader?: string;
  };
  headers?: Record<string, string>;
  onProxyReq?: string; // Function name as string
  onProxyRes?: string; // Function name as string
  onError?: string; // Function name as string
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  enabled: boolean;
  provider: 'memory' | 'redis' | 'file';
  ttl: number; // Time to live in seconds
  maxSize?: number; // Max cache size
  checkPeriod?: number; // Check expired keys period
  prefix?: string;
  compression?: boolean;
  serializer?: 'json' | 'msgpack';
  redis?: {
    host: string;
    port: number;
    password?: string;
    database?: number;
  };
  memory?: {
    maxKeys: number;
    checkPeriod: number;
  };
  file?: {
    cacheDir: string;
    maxFileSize: number;
  };
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests: boolean;
  skipFailedRequests: boolean;
  keyGenerator: 'ip' | 'user' | 'custom';
  message?: string;
  statusCode?: number;
  headers?: boolean;
  draft_polli_ratelimit_headers?: boolean;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  store?: 'memory' | 'redis';
  redis?: {
    host: string;
    port: number;
    password?: string;
    database?: number;
  };
}

/**
 * Monitoring configuration
 */
export interface MonitoringConfig {
  enabled: boolean;
  metrics: {
    enabled: boolean;
    port?: number;
    path?: string;
    collectDefaultMetrics?: boolean;
    customMetrics?: string[];
  };
  healthCheck: {
    enabled: boolean;
    path: string;
    interval: number;
    timeout: number;
    checks: HealthCheckConfig[];
  };
  apm?: {
    enabled: boolean;
    serviceName: string;
    environment: string;
    serverUrl?: string;
    secretToken?: string;
    apiKey?: string;
  };
}

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  name: string;
  type: 'http' | 'tcp' | 'database' | 'memory' | 'disk' | 'custom';
  target?: string;
  timeout: number;
  interval: number;
  retries: number;
  threshold?: {
    warning: number;
    critical: number;
  };
}

/**
 * Feature flags configuration
 */
export interface FeatureFlags {
  enableNewAuth: boolean;
  enableWorkspaceV2: boolean;
  enableAdvancedLogging: boolean;
  enableMetrics: boolean;
  enableCaching: boolean;
  enableRateLimiting: boolean;
  enableCompression: boolean;
  enableHealthChecks: boolean;
  maintenanceMode: boolean;
  debugMode: boolean;
}

/**
 * Environment-specific configuration
 */
export interface EnvironmentConfig {
  name: string;
  debug: boolean;
  verbose: boolean;
  testing: boolean;
  production: boolean;
  maintenance: boolean;
  apiVersion: string;
  buildVersion?: string;
  buildDate?: string;
  gitCommit?: string;
  nodeVersion: string;
  timezone: string;
  locale: string;
}

/**
 * Configuration validation result
 */
export interface ConfigValidationResult {
  isValid: boolean;
  errors: ConfigValidationError[];
  warnings: ConfigValidationWarning[];
}

/**
 * Configuration validation error
 */
export interface ConfigValidationError {
  path: string;
  message: string;
  value?: any;
  expectedType?: string;
}

/**
 * Configuration validation warning
 */
export interface ConfigValidationWarning {
  path: string;
  message: string;
  value?: any;
  suggestion?: string;
}