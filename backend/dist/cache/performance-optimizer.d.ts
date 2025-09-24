/**
 * Performance Optimizer for SvelteHR
 *
 * Comprehensive performance optimization including:
 * - Query optimization
 * - Connection pooling
 * - Resource optimization
 * - Performance monitoring
 * - Auto-scaling recommendations
 */
import { Pool } from 'pg';
import { Redis } from 'ioredis';
import { CacheService, GraphQLQueryCache } from './cache-service';
interface OptimizationSuggestion {
    type: 'query' | 'connection' | 'cache' | 'memory' | 'index';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    suggestion: string;
    impact: number;
}
/**
 * Performance optimization service with real-time monitoring
 */
export declare class PerformanceOptimizer {
    private pool;
    private redis;
    private cacheService;
    private graphQLCache;
    private metrics;
    private maxMetricsHistory;
    private optimizationSettings;
    constructor(pool: Pool, redis: Redis, cacheService: CacheService, settings?: Partial<typeof this.optimizationSettings>);
    /**
     * Start continuous metrics collection
     */
    private startMetricsCollection;
    /**
     * Collect current performance metrics
     */
    private collectMetrics;
    /**
     * Get average query latency from PostgreSQL
     */
    private getAverageQueryLatency;
    /**
     * Get active connection count
     */
    private getActiveConnectionCount;
    /**
     * Get total memory usage
     */
    private getTotalMemoryUsage;
    /**
     * Get CPU usage (Node.js)
     */
    private getCPUUsage;
    /**
     * Analyze metrics and generate optimization suggestions
     */
    private analyzeAndOptimize;
    /**
     * Generate optimization suggestions based on current metrics
     */
    generateOptimizationSuggestions(): Promise<OptimizationSuggestion[]>;
    /**
     * Calculate average metrics from metrics array
     */
    private calculateAverageMetrics;
    /**
     * Check for missing database indexes
     */
    private checkDatabaseIndexes;
    /**
     * Apply automatic optimization
     */
    private applyOptimization;
    /**
     * Optimize cache settings dynamically
     */
    private optimizeCache;
    /**
     * Optimize poor-performing queries
     */
    private optimizeQueries;
    /**
     * Optimize connection pool settings
     */
    private optimizeConnections;
    /**
     * Optimize memory usage
     */
    private optimizeMemory;
    /**
     * Format bytes for human readable output
     */
    private formatBytes;
    /**
     * Get current performance report
     */
    getPerformanceReport(): any;
    /**
     * Get GraphQL cache instance
     */
    getGraphQLCache(): GraphQLQueryCache;
}
export default PerformanceOptimizer;
