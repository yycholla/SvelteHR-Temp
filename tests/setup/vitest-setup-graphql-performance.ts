/**
 * Vitest Setup for GraphQL Performance Testing
 *
 * Setup configuration for GraphQL performance and load testing.
 */

import { beforeAll, afterAll, beforeEach, afterEach, expect } from 'vitest';
import { createUrqlClient } from '$lib/graphql/client';
import { GraphQLPerformanceMonitor } from '$lib/graphql/performance-monitor';
import { NPlusOneDetector } from '$lib/graphql/n-plus-one-detector';
import { QueryComplexityAnalyzer } from '$lib/graphql/query-complexity-analyzer';

// Global performance testing utilities
declare global {
	var __GRAPHQL_PERF_TEST_CLIENT__: any;
	var __GRAPHQL_PERF_MONITOR__: GraphQLPerformanceMonitor;
	var __GRAPHQL_N_PLUS_ONE_DETECTOR__: NPlusOneDetector;
	var __GRAPHQL_PERF_COMPLEXITY_ANALYZER__: QueryComplexityAnalyzer;
	var __GRAPHQL_PERF_TEST_RESULTS__: Map<string, any>;
	var __GRAPHQL_LOAD_TEST_ACTIVE__: boolean;
}

beforeAll(async () => {
	// Initialize performance test client with optimizations disabled for testing
	const perfClient = createUrqlClient(fetch);
	global.__GRAPHQL_PERF_TEST_CLIENT__ = perfClient;

	// Initialize performance monitor with test-specific configuration
	const perfMonitor = new GraphQLPerformanceMonitor({
		enabled: true,
		sampleRate: 1.0, // Sample all requests in tests
		alertingEnabled: true,
		reportingInterval: 0, // Disable automatic reporting
		thresholds: {
			warningTime: parseInt(process.env.GRAPHQL_PERFORMANCE_ALERT_THRESHOLD || '500'),
			criticalTime: parseInt(process.env.GRAPHQL_PERFORMANCE_ALERT_THRESHOLD || '500') * 2,
			complexityWarning: 800,
			complexityCritical: 1500,
			cacheHitRateWarning: 70,
			slowQueryPercentile: 95
		}
	});
	global.__GRAPHQL_PERF_MONITOR__ = perfMonitor;

	// Initialize N+1 detector for performance analysis
	const nPlusOneDetector = new NPlusOneDetector({
		enableRealTimeDetection: true,
		severityThreshold: 'medium',
		maxNestedDepth: 15,
		listFieldThreshold: parseInt(process.env.GRAPHQL_N_PLUS_ONE_THRESHOLD || '10')
	});
	global.__GRAPHQL_N_PLUS_ONE_DETECTOR__ = nPlusOneDetector;

	// Initialize complexity analyzer for performance testing
	const complexityAnalyzer = new QueryComplexityAnalyzer({
		maximumComplexity: 2000, // Higher limit for performance tests
		depthLimit: 20,
		listFactor: 8
	});
	global.__GRAPHQL_PERF_COMPLEXITY_ANALYZER__ = complexityAnalyzer;

	// Initialize results storage
	global.__GRAPHQL_PERF_TEST_RESULTS__ = new Map();
	global.__GRAPHQL_LOAD_TEST_ACTIVE__ = false;

	// Setup performance monitoring hooks
	if (process.env.GRAPHQL_MEMORY_MONITORING_ENABLED === 'true') {
		setupMemoryMonitoring();
	}

	console.log('GraphQL performance testing environment initialized');
	console.log(
		`Load test configuration: ${process.env.GRAPHQL_LOAD_TEST_CONCURRENT_REQUESTS || 10} concurrent requests`
	);
	console.log(
		`Performance alert threshold: ${process.env.GRAPHQL_PERFORMANCE_ALERT_THRESHOLD || 500}ms`
	);
});

afterAll(async () => {
	// Generate final performance report
	if (global.__GRAPHQL_PERF_MONITOR__) {
		const finalReport = global.__GRAPHQL_PERF_MONITOR__.generateReport();
		console.log('Final Performance Report:', {
			totalQueries: finalReport.summary.totalQueries,
			averageResponseTime: finalReport.summary.averageResponseTime,
			slowQueriesCount: finalReport.summary.slowestQueries.length,
			alertsCount: finalReport.alerts.length
		});

		global.__GRAPHQL_PERF_MONITOR__.stop();
	}

	// Stop N+1 detector
	if (global.__GRAPHQL_N_PLUS_ONE_DETECTOR__) {
		global.__GRAPHQL_N_PLUS_ONE_DETECTOR__.clearPatterns();
	}

	// Clear results
	if (global.__GRAPHQL_PERF_TEST_RESULTS__) {
		global.__GRAPHQL_PERF_TEST_RESULTS__.clear();
	}

	global.__GRAPHQL_LOAD_TEST_ACTIVE__ = false;

	console.log('GraphQL performance testing environment cleaned up');
});

beforeEach(() => {
	// Reset performance monitor for each test
	if (global.__GRAPHQL_PERF_MONITOR__) {
		global.__GRAPHQL_PERF_MONITOR__.reset();
	}

	// Clear N+1 patterns for fresh test
	if (global.__GRAPHQL_N_PLUS_ONE_DETECTOR__) {
		global.__GRAPHQL_N_PLUS_ONE_DETECTOR__.clearPatterns();
	}
});

afterEach(async () => {
	// Capture test results
	if (global.__GRAPHQL_PERF_MONITOR__) {
		const testMetrics = global.__GRAPHQL_PERF_MONITOR__.getCurrentMetrics();
		const testName = expect.getState().currentTestName || 'unknown';

		global.__GRAPHQL_PERF_TEST_RESULTS__.set(testName, {
			metrics: testMetrics,
			timestamp: new Date()
		});
	}

	// Log warnings for slow tests
	const currentMetrics = global.__GRAPHQL_PERF_MONITOR__?.getCurrentMetrics();
	if (currentMetrics?.averageResponseTime > 1000) {
		console.warn(
			`Slow test detected: ${expect.getState().currentTestName}, avg response time: ${currentMetrics.averageResponseTime}ms`
		);
	}
});

// Setup memory monitoring
function setupMemoryMonitoring() {
	const initialMemory = process.memoryUsage();

	// Monitor memory every 5 seconds during tests
	const memoryInterval = setInterval(() => {
		const currentMemory = process.memoryUsage();
		const heapIncrease = currentMemory.heapUsed - initialMemory.heapUsed;

		// Warn if memory usage increases significantly
		if (heapIncrease > 100 * 1024 * 1024) {
			// 100MB increase
			console.warn(`High memory usage detected: +${Math.round(heapIncrease / 1024 / 1024)}MB heap`);
		}
	}, 5000);

	// Clear interval on exit
	afterAll(() => {
		clearInterval(memoryInterval);
	});
}

// Utility functions for load testing
export function startLoadTest() {
	global.__GRAPHQL_LOAD_TEST_ACTIVE__ = true;
}

export function stopLoadTest() {
	global.__GRAPHQL_LOAD_TEST_ACTIVE__ = false;
}

export function isLoadTestActive() {
	return global.__GRAPHQL_LOAD_TEST_ACTIVE__;
}

// Export utilities for performance tests
export const getPerfTestClient = () => global.__GRAPHQL_PERF_TEST_CLIENT__;
export const getPerfMonitor = () => global.__GRAPHQL_PERF_MONITOR__;
export const getNPlusOneDetector = () => global.__GRAPHQL_N_PLUS_ONE_DETECTOR__;
export const getPerfComplexityAnalyzer = () => global.__GRAPHQL_PERF_COMPLEXITY_ANALYZER__;
export const getPerfTestResults = () => global.__GRAPHQL_PERF_TEST_RESULTS__;

// Load test utilities
export async function runConcurrentQueries(
	query: string,
	variables: any,
	concurrency: number = 10,
	duration: number = 30000
) {
	const client = getPerfTestClient();
	const startTime = Date.now();
	const results: any[] = [];

	startLoadTest();

	while (Date.now() - startTime < duration && isLoadTestActive()) {
		const batch = Array.from({ length: concurrency }, () =>
			client.query(query, variables).toPromise()
		);

		const batchResults = await Promise.allSettled(batch);
		results.push(...batchResults);

		// Small delay between batches to prevent overwhelming
		await new Promise((resolve) => setTimeout(resolve, 100));
	}

	stopLoadTest();

	return {
		totalRequests: results.length,
		successfulRequests: results.filter((r) => r.status === 'fulfilled').length,
		failedRequests: results.filter((r) => r.status === 'rejected').length,
		duration: Date.now() - startTime
	};
}
