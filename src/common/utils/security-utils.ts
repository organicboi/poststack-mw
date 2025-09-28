import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';

export interface SecurityUtilsConfig {
  blockedIPs?: string[];
  allowedIPs?: string[];
  enableIPFiltering?: boolean;
  enableInputSanitization?: boolean;
  maxStringLength?: number;
  allowedFileTypes?: string[];
}

// IP address utilities
export class IPUtils {
  // Check if IP is in CIDR range
  static isIPInRange(ip: string, cidr: string): boolean {
    try {
      const [range, bits] = cidr.split('/');
      const mask = ~(2 ** (32 - parseInt(bits)) - 1);
      const ipInt = this.ipToInt(ip);
      const rangeInt = this.ipToInt(range);
      return (ipInt & mask) === (rangeInt & mask);
    } catch {
      return false;
    }
  }

  // Convert IP address to integer
  static ipToInt(ip: string): number {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
  }

  // Extract real IP from request (considering proxies)
  static getRealIP(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'] as string;
    const realIP = req.headers['x-real-ip'] as string;
    const cfConnectingIP = req.headers['cf-connecting-ip'] as string;

    // Priority order: CF-Connecting-IP, X-Real-IP, X-Forwarded-For, req.ip
    if (cfConnectingIP) return cfConnectingIP;
    if (realIP) return realIP;
    if (forwarded) return forwarded.split(',')[0].trim();
    return req.ip || req.connection.remoteAddress || 'unknown';
  }

  // Check if IP is private/local
  static isPrivateIP(ip: string): boolean {
    const privateRanges = [
      '10.0.0.0/8',
      '172.16.0.0/12',
      '192.168.0.0/16',
      '127.0.0.0/8',
      '169.254.0.0/16'
    ];

    return privateRanges.some(range => this.isIPInRange(ip, range));
  }

  // Validate IP address format
  static isValidIP(ip: string): boolean {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }
}

// Input sanitization utilities
export class InputSanitizer {
  // Remove dangerous characters and patterns
  static sanitizeString(input: string, maxLength: number = 1000): string {
    if (typeof input !== 'string') return '';

    return input
      // Remove null bytes
      .replace(/\0/g, '')
      // Remove potential script tags
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Remove potential HTML tags (basic)
      .replace(/<[^>]*>/g, '')
      // Remove SQL injection patterns
      .replace(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi, '')
      // Remove XSS patterns
      .replace(/(javascript:|vbscript:|onload=|onerror=)/gi, '')
      // Limit length
      .substring(0, maxLength)
      // Trim whitespace
      .trim();
  }

  // Sanitize object recursively
  static sanitizeObject(obj: any, maxLength: number = 1000): any {
    if (typeof obj === 'string') {
      return this.sanitizeString(obj, maxLength);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item, maxLength));
    }

    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // Sanitize both key and value
        const sanitizedKey = this.sanitizeString(key, 100);
        sanitized[sanitizedKey] = this.sanitizeObject(value, maxLength);
      }
      return sanitized;
    }

    return obj;
  }

  // Validate email format
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  // Validate URL format
  static isValidURL(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }

  // Check for common malicious patterns
  static containsMaliciousPatterns(input: string): boolean {
    const maliciousPatterns = [
      // SQL injection patterns
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b.*\b(FROM|WHERE|INTO)\b)/i,
      /(\bOR\b\s*\d+\s*=\s*\d+)|(\bAND\b\s*\d+\s*=\s*\d+)/i,
      /('\s*(OR|AND)\s*'[^']*')/i,

      // XSS patterns
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/i,
      /vbscript:/i,
      /(onload|onerror|onclick|onmouseover)=/i,

      // Path traversal
      /\.\.[\/\\]/,
      /(\.{2,}[\/\\])/,

      // Command injection
      /[;&|`$(){}]/,
      /(rm\s+-rf|del\s+\/|format\s+c:)/i,

      // Template injection
      /\{\{.*\}\}/,
      /\<%.*%\>/,

      // LDAP injection
      /[\(\)\*\&\|\!]/
    ];

    return maliciousPatterns.some(pattern => pattern.test(input));
  }
}

// File security utilities
export class FileSecurityUtils {
  // Check file type based on content (magic numbers)
  static getFileTypeFromContent(buffer: Buffer): string | null {
    const signatures: { [key: string]: number[] } = {
      jpg: [0xFF, 0xD8, 0xFF],
      png: [0x89, 0x50, 0x4E, 0x47],
      gif: [0x47, 0x49, 0x46],
      pdf: [0x25, 0x50, 0x44, 0x46],
      zip: [0x50, 0x4B, 0x03, 0x04],
      exe: [0x4D, 0x5A],
      doc: [0xD0, 0xCF, 0x11, 0xE0],
      mp4: [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]
    };

    for (const [type, signature] of Object.entries(signatures)) {
      if (signature.every((byte, index) => buffer[index] === byte)) {
        return type;
      }
    }

    return null;
  }

  // Validate file extension
  static isAllowedFileType(filename: string, allowedTypes: string[]): boolean {
    const extension = filename.split('.').pop()?.toLowerCase();
    return extension ? allowedTypes.includes(extension) : false;
  }

  // Generate secure filename
  static generateSecureFilename(originalFilename: string): string {
    const sanitizedName = originalFilename
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/\.{2,}/g, '.')
      .substring(0, 100);

    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);

    return `${timestamp}_${random}_${sanitizedName}`;
  }
}

// Hash utilities for security
export class HashUtils {
  // Generate hash for content verification
  static generateContentHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  // Generate signature for request verification
  static generateSignature(payload: string, secret: string): string {
    return createHash('hmac-sha256').update(payload, 'utf8').update(secret, 'utf8').digest('hex');
  }

  // Verify signature
  static verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = this.generateSignature(payload, secret);
    return this.constantTimeCompare(signature, expectedSignature);
  }

  // Constant time string comparison to prevent timing attacks
  static constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }
}

// IP filtering middleware
export const ipFilteringMiddleware = (config: SecurityUtilsConfig) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!config.enableIPFiltering) {
      return next();
    }

    const clientIP = IPUtils.getRealIP(req);

    // Check blocked IPs
    if (config.blockedIPs?.some(blockedIP => {
      return blockedIP.includes('/')
        ? IPUtils.isIPInRange(clientIP, blockedIP)
        : clientIP === blockedIP;
    })) {
      console.warn(`Blocked IP attempted access: ${clientIP}`);
      return res.status(403).json({
        success: false,
        message: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    // Check allowed IPs (if whitelist is enabled)
    if (config.allowedIPs?.length && !config.allowedIPs.some(allowedIP => {
      return allowedIP.includes('/')
        ? IPUtils.isIPInRange(clientIP, allowedIP)
        : clientIP === allowedIP;
    })) {
      console.warn(`Non-whitelisted IP attempted access: ${clientIP}`);
      return res.status(403).json({
        success: false,
        message: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
};

// Input sanitization middleware
export const inputSanitizationMiddleware = (config: SecurityUtilsConfig) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!config.enableInputSanitization) {
      return next();
    }

    const maxLength = config.maxStringLength || 1000;

    // Sanitize request body
    if (req.body) {
      req.body = InputSanitizer.sanitizeObject(req.body, maxLength);
    }

    // Sanitize query parameters
    if (req.query) {
      req.query = InputSanitizer.sanitizeObject(req.query, maxLength);
    }

    // Sanitize URL parameters
    if (req.params) {
      req.params = InputSanitizer.sanitizeObject(req.params, maxLength);
    }

    // Check for malicious patterns in all string inputs
    const checkMaliciousContent = (obj: any): boolean => {
      if (typeof obj === 'string') {
        return InputSanitizer.containsMaliciousPatterns(obj);
      }
      if (Array.isArray(obj)) {
        return obj.some(checkMaliciousContent);
      }
      if (obj && typeof obj === 'object') {
        return Object.values(obj).some(checkMaliciousContent);
      }
      return false;
    };

    if (checkMaliciousContent(req.body) ||
        checkMaliciousContent(req.query) ||
        checkMaliciousContent(req.params)) {
      console.warn(`Malicious content detected from IP: ${IPUtils.getRealIP(req)}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid input detected',
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
};

// Security utilities factory
export const createSecurityUtils = (config: SecurityUtilsConfig) => {
  return {
    ipFiltering: ipFilteringMiddleware(config),
    inputSanitization: inputSanitizationMiddleware(config),
    utils: {
      IPUtils,
      InputSanitizer,
      FileSecurityUtils,
      HashUtils
    }
  };
};