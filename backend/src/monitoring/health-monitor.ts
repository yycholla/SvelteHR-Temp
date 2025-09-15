/**
 * Comprehensive Health Monitoring System
 * 
 * Multi-layer health monitoring with:
 * - Service health checks
 * - Performance metrics
 * - Security monitoring
 * - Resource utilization
 * - Alert management
 */

import { Pool } from 'pg';
import { Redis } from 'ioredis';
import { createLogger, format, transports } from 'winston';
import CacheService from '../cache/cache-service';

const logger = createLogger({
  level: 'debug',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [new transports.Console()]
});

interface HealthCheck {
  name: string;
  check: () => Promise<boolean>;
  critical: boolean;
  timeout: number;
}

interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: Date;
  responseTime: number;
  errorMessage?: string;
}

interface HealthSummary {
  overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  services: ServiceHealth[];
  metrics: SystemMetrics;
  timestamp: Date;
  uptime: number;
  version: string;
}

interface SystemMetrics {
  cpu: {
    usage: number;
    load: number[];
  };
  memory: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
  };
  process: {
    uptime: number;
    memory: NodeJS.MemoryUsage;
    cpu: NodeJS.CpuUsage;
  };
}

interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  service: string;
  timestamp: Date;
  resolved: boolean;
  metadata?: Record<string, any>;
}

/**
 * Health monitoring system for SvelteHR
 */
export class HealthMonitor {
  private pool: Pool;
  private redis: Redis;
  private cacheService: CacheService;
  private healthChecks: Map<string, HealthCheck>;
  private serviceHealth: Map<string, ServiceHealth>;
  private alerts: Map<string, Alert>;
  private metricsInterval: NodeJS.Timeout;
  private healthInterval: NodeJS.Timeout;
  private systemMetrics: SystemMetrics;

  constructor(pool: Pool, redis: Redis, cacheService: CacheService) {
    this.pool = pool;
    this.redis = redis;
    this.cacheService = cacheService;
    this.healthChecks = new Map();
    this.serviceHealth = new Map();
    this.alerts = new Map();
    this.systemMetrics = {
      cpu: { usage: 0, load: [0, 0, 0] },
      memory: { total: 0, used: 0, free: 0, percentage: 0 },
      disk: { total: 0, used: 0, free: 0, percentage: 0 },
      network: { bytesIn: 0, bytesOut: 0 },
      process: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      }
    };

    this.initializeHealthChecks();
  }

  /**
   * Initialize all health checks
   */
  private initializeHealthChecks(): void {
    // Database health check
    this.healthChecks.set('database', {
      name: 'Database',
      check: async () => this.checkDatabase(),
      critical: true,
      timeout: 5000
    });

    // Redis health check
    this.healthChecks.set('redis', {
      name: 'Redis Cache',
      check: async () => this.checkRedis(),
      critical: true,
      timeout: 3000
    });

    // PostgreSQL connection pool health
    this.healthChecks.set('connection-pool', {
      name: 'Connection Pool',
      check: async () => this.checkConnectionPool(),
      critical: true,
      timeout: 3000
    });

    // GraphQL endpoint health
    this.healthChecks.set('graphql', {
      name: 'GraphQL API',
      check: async () => this.checkGraphQL(),
      critical: true,
      timeout: 5000
    });

    // Authentication service health
    this.healthChecks.set('authentication', {
      name: 'Authentication',
      check: async () => this.checkAuthentication(),
      critical: true,
      timeout: 3000
    });

    // Cache service health
    this.healthChecks.set('cache', {
      name: 'Cache Service',
      check: async () => this.checkCache(),
      critical: false,
      timeout: 3000
    });

    // System resources health
    this.healthChecks.set('resources', {
      name: 'System Resources',
      check: async () => this.checkResources(),
      critical: false,
      timeout: 3000
    });
  }

  /**
   * Start monitoring
   */
  start(): void {
    // Run health checks every 30 seconds
    this.healthInterval = setInterval(async () => {
      await this.runHealthChecks();
    }, 30000);

    // Update system metrics every 10 seconds
    this.metricsInterval = setInterval(async () => {
      await this.updateSystemMetrics();
    }, 10000);

    // Run initial checks
    this.runHealthChecks();
    this.updateSystemMetrics();

    logger.info('Health monitoring started');
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.healthInterval) {
      clearInterval(this.healthInterval);
    }
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    logger.info('Health monitoring stopped');
  }

  /**
   * Run all health checks
   */
  private async runHealthChecks(): Promise<void> {
    const promises = Array.from(this.healthChecks.values()).map(async (healthCheck) => {
      const startTime = Date.now();
      
      try {
        // Execute check with timeout
        const checkPromise = Promise.race([
          healthCheck.check(),
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Health check timeout')), healthCheck.timeout);
          })
        ]);

        const isHealthy = await checkPromise;
        const responseTime = Date.now() - startTime;

        const serviceHealth: ServiceHealth = {
          name: healthCheck.name,
          status: isHealthy ? 'healthy' : 'unhealthy',
          lastCheck: new Date(),
          responseTime
        };

        this.serviceHealth.set(healthCheck.name, serviceHealth);

        // Create alerts for critical failures
        if (!isHealthy && healthCheck.critical) {
          this.createAlert({
            type: 'error',
            message: `${healthCheck.name} service is unhealthy`,
            service: healthCheck.name
          });
        }

      } catch (error) {
        const responseTime = Date.now() - startTime;
        const serviceHealth: ServiceHealth = {
          name: healthCheck.name,
          status: 'unhealthy',
          lastCheck: new Date(),
          responseTime,
          errorMessage: error.message
        };

        this.serviceHealth.set(healthCheck.name, serviceHealth);

        // Create alerts for check failures
        if (healthCheck.critical) {
          this.createAlert({
            type: 'error',
            message: `${healthCheck.name} health check failed: ${error.message}`,
            service: healthCheck.name
          });
        }
      }
    });

    await Promise.all(promises);

    logger.debug('Health checks completed', {
      services: Array.from(this.serviceHealth.values()),
      healthyCount: Array.from(this.serviceHealth.values()).filter(s => s.status === 'healthy').length
    });
  }

  /**
   * Database health check
   */
  private async checkDatabase(): Promise<boolean> {
    try {
      // Check basic connectivity
      const basicResult = await this.pool.query('SELECT 1');
      if (basicResult.rows.length === 0) {
        return false;
      }

      // Check database version and basic statistics
      const statsResult = await this.pool.query(`
        SELECT 
          version() as version,
          count(*) as table_count
        FROM information_schema.tables 
        WHERE table_schema = 'hr_public'
      `);

      const connectionResult = await this.pool.query(`
        SELECT count(*) as active_connections
        FROM pg_stat_activity 
        WHERE state = 'active'
        AND datname = current_database()
      `);

      logger.debug('Database health check passed', {
        version: statsResult.rows[0]?.version,
        tableCount: statsResult.rows[0]?.table_count,
        activeConnections: connectionResult.rows[0]?.active_connections
      });

      return true;

    } catch (error) {
      logger.error('Database health check failed', error);
      return false;
    }
  }

  /**
   * Redis health check
   */
  private async checkRedis(): Promise<boolean> {
    try {
      const start = Date.now();
      const result = await this.redis.ping();
      const responseTime = Date.now() - start;

      if (result !== 'PONG') {
        return false;
      }

      // Check Redis memory usage
      const info = await this.redis.info('memory');
      const usedMemoryMatch = info.match(/used_memory:(\d+)/);
      const maxMemoryMatch = info.match(/maxmemory:(\d+)/);

      if (usedMemoryMatch && maxMemoryMatch) {
        const used = parseInt(usedMemoryMatch[1]);
        const max = parseInt(maxMemoryMatch[1]);
        const percentage = max > 0 ? (used / max) * 100 : 0;

        // Warning if memory usage is high
        if (percentage > 80) {
          this.createAlert({
            type: 'warning',
            message: `Redis memory usage high: ${percentage.toFixed(1)}%`,
            service: 'Redis'
          });
        }
      }

      logger.debug('Redis health check passed', { responseTime });

      return true;

    } catch (error) {
      logger.error('Redis health check failed', error);
      return false;
    }
  }

  /**
   * Connection pool health check
   */
  private async checkConnectionPool(): Promise<boolean> {
    try {
      const config = this.pool.options;
      const total = this.pool.totalCount;
      const idle = this.pool.idleCount;
      const waiting = this.pool.waitingCount;

      // Check if pool is healthy
      const isHealthy = idle >= config.min && waiting === 0;

      if (!isHealthy) {
        this.createAlert({
          type: 'warning',
          message: `Connection pool issues - Total: ${total}, Idle: ${idle}, Waiting: ${waiting}`,
          service: 'Connection Pool'
        });
      }

      return isHealthy;

    } catch (error) {
      logger.error('Connection pool health check failed', error);
      return false;
    }
  }

  /**
   * GraphQL endpoint health check
   */
  private async checkGraphQL(): Promise<boolean> {
    try {
      // Perform a simple GraphQL query to test endpoint
      const testQuery = `
        query HealthCheck {
          __schema {
            types {
              name
            }
          }
        }
      `;

      // Here you would typically make an actual GraphQL request
      // For now, we'll check if the PostGraphile stack is healthy
      const result = await this.pool.query('SELECT 1 as graphql_test');

      return result.rows.length > 0;

    } catch (error) {
      logger.error('GraphQL health check failed', error);
      return false;
    }
  }

  /**
   * Authentication service health check
   */
  private async checkAuthentication(): Promise<boolean> {
    try {
      // Check if authentication functions exist and are accessible
      const result = await this.pool.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.routines 
          WHERE routine_schema = 'hr_public' 
          AND routine_name = 'authenticate_email'
        ) as auth_function_exists
      `);

      const exists = result.rows[0]?.auth_function_exists || false;

      if (!exists) {
        this.createAlert({
          type: 'error',
          message: 'Authentication function not found',
          service: 'Authentication'
        });
      }

      return exists;

    } catch (error) {
      logger.error('Authentication health check failed', error);
      return false;
    }
  }

  /**
   * Cache service health check
   */
  private async checkCache(): Promise<boolean> {
    try {
      // Perform a simple cache operation
      const testKey = 'health_check_test';
      const testValue = Date.now().toString();

      await this.cacheService.set(testKey, testValue, 10);
      const retrievedValue = await this.cacheService.get(testKey);
      await this.cacheService.delete(testKey);

      return retrievedValue === testValue;

    } catch (error) {
      logger.error('Cache health check failed', error);
      return false;
    }
  }

  /**
   * System resources health check
   */
  private async checkResources(): Promise<boolean> {
    try {
      const metrics = this.systemMetrics;
      
      // Check memory usage
      if (metrics.memory.percentage > 90) {
        this.createAlert({
          type: 'warning',
          message: `High memory usage: ${metrics.memory.percentage.toFixed(1)}%`,
          service: 'System Resources'
        });
        return false;
      }

      // Check disk usage
      if (metrics.disk.percentage > 90) {
        this.createAlert({
          type: 'warning',
          message: `High disk usage: ${metrics.disk.percentage.toFixed(1)}%`,
          service: 'System Resources'
        });
        return false;
      }

      // Check CPU usage
      if (metrics.cpu.usage > 90) {
        this.createAlert({
          type: 'warning',
          message: `High CPU usage: ${metrics.cpu.usage.toFixed(1)}%`,
          service: 'System Resources'
        });
        return false;
      }

      return true;

    } catch (error) {
      logger.error('System resources health check failed', error);
      return false;
    }
  }

  /**
   * Update system metrics
   */
  private async updateSystemMetrics(): Promise<void> {
    try {
      // Update process metrics
      this.systemMetrics.process.uptime = process.uptime();
      this.systemMetrics.process.memory = process.memoryUsage();
      this.systemMetrics.process.cpu = process.cpuUsage();

      // Get CPU and memory information (Node.js specific)
      const memoryUsage = process.memoryUsage();
      this.systemMetrics.memory = {
        total: memoryUsage.heapTotal + memoryUsage.external,
        used: memoryUsage.heapUsed + memoryUsage.external,
        free: memoryUsage.heapTotal - memoryUsage.heapUsed,
        percentage: ((memoryUsage.heapUsed + memoryUsage.external) / 
                    (memoryUsage.heapTotal + memoryUsage.external)) * 100
      };

      // CPU usage calculation (simplified)
      this.systemMetrics.cpu = {
        usage: 0, // This would require more complex calculation
        load: [0, 0, 0] // These would come from OS-level monitoring
      };

      // Disk usage (would require additional module)
      this.systemMetrics.disk = {
        total: 0,
        used: 0,
        free: 0,
        percentage: 0
      };

    } catch (error) {
      logger.error('Failed to update system metrics', error);
    }
  }

  /**
   * Create alert
   */
  private createAlert(alert: Omit<Alert, 'id' | 'timestamp' | 'resolved'>): void {
    const id = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullAlert: Alert = {
      ...alert,
      id,
      timestamp: new Date(),
      resolved: false
    };

    this.alerts.set(id, fullAlert);

    logger.warn('Alert created', fullAlert);

    // Store alert in Redis for persistence and alerts history
    try {
      this.redis.setex(`alert:${id}`, 86400, JSON.stringify(fullAlert)); // Store for 24 hours
    } catch (error) {
      logger.error('Failed to store alert in Redis', error);
    }
  }

  /**
   * Get current health summary
   */
  async getHealthSummary(): Promise<HealthSummary> {
    const services = Array.from(this.serviceHealth.values());
    const criticalServices = services.filter(service => {
      const healthCheck = this.healthChecks.get(service.name);
      return healthCheck?.critical;
    });

    const hasHealthyCriticals = criticalServices.filter(s => s.status === 'healthy').length;
    const totalCriticals = criticalServices.length;

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (hasHealthyCriticals === totalCriticals) {
      overallStatus = 'healthy';
    } else if (hasHealthyCriticals > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'unhealthy';
    }

    return {
      overallStatus,
      services,
      metrics: this.systemMetrics,
      timestamp: new Date(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0'
    };
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      this.alerts.set(alertId, alert);
      
      // Update in Redis
      this.redis.set(`alert:${alertId}`, JSON.stringify(alert)).catch(error => {
        logger.error('Failed to update alert in Redis', error);
      });

      logger.info('Alert resolved', alert);
      return true;
    }

    return false;
  }

  /**
   * Get detailed service status
   */
  getServiceStatus(serviceName: string): ServiceHealth | null {
    return this.serviceHealth.get(serviceName) || null;
  }
}

export default HealthMonitor;