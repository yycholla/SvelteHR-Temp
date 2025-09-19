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
import CacheService from '../cache/cache-service';
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
export declare class HealthMonitor {
  private pool;
  private redis;
  private cacheService;
  private healthChecks;
  private serviceHealth;
  private alerts;
  private metricsInterval;
  private healthInterval;
  private systemMetrics;
  constructor(pool: Pool, redis: Redis, cacheService: CacheService);
  /**
   * Initialize all health checks
   */
  private initializeHealthChecks;
  /**
   * Start monitoring
   */
  start(): void;
  /**
   * Stop monitoring
   */
  stop(): void;
  /**
   * Run all health checks
   */
  private runHealthChecks;
  /**
   * Database health check
   */
  private checkDatabase;
  /**
   * Redis health check
   */
  private checkRedis;
  /**
   * Connection pool health check
   */
  private checkConnectionPool;
  /**
   * GraphQL endpoint health check
   */
  private checkGraphQL;
  /**
   * Authentication service health check
   */
  private checkAuthentication;
  /**
   * Cache service health check
   */
  private checkCache;
  /**
   * System resources health check
   */
  private checkResources;
  /**
   * Update system metrics
   */
  private updateSystemMetrics;
  /**
   * Create alert
   */
  private createAlert;
  /**
   * Get current health summary
   */
  getHealthSummary(): Promise<HealthSummary>;
  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[];
  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): boolean;
  /**
   * Get detailed service status
   */
  getServiceStatus(serviceName: string): ServiceHealth | null;
}
export default HealthMonitor;
