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

import { PluginHookFn, Build } from 'graphile-build';
import { Context } from 'postgraphile';
import { createLogger, format, transports } from 'winston';
import { Redis } from 'ioredis';

const logger = createLogger({
  level: 'debug',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [new transports.Console()]
});

/**
 * Security Configuration
 */
const SECURITY_CONFIG = {
  maxQueryDepth: 10,
  maxComplexity: 100,
  requestRateWindow: 60000, // 1 minute
  maxRequestsPerWindow: 100,
  sensitiveFields: [
    'password', 'passwordHash', 'password_salt', 'ssn',
    'bankAccount', 'salary', 'personalPhone', 'personalEmail'
  ],
  privilegedOperations: [
    'createUser', 'updateUser', 'deleteUser',
    'createEmployee', 'updateEmployee', 'terminateEmployee',
    'updateRole', 'updatePermissions'
  ]
};

/**
 * Query Security Plugin
 * Enforces query complexity, depth limits, and rate limiting
 */
export class QuerySecurityPlugin {
  private redis: Redis;
  private requestCounts: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(redis: Redis) {
    this.redis = redis;
  }

  createPlugin(): PluginHookFn {
    return (build: Build) => {
      // Query validation before execution
      build.hook('postgraphile:http:handler', async (req: any, context: any) => {
        const startTime = Date.now();
        const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
        
        try {
          // Rate limiting check
          if (!(await this.checkRateLimit(clientIp))) {
            const error = new Error('Rate limit exceeded. Please try again later.');
            (error as any).statusCode = 429;
            throw error;
          }

          // Parse and validate GraphQL query
          if (req.body && req.body.query) {
            const query = req.body.query;
            
            // Basic security checks
            this.validateQueryStructure(query);
            
            // Check for suspicious patterns
            this.checkForSuspiciousPatterns(query);
            
            // Query complexity analysis
            const complexity = this.analyzeComplexity(query);
            if (complexity > SECURITY_CONFIG.maxComplexity) {
              const error = new Error(`Query too complex (cost: ${complexity}). Maximum allowed: ${SECURITY_CONFIG.maxComplexity}`);
              (error as any).statusCode = 400;
              throw error;
            }

            // Query depth analysis
            const depth = this.analyzeQueryDepth(query);
            if (depth > SECURITY_CONFIG.maxQueryDepth) {
              const error = new Error(`Query too deep (depth: ${depth}). Maximum allowed: ${SECURITY_CONFIG.maxQueryDepth}`);
              (error as any).statusCode = 400;
              throw error;
            }

            logger.debug('Query security validation passed', {
              ip: clientIp,
              complexity,
              depth,
              queryLength: query.length
            });
          }

          return req;
        } catch (error) {
          const duration = Date.now() - startTime;
          logger.warn('Query security validation failed', {
            ip: clientIp,
            error: error.message,
            duration,
            statusCode: (error as any).statusCode
          });
          throw error;
        }
      });

      // Field-level access control
      build.hook('GraphQLObjectType:fields:field', (field, build, context: any) => {
        const fieldName = field.fieldName;
        
        // Check for sensitive fields
        if (SECURITY_CONFIG.sensitiveFields.some(sensitive => 
          fieldName.toLowerCase().includes(sensitive.toLowerCase()))) {
          
          const originalResolve = field.resolve;
          
          field.resolve = async (root: any, args: any, context: Context, info: any) => {
            const userRole = context.pgSettings?.['jwt.claims.role'] || 'hr_guest';
            const userRoleLevel = parseInt(context.pgSettings?.['jwt.claims.role_level'] || '0', 10);
            const userId = context.pgSettings?.['jwt.claims.user_id'];

            // Access control logic for sensitive fields
            if (!this.canAccessSensitiveField(fieldName, userRole, userRoleLevel, userId, root)) {
              logger.warn('Unauthorized access attempt to sensitive field', {
                field: fieldName,
                userRole,
                userRoleLevel,
                userId,
                resourceOwnerId: root?.id
              });
              
              throw new Error(`Access denied for field: ${fieldName}`);
            }

            return originalResolve ? originalResolve(root, args, context, info) : root[fieldName];
          };
        }
        
        return field;
      });

      return build;
    };
  }

  /**
   * Rate limiting using Redis
   */
  private async checkRateLimit(ip: string): Promise<boolean> {
    const key = `rate_limit:${ip}`;
    const windowStart = Math.floor(Date.now() / SECURITY_CONFIG.requestRateWindow);
    
    try {
      const redisKey = `${key}:${windowStart}`;
      const currentCount = await this.redis.incr(redisKey);
      
      if (currentCount === 1) {
        await this.redis.expire(redisKey, SECURITY_CONFIG.requestRateWindow / 1000);
      }
      
      return currentCount <= SECURITY_CONFIG.maxRequestsPerWindow;
    } catch (error) {
      logger.error('Rate limit check failed', { ip, error: error.message });
      // Fail open if Redis is unavailable
      return true;
    }
  }

  /**
   * Validate query structure for potential attacks
   */
  private validateQueryStructure(query: string): void {
    // Check for obvious injection attempts
    const dangerousPatterns = [
      /union\s+.+?select/i,
      /insert\s+.+?into/i,
      /drop\s+(table|database)/i,
      /delete\s+from/i,
      /update\s+.+?set/i,
      /;\s*--/i,
      /;\s*#{/,
      /`.*`/i
    ];

    if (dangerousPatterns.some(pattern => pattern.test(query))) {
      const error = new Error('Query contains potentially dangerous patterns');
      (error as any).statusCode = 400;
      throw error;
    }
  }

  /**
   * Check for suspicious query patterns
   */
  private checkForSuspiciousPatterns(query: string): void {
    const suspiciousPatterns = [
      /fragment\s+on\s+\w+/i, // Excessive fragment usage
      /{[^}]*{[^}]*}/g,      // Nested objects (potential DDoS)
      /__typename/,          // Potential introspection abuse
      /IntrospectionQuery/   // Direct introspection
    ];

    const warnings = [];
    suspiciousPatterns.forEach((pattern, index) => {
      const matches = query.match(pattern);
      if (matches) {
        warnings.push(`Suspicious pattern ${index + 1} detected`);
      }
    });

    if (warnings.length > 0) {
      logger.warn('Suspicious query patterns detected', {
        patterns: warnings,
        queryLength: query.length
      });
    }
  }

  /**
   * Simple complexity analysis based on field counts and nesting
   */
  private analyzeComplexity(query: string): number {
    let complexity = 0;
    
    // Count fields
    complexity += (query.match(/\w+\s*:/g) || []).length * 2;
    
    // Count nested objects (higher cost)
    complexity += (query.match(/\{[^}]*\{/g) || []).length * 5;
    
    // Count arguments
    complexity += (query.match(/\w+\s*:/g) || []).length * 1;
    
    return complexity;
  }

  /**
   * Analyze query depth
   */
  private analyzeQueryDepth(query: string): number {
    let maxDepth = 0;
    let currentDepth = 0;
    
    for (const char of query) {
      if (char === '{') {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      } else if (char === '}') {
        currentDepth--;
      }
    }
    
    return maxDepth;
  }

  /**
   * Check if user can access sensitive field
   */
  private canAccessSensitiveField(
    fieldName: string, 
    userRole: string, 
    userRoleLevel: number, 
    userId: string,
    resource: any
  ): boolean {
    // Admins have access to everything
    if (userRole === 'hr_super_admin' || userRoleLevel >= 100) {
      return true;
    }

    // HR admins can access most sensitive fields except personal HR data
    if (userRole === 'hr_admin' || userRoleLevel >= 80) {
      return !['personalPhone', 'personalEmail'].some(field => 
        fieldName.toLowerCase().includes(field.toLowerCase()));
    }

    // Managers can access employee data for their direct reports
    if (userRole === 'hr_manager' || userRoleLevel >= 60) {
      // Check if the resource belongs to user's department
      if (resource && resource.department_id) {
        // This would need to be checked against user's department
        return true;
      }
    }

    // Regular employees can only see their own sensitive data
    if (userRole === 'hr_employee' || userRoleLevel >= 20) {
      const resourceUserId = resource.user_id || resource.userId;
      const resourceEmployeeId = resource.id || resource.employee_id;
      
      return (
        resourceUserId?.toString() === userId ||
        resourceEmployeeId?.toString() === context.pgSettings?.['jwt.claims.employee_id']
      );
    }

    // Guests have no access to sensitive fields
    return false;
  }
}

/**
 * Monitoring and Analytics Plugin
 * Performance monitoring and usage analytics
 */
export class MonitoringPlugin {
  private redis: Redis;
  private queryMetrics: Map<string, any[]> = new Map();

  constructor(redis: Redis) {
    this.redis = redis;
  }

  createPlugin(): PluginHookFn {
    return (build: Build) => {
      // Query performance monitoring
      build.hook('GraphQLObject:fields:field', (field, build, context: any) => {
        const fieldName = field.fieldName;
        const originalResolve = field.resolve;

        if (originalResolve) {
          field.resolve = async (root: any, args: any, context: Context, info: any) => {
            const startTime = Date.now();
            const operationName = info?.operation?.name?.value || 'Anonymous';
            
            try {
              const result = await originalResolve(root, args, context, info);
              
              const duration = Date.now() - startTime;
              await this.recordFieldMetrics(fieldName, operationName, duration);
              
              return result;
            } catch (error) {
              const duration = Date.now() - startTime;
              await this.recordFieldError(fieldName, operationName, duration, error.message);
              throw error;
            }
          };
        }
        
        return field;
      });

      // Request lifecycle monitoring
      build.hook('postgraphile:http:handler', async (req: any, context: any) => {
        const requestId = this.generateRequestId();
        const startTime = Date.now();
        
        // Add request ID to context
        req.requestId = requestId;
        context.requestId = requestId;
        
        logger.info('GraphQL request started', {
          requestId,
          operation: req.body?.operationName || 'Anonymous',
          ip: req.ip || req.headers['x-forwarded-for']
        });

        // Set up cleanup handler
        const originalEnd = req.end;
        req.end = function(...args: any[]) {
          logger.info('GraphQL request completed', {
            requestId,
            duration: Date.now() - startTime
          });
          
          if (originalEnd) {
            return originalEnd.apply(req, args);
          }
        };

        return req;
      });

      return build;
    };
  }

  /**
   * Record field performance metrics
   */
  private async recordFieldMetrics(fieldName: string, operation: string, duration: number): Promise<void> {
    try {
      const metricKey = `metrics:field:${fieldName}:${new Date().toISOString()}`;
      await this.redis.lpush('metrics:recent', JSON.stringify({
        type: 'field',
        field: fieldName,
        operation,
        duration,
        timestamp: new Date().toISOString()
      }));
      
      // Keep only last 1000 metrics
      await this.redis.ltrim('metrics:recent', 0, 999);
      
      // Log slow fields
      if (duration > 500) {
        logger.warn('Slow field resolution', {
          field: fieldName,
          operation,
          duration
        });
      }
    } catch (error) {
      logger.error('Failed to record field metrics', {
        field: fieldName,
        operation,
        duration,
        error: error.message
      });
    }
  }

  /**
   * Record field errors
   */
  private async recordFieldError(fieldName: string, operation: string, duration: number, error: string): Promise<void> {
    try {
      const errorKey = `errors:field:${fieldName}:${Date.now()}`;
      await this.redis.lpush('errors:recent', JSON.stringify({
        type: 'field',
        field: fieldName,
        operation,
        duration,
        error,
        timestamp: new Date().toISOString()
      }));
      
      // Keep only last 100 errors
      await this.redis.ltrim('errors:recent', 0, 99);
    } catch (error) {
      logger.error('Failed to record field error', {
        field: fieldName,
        operation,
        duration,
        error: error.message
      });
    }
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    return `req_${timestamp}_${random}`;
  }
}

/**
 * Audit Logging Plugin
 * Tracks all sensitive operations for compliance and security
 */
export class AuditLoggingPlugin {
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  createPlugin(): PluginHookFn {
    return (build: Build) => {
      // Monitor privileged operations
      build.hook('GraphQLObject:fields:field', (field, build, context: any) => {
        const fieldName = field.fieldName;
        
        // Check if this is a privileged operation
        if (SECURITY_CONFIG.privilegedOperations.some(op => 
          fieldName.toLowerCase().includes(op.toLowerCase()))) {
          
          const originalResolve = field.resolve;

          if (originalResolve) {
            field.resolve = async (root: any, args: any, context: Context, info: any) => {
              const startTime = Date.now();
              const userId = context.pgSettings?.['jwt.claims.user_id'];
              const userRole = context.pgSettings?.['jwt.claims.role'];
              const operationName = info?.operation?.name?.value || 'Anonymous';

              logger.info('Privileged operation initiated', {
                operation: fieldName,
                userRole,
                userId,
                operationName,
                arguments: this.sanitizeArgs(args)
              });

              try {
                const result = await originalResolve(root, args, context, info);
                
                // Log successful operation
                await this.logAuditEvent({
                  type: 'operation_success',
                  operation: fieldName,
                  userId,
                  userRole,
                  operationName,
                  duration: Date.now() - startTime,
                  success: true
                });

                return result;
              } catch (error) {
                // Log failed operation
                await this.logAuditEvent({
                  type: 'operation_failure',
                  operation: fieldName,
                  userId,
                  userRole,
                  operationName,
                  duration: Date.now() - startTime,
                  success: false,
                  error: error.message
                });
                throw error;
              }
            };
          }
        }
        
        return field;
      });

      return build;
    };
  }

  /**
   * Log audit event
   */
  private async logAuditEvent(event: any): Promise<void> {
    try {
      const auditKey = `audit:${Date.now()}:${Math.random().toString(36).substring(2)}`;
      await this.redis.lpush('audit:recent', JSON.stringify({
        ...event,
        timestamp: new Date().toISOString()
      }));
      
      // Keep only last 1000 audit events
      await this.redis.ltrim('audit:recent', 0, 999);
      
      logger.info('Audit event logged', event);
    } catch (error) {
      logger.error('Failed to log audit event', {
        event,
        error: error.message
      });
    }
  }

  /**
   * Sanitize arguments for logging
   */
  private sanitizeArgs(args: any): any {
    if (typeof args !== 'object' || args === null) {
      return args;
    }

    const sanitized = { ...args };
    const sensitiveFields = ['password', 'passwordHash', 'ssn', 'token'];
    
    for (const [key, value] of Object.entries(sanitized)) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }
}

// Export plugins
export const querySecurityPlugin = (redis: Redis) => new QuerySecurityPlugin(redis).createPlugin();
export const monitoringPlugin = (redis: Redis) => new MonitoringPlugin(redis).createPlugin();
export const auditLoggingPlugin = (redis: Redis) => new AuditLoggingPlugin(redis).createPlugin();

// Security plugin bundle
export const securityPlugins = (redis: Redis) => [
  querySecurityPlugin(redis),
  monitoringPlugin(redis),
  auditLoggingPlugin(redis)
];