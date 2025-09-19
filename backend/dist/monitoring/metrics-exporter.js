/**
 * Prometheus Metrics Exporter
 *
 * Export SvelteHR metrics in Prometheus format for monitoring and alerting.
 * Compatible with Prometheus, Grafana, and other monitoring systems.
 */
import { Registry, Counter, Histogram, Gauge } from 'prom-client';
import express from 'express';
import { createLogger, format, transports } from 'winston';
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
 * Metrics exporter for SvelteHR
 */
export class MetricsExporter {
  registry;
  app;
  // GraphQL metrics
  graphqlRequestTotal;
  graphqlRequestDuration;
  graphqlErrorsTotal;
  // Authentication metrics
  authAttemptsTotal;
  authSuccessesTotal;
  authFailuresTotal;
  authLatency;
  activeSessions;
  // Database metrics
  dbConnectionsActive;
  dbConnectionsIdle;
  dbConnectionsWaiting;
  dbQueryDuration;
  dbQueryErrorsTotal;
  // Cache metrics
  cacheHitsTotal;
  cacheMissesTotal;
  cacheOperationsTotal;
  cacheLatency;
  cacheMemoryUsage;
  // Service metrics
  serviceHealth;
  serviceLatency;
  serviceErrorsTotal;
  // System metrics
  processCpuSecondsTotal;
  processMemoryBytes;
  processStartTimeSeconds;
  runtimeVersion;
  constructor() {
    this.registry = new Registry();
    this.app = express();
    this.initializeMetrics();
    this.setupRoutes();
  }
  /**
   * Initialize all metrics
   */
  initializeMetrics() {
    // GraphQL metrics
    this.graphqlRequestTotal = new Counter({
      name: 'sveltehr_graphql_requests_total',
      help: 'Total number of GraphQL requests',
      labelNames: ['operation', 'status'],
      registers: [this.registry],
    });
    this.graphqlRequestDuration = new Histogram({
      name: 'sveltehr_graphql_request_duration_seconds',
      help: 'GraphQL request duration in seconds',
      labelNames: ['operation'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
      registers: [this.registry],
    });
    this.graphqlErrorsTotal = new Counter({
      name: 'sveltehr_graphql_errors_total',
      help: 'Total number of GraphQL errors',
      labelNames: ['operation', 'error_type'],
      registers: [this.registry],
    });
    // Authentication metrics
    this.authAttemptsTotal = new Counter({
      name: 'sveltehr_auth_attempts_total',
      help: 'Total authentication attempts',
      labelNames: ['result', 'method'],
      registers: [this.registry],
    });
    this.authSuccessesTotal = new Counter({
      name: 'sveltehr_auth_successes_total',
      help: 'Total successful authentications',
      labelNames: ['role'],
      registers: [this.registry],
    });
    this.authFailuresTotal = new Counter({
      name: 'sveltehr_auth_failures_total',
      help: 'Total failed authentications',
      labelNames: ['reason'],
      registers: [this.registry],
    });
    this.authLatency = new Histogram({
      name: 'sveltehr_auth_latency_seconds',
      help: 'Authentication latency in seconds',
      labelNames: ['method'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2],
      registers: [this.registry],
    });
    this.activeSessions = new Gauge({
      name: 'sveltehr_auth_active_sessions',
      help: 'Number of active user sessions',
      labelNames: ['role'],
      registers: [this.registry],
    });
    // Database metrics
    this.dbConnectionsActive = new Gauge({
      name: 'sveltehr_db_connections_active',
      help: 'Number of active database connections',
      registers: [this.registry],
    });
    this.dbConnectionsIdle = new Gauge({
      name: 'sveltehr_db_connections_idle',
      help: 'Number of idle database connections',
      registers: [this.registry],
    });
    this.dbConnectionsWaiting = new Gauge({
      name: 'sveltehr_db_connections_waiting',
      help: 'Number of waiting database connections',
      registers: [this.registry],
    });
    this.dbQueryDuration = new Histogram({
      name: 'sveltehr_db_query_duration_seconds',
      help: 'Database query duration in seconds',
      labelNames: ['operation', 'table'],
      buckets: [0.001, 0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
      registers: [this.registry],
    });
    this.dbQueryErrorsTotal = new Counter({
      name: 'sveltehr_db_query_errors_total',
      help: 'Total database query errors',
      labelNames: ['operation', 'table', 'error_type'],
      registers: [this.registry],
    });
    // Cache metrics
    this.cacheHitsTotal = new Counter({
      name: 'sveltehr_cache_hits_total',
      help: 'Total cache hits',
      labelNames: ['cache_type', 'key_pattern'],
      registers: [this.registry],
    });
    this.cacheMissesTotal = new Counter({
      name: 'sveltehr_cache_misses_total',
      help: 'Total cache misses',
      labelNames: ['cache_type', 'key_pattern'],
      registers: [this.registry],
    });
    this.cacheOperationsTotal = new Counter({
      name: 'sveltehr_cache_operations_total',
      help: 'Total cache operations',
      labelNames: ['operation', 'result'],
      registers: [this.registry],
    });
    this.cacheLatency = new Histogram({
      name: 'sveltehr_cache_operation_seconds',
      help: 'Cache operation latency in seconds',
      labelNames: ['operation'],
      buckets: [0.0001, 0.001, 0.01, 0.1, 0.5, 1],
      registers: [this.registry],
    });
    this.cacheMemoryUsage = new Gauge({
      name: 'sveltehr_cache_memory_bytes',
      help: 'Cache memory usage in bytes',
      labelNames: ['cache_type'],
      registers: [this.registry],
    });
    // Service metrics
    this.serviceHealth = new Gauge({
      name: 'sveltehr_service_health',
      help: 'Service health status (1=healthy, 0=unhealthy)',
      labelNames: ['service'],
      registers: [this.registry],
    });
    this.serviceLatency = new Histogram({
      name: 'sveltehr_service_response_time_seconds',
      help: 'Service response time in seconds',
      labelNames: ['service'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 5],
      registers: [this.registry],
    });
    this.serviceErrorsTotal = new Counter({
      name: 'sveltehr_service_errors_total',
      help: 'Total service errors',
      labelNames: ['service', 'error_type'],
      registers: [this.registry],
    });
    // System metrics
    this.processCpuSecondsTotal = new Counter({
      name: 'process_cpu_seconds_total',
      help: 'Total user and system CPU time spent in seconds',
      registers: [this.registry],
    });
    this.processMemoryBytes = new Gauge({
      name: 'process_memory_bytes',
      help: 'Process memory usage in bytes',
      labelNames: ['type'],
      registers: [this.registry],
    });
    this.processStartTimeSeconds = new Gauge({
      name: 'process_start_time_seconds',
      help: 'Start time of the process since unix epoch in seconds',
      registers: [this.registry],
    });
    this.runtimeVersion = new Gauge({
      name: 'sveltehr_runtime_version',
      help: 'SvelteHR runtime version',
      labelNames: ['component'],
      registers: [this.registry],
    });
    // Set initial values
    this.processStartTimeSeconds.set(Date.now() / 1000);
    this.runtimeVersion.set({ component: 'app' }, 1);
    logger.info('Prometheus metrics initialized');
  }
  /**
   * Setup express routes
   */
  setupRoutes() {
    // Metrics endpoint for Prometheus scraping
    this.app.get('/metrics', async (req, res) => {
      try {
        // Update system metrics
        await this.updateSystemMetrics();
        res.set('Content-Type', this.registry.contentType);
        res.end(await this.registry.metrics());
      } catch (error) {
        logger.error('Failed to expose metrics', error);
        res.status(500).send('Error exposing metrics');
      }
    });
    // Health endpoint that uses metrics
    this.app.get('/health-metric', (req, res) => {
      try {
        const metrics = this.getHealthMetrics();
        res.json(metrics);
      } catch (error) {
        logger.error('Failed to get health metrics', error);
        res.status(500).json({ error: 'Failed to get health metrics' });
      }
    });
  }
  /**
   * GraphQL metrics recording methods
   */
  recordGraphQLRequest(operation, status, duration) {
    this.graphqlRequestTotal.inc({ operation, status });
    this.graphqlRequestDuration.observe({ operation }, duration);
    if (status === 'error') {
      this.graphqlErrorsTotal.inc({ operation, error_type: 'graphql_error' });
    }
  }
  /**
   * Authentication metrics recording methods
   */
  recordAuthAttempt(method, result, role, reason) {
    this.authAttemptsTotal.inc({ result, method });
    if (result === 'success' && role) {
      this.authSuccessesTotal.inc({ role });
    } else if (result === 'failure' && reason) {
      this.authFailuresTotal.inc({ reason });
    }
  }
  recordAuthLatency(method, duration) {
    this.authLatency.observe({ method }, duration);
  }
  updateActiveSessions(roleBreakdown) {
    Object.entries(roleBreakdown).forEach(([role, count]) => {
      this.activeSessions.set({ role }, count);
    });
  }
  /**
   * Database metrics recording methods
   */
  updateDatabaseConnections(active, idle, waiting) {
    this.dbConnectionsActive.set(active);
    this.dbConnectionsIdle.set(idle);
    this.dbConnectionsWaiting.set(waiting);
  }
  recordDatabaseQuery(operation, table, duration, error) {
    this.dbQueryDuration.observe({ operation, table }, duration);
    if (error) {
      this.dbQueryErrorsTotal.inc({ operation, table, error_type: error });
    }
  }
  /**
   * Cache metrics recording methods
   */
  recordCacheHit(cacheType, keyPattern) {
    this.cacheHitsTotal.inc({
      cache_type: cacheType,
      key_pattern: keyPattern || 'unknown',
    });
  }
  recordCacheMiss(cacheType, keyPattern) {
    this.cacheMissesTotal.inc({
      cache_type: cacheType,
      key_pattern: keyPattern || 'unknown',
    });
  }
  recordCacheOperation(operation, result, duration) {
    this.cacheOperationsTotal.inc({ operation, result });
    if (duration !== undefined) {
      this.cacheLatency.observe({ operation }, duration);
    }
  }
  updateCacheMemoryUsage(cacheType, bytes) {
    this.cacheMemoryUsage.set({ cache_type: cacheType }, bytes);
  }
  /**
   * Service metrics recording methods
   */
  updateServiceHealth(service, healthy) {
    this.serviceHealth.set({ service }, healthy ? 1 : 0);
  }
  recordServiceLatency(service, duration) {
    this.serviceLatency.observe({ service }, duration);
  }
  recordServiceError(service, errorType) {
    this.serviceErrorsTotal.inc({ service, error_type });
  }
  /**
   * Update system metrics
   */
  async updateSystemMetrics() {
    const memUsage = process.memoryUsage();
    // Update process memory metrics
    this.processMemoryBytes.set({ type: 'rss' }, memUsage.rss);
    this.processMemoryBytes.set({ type: 'heap_total' }, memUsage.heapTotal);
    this.processMemoryBytes.set({ type: 'heap_used' }, memUsage.heapUsed);
    this.processMemoryBytes.set({ type: 'external' }, memUsage.external);
    // Update CPU time (approximate calculation)
    const cpuUsage = process.cpuUsage();
    // This would need more sophisticated calculation for actual CPU time
    // For now, we'll just set it when available
  }
  /**
   * Get health metrics based on collected data
   */
  getHealthMetrics() {
    return {
      timestamp: new Date().toISOString(),
      health_score: this.calculateHealthScore(),
      services: this.getServiceHealthSummary(),
      performance: {
        response_time_95th_percentile: this.calculateResponseTimePercentile(95),
        error_rate: this.calculateErrorRate(),
        cache_hit_rate: this.calculateCacheHitRate(),
      },
      resources: {
        memory_usage_mb: process.memoryUsage().heapUsed / 1024 / 1024,
        uptime_seconds: process.uptime(),
      },
    };
  }
  /**
   * Calculate overall health score (0-100)
   */
  calculateHealthScore() {
    // Simple calculation based on various metrics
    // This could be enhanced with more sophisticated algorithms
    let score = 100;
    // Deduct points for service errors
    const errorMetric = this.registry.getSingleMetric(
      'sveltehr_service_errors_total'
    );
    if (errorMetric) {
      const metrics = errorMetric.get();
      // This is a simplified version - in reality, you'd want more complex analysis
    }
    return Math.max(0, Math.min(100, score));
  }
  /**
   * Get service health summary
   */
  getServiceHealthSummary() {
    const services = [];
    // Get service health metrics
    const healthMetric = this.registry.getSingleMetric(
      'sveltehr_service_health'
    );
    if (healthMetric) {
      const metrics = healthMetric.get();
      for (const metric of metrics.values) {
        services.push({
          service: metric.labels.service,
          status: metric.value === 1 ? 'healthy' : 'unhealthy',
          score: metric.value * 100,
        });
      }
    }
    return services;
  }
  /**
   * Calculate response time percentile
   */
  calculateResponseTimePercentile(percentile) {
    // This would require collecting histogram data and calculating percentiles
    // For now, return a placeholder
    return 0;
  }
  /**
   * Calculate error rate
   */
  calculateErrorRate() {
    // Calculate error rate based on total requests vs errors
    return 0;
  }
  /**
   * Calculate cache hit rate
   */
  calculateCacheHitRate() {
    const hitsMetric = this.registry.getSingleMetric(
      'sveltehr_cache_hits_total'
    );
    const missesMetric = this.registry.getSingleMetric(
      'sveltehr_cache_misses_total'
    );
    if (!hitsMetric || !missesMetric) {
      return 0;
    }
    const hitsValue = hitsMetric.get();
    const missesValue = missesMetric.get();
    const totalHits =
      hitsValue.values?.reduce((sum, val) => sum + val.value, 0) || 0;
    const totalMisses =
      missesValue.values?.reduce((sum, val) => sum + val.value, 0) || 0;
    const total = totalHits + totalMisses;
    return total > 0 ? (totalHits / total) * 100 : 0;
  }
  /**
   * Get the express app for metrics endpoints
   */
  getApp() {
    return this.app;
  }
  /**
   * Get the prometheus registry
   */
  getRegistry() {
    return this.registry;
  }
  /**
   * Reset all metrics (useful for testing)
   */
  resetMetrics() {
    this.registry.reset();
  }
}
export default MetricsExporter;
//# sourceMappingURL=metrics-exporter.js.map
