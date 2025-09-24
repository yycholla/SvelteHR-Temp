/**
 * HR Monitoring and Rate Limiting Plugin
 *
 * Comprehensive system for monitoring API usage, performance, and implementing
 * intelligent rate limiting for HR operations.
 */
// Rate limiting configurations
export const RateLimitConfigs = {
    // General API rate limiting
    general: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // requests per window per IP
        message: {
            error: 'Too many requests',
            retryAfter: '15 minutes',
            code: 'RATE_LIMIT_EXCEEDED'
        },
        standardHeaders: true,
        legacyHeaders: false,
    },
    // Authentication endpoints (stricter)
    auth: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // login attempts per window per IP
        message: {
            error: 'Too many login attempts',
            retryAfter: '15 minutes',
            code: 'AUTH_RATE_LIMIT_EXCEEDED'
        },
        skipSuccessfulRequests: true,
    },
    // HR mutations (moderate limits)
    mutations: {
        windowMs: 1 * 60 * 1000, // 1 minute
        max: 20, // mutations per minute per user
        message: {
            error: 'Too many operations',
            retryAfter: '1 minute',
            code: 'MUTATION_RATE_LIMIT_EXCEEDED'
        },
    },
    // Sensitive operations (stricter)
    sensitive: {
        windowMs: 5 * 60 * 1000, // 5 minutes
        max: 3, // operations per window per user
        message: {
            error: 'Too many sensitive operations',
            retryAfter: '5 minutes',
            code: 'SENSITIVE_RATE_LIMIT_EXCEEDED'
        },
    },
    // Bulk operations (very strict)
    bulk: {
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 10, // bulk operations per hour per user
        message: {
            error: 'Too many bulk operations',
            retryAfter: '1 hour',
            code: 'BULK_RATE_LIMIT_EXCEEDED'
        },
    }
};
// HR-specific metrics collector
export class HRMetricsCollector {
    metrics;
    redis;
    startTime;
    constructor(redis) {
        this.redis = redis;
        this.startTime = Date.now();
        this.metrics = {
            requests: { total: 0, queries: 0, mutations: 0, errors: 0 },
            performance: { avgResponseTime: 0, slowQueries: 0, dbConnections: 0 },
            hr: { timeEntriesSubmitted: 0, leaveRequestsSubmitted: 0, goalsCreated: 0, notificationsSent: 0 },
            errors: { validationErrors: 0, authErrors: 0, serverErrors: 0 }
        };
    }
    // Record request metrics
    recordRequest(type, responseTime, hasErrors = false) {
        this.metrics.requests.total++;
        this.metrics.requests[type === 'query' ? 'queries' : 'mutations']++;
        if (hasErrors) {
            this.metrics.requests.errors++;
        }
        // Update average response time
        this.updateAverageResponseTime(responseTime);
        // Track slow queries (>2000ms)
        if (responseTime > 2000) {
            this.metrics.performance.slowQueries++;
        }
        // Store in Redis for persistence and aggregation
        this.storeMetricsInRedis();
    }
    // Record HR-specific operations
    recordHROperation(operation, count = 1) {
        this.metrics.hr[operation] += count;
        this.storeMetricsInRedis();
    }
    // Record errors by type
    recordError(errorType, count = 1) {
        this.metrics.errors[errorType] += count;
        this.storeMetricsInRedis();
    }
    // Update average response time
    updateAverageResponseTime(newTime) {
        const totalRequests = this.metrics.requests.total;
        const currentAvg = this.metrics.performance.avgResponseTime;
        this.metrics.performance.avgResponseTime =
            ((currentAvg * (totalRequests - 1)) + newTime) / totalRequests;
    }
    // Store metrics in Redis for persistence
    async storeMetricsInRedis() {
        try {
            const key = `hr_metrics:${new Date().toISOString().slice(0, 10)}`; // Daily metrics
            await this.redis.hset(key, 'metrics', JSON.stringify(this.metrics));
            await this.redis.expire(key, 7 * 24 * 60 * 60); // Keep for 7 days
        }
        catch (error) {
            console.error('Failed to store metrics in Redis:', error);
        }
    }
    // Get current metrics
    getMetrics() {
        return { ...this.metrics };
    }
    // Get system health
    getSystemHealth() {
        const uptime = Date.now() - this.startTime;
        return {
            uptime: uptime,
            uptimeFormatted: this.formatUptime(uptime),
            memory: process.memoryUsage(),
            metrics: this.getMetrics(),
            timestamp: new Date().toISOString()
        };
    }
    formatUptime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        if (days > 0)
            return `${days}d ${hours % 24}h ${minutes % 60}m`;
        if (hours > 0)
            return `${hours}h ${minutes % 60}m`;
        if (minutes > 0)
            return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }
}
// User-based rate limiting (using Redis)
export class UserRateLimiter {
    redis;
    constructor(redis) {
        this.redis = redis;
    }
    // Check if user is within rate limits
    async checkUserLimit(userId, operation, limit, windowMs) {
        const key = `rate_limit:user:${userId}:${operation}`;
        const now = Date.now();
        const window = Math.floor(now / windowMs);
        const windowKey = `${key}:${window}`;
        try {
            // Get current count for this window
            const current = await this.redis.get(windowKey);
            const count = current ? parseInt(current) : 0;
            if (count >= limit) {
                return {
                    allowed: false,
                    remainingRequests: 0,
                    resetTime: (window + 1) * windowMs
                };
            }
            // Increment counter
            const multi = this.redis.multi();
            multi.incr(windowKey);
            multi.expire(windowKey, Math.ceil(windowMs / 1000));
            await multi.exec();
            return {
                allowed: true,
                remainingRequests: limit - (count + 1),
                resetTime: (window + 1) * windowMs
            };
        }
        catch (error) {
            console.error('Rate limiting error:', error);
            // On Redis error, allow the request (fail open)
            return {
                allowed: true,
                remainingRequests: limit,
                resetTime: now + windowMs
            };
        }
    }
    // Check multiple rate limits at once
    async checkMultipleLimits(userId, checks) {
        const results = await Promise.all(checks.map(check => this.checkUserLimit(userId, check.operation, check.limit, check.windowMs)
            .then(result => ({ ...result, operation: check.operation }))));
        const failedChecks = results
            .filter(result => !result.allowed)
            .map(result => result.operation);
        const earliestReset = Math.min(...results.map(r => r.resetTime));
        return {
            allowed: failedChecks.length === 0,
            failedChecks,
            resetTime: earliestReset
        };
    }
}
// GraphQL operation analyzer
export class GraphQLOperationAnalyzer {
    // Analyze GraphQL operation to determine rate limiting strategy
    static analyzeOperation(query) {
        const isMutation = query.includes('mutation');
        const isSubscription = query.includes('subscription');
        // Extract operation names
        const operationMatches = query.match(/(?:query|mutation|subscription)\s*(?:\w+)?\s*\{([^}]+)\}/);
        const operations = operationMatches
            ? operationMatches[1].match(/\b\w+(?=\s*[\(\{])/g) || []
            : [];
        // Determine complexity (rough estimate)
        const complexity = this.calculateComplexity(query, operations);
        // Check if operations are sensitive
        const sensitiveOperations = [
            'rejectTimeEntry', 'rejectLeaveRequest',
            'updateUserRole', 'deleteUser', 'approveProfileChanges',
            'assignEmployeesToReviewCycle', 'sendBulkNotification'
        ];
        const isSensitive = operations.some(op => sensitiveOperations.includes(op));
        // Check if operations are bulk
        const bulkOperations = [
            'sendBulkNotification', 'assignEmployeesToReviewCycle',
            'createUser', 'updateUser' // When used with arrays
        ];
        const isBulk = operations.some(op => bulkOperations.includes(op)) ||
            query.includes('[') && query.includes(']'); // Array inputs
        return {
            type: isMutation ? 'mutation' : (isSubscription ? 'subscription' : 'query'),
            operations,
            complexity,
            isSensitive,
            isBulk
        };
    }
    static calculateComplexity(query, operations) {
        let complexity = 1;
        // Add complexity for each operation
        complexity += operations.length;
        // Add complexity for nested fields
        const depth = (query.match(/\{/g) || []).length;
        complexity += depth * 0.5;
        // Add complexity for variables
        const variables = (query.match(/\$\w+/g) || []).length;
        complexity += variables * 0.2;
        return Math.round(complexity);
    }
}
// Express middleware factory for HR-aware rate limiting
export function createHRRateLimitingMiddleware(redis, metricsCollector) {
    const userRateLimiter = new UserRateLimiter(redis);
    return async (req, res, next) => {
        const startTime = Date.now();
        try {
            // Skip rate limiting for health checks and introspection
            if (req.path.includes('health') ||
                (req.body?.query && req.body.query.includes('__schema'))) {
                return next();
            }
            // Extract user ID from JWT claims
            const userId = req.user?.user_id || req.headers['x-user-id'] || req.ip;
            const query = req.body?.query || '';
            // Analyze the GraphQL operation
            const analysis = GraphQLOperationAnalyzer.analyzeOperation(query);
            // Determine rate limiting strategy based on operation
            const rateLimitChecks = [];
            // General rate limiting
            rateLimitChecks.push({
                operation: 'general',
                limit: 100,
                windowMs: 15 * 60 * 1000
            });
            // Operation-specific rate limiting
            if (analysis.type === 'mutation') {
                rateLimitChecks.push({
                    operation: 'mutations',
                    limit: 20,
                    windowMs: 1 * 60 * 1000
                });
                if (analysis.isSensitive) {
                    rateLimitChecks.push({
                        operation: 'sensitive',
                        limit: 3,
                        windowMs: 5 * 60 * 1000
                    });
                }
                if (analysis.isBulk) {
                    rateLimitChecks.push({
                        operation: 'bulk',
                        limit: 10,
                        windowMs: 60 * 60 * 1000
                    });
                }
            }
            // Check rate limits
            const limitResult = await userRateLimiter.checkMultipleLimits(userId, rateLimitChecks);
            if (!limitResult.allowed) {
                const responseTime = Date.now() - startTime;
                metricsCollector.recordRequest(analysis.type, responseTime, true);
                metricsCollector.recordError('authErrors');
                return res.status(429).json({
                    error: 'Rate limit exceeded',
                    code: 'RATE_LIMIT_EXCEEDED',
                    failedChecks: limitResult.failedChecks,
                    retryAfter: new Date(limitResult.resetTime),
                    message: `Too many requests. Please try again after ${new Date(limitResult.resetTime).toLocaleString()}`
                });
            }
            // Set rate limit headers
            res.set({
                'X-RateLimit-Limit': '100',
                'X-RateLimit-Remaining': limitResult.resetTime.toString(),
                'X-RateLimit-Reset': new Date(limitResult.resetTime).toISOString()
            });
            // Track the request
            res.on('finish', () => {
                const responseTime = Date.now() - startTime;
                const hasErrors = res.statusCode >= 400;
                metricsCollector.recordRequest(analysis.type, responseTime, hasErrors);
                // Track HR-specific operations
                analysis.operations.forEach(operation => {
                    if (operation.includes('TimeEntry')) {
                        metricsCollector.recordHROperation('timeEntriesSubmitted');
                    }
                    else if (operation.includes('LeaveRequest')) {
                        metricsCollector.recordHROperation('leaveRequestsSubmitted');
                    }
                    else if (operation.includes('Goal')) {
                        metricsCollector.recordHROperation('goalsCreated');
                    }
                    else if (operation.includes('Notification')) {
                        metricsCollector.recordHROperation('notificationsSent');
                    }
                });
                // Track errors by type
                if (hasErrors) {
                    if (res.statusCode === 401 || res.statusCode === 403) {
                        metricsCollector.recordError('authErrors');
                    }
                    else if (res.statusCode === 400) {
                        metricsCollector.recordError('validationErrors');
                    }
                    else if (res.statusCode >= 500) {
                        metricsCollector.recordError('serverErrors');
                    }
                }
            });
            next();
        }
        catch (error) {
            console.error('Rate limiting middleware error:', error);
            // On error, allow the request (fail open)
            next();
        }
    };
}
// Health check endpoint data
export function getHealthCheckData(metricsCollector, redis, pgPool) {
    return async () => {
        const health = metricsCollector.getSystemHealth();
        try {
            // Check database
            const dbResult = await pgPool.query('SELECT 1 as status, NOW() as timestamp');
            health.services = {
                database: {
                    status: 'up',
                    responseTime: dbResult.duration || 0,
                    timestamp: dbResult.rows[0]?.timestamp
                }
            };
            // Check Redis
            const redisStart = Date.now();
            const redisResult = await redis.ping();
            health.services.redis = {
                status: redisResult === 'PONG' ? 'up' : 'down',
                responseTime: Date.now() - redisStart
            };
        }
        catch (error) {
            health.services = health.services || {};
            health.services.error = error.message;
        }
        return health;
    };
}
//# sourceMappingURL=hr-monitoring-plugin.js.map