/**
 * Vitest Setup for GraphQL Testing
 *
 * Setup configuration for GraphQL testing including schema validation,
 * query complexity analysis, and authorization testing.
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { createUrqlClient } from '$lib/graphql/client';
import { QueryComplexityAnalyzer } from '$lib/graphql/query-complexity-analyzer';
import { FieldAuthorizationValidator } from '$lib/graphql/field-authorization-validator';
import { GraphQLPerformanceMonitor } from '$lib/graphql/performance-monitor';
import type { Client } from '@urql/core';

// Global test clients and utilities
declare global {
	var __GRAPHQL_TEST_CLIENT__: Client;
	var __GRAPHQL_COMPLEXITY_ANALYZER__: QueryComplexityAnalyzer;
	var __GRAPHQL_AUTH_VALIDATOR__: FieldAuthorizationValidator;
	var __GRAPHQL_PERFORMANCE_MONITOR__: GraphQLPerformanceMonitor;
}

beforeAll(async () => {
	// Setup GraphQL test client
	const testClient = createUrqlClient(fetch, 'test-jwt-token');
	global.__GRAPHQL_TEST_CLIENT__ = testClient;

	// Setup query complexity analyzer
	const complexityAnalyzer = new QueryComplexityAnalyzer({
		maximumComplexity: (() => {
			const parsed = parseInt(process.env.GRAPHQL_MAX_QUERY_COMPLEXITY || '', 10);
			return Number.isFinite(parsed) && parsed > 0 ? parsed : 1000;
		})(),
		depthLimit: (() => {
			const parsed = parseInt(process.env.GRAPHQL_MAX_QUERY_DEPTH || '', 10);
			return Number.isFinite(parsed) && parsed > 0 ? parsed : 15;
		})()
	});
	global.__GRAPHQL_COMPLEXITY_ANALYZER__ = complexityAnalyzer;

	// Setup authorization validator
	const authValidator = new FieldAuthorizationValidator({
		strictMode: process.env.GRAPHQL_AUTH_STRICT_MODE === 'true',
		enableSensitivityAnalysis: true
	});
	global.__GRAPHQL_AUTH_VALIDATOR__ = authValidator;

	// Setup performance monitor
	const performanceMonitor = new GraphQLPerformanceMonitor({
		enabled: process.env.GRAPHQL_ENABLE_PERFORMANCE_MONITORING === 'true',
		thresholds: {
			warningTime: (() => {
				const parsed = parseInt(process.env.GRAPHQL_PERFORMANCE_THRESHOLD_WARNING || '', 10);
				return Number.isFinite(parsed) && parsed > 0 ? parsed : 200;
			})(),
			criticalTime: (() => {
				const parsed = parseInt(process.env.GRAPHQL_PERFORMANCE_THRESHOLD_CRITICAL || '', 10);
				return Number.isFinite(parsed) && parsed > 0 ? parsed : 500;
			})(),
			complexityWarning: (() => {
				const parsed = parseInt(process.env.GRAPHQL_MAX_QUERY_COMPLEXITY || '', 10);
				const base = Number.isFinite(parsed) && parsed > 0 ? parsed : 1000;
				return base * 0.8;
			})(),
			complexityCritical: (() => {
				const parsed = parseInt(process.env.GRAPHQL_MAX_QUERY_COMPLEXITY || '', 10);
				return Number.isFinite(parsed) && parsed > 0 ? parsed : 1000;
			})(),
			cacheHitRateWarning: 80,
			slowQueryPercentile: 95
		}
	});
	global.__GRAPHQL_PERFORMANCE_MONITOR__ = performanceMonitor;

	console.log('GraphQL testing environment initialized');
});

afterAll(async () => {
	// Cleanup performance monitor
	if (global.__GRAPHQL_PERFORMANCE_MONITOR__) {
		global.__GRAPHQL_PERFORMANCE_MONITOR__.stop();
	}

	console.log('GraphQL testing environment cleaned up');
});

beforeEach(() => {
	// Reset performance monitor for each test
	if (global.__GRAPHQL_PERFORMANCE_MONITOR__) {
		global.__GRAPHQL_PERFORMANCE_MONITOR__.reset();
	}
});

afterEach(() => {
	// Any per-test cleanup
});

// Export utilities for tests
export const getTestGraphQLClient = () => global.__GRAPHQL_TEST_CLIENT__;
export const getComplexityAnalyzer = () => global.__GRAPHQL_COMPLEXITY_ANALYZER__;
export const getAuthValidator = () => global.__GRAPHQL_AUTH_VALIDATOR__;
export const getPerformanceMonitor = () => global.__GRAPHQL_PERFORMANCE_MONITOR__;
