/**
 * Prometheus Metrics Exporter
 *
 * Export SvelteHR metrics in Prometheus format for monitoring and alerting.
 * Compatible with Prometheus, Grafana, and other monitoring systems.
 */
import { Registry } from 'prom-client';
import express from 'express';
/**
 * Metrics exporter for SvelteHR
 */
export declare class MetricsExporter {
    private registry;
    private app;
    private graphqlRequestTotal;
    private graphqlRequestDuration;
    private graphqlErrorsTotal;
    private authAttemptsTotal;
    private authSuccessesTotal;
    private authFailuresTotal;
    private authLatency;
    private activeSessions;
    private dbConnectionsActive;
    private dbConnectionsIdle;
    private dbConnectionsWaiting;
    private dbQueryDuration;
    private dbQueryErrorsTotal;
    private cacheHitsTotal;
    private cacheMissesTotal;
    private cacheOperationsTotal;
    private cacheLatency;
    private cacheMemoryUsage;
    private serviceHealth;
    private serviceLatency;
    private serviceErrorsTotal;
    private processCpuSecondsTotal;
    private processMemoryBytes;
    private processStartTimeSeconds;
    private runtimeVersion;
    constructor();
    /**
     * Initialize all metrics
     */
    private initializeMetrics;
    /**
     * Setup express routes
     */
    private setupRoutes;
    /**
     * GraphQL metrics recording methods
     */
    recordGraphQLRequest(operation: string, status: 'success' | 'error', duration: number): void;
    /**
     * Authentication metrics recording methods
     */
    recordAuthAttempt(method: string, result: 'success' | 'failure', role?: string, reason?: string): void;
    recordAuthLatency(method: string, duration: number): void;
    updateActiveSessions(roleBreakdown: Record<string, number>): void;
    /**
     * Database metrics recording methods
     */
    updateDatabaseConnections(active: number, idle: number, waiting: number): void;
    recordDatabaseQuery(operation: string, table: string, duration: number, error?: string): void;
    /**
     * Cache metrics recording methods
     */
    recordCacheHit(cacheType: string, keyPattern?: string): void;
    recordCacheMiss(cacheType: string, keyPattern?: string): void;
    recordCacheOperation(operation: string, result: 'success' | 'error', duration?: number): void;
    updateCacheMemoryUsage(cacheType: string, bytes: number): void;
    /**
     * Service metrics recording methods
     */
    updateServiceHealth(service: string, healthy: boolean): void;
    recordServiceLatency(service: string, duration: number): void;
    recordServiceError(service: string, errorType: string): void;
    /**
     * Update system metrics
     */
    private updateSystemMetrics;
    /**
     * Get health metrics based on collected data
     */
    private getHealthMetrics;
    /**
     * Calculate overall health score (0-100)
     */
    private calculateHealthScore;
    /**
     * Get service health summary
     */
    private getServiceHealthSummary;
    /**
     * Calculate response time percentile
     */
    private calculateResponseTimePercentile;
    /**
     * Calculate error rate
     */
    private calculateErrorRate;
    /**
     * Calculate cache hit rate
     */
    private calculateCacheHitRate;
    /**
     * Get the express app for metrics endpoints
     */
    getApp(): express.Application;
    /**
     * Get the prometheus registry
     */
    getRegistry(): Registry;
    /**
     * Reset all metrics (useful for testing)
     */
    resetMetrics(): void;
}
export default MetricsExporter;
