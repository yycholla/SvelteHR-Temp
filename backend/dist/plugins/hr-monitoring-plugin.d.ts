/**
 * HR Monitoring and Rate Limiting Plugin
 *
 * Comprehensive system for monitoring API usage, performance, and implementing
 * intelligent rate limiting for HR operations.
 */
import { Redis } from 'ioredis';
export interface HRMetrics {
    requests: {
        total: number;
        queries: number;
        mutations: number;
        errors: number;
    };
    performance: {
        avgResponseTime: number;
        slowQueries: number;
        dbConnections: number;
    };
    hr: {
        timeEntriesSubmitted: number;
        leaveRequestsSubmitted: number;
        goalsCreated: number;
        notificationsSent: number;
    };
    errors: {
        validationErrors: number;
        authErrors: number;
        serverErrors: number;
    };
}
export declare const RateLimitConfigs: {
    general: {
        windowMs: number;
        max: number;
        message: {
            error: string;
            retryAfter: string;
            code: string;
        };
        standardHeaders: boolean;
        legacyHeaders: boolean;
    };
    auth: {
        windowMs: number;
        max: number;
        message: {
            error: string;
            retryAfter: string;
            code: string;
        };
        skipSuccessfulRequests: boolean;
    };
    mutations: {
        windowMs: number;
        max: number;
        message: {
            error: string;
            retryAfter: string;
            code: string;
        };
    };
    sensitive: {
        windowMs: number;
        max: number;
        message: {
            error: string;
            retryAfter: string;
            code: string;
        };
    };
    bulk: {
        windowMs: number;
        max: number;
        message: {
            error: string;
            retryAfter: string;
            code: string;
        };
    };
};
export declare class HRMetricsCollector {
    private metrics;
    private redis;
    private startTime;
    constructor(redis: Redis);
    recordRequest(type: 'query' | 'mutation', responseTime: number, hasErrors?: boolean): void;
    recordHROperation(operation: keyof HRMetrics['hr'], count?: number): void;
    recordError(errorType: keyof HRMetrics['errors'], count?: number): void;
    private updateAverageResponseTime;
    private storeMetricsInRedis;
    getMetrics(): HRMetrics;
    getSystemHealth(): any;
    private formatUptime;
}
export declare class UserRateLimiter {
    private redis;
    constructor(redis: Redis);
    checkUserLimit(userId: string, operation: string, limit: number, windowMs: number): Promise<{
        allowed: boolean;
        remainingRequests: number;
        resetTime: number;
    }>;
    checkMultipleLimits(userId: string, checks: Array<{
        operation: string;
        limit: number;
        windowMs: number;
    }>): Promise<{
        allowed: boolean;
        failedChecks: string[];
        resetTime: number;
    }>;
}
export declare class GraphQLOperationAnalyzer {
    static analyzeOperation(query: string): {
        type: 'query' | 'mutation' | 'subscription';
        operations: string[];
        complexity: number;
        isSensitive: boolean;
        isBulk: boolean;
    };
    private static calculateComplexity;
}
export declare function createHRRateLimitingMiddleware(redis: Redis, metricsCollector: HRMetricsCollector): (req: any, res: any, next: any) => Promise<any>;
export declare function getHealthCheckData(metricsCollector: HRMetricsCollector, redis: Redis, pgPool: any): () => Promise<any>;
export { HRMetricsCollector, UserRateLimiter, GraphQLOperationAnalyzer };
