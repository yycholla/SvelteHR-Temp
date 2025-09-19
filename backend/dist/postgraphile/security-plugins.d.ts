/**
 * Security and Monitoring Plugins for PostGraphile
 *
 * Comprehensive security features:
 * - Query rate limiting
 * - Query depth analysis
 * - Field-level access control
 * - Security event logging
 * - Performance monitoring
 */
import { PluginHookFn } from 'graphile-build';
import { Redis } from 'ioredis';
/**
 * Query Security Plugin
 * Enforces query complexity, depth limits, and rate limiting
 */
export declare class QuerySecurityPlugin {
  private redis;
  private requestCounts;
  constructor(redis: Redis);
  createPlugin(): PluginHookFn;
  /**
   * Rate limiting using Redis
   */
  private checkRateLimit;
  /**
   * Validate query structure for potential attacks
   */
  private validateQueryStructure;
  /**
   * Check for suspicious query patterns
   */
  private checkForSuspiciousPatterns;
  /**
   * Simple complexity analysis based on field counts and nesting
   */
  private analyzeComplexity;
  /**
   * Analyze query depth
   */
  private analyzeQueryDepth;
  /**
   * Check if user can access sensitive field
   */
  private canAccessSensitiveField;
}
/**
 * Monitoring and Analytics Plugin
 * Performance monitoring and usage analytics
 */
export declare class MonitoringPlugin {
  private redis;
  private queryMetrics;
  constructor(redis: Redis);
  createPlugin(): PluginHookFn;
  /**
   * Record field performance metrics
   */
  private recordFieldMetrics;
  /**
   * Record field errors
   */
  private recordFieldError;
  /**
   * Generate unique request ID
   */
  private generateRequestId;
}
/**
 * Audit Logging Plugin
 * Tracks all sensitive operations for compliance and security
 */
export declare class AuditLoggingPlugin {
  private redis;
  constructor(redis: Redis);
  createPlugin(): PluginHookFn;
  /**
   * Log audit event
   */
  private logAuditEvent;
  /**
   * Sanitize arguments for logging
   */
  private sanitizeArgs;
}
export declare const querySecurityPlugin: (redis: Redis) => PluginHookFn;
export declare const monitoringPlugin: (redis: Redis) => PluginHookFn;
export declare const auditLoggingPlugin: (redis: Redis) => PluginHookFn;
export declare const securityPlugins: (redis: Redis) => any[];
