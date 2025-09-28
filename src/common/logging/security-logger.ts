import winston from 'winston';
import { Request, Response } from 'express';
import { config } from '../config';
import { IPUtils } from '../utils/security-utils';

export enum SecurityEventType {
  AUTHENTICATION_FAILURE = 'auth_failure',
  AUTHENTICATION_SUCCESS = 'auth_success',
  AUTHORIZATION_FAILURE = 'authz_failure',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  MALICIOUS_INPUT_DETECTED = 'malicious_input',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  ACCOUNT_LOCKOUT = 'account_lockout',
  PASSWORD_RESET_REQUESTED = 'password_reset',
  PRIVILEGE_ESCALATION_ATTEMPT = 'privilege_escalation',
  DATA_ACCESS_VIOLATION = 'data_access_violation',
  BRUTE_FORCE_ATTEMPT = 'brute_force',
  IP_BLOCKED = 'ip_blocked',
  CORS_VIOLATION = 'cors_violation',
  FILE_UPLOAD_VIOLATION = 'file_upload_violation',
  SQL_INJECTION_ATTEMPT = 'sql_injection',
  XSS_ATTEMPT = 'xss_attempt'
}

export enum SecuritySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface SecurityEvent {
  type: SecurityEventType;
  severity: SecuritySeverity;
  message: string;
  timestamp: string;
  requestId?: string;
  userId?: string;
  email?: string;
  ip: string;
  userAgent?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  details?: Record<string, any>;
  risk_score?: number;
}

export interface SecurityMetrics {
  totalEvents: number;
  eventsByType: Record<SecurityEventType, number>;
  eventsBySeverity: Record<SecuritySeverity, number>;
  topIPs: Array<{ ip: string; count: number }>;
  timeRange: { start: string; end: string };
}

class SecurityLogger {
  private logger: winston.Logger;
  private events: SecurityEvent[] = [];
  private maxEvents = 10000; // Keep last 10k events in memory

  constructor() {
    this.logger = this.createLogger();
    this.setupRotation();
  }

  private createLogger(): winston.Logger {
    const logFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        return JSON.stringify({
          timestamp,
          level,
          message,
          ...meta
        });
      })
    );

    return winston.createLogger({
      level: 'info',
      format: logFormat,
      defaultMeta: { service: 'postiz-security' },
      transports: [
        // Security events file
        new winston.transports.File({
          filename: 'logs/security-events.log',
          level: 'warn',
          maxsize: 10485760, // 10MB
          maxFiles: 10,
          tailable: true
        }),

        // Critical security events
        new winston.transports.File({
          filename: 'logs/security-critical.log',
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
          tailable: true
        }),

        // Combined log
        new winston.transports.File({
          filename: 'logs/security-combined.log',
          maxsize: 20971520, // 20MB
          maxFiles: 15,
          tailable: true
        })
      ]
    });

    // Add console transport in development
    if (config.server.environment === 'development') {
      this.logger.add(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      );
    }
  }

  private setupRotation(): void {
    // Clean up old events in memory every hour
    setInterval(() => {
      if (this.events.length > this.maxEvents) {
        this.events = this.events.slice(-this.maxEvents);
      }
    }, 3600000); // 1 hour
  }

  public logEvent(event: Omit<SecurityEvent, 'timestamp'>): void {
    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: new Date().toISOString()
    };

    // Add to in-memory storage
    this.events.push(securityEvent);

    // Log to Winston based on severity
    switch (event.severity) {
      case SecuritySeverity.CRITICAL:
        this.logger.error('CRITICAL SECURITY EVENT', securityEvent);
        break;
      case SecuritySeverity.HIGH:
        this.logger.error('HIGH SECURITY EVENT', securityEvent);
        break;
      case SecuritySeverity.MEDIUM:
        this.logger.warn('MEDIUM SECURITY EVENT', securityEvent);
        break;
      case SecuritySeverity.LOW:
        this.logger.info('LOW SECURITY EVENT', securityEvent);
        break;
    }

    // Trigger alerts for critical events
    if (event.severity === SecuritySeverity.CRITICAL) {
      this.triggerCriticalAlert(securityEvent);
    }
  }

  private triggerCriticalAlert(event: SecurityEvent): void {
    // In a real implementation, this would send alerts via email, Slack, PagerDuty, etc.
    console.error('🚨 CRITICAL SECURITY ALERT 🚨', {
      type: event.type,
      message: event.message,
      ip: event.ip,
      timestamp: event.timestamp
    });

    // You could integrate with alerting services here:
    // - Send email via AWS SES
    // - Send Slack notification
    // - Trigger PagerDuty incident
    // - Send webhook to monitoring system
  }

  // Security event logging helpers
  public logAuthFailure(req: Request, email?: string, reason?: string): void {
    this.logEvent({
      type: SecurityEventType.AUTHENTICATION_FAILURE,
      severity: SecuritySeverity.MEDIUM,
      message: `Authentication failed: ${reason || 'Invalid credentials'}`,
      requestId: req.requestId,
      email,
      ip: IPUtils.getRealIP(req),
      userAgent: req.headers['user-agent'],
      path: req.path,
      method: req.method,
      details: { reason }
    });
  }

  public logAuthSuccess(req: Request, userId: string, email: string): void {
    this.logEvent({
      type: SecurityEventType.AUTHENTICATION_SUCCESS,
      severity: SecuritySeverity.LOW,
      message: 'User authenticated successfully',
      requestId: req.requestId,
      userId,
      email,
      ip: IPUtils.getRealIP(req),
      userAgent: req.headers['user-agent'],
      path: req.path,
      method: req.method
    });
  }

  public logRateLimitExceeded(req: Request, limitType: string): void {
    this.logEvent({
      type: SecurityEventType.RATE_LIMIT_EXCEEDED,
      severity: SecuritySeverity.HIGH,
      message: `Rate limit exceeded for ${limitType}`,
      requestId: req.requestId,
      userId: req.user?.id,
      ip: IPUtils.getRealIP(req),
      userAgent: req.headers['user-agent'],
      path: req.path,
      method: req.method,
      details: { limitType }
    });
  }

  public logMaliciousInput(req: Request, inputType: string, pattern: string): void {
    this.logEvent({
      type: SecurityEventType.MALICIOUS_INPUT_DETECTED,
      severity: SecuritySeverity.HIGH,
      message: `Malicious input detected in ${inputType}`,
      requestId: req.requestId,
      userId: req.user?.id,
      ip: IPUtils.getRealIP(req),
      userAgent: req.headers['user-agent'],
      path: req.path,
      method: req.method,
      details: { inputType, pattern, body: req.body }
    });
  }

  public logSuspiciousActivity(req: Request, activity: string, details?: Record<string, any>): void {
    this.logEvent({
      type: SecurityEventType.SUSPICIOUS_ACTIVITY,
      severity: SecuritySeverity.MEDIUM,
      message: `Suspicious activity detected: ${activity}`,
      requestId: req.requestId,
      userId: req.user?.id,
      ip: IPUtils.getRealIP(req),
      userAgent: req.headers['user-agent'],
      path: req.path,
      method: req.method,
      details
    });
  }

  public logIPBlocked(ip: string, reason: string): void {
    this.logEvent({
      type: SecurityEventType.IP_BLOCKED,
      severity: SecuritySeverity.HIGH,
      message: `IP address blocked: ${reason}`,
      ip,
      details: { reason }
    });
  }

  public logCorsViolation(req: Request, origin: string): void {
    this.logEvent({
      type: SecurityEventType.CORS_VIOLATION,
      severity: SecuritySeverity.MEDIUM,
      message: `CORS policy violation from origin: ${origin}`,
      requestId: req.requestId,
      ip: IPUtils.getRealIP(req),
      userAgent: req.headers['user-agent'],
      path: req.path,
      method: req.method,
      details: { origin, headers: req.headers }
    });
  }

  public logBruteForceAttempt(req: Request, email: string, attemptCount: number): void {
    this.logEvent({
      type: SecurityEventType.BRUTE_FORCE_ATTEMPT,
      severity: attemptCount > 10 ? SecuritySeverity.CRITICAL : SecuritySeverity.HIGH,
      message: `Brute force attempt detected (${attemptCount} attempts)`,
      requestId: req.requestId,
      email,
      ip: IPUtils.getRealIP(req),
      userAgent: req.headers['user-agent'],
      path: req.path,
      method: req.method,
      details: { attemptCount },
      risk_score: Math.min(attemptCount * 10, 100)
    });
  }

  // Analytics and reporting
  public getSecurityMetrics(timeRange?: { start: Date; end: Date }): SecurityMetrics {
    let filteredEvents = this.events;

    if (timeRange) {
      filteredEvents = this.events.filter(event => {
        const eventTime = new Date(event.timestamp);
        return eventTime >= timeRange.start && eventTime <= timeRange.end;
      });
    }

    const eventsByType = {} as Record<SecurityEventType, number>;
    const eventsBySeverity = {} as Record<SecuritySeverity, number>;
    const ipCounts = {} as Record<string, number>;

    // Initialize counters
    Object.values(SecurityEventType).forEach(type => {
      eventsByType[type] = 0;
    });
    Object.values(SecuritySeverity).forEach(severity => {
      eventsBySeverity[severity] = 0;
    });

    // Count events
    filteredEvents.forEach(event => {
      eventsByType[event.type]++;
      eventsBySeverity[event.severity]++;
      ipCounts[event.ip] = (ipCounts[event.ip] || 0) + 1;
    });

    // Top IPs by event count
    const topIPs = Object.entries(ipCounts)
      .map(([ip, count]) => ({ ip, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalEvents: filteredEvents.length,
      eventsByType,
      eventsBySeverity,
      topIPs,
      timeRange: {
        start: timeRange?.start.toISOString() || 'N/A',
        end: timeRange?.end.toISOString() || 'N/A'
      }
    };
  }

  public getRecentEvents(limit: number = 100): SecurityEvent[] {
    return this.events.slice(-limit).reverse();
  }

  public getEventsByType(type: SecurityEventType, limit: number = 50): SecurityEvent[] {
    return this.events
      .filter(event => event.type === type)
      .slice(-limit)
      .reverse();
  }

  public getHighRiskEvents(threshold: number = 50): SecurityEvent[] {
    return this.events
      .filter(event =>
        event.severity === SecuritySeverity.CRITICAL ||
        event.severity === SecuritySeverity.HIGH ||
        (event.risk_score && event.risk_score >= threshold)
      )
      .slice(-100)
      .reverse();
  }
}

// Singleton instance
export const securityLogger = new SecurityLogger();

// Middleware for automatic security event logging
export const securityEventMiddleware = (req: Request, res: Response, next: Function) => {
  // Log suspicious patterns in requests
  const checkSuspiciousPatterns = () => {
    // Check for suspicious user agents
    const userAgent = req.headers['user-agent'] || '';
    const suspiciousUAs = ['sqlmap', 'nikto', 'nessus', 'burp', 'dirbuster'];

    if (suspiciousUAs.some(ua => userAgent.toLowerCase().includes(ua))) {
      securityLogger.logSuspiciousActivity(req, 'Suspicious User-Agent detected', { userAgent });
    }

    // Check for suspicious paths
    const suspiciousPaths = ['/admin', '/.env', '/wp-admin', '/phpmyadmin', '/.git'];
    if (suspiciousPaths.some(path => req.path.includes(path))) {
      securityLogger.logSuspiciousActivity(req, 'Access to suspicious path', { path: req.path });
    }

    // Check for suspicious headers
    if (req.headers['x-forwarded-for'] && req.headers['x-forwarded-for'].includes('127.0.0.1')) {
      securityLogger.logSuspiciousActivity(req, 'Suspicious X-Forwarded-For header', {
        forwardedFor: req.headers['x-forwarded-for']
      });
    }
  };

  // Log error responses
  const originalSend = res.send;
  res.send = function (body: any) {
    if (res.statusCode >= 400) {
      securityLogger.logEvent({
        type: SecurityEventType.SUSPICIOUS_ACTIVITY,
        severity: res.statusCode >= 500 ? SecuritySeverity.HIGH : SecuritySeverity.MEDIUM,
        message: `HTTP Error Response: ${res.statusCode}`,
        requestId: req.requestId,
        userId: req.user?.id,
        ip: IPUtils.getRealIP(req),
        userAgent: req.headers['user-agent'],
        path: req.path,
        method: req.method,
        statusCode: res.statusCode,
        details: { responseBody: body }
      });
    }

    return originalSend.call(this, body);
  };

  checkSuspiciousPatterns();
  next();
};