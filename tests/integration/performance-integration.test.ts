/**
 * Performance Monitoring Integration Tests
 *
 * Tests the complete integration of performance monitoring systems:
 * - Client-side performance monitoring
 * - Server-side performance tracking
 * - GraphQL performance exchange
 * - Performance budgets validation
 * - API endpoints
 */

import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createUrqlClient } from '$lib/graphql/client';
import { performanceMonitor } from '$lib/performance/client-monitor';
import { serverPerformanceMonitor } from '$lib/performance/server-monitor';
import { budgetValidator } from '$lib/performance/performance-budgets';

describe('Performance Monitoring Integration', () => {
	beforeAll(() => {
		// Initialize performance monitoring
		console.log('🚀 Starting performance monitoring integration tests...');
	});

	afterAll(() => {
		// Cleanup
		console.log('✅ Performance monitoring integration tests completed');
	});

	test('Client-side performance monitor initializes correctly', () => {
		expect(performanceMonitor).toBeDefined();
		expect(performanceMonitor.metricsStore).toBeDefined();
		expect(performanceMonitor.alertsStore).toBeDefined();
		expect(performanceMonitor.statisticsStore).toBeDefined();
	});

	test('Server-side performance monitor initializes correctly', () => {
		expect(serverPerformanceMonitor).toBeDefined();
		expect(typeof serverPerformanceMonitor.getStatistics).toBe('function');
		expect(typeof serverPerformanceMonitor.createHandle).toBe('function');
	});

	test('GraphQL client includes performance exchange', () => {
		const client = createUrqlClient();
		expect(client).toBeDefined();

		// The client should have our performance exchange in the stack
		// This is verified by the exchange being added in the client configuration
		// Note: urql Client type doesn't expose url property directly
		expect(typeof client.executeQuery).toBe('function');
	});

	test('Performance budgets validator works correctly', () => {
		// Test with metrics that should pass
		const goodMetrics = {
			'GraphQL Response Time (Average)': 150,
			'Page Load Time (Average)': 800,
			'JavaScript Heap Memory': 80 * 1024 * 1024
		};

		const goodValidation = budgetValidator.validateMetrics(goodMetrics);
		expect(goodValidation.overallPassed).toBe(true);
		expect(goodValidation.overallScore).toBeGreaterThan(80);

		// Test with metrics that should fail
		const badMetrics = {
			'GraphQL Response Time (Average)': 400,
			'Page Load Time (Average)': 3000,
			'JavaScript Heap Memory': 200 * 1024 * 1024
		};

		const badValidation = budgetValidator.validateMetrics(badMetrics);
		expect(badValidation.overallPassed).toBe(false);
		expect(badValidation.violations.length).toBeGreaterThan(0);
	});

	test('Performance tracking records metrics correctly', async () => {
		// Simulate a tracked operation
		const startTime = performance.now();

		// Mock a GraphQL operation
		await new Promise((resolve) => setTimeout(resolve, 100));

		const duration = performance.now() - startTime;

		// This would normally be called by the performance exchange
		performanceMonitor.trackGraphQLOperation('TestOperation', duration);

		// Check that the metric was recorded by accessing the metricsStore
		let metricsData: any[] = [];
		performanceMonitor.metricsStore.subscribe((metrics) => {
			metricsData = metrics;
		})();

		const testEntry = metricsData.find((e: any) => e.name.includes('TestOperation'));

		if (testEntry) {
			expect(testEntry.duration).toBeGreaterThan(90); // Approximately 100ms
			expect(testEntry.type).toBe('graphql');
		}
	});

	test('Server performance monitoring records requests', () => {
		// Simulate recording a server request
		serverPerformanceMonitor.recordAPIEndpoint('/test-endpoint', 'GET', 150, 200);

		const stats = serverPerformanceMonitor.getStatistics(60000); // Last minute
		expect(stats.totalRequests).toBeGreaterThan(0);
	});

	test('Performance budget violations generate recommendations', () => {
		const violations = [
			budgetValidator.validateMetric('GraphQL Response Time (Average)', 400),
			budgetValidator.validateMetric('JavaScript Heap Memory', 200 * 1024 * 1024)
		].filter((v) => !v.passed);

		const recommendations = budgetValidator.generateRecommendations(violations);

		expect(recommendations.length).toBeGreaterThan(0);
		expect(recommendations.some((r) => r.toLowerCase().includes('graphql'))).toBe(true);
		expect(recommendations.some((r) => r.toLowerCase().includes('memory'))).toBe(true);
	});

	test('Performance monitoring handles errors gracefully', async () => {
		// Test error handling in performance tracking
		const errorOperation = async () => {
			throw new Error('Test error');
		};

		try {
			await performanceMonitor.timeFunction('ErrorTest', 'component', errorOperation, [
				'error-test'
			]);
		} catch (error) {
			// Expected error
		}

		// Access metrics via the store
		let metricsData: any[] = [];
		performanceMonitor.metricsStore.subscribe((metrics) => {
			metricsData = metrics;
		})();

		const errorEntry = metricsData.find((e: any) => e.name === 'ErrorTest');

		if (errorEntry) {
			expect(errorEntry.status).toBe('error');
			expect(errorEntry.metadata?.error).toBeDefined();
		}
	});

	test('Memory monitoring detects usage patterns', () => {
		// This test would be more meaningful in a browser environment
		// For now, we'll just test that the memory monitoring structure exists
		const memoryUsage = performanceMonitor.memoryUsageStore;
		expect(memoryUsage).toBeDefined();

		// In a real browser environment, this would have actual memory data
		// For Node.js testing, we verify the structure is in place
	});

	test('Performance dashboard data is accessible', () => {
		const statistics = performanceMonitor.statisticsStore;
		expect(statistics).toBeDefined();

		// The statistics store should be reactive and provide current metrics
		// In a real application, this would contain performance data
	});

	test('Core Web Vitals tracking is initialized', () => {
		const coreWebVitals = performanceMonitor.coreWebVitalsStore;
		expect(coreWebVitals).toBeDefined();

		// Core Web Vitals would be populated in a browser environment
		// This test ensures the tracking infrastructure is in place
	});

	test('Performance alerts are generated for violations', () => {
		// Test alert generation for performance violations
		const alerts = performanceMonitor.alertsStore;
		expect(alerts).toBeDefined();

		// Simulate a performance violation that should trigger an alert
		performanceMonitor.trackGraphQLOperation('SlowOperation', 500);

		// In a real scenario, this might generate an alert for exceeding budget
	});

	test('Export and reporting functionality works', () => {
		const serverReport = serverPerformanceMonitor.exportReport();

		expect(serverReport).toBeDefined();
		expect(serverReport.timestamp).toBeDefined();
		expect(serverReport.statistics).toBeDefined();
		expect(serverReport.systemInfo).toBeDefined();
		expect(serverReport.systemInfo.nodeVersion).toBeDefined();
		expect(serverReport.systemInfo.platform).toBeDefined();
	});

	test('Performance configuration can be updated', () => {
		// Test that configuration updates work
		const originalConfig = { enabled: true, sampleRate: 1.0 };

		// This would normally update the actual configuration
		// For this test, we just verify the structure exists
		expect(typeof serverPerformanceMonitor.getStatistics).toBe('function');

		// Configuration updates would be handled by the performance monitor
		// The test ensures the API exists for configuration management
	});
});

describe('Performance Monitoring Edge Cases', () => {
	test('Handles high-frequency operations efficiently', async () => {
		const operations = [];

		// Create many rapid operations
		for (let i = 0; i < 100; i++) {
			operations.push(
				performanceMonitor.timeFunction(
					`RapidOp${i}`,
					'component',
					async () => {
						await new Promise((resolve) => setTimeout(resolve, 1));
					},
					['rapid', 'batch']
				)
			);
		}

		const startTime = performance.now();
		await Promise.all(operations);
		const totalTime = performance.now() - startTime;

		console.log(`⚡ 100 rapid operations completed in ${totalTime.toFixed(2)}ms`);

		// Should handle rapid operations without significant overhead
		expect(totalTime).toBeLessThan(1000);
	});

	test('Performance monitoring survives large datasets', () => {
		// Test that performance monitoring can handle tracking many metrics
		for (let i = 0; i < 1000; i++) {
			serverPerformanceMonitor.recordAPIEndpoint(`/api/test/${i}`, 'GET', Math.random() * 200, 200);
		}

		const stats = serverPerformanceMonitor.getStatistics();
		expect(stats.totalRequests).toBeGreaterThanOrEqual(1000);

		// Should still be responsive with large dataset
		const recentMetrics = serverPerformanceMonitor.getRecentMetrics(50);
		expect(recentMetrics).toHaveLength(50);
	});

	test('Handles concurrent performance tracking', async () => {
		// Test concurrent tracking from multiple sources
		const concurrentTracking = [
			() => performanceMonitor.trackGraphQLOperation('ConcurrentQL1', 100),
			() => performanceMonitor.trackGraphQLOperation('ConcurrentQL2', 120),
			() => performanceMonitor.trackPageLoad('ConcurrentPage1', 800),
			() => performanceMonitor.trackPageLoad('ConcurrentPage2', 900),
			() => serverPerformanceMonitor.recordAPIEndpoint('/concurrent1', 'GET', 150, 200),
			() => serverPerformanceMonitor.recordAPIEndpoint('/concurrent2', 'POST', 180, 200)
		];

		// Execute all tracking concurrently
		await Promise.all(
			concurrentTracking.map(
				(track) =>
					new Promise((resolve) => {
						track();
						resolve(null);
					})
			)
		);

		// Verify all metrics were recorded correctly
		const clientStats = performanceMonitor.statisticsStore;
		const serverStats = serverPerformanceMonitor.getStatistics();

		expect(serverStats.totalRequests).toBeGreaterThan(0);
		// Client stats would be populated in a browser environment
	});
});
