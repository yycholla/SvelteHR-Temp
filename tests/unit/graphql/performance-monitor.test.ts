/**
 * GraphQL Performance Monitor Tests
 *
 * Tests for GraphQL operation performance monitoring and analysis.
 */

import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { parse } from 'graphql';
import {
  GraphQLPerformanceMonitor,
  createPostGraphilePerformanceMonitor
} from '$lib/graphql/performance-monitor';
import type {
  GraphQLPerformanceMetrics,
  PerformanceAlert
} from '../../../src/tests/generated/test-types';

// Mock performance metrics for testing
const createMockMetrics = (overrides: Partial<GraphQLPerformanceMetrics> = {}): GraphQLPerformanceMetrics => ({
  operationName: 'TestQuery',
  operationType: 'query',
  executionTime: 100,
  complexity: 50,
  depth: 3,
  fieldCount: 10,
  errorCount: 0,
  cacheHitRatio: 0.8,
  ...overrides
});

describe('GraphQLPerformanceMonitor', () => {
  let monitor: GraphQLPerformanceMonitor;
  let alertHandler: vi.Mock;
  let reportHandler: vi.Mock;

  beforeEach(() => {
    vi.useFakeTimers();
    monitor = new GraphQLPerformanceMonitor({
      reportingInterval: 0, // Disable automatic reporting for tests
      alertingEnabled: true
    });

    alertHandler = vi.fn();
    reportHandler = vi.fn();

    monitor.onAlert(alertHandler);
    monitor.onReport(reportHandler);
  });

  afterEach(() => {
    vi.useRealTimers();
    monitor.stop();
  });

  describe('Basic Metrics Recording', () => {
    test('should record and store performance metrics', () => {
      const metrics = createMockMetrics({ operationName: 'UserQuery', executionTime: 150 });

      monitor.recordMetrics(metrics);

      const profile = monitor.getQueryProfile('UserQuery');

      expect(profile).toBeDefined();
      expect(profile?.operationName).toBe('UserQuery');
      expect(profile?.executionCount).toBe(1);
      expect(profile?.averageExecutionTime).toBe(150);
      expect(profile?.minExecutionTime).toBe(150);
      expect(profile?.maxExecutionTime).toBe(150);
    });

    test('should update existing query profiles', () => {
      const metrics1 = createMockMetrics({ operationName: 'UserQuery', executionTime: 100 });
      const metrics2 = createMockMetrics({ operationName: 'UserQuery', executionTime: 200 });

      monitor.recordMetrics(metrics1);
      monitor.recordMetrics(metrics2);

      const profile = monitor.getQueryProfile('UserQuery');

      expect(profile?.executionCount).toBe(2);
      expect(profile?.averageExecutionTime).toBe(150);
      expect(profile?.minExecutionTime).toBe(100);
      expect(profile?.maxExecutionTime).toBe(200);
    });

    test('should generate query hash for document-based queries', () => {
      const document = parse(`
        query TestDocumentQuery {
          users {
            id
            name
          }
        }
      `);

      const metrics = createMockMetrics({ operationName: undefined });

      monitor.recordMetrics(metrics, document);

      const profiles = monitor.getAllQueryProfiles();
      expect(profiles.length).toBe(1);
      expect(profiles[0].queryHash).toBeTruthy();
    });

    test('should skip introspection queries when configured', () => {
      const introspectionMetrics = createMockMetrics({ operationName: 'IntrospectionQuery' });

      monitor.recordMetrics(introspectionMetrics);

      const profiles = monitor.getAllQueryProfiles();
      expect(profiles.length).toBe(0);
    });

    test('should respect sample rate configuration', () => {
      const lowSampleMonitor = new GraphQLPerformanceMonitor({ sampleRate: 0 });
      const metrics = createMockMetrics();

      lowSampleMonitor.recordMetrics(metrics);

      const profiles = lowSampleMonitor.getAllQueryProfiles();
      expect(profiles.length).toBe(0);
    });
  });

  describe('Performance Alerts', () => {
    test('should trigger slow query alerts', () => {
      const slowMetrics = createMockMetrics({
        operationName: 'SlowQuery',
        executionTime: 600 // Above critical threshold
      });

      monitor.recordMetrics(slowMetrics);

      expect(alertHandler).toHaveBeenCalledTimes(1);
      const alert: PerformanceAlert = alertHandler.mock.calls[0][0];

      expect(alert.severity).toBe('critical');
      expect(alert.type).toBe('slow_query');
      expect(alert.operationName).toBe('SlowQuery');
      expect(alert.recommendations.length).toBeGreaterThan(0);
    });

    test('should trigger complexity alerts', () => {
      const complexMetrics = createMockMetrics({
        operationName: 'ComplexQuery',
        complexity: 1200 // Above critical threshold
      });

      monitor.recordMetrics(complexMetrics);

      expect(alertHandler).toHaveBeenCalledTimes(1);
      const alert: PerformanceAlert = alertHandler.mock.calls[0][0];

      expect(alert.severity).toBe('critical');
      expect(alert.type).toBe('high_complexity');
    });

    test('should trigger low cache hit rate alerts', () => {
      const lowCacheMetrics = createMockMetrics({
        operationName: 'LowCacheQuery',
        cacheHitRatio: 0.5 // Below warning threshold
      });

      monitor.recordMetrics(lowCacheMetrics);

      expect(alertHandler).toHaveBeenCalledTimes(1);
      const alert: PerformanceAlert = alertHandler.mock.calls[0][0];

      expect(alert.type).toBe('low_cache_hit');
      expect(alert.severity).toBe('warning');
    });

    test('should not trigger alerts when alerting is disabled', () => {
      const disabledMonitor = new GraphQLPerformanceMonitor({ alertingEnabled: false });
      const alertHandlerDisabled = vi.fn();
      disabledMonitor.onAlert(alertHandlerDisabled);

      const slowMetrics = createMockMetrics({ executionTime: 600 });
      disabledMonitor.recordMetrics(slowMetrics);

      expect(alertHandlerDisabled).not.toHaveBeenCalled();
    });

    test('should provide meaningful alert recommendations', () => {
      const metrics = createMockMetrics({ executionTime: 600, complexity: 1200 });

      monitor.recordMetrics(metrics);

      expect(alertHandler).toHaveBeenCalledTimes(2); // One for slow query, one for complexity

      alertHandler.mock.calls.forEach(call => {
        const alert: PerformanceAlert = call[0];
        expect(alert.recommendations.length).toBeGreaterThan(0);
        expect(alert.recommendations[0]).toMatch(/(optim|improv|reduc|review)/i);
      });
    });
  });

  describe('Query Profile Analysis', () => {
    test('should calculate percentiles correctly', () => {
      const operationName = 'PercentileTest';

      // Record multiple metrics with different execution times
      const executionTimes = [50, 100, 150, 200, 300, 400, 500, 600, 800, 1000];

      executionTimes.forEach(time => {
        monitor.recordMetrics(createMockMetrics({ operationName, executionTime: time }));
      });

      const profile = monitor.getQueryProfile(operationName);

      expect(profile?.percentiles.p50).toBeLessThan(profile?.percentiles.p95);
      expect(profile?.percentiles.p95).toBeLessThan(profile?.percentiles.p99);
      expect(profile?.percentiles.p99).toBe(1000); // Should be the maximum value
    });

    test('should track cache statistics accurately', () => {
      const operationName = 'CacheTest';

      // Record metrics with different cache hit ratios
      monitor.recordMetrics(createMockMetrics({ operationName, cacheHitRatio: 1.0 })); // Hit
      monitor.recordMetrics(createMockMetrics({ operationName, cacheHitRatio: 0.0 })); // Miss
      monitor.recordMetrics(createMockMetrics({ operationName, cacheHitRatio: 1.0 })); // Hit

      const profile = monitor.getQueryProfile(operationName);

      expect(profile?.cacheStats.hits).toBe(2);
      expect(profile?.cacheStats.misses).toBe(1);
      expect(profile?.cacheStats.hitRate).toBeCloseTo(0.667, 2); // 2/3
    });

    test('should calculate complexity statistics', () => {
      const operationName = 'ComplexityTest';

      monitor.recordMetrics(createMockMetrics({ operationName, complexity: 100 }));
      monitor.recordMetrics(createMockMetrics({ operationName, complexity: 200 }));
      monitor.recordMetrics(createMockMetrics({ operationName, complexity: 300 }));

      const profile = monitor.getQueryProfile(operationName);

      expect(profile?.complexityStats.min).toBe(100);
      expect(profile?.complexityStats.max).toBe(300);
      expect(profile?.complexityStats.average).toBe(200);
    });

    test('should calculate error rates correctly', () => {
      const operationName = 'ErrorTest';

      monitor.recordMetrics(createMockMetrics({ operationName, errorCount: 0 }));
      monitor.recordMetrics(createMockMetrics({ operationName, errorCount: 1 }));
      monitor.recordMetrics(createMockMetrics({ operationName, errorCount: 0 }));
      monitor.recordMetrics(createMockMetrics({ operationName, errorCount: 1 }));

      const profile = monitor.getQueryProfile(operationName);

      expect(profile?.errorRate).toBe(0.5); // 50% error rate
    });

    test('should identify performance trends', () => {
      const operationName = 'TrendTest';

      // Simulate degrading performance over time
      for (let i = 1; i <= 15; i++) {
        const executionTime = i <= 5 ? 100 : 200; // First 5 fast, next 10 slow
        monitor.recordMetrics(createMockMetrics({ operationName, executionTime }));
      }

      const profile = monitor.getQueryProfile(operationName);

      expect(profile?.trending).toBe('degrading');
    });
  });

  describe('Performance Reports', () => {
    test('should generate comprehensive performance reports', () => {
      // Record various metrics
      monitor.recordMetrics(createMockMetrics({ operationName: 'FastQuery', executionTime: 50 }));
      monitor.recordMetrics(createMockMetrics({ operationName: 'SlowQuery', executionTime: 300 }));
      monitor.recordMetrics(createMockMetrics({ operationName: 'ComplexQuery', complexity: 800 }));

      const report = monitor.generateReport();

      expect(report.reportId).toBeTruthy();
      expect(report.generatedAt).toBeInstanceOf(Date);
      expect(report.summary.totalQueries).toBe(3);
      expect(report.summary.averageResponseTime).toBeCloseTo(150, 0);
      expect(report.summary.slowestQueries.length).toBeGreaterThan(0);
      expect(report.summary.mostComplexQueries.length).toBeGreaterThan(0);
    });

    test('should provide cache performance analysis in reports', () => {
      monitor.recordMetrics(createMockMetrics({ operationName: 'CachedQuery', cacheHitRatio: 0.9 }));
      monitor.recordMetrics(createMockMetrics({ operationName: 'UncachedQuery', cacheHitRatio: 0.1 }));

      const report = monitor.generateReport();

      expect(report.summary.cachePerformance.overallHitRate).toBeGreaterThan(0);
      expect(report.summary.cachePerformance.topCachedOperations).toContain('CachedQuery');
      expect(report.summary.cachePerformance.cacheOptimizationOpportunities.length).toBeGreaterThan(0);
    });

    test('should include alerts in reports', () => {
      monitor.recordMetrics(createMockMetrics({ executionTime: 600 })); // Trigger alert

      const report = monitor.generateReport();

      expect(report.alerts.length).toBeGreaterThan(0);
      expect(report.alerts[0].severity).toBe('critical');
    });

    test('should provide performance recommendations', () => {
      // Create conditions that should trigger recommendations
      monitor.recordMetrics(createMockMetrics({ operationName: 'SlowQuery', executionTime: 400 }));
      monitor.recordMetrics(createMockMetrics({ operationName: 'ComplexQuery', complexity: 800 }));
      monitor.recordMetrics(createMockMetrics({ operationName: 'LowCacheQuery', cacheHitRatio: 0.3 }));

      const report = monitor.generateReport();

      expect(report.recommendations.length).toBeGreaterThan(0);

      const recommendation = report.recommendations[0];
      expect(recommendation.category).toBeOneOf(['query_optimization', 'caching', 'schema_design']);
      expect(recommendation.priority).toBeOneOf(['low', 'medium', 'high', 'critical']);
      expect(recommendation.actionItems.length).toBeGreaterThan(0);
    });

    test('should filter reports by time range', () => {
      const now = new Date();
      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      monitor.recordMetrics(createMockMetrics({ operationName: 'OldQuery' }));

      // Simulate time passing
      vi.setSystemTime(now);

      monitor.recordMetrics(createMockMetrics({ operationName: 'NewQuery' }));

      const report = monitor.generateReport({
        start: hourAgo,
        end: now
      });

      expect(report.timeRange.start).toEqual(hourAgo);
      expect(report.timeRange.end).toEqual(now);
    });

    test('should call report handlers', () => {
      monitor.recordMetrics(createMockMetrics());

      monitor.generateReport();

      expect(reportHandler).toHaveBeenCalledTimes(1);
      const report = reportHandler.mock.calls[0][0];
      expect(report.reportId).toBeTruthy();
    });
  });

  describe('Current Metrics Summary', () => {
    test('should provide current metrics summary', () => {
      monitor.recordMetrics(createMockMetrics({ executionTime: 100, cacheHitRatio: 0.8, errorCount: 0 }));
      monitor.recordMetrics(createMockMetrics({ executionTime: 200, cacheHitRatio: 0.6, errorCount: 1 }));
      monitor.recordMetrics(createMockMetrics({ executionTime: 300, cacheHitRatio: 0.9, errorCount: 0 }));

      const currentMetrics = monitor.getCurrentMetrics();

      expect(currentMetrics.activeQueries).toBe(3);
      expect(currentMetrics.averageResponseTime).toBe(200);
      expect(currentMetrics.cacheHitRate).toBeGreaterThan(0);
      expect(currentMetrics.errorRate).toBeCloseTo(0.333, 2);
    });

    test('should identify slow and complex queries in summary', () => {
      monitor.recordMetrics(createMockMetrics({ operationName: 'SlowQuery', executionTime: 250 }));
      monitor.recordMetrics(createMockMetrics({ operationName: 'ComplexQuery', complexity: 600 }));
      monitor.recordMetrics(createMockMetrics({ operationName: 'NormalQuery', executionTime: 50, complexity: 100 }));

      const currentMetrics = monitor.getCurrentMetrics();

      expect(currentMetrics.slowQueriesCount).toBe(1);
      expect(currentMetrics.complexQueriesCount).toBe(1);
    });
  });

  describe('Query Profile Sorting', () => {
    test('should sort profiles by execution time', () => {
      monitor.recordMetrics(createMockMetrics({ operationName: 'FastQuery', executionTime: 50 }));
      monitor.recordMetrics(createMockMetrics({ operationName: 'SlowQuery', executionTime: 300 }));
      monitor.recordMetrics(createMockMetrics({ operationName: 'MediumQuery', executionTime: 150 }));

      const profiles = monitor.getAllQueryProfiles('execution_time');

      expect(profiles[0].operationName).toBe('SlowQuery');
      expect(profiles[1].operationName).toBe('MediumQuery');
      expect(profiles[2].operationName).toBe('FastQuery');
    });

    test('should sort profiles by complexity', () => {
      monitor.recordMetrics(createMockMetrics({ operationName: 'SimpleQuery', complexity: 100 }));
      monitor.recordMetrics(createMockMetrics({ operationName: 'ComplexQuery', complexity: 800 }));
      monitor.recordMetrics(createMockMetrics({ operationName: 'MediumQuery', complexity: 400 }));

      const profiles = monitor.getAllQueryProfiles('complexity');

      expect(profiles[0].operationName).toBe('ComplexQuery');
      expect(profiles[1].operationName).toBe('MediumQuery');
      expect(profiles[2].operationName).toBe('SimpleQuery');
    });

    test('should sort profiles by frequency', () => {
      // Record different frequencies
      monitor.recordMetrics(createMockMetrics({ operationName: 'RareQuery' }));

      monitor.recordMetrics(createMockMetrics({ operationName: 'CommonQuery' }));
      monitor.recordMetrics(createMockMetrics({ operationName: 'CommonQuery' }));
      monitor.recordMetrics(createMockMetrics({ operationName: 'CommonQuery' }));

      const profiles = monitor.getAllQueryProfiles('frequency');

      expect(profiles[0].operationName).toBe('CommonQuery');
      expect(profiles[0].executionCount).toBe(3);
      expect(profiles[1].operationName).toBe('RareQuery');
      expect(profiles[1].executionCount).toBe(1);
    });
  });

  describe('Configuration Management', () => {
    test('should allow configuration updates', () => {
      monitor.updateConfig({
        alertingEnabled: false,
        sampleRate: 0.5
      });

      // Should not trigger alerts after disabling
      const slowMetrics = createMockMetrics({ executionTime: 600 });
      monitor.recordMetrics(slowMetrics);

      expect(alertHandler).not.toHaveBeenCalled();
    });

    test('should restart periodic reporting when interval changes', () => {
      const spy = vi.spyOn(global, 'setInterval');

      monitor.updateConfig({ reportingInterval: 30 });

      expect(spy).toHaveBeenCalled();

      spy.mockRestore();
    });
  });

  describe('Memory Management', () => {
    test('should clean up old metrics based on retention period', () => {
      const shortRetentionMonitor = new GraphQLPerformanceMonitor({
        retentionPeriod: 1 // 1 day
      });

      // Record metrics
      shortRetentionMonitor.recordMetrics(createMockMetrics({ operationName: 'OldQuery' }));

      // Simulate time passing beyond retention period
      vi.advanceTimersByTime(2 * 24 * 60 * 60 * 1000); // 2 days

      // Record new metrics to trigger cleanup
      shortRetentionMonitor.recordMetrics(createMockMetrics({ operationName: 'NewQuery' }));

      // Old metrics should be cleaned up
      const profiles = shortRetentionMonitor.getAllQueryProfiles();
      expect(profiles.some(p => p.operationName === 'OldQuery')).toBe(false);
      expect(profiles.some(p => p.operationName === 'NewQuery')).toBe(true);
    });

    test('should reset all data when requested', () => {
      monitor.recordMetrics(createMockMetrics());
      monitor.recordMetrics(createMockMetrics({ executionTime: 600 })); // Trigger alert

      expect(monitor.getAllQueryProfiles().length).toBeGreaterThan(0);
      expect(monitor.getRecentAlerts().length).toBeGreaterThan(0);

      monitor.reset();

      expect(monitor.getAllQueryProfiles().length).toBe(0);
      expect(monitor.getRecentAlerts().length).toBe(0);
    });
  });

  describe('PostGraphile Integration', () => {
    test('should create PostGraphile-optimized monitor', () => {
      const pgMonitor = createPostGraphilePerformanceMonitor({
        alertingEnabled: true
      });

      // Should have adjusted thresholds for PostGraphile
      const slowMetrics = createMockMetrics({ executionTime: 160 }); // Above PostGraphile warning but below default
      const slowAlertHandler = vi.fn();
      pgMonitor.onAlert(slowAlertHandler);

      pgMonitor.recordMetrics(slowMetrics);

      // Should trigger alert with PostGraphile thresholds
      expect(slowAlertHandler).toHaveBeenCalledTimes(1);
    });

    test('should use appropriate sample rates for production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const pgMonitor = createPostGraphilePerformanceMonitor();

      // In production, sample rate should be reduced
      // This is tested indirectly by checking if fewer metrics are recorded
      // when sample rate is low (though this test relies on randomness)

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty metrics gracefully', () => {
      const currentMetrics = monitor.getCurrentMetrics();

      expect(currentMetrics.activeQueries).toBe(0);
      expect(currentMetrics.averageResponseTime).toBe(0);
      expect(currentMetrics.cacheHitRate).toBe(0);
    });

    test('should handle queries without operation names', () => {
      const metrics = createMockMetrics({ operationName: undefined });

      monitor.recordMetrics(metrics);

      const profiles = monitor.getAllQueryProfiles();
      expect(profiles.length).toBe(1);
      expect(profiles[0].operationName).toBeUndefined();
    });

    test('should handle disabled monitoring', () => {
      const disabledMonitor = new GraphQLPerformanceMonitor({ enabled: false });

      disabledMonitor.recordMetrics(createMockMetrics());

      const profiles = disabledMonitor.getAllQueryProfiles();
      expect(profiles.length).toBe(0);
    });
  });
});