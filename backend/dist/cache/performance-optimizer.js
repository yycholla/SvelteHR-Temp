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
import { createLogger, format, transports } from 'winston';
import { GraphQLQueryCache } from './cache-service';
const logger = createLogger({
  level: 'debug',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [new transports.Console()],
});
/**
 * Performance optimization service with real-time monitoring
 */
export class PerformanceOptimizer {
  pool;
  redis;
  cacheService;
  graphQLCache;
  metrics = [];
  maxMetricsHistory = 1000;
  optimizationSettings;
  constructor(pool, redis, cacheService, settings) {
    this.pool = pool;
    this.redis = redis;
    this.cacheService = cacheService;
    this.graphQLCache = new GraphQLQueryCache(cacheService);
    this.optimizationSettings = {
      slowQueryThreshold: 1000, // 1 second
      highConnectionThreshold: 80, // 80% of max connections
      lowCacheHitRateThreshold: 0.7, // 70% hit rate
      highMemoryThreshold: 512 * 1024 * 1024, // 512MB
      enableAutomaticOptimization: true,
      ...settings,
    };
    this.startMetricsCollection();
  }
  /**
   * Start continuous metrics collection
   */
  startMetricsCollection() {
    setInterval(async () => {
      await this.collectMetrics();
      // Analyze metrics and generate suggestions
      if (this.optimizationSettings.enableAutomaticOptimization) {
        await this.analyzeAndOptimize();
      }
    }, 30000); // Every 30 seconds
    logger.info('Performance optimizer started', {
      slowQueryThreshold: this.optimizationSettings.slowQueryThreshold,
      highConnectionThreshold:
        this.optimizationSettings.highConnectionThreshold,
    });
  }
  /**
   * Collect current performance metrics
   */
  async collectMetrics() {
    try {
      const metrics = {
        timestamp: Date.now(),
        queryLatency: await this.getAverageQueryLatency(),
        connectionCount: await this.getActiveConnectionCount(),
        cacheHitRate: this.cacheService.getStats().hitRate,
        memoryUsage: this.getTotalMemoryUsage(),
        cpuUsage: this.getCPUUsage(),
      };
      this.metrics.push(metrics);
      // Keep only recent metrics
      if (this.metrics.length > this.maxMetricsHistory) {
        this.metrics = this.metrics.slice(-this.maxMetricsHistory);
      }
      logger.debug('Performance metrics collected', metrics);
    } catch (error) {
      logger.error('Metrics collection failed', { error: error.message });
    }
  }
  /**
   * Get average query latency from PostgreSQL
   */
  async getAverageQueryLatency() {
    try {
      const result = await this.pool.query(`
        SELECT AVG(total_time) as avg_latency
        FROM pg_stat_statements
        WHERE calls > 0
      `);
      return parseFloat(result.rows[0]?.avg_latency) || 0;
    } catch (error) {
      logger.debug('Could not get query latency', { error: error.message });
      return 0;
    }
  }
  /**
   * Get active connection count
   */
  async getActiveConnectionCount() {
    try {
      const result = await this.pool.query(`
        SELECT count(*) as active_connections
        FROM pg_stat_activity
        WHERE state = 'active'
      `);
      return parseInt(result.rows[0]?.active_connections) || 0;
    } catch (error) {
      logger.debug('Could not get connection count', { error: error.message });
      return 0;
    }
  }
  /**
   * Get total memory usage
   */
  getTotalMemoryUsage() {
    return process.memoryUsage().heapUsed;
  }
  /**
   * Get CPU usage (Node.js)
   */
  getCPUUsage() {
    return process.cpuUsage();
  }
  /**
   * Analyze metrics and generate optimization suggestions
   */
  async analyzeAndOptimize() {
    try {
      const suggestions = await this.generateOptimizationSuggestions();
      // Log suggestions and apply automatic optimizations
      for (const suggestion of suggestions) {
        logger.info('Performance suggestion generated', suggestion);
        if (
          (this.optimizationSettings.enableAutomaticOptimization &&
            suggestion.severity === 'high') ||
          suggestion.severity === 'critical'
        ) {
          await this.applyOptimization(suggestion);
        }
      }
    } catch (error) {
      logger.error('Performance analysis failed', { error: error.message });
    }
  }
  /**
   * Generate optimization suggestions based on current metrics
   */
  async generateOptimizationSuggestions() {
    const suggestions = [];
    const recentMetrics = this.metrics.slice(-10); // Last 5 minutes
    if (recentMetrics.length === 0) {
      return suggestions;
    }
    const avgMetrics = this.calculateAverageMetrics(recentMetrics);
    // Analyze query latency
    if (
      avgMetrics.queryLatency > this.optimizationSettings.slowQueryThreshold
    ) {
      suggestions.push({
        type: 'query',
        severity: 'high',
        message: `Average query latency (${avgMetrics.queryLatency.toFixed(2)}ms) exceeds threshold`,
        suggestion:
          'Review pg_stat_statements for slow queries and add missing indexes',
        impact:
          avgMetrics.queryLatency /
          this.optimizationSettings.slowQueryThreshold,
      });
    }
    // Analyze connection count
    if (
      avgMetrics.connectionCount >
      this.optimizationSettings.highConnectionThreshold
    ) {
      suggestions.push({
        type: 'connection',
        severity: 'medium',
        message: `High connection count (${avgMetrics.connectionCount})`,
        suggestion:
          'Consider increasing pool size or implementing connection timeout',
        impact:
          avgMetrics.connectionCount /
          this.optimizationSettings.highConnectionThreshold,
      });
    }
    // Analyze cache hit rate
    if (
      avgMetrics.cacheHitRate <
      this.optimizationSettings.lowCacheHitRateThreshold
    ) {
      suggestions.push({
        type: 'cache',
        severity: 'medium',
        message: `Low cache hit rate (${(avgMetrics.cacheHitRate * 100).toFixed(1)}%)`,
        suggestion:
          'Review cache keys and TTLs, implement cache warming for frequently accessed data',
        impact:
          1 -
          avgMetrics.cacheHitRate /
            this.optimizationSettings.lowCacheHitRateThreshold,
      });
    }
    // Analyze memory usage
    if (
      avgMetrics.memoryUsage > this.optimizationSettings.highMemoryThreshold
    ) {
      suggestions.push({
        type: 'memory',
        severity: 'medium',
        message: `High memory usage (${this.formatBytes(avgMetrics.memoryUsage)})`,
        suggestion:
          'Review memory leaks, increase garbage collection frequency, or increase memory limits',
        impact:
          avgMetrics.memoryUsage /
          this.optimizationSettings.highMemoryThreshold,
      });
    }
    // Check for missing indexes (database-specific optimization)
    await this.checkDatabaseIndexes(suggestions);
    return suggestions;
  }
  /**
   * Calculate average metrics from metrics array
   */
  calculateAverageMetrics(metrics) {
    const sum = metrics.reduce(
      (acc, metric) => ({
        queryLatency: acc.queryLatency + metric.queryLatency,
        connectionCount: acc.connectionCount + metric.connectionCount,
        cacheHitRate: acc.cacheHitRate + metric.cacheHitRate,
        memoryUsage: acc.memoryUsage + metric.memoryUsage,
      }),
      {
        queryLatency: 0,
        connectionCount: 0,
        cacheHitRate: 0,
        memoryUsage: 0,
      }
    );
    const count = metrics.length;
    return {
      queryLatency: sum.queryLatency / count,
      connectionCount: sum.connectionCount / count,
      cacheHitRate: sum.cacheHitRate / count,
      memoryUsage: sum.memoryUsage / count,
    };
  }
  /**
   * Check for missing database indexes
   */
  async checkDatabaseIndexes(suggestions) {
    try {
      // Check for tables without indexes or with missing foreign key indexes
      const result = await this.pool.query(`
        WITH table_info AS (
          SELECT 
            t.tablename,
            c.reltuples::bigint as row_count
          FROM pg_tables t
          JOIN pg_class c ON t.tablename = c.relname
          WHERE t.schemaname = 'hr_public'
        ),
        index_info AS (
          SELECT 
            t.tablename,
            COUNT(i.indexname) as index_count,
            COUNT(DISTINCT i.indisprimary) as has_pk
          FROM pg_tables t
          LEFT JOIN pg_indexes i ON t.tablename = i.tablename
          WHERE t.schemaname = 'hr_public'
          GROUP BY t.tablename
        )
        SELECT 
          ti.tablename,
          ti.row_count,
          COALESCE(ii.index_count, 0) as index_count,
          COALESCE(ii.has_pk, 0) as has_pk
        FROM table_info ti
        LEFT JOIN index_info ii ON ti.tablename = ii.tablename
        WHERE ti.row_count > 1000  -- Only check tables with significant data
        ORDER BY ti.row_count DESC
      `);
      for (const row of result.rows) {
        if (row.index_count === 0) {
          suggestions.push({
            type: 'index',
            severity: 'high',
            message: `Table ${row.tablename} (${row.row_count?.toLocaleString()} rows) has no indexes`,
            suggestion: `Add primary key indexing and frequently queried fields indexes to ${row.tablename}`,
            impact: 0.8,
          });
        } else if (row.has_pk === 0) {
          suggestions.push({
            type: 'index',
            severity: 'medium',
            message: `Table ${row.tablename} lacks primary key`,
            suggestion: `Add primary key indexing to ${row.tablename}`,
            impact: 0.5,
          });
        }
      }
    } catch (error) {
      logger.debug('Could not check database indexes', {
        error: error.message,
      });
    }
  }
  /**
   * Apply automatic optimization
   */
  async applyOptimization(suggestion) {
    logger.info('Applying automatic optimization', suggestion);
    switch (suggestion.type) {
      case 'cache':
        await this.optimizeCache();
        break;
      case 'query':
        await this.optimizeQueries();
        break;
      case 'connection':
        await this.optimizeConnections();
        break;
      case 'memory':
        await this.optimizeMemory();
        break;
      case 'index':
        // Index optimizations require manual review
        logger.warn('Index optimization requires manual review', suggestion);
        break;
    }
  }
  /**
   * Optimize cache settings dynamically
   */
  async optimizeCache() {
    // Implement cache optimization strategies
    try {
      const stats = this.cacheService.getStats();
      if (
        stats.hitRate < 0.5 &&
        stats.memoryUsage < this.cacheService['config'].maxKeys * 0.8
      ) {
        // Increase memory cache TTL if hit rate is low and we have space
        if (this.cacheService['config'].memoryCacheTTL < 600) {
          this.cacheService['config'].memoryCacheTTL += 60;
          logger.info('Increased memory cache TTL', {
            newTTL: this.cacheService['config'].memoryCacheTTL,
          });
        }
      } else if (stats.hitRate < 0.3) {
        // Clear stale cache if hit rate is very low
        await this.cacheService.invalidate('stale');
      }
    } catch (error) {
      logger.error('Cache optimization failed', { error: error.message });
    }
  }
  /**
   * Optimize poor-performing queries
   */
  async optimizeQueries() {
    try {
      // Clear poor performing query cache
      await this.cacheService.invalidate('slow_query');
      // Run PostgreSQL ANALYZE to update statistics
      await this.pool.query('ANALYZE');
      logger.info('Query optimization applied');
    } catch (error) {
      logger.error('Query optimization failed', { error: error.message });
    }
  }
  /**
   * Optimize connection pool settings
   */
  async optimizeConnections() {
    try {
      const currentStats = await this.pool.query(`
        SELECT count(*) as total_connections,
               count(*) FILTER (WHERE state = 'active') as active_connections
        FROM pg_stat_activity
        WHERE datname = current_database()
      `);
      const totalConnections = parseInt(currentStats.rows[0].total_connections);
      const activeConnections = parseInt(
        currentStats.rows[0].active_connections
      );
      // Log connection usage for manual review
      logger.info('Connection pool usage', {
        totalConnections,
        activeConnections,
        poolSize: this.pool.totalCount,
        idle: this.pool.idleCount,
      });
    } catch (error) {
      logger.error('Connection optimization failed', { error: error.message });
    }
  }
  /**
   * Optimize memory usage
   */
  async optimizeMemory() {
    try {
      // Trigger garbage collection if available
      if (global.gc) {
        global.gc();
        logger.info('Manual garbage collection triggered');
      }
      // Clear old metrics to free memory
      if (this.metrics.length > this.maxMetricsHistory / 2) {
        this.metrics = this.metrics.slice(-this.maxMetricsHistory / 2);
        logger.info('Old metrics cleared to free memory');
      }
    } catch (error) {
      logger.error('Memory optimization failed', { error: error.message });
    }
  }
  /**
   * Format bytes for human readable output
   */
  formatBytes(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }
  /**
   * Get current performance report
   */
  getPerformanceReport() {
    const recentMetrics = this.metrics.slice(-20);
    const avgMetrics = this.calculateAverageMetrics(recentMetrics);
    const cacheStats = this.cacheService.getStats();
    return {
      timestamp: new Date().toISOString(),
      metrics: avgMetrics,
      cache: cacheStats,
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
      },
      settings: this.optimizationSettings,
    };
  }
  /**
   * Get GraphQL cache instance
   */
  getGraphQLCache() {
    return this.graphQLCache;
  }
}
export default PerformanceOptimizer;
//# sourceMappingURL=performance-optimizer.js.map
