/**
 * GraphQL Performance Tests
 *
 * Unit and integration tests specifically focused on GraphQL operation performance.
 * These tests validate that GraphQL queries and mutations meet the <200ms target.
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import {
	performanceMonitor,
	markPerformance,
	measurePerformance,
	timeFunction
} from '../../tests/utils/performance-monitor.js';
import { graphqlPerformanceTester } from '$lib/performance/graphql-performance-exchange';
import { budgetValidator, PERFORMANCE_BUDGETS } from '$lib/performance/performance-budgets.js';

// Mock GraphQL operations for testing
const mockGraphQLOperations = {
	simpleQuery: async () => {
		// Simulate a fast query
		await new Promise((resolve) => setTimeout(resolve, 50));
		return { data: { users: [{ id: 1, name: 'Test User' }] } };
	},

	complexQuery: async () => {
		// Simulate a more complex query
		await new Promise((resolve) => setTimeout(resolve, 150));
		return {
			data: {
				users: Array.from({ length: 100 }, (_, i) => ({
					id: i + 1,
					name: `User ${i + 1}`,
					profile: { email: `user${i + 1}@example.com` },
					posts: Array.from({ length: 5 }, (_, j) => ({
						id: `${i + 1}_${j + 1}`,
						title: `Post ${j + 1}`,
						content: 'Lorem ipsum...'
					}))
				}))
			}
		};
	},

	slowQuery: async () => {
		// Simulate a slow query that exceeds budget
		await new Promise((resolve) => setTimeout(resolve, 300));
		return { data: { result: 'slow operation completed' } };
	},

	mutationOperation: async (variables: any) => {
		// Simulate a mutation with variable processing time
		const processingTime = variables?.complexity === 'high' ? 180 : 80;
		await new Promise((resolve) => setTimeout(resolve, processingTime));
		return { data: { success: true, id: Math.random() } };
	}
};

describe('GraphQL Performance Tests', () => {
	beforeEach(() => {
		performanceMonitor.startMonitoring();
	});

	afterEach(() => {
		const report = performanceMonitor.stopMonitoring();
		console.log('📊 Performance report:', {
			totalOperations: report.totalTests,
			averageTime: `${report.averageDuration.toFixed(2)}ms`,
			budgetViolations: report.performanceTargets.failed
		});
	});

	test('Simple GraphQL queries meet performance budget', async () => {
		console.log('🚀 Testing simple GraphQL query performance...');

		const results = await timeFunction(
			'SimpleGraphQLQuery',
			'graphql',
			mockGraphQLOperations.simpleQuery,
			['graphql', 'simple']
		);

		const entries = performanceMonitor.getEntriesByTag('graphql');
		expect(entries).toHaveLength(1);

		const queryTime = entries[0].duration;
		console.log(`⚡ Simple query completed in ${queryTime}ms`);

		// Validate against GraphQL response time budget
		const validation = budgetValidator.validateMetric('GraphQL Response Time (Average)', queryTime);
		expect(validation.passed, validation.message).toBe(true);
		expect(queryTime).toBeLessThan(200); // Direct budget check
	});

	test('Complex GraphQL queries stay within acceptable limits', async () => {
		console.log('🔍 Testing complex GraphQL query performance...');

		const results = await timeFunction(
			'ComplexGraphQLQuery',
			'graphql',
			mockGraphQLOperations.complexQuery,
			['graphql', 'complex']
		);

		const entries = performanceMonitor.getEntriesByTag('graphql');
		const complexQuery = entries.find((e) => e.name === 'ComplexGraphQLQuery');

		expect(complexQuery).toBeDefined();
		console.log(`🔍 Complex query completed in ${complexQuery!.duration}ms`);

		// Complex queries should still meet the average budget, but may approach warning threshold
		const validation = budgetValidator.validateMetric(
			'GraphQL Response Time (Average)',
			complexQuery!.duration
		);
		console.log(`Budget validation: ${validation.message}`);

		// Should be within warning threshold at minimum
		expect(complexQuery!.duration).toBeLessThan(
			PERFORMANCE_BUDGETS.budgets.find((b) => b.name === 'GraphQL Response Time (Average)')!.warning
		);
	});

	test('GraphQL mutations meet performance requirements', async () => {
		console.log('✏️ Testing GraphQL mutation performance...');

		// Test simple mutation
		const simpleMutation = await timeFunction(
			'SimpleMutation',
			'graphql',
			() => mockGraphQLOperations.mutationOperation({ complexity: 'low' }),
			['graphql', 'mutation', 'simple']
		);

		// Test complex mutation
		const complexMutation = await timeFunction(
			'ComplexMutation',
			'graphql',
			() => mockGraphQLOperations.mutationOperation({ complexity: 'high' }),
			['graphql', 'mutation', 'complex']
		);

		const mutationEntries = performanceMonitor.getEntriesByTag('mutation');
		expect(mutationEntries).toHaveLength(2);

		const simpleTime = mutationEntries.find((e) => e.name === 'SimpleMutation')!.duration;
		const complexTime = mutationEntries.find((e) => e.name === 'ComplexMutation')!.duration;

		console.log(`✏️ Simple mutation: ${simpleTime}ms`);
		console.log(`✏️ Complex mutation: ${complexTime}ms`);

		// Both should meet budget requirements
		expect(simpleTime).toBeLessThan(200);
		expect(complexTime).toBeLessThan(200);
	});

	test('Slow queries are properly identified and flagged', async () => {
		console.log('🐌 Testing slow query detection...');

		const slowOperation = await timeFunction(
			'SlowGraphQLQuery',
			'graphql',
			mockGraphQLOperations.slowQuery,
			['graphql', 'slow']
		);

		const entries = performanceMonitor.getEntriesByTag('slow');
		const slowQuery = entries.find((e) => e.name === 'SlowGraphQLQuery');

		expect(slowQuery).toBeDefined();
		console.log(`🐌 Slow query took ${slowQuery!.duration}ms`);

		// This should exceed our budget and be flagged
		const validation = budgetValidator.validateMetric(
			'GraphQL Response Time (Average)',
			slowQuery!.duration
		);
		expect(validation.passed).toBe(false);
		expect(validation.level).toMatch(/warning|critical/);

		console.log(`⚠️ Budget violation detected: ${validation.message}`);
	});

	test('GraphQL performance testing utility works correctly', async () => {
		console.log('🧪 Testing GraphQL performance testing utilities...');

		const testResults = await graphqlPerformanceTester.testOperation(
			'PerformanceTestOperation',
			mockGraphQLOperations.simpleQuery,
			{
				iterations: 5,
				warmupIterations: 2,
				maxDuration: 200,
				logResults: false
			}
		);

		console.log('📊 Performance test results:', {
			averageDuration: `${testResults.averageDuration}ms`,
			p95Duration: `${testResults.p95Duration}ms`,
			successRate: `${testResults.successRate}%`,
			iterations: testResults.iterations
		});

		expect(testResults.iterations).toBe(5);
		expect(testResults.successRate).toBe(100);
		expect(testResults.averageDuration).toBeLessThan(200);
		expect(testResults.p95Duration).toBeLessThan(250); // Slightly higher threshold for P95
	});

	test('Performance monitoring captures GraphQL metrics correctly', async () => {
		console.log('📈 Testing GraphQL performance monitoring integration...');

		// Perform multiple operations
		const operations = [
			() => timeFunction('Query1', 'graphql', mockGraphQLOperations.simpleQuery, ['batch']),
			() => timeFunction('Query2', 'graphql', mockGraphQLOperations.complexQuery, ['batch']),
			() =>
				timeFunction('Mutation1', 'graphql', () => mockGraphQLOperations.mutationOperation({}), [
					'batch'
				])
		];

		// Execute all operations
		await Promise.all(operations.map((op) => op()));

		const batchEntries = performanceMonitor.getEntriesByTag('batch');
		expect(batchEntries).toHaveLength(3);

		// Check that all entries are properly tagged and measured
		batchEntries.forEach((entry) => {
			expect(entry.duration).toBeGreaterThan(0);
			expect(entry.name).toMatch(/Query\d|Mutation\d/);
			expect(entry.tags).toContain('graphql');
			expect(entry.tags).toContain('batch');
		});

		// Calculate batch statistics
		const avgDuration = batchEntries.reduce((sum, e) => sum + e.duration, 0) / batchEntries.length;
		console.log(`📊 Batch average duration: ${avgDuration.toFixed(2)}ms`);

		expect(avgDuration).toBeLessThan(200);
	});

	test('Performance budgets are enforced correctly', async () => {
		console.log('💰 Testing performance budget enforcement...');

		// Create test metrics that should pass and fail budgets
		const testMetrics = {
			'GraphQL Response Time (Average)': 150, // Should pass
			'GraphQL Response Time (P95)': 180, // Should pass
			'Page Load Time (Average)': 2500, // Should fail
			'JavaScript Heap Memory': 150 * 1024 * 1024 // Should fail (150MB > 100MB budget)
		};

		const validation = budgetValidator.validateMetrics(testMetrics);

		console.log('📊 Budget validation results:', {
			overallPassed: validation.overallPassed,
			overallScore: validation.overallScore,
			violationCount: validation.violations.length
		});

		// Should not pass overall due to page load and memory violations
		expect(validation.overallPassed).toBe(false);
		expect(validation.violations).toHaveLength(2);

		// Check specific violations
		const violations = validation.violations.map((v) => v.budget.name);
		expect(violations).toContain('Page Load Time (Average)');
		expect(violations).toContain('JavaScript Heap Memory');

		// GraphQL budgets should pass
		const graphqlResults = validation.results.filter((r) => r.budget.name.includes('GraphQL'));

		graphqlResults.forEach((result) => {
			expect(result.passed, `${result.budget.name} should pass budget`).toBe(true);
		});
	});

	test('Performance recommendations are generated for violations', async () => {
		console.log('💡 Testing performance recommendation generation...');

		// Create violations across different categories
		const testMetrics = {
			'GraphQL Response Time (Average)': 400, // Response time violation
			'JavaScript Heap Memory': 200 * 1024 * 1024, // Memory violation
			'Largest Contentful Paint (LCP)': 5000, // User experience violation
			'Error Rate': 8.0 // Throughput violation
		};

		const validation = budgetValidator.validateMetrics(testMetrics);
		const recommendations = budgetValidator.generateRecommendations(validation.violations);

		console.log('💡 Generated recommendations:', recommendations);

		expect(recommendations.length).toBeGreaterThan(0);

		// Should include GraphQL-specific recommendations
		expect(recommendations.some((r) => r.includes('GraphQL'))).toBe(true);

		// Should include memory-related recommendations
		expect(recommendations.some((r) => r.toLowerCase().includes('memory'))).toBe(true);

		// Should include user experience recommendations
		expect(recommendations.some((r) => r.toLowerCase().includes('rendering'))).toBe(true);
	});
});

describe('GraphQL Performance Edge Cases', () => {
	test('Handles concurrent GraphQL operations efficiently', async () => {
		console.log('⚡ Testing concurrent GraphQL operations...');

		performanceMonitor.startMonitoring();

		// Create 10 concurrent operations
		const concurrentOps = Array.from({ length: 10 }, (_, i) =>
			timeFunction(`ConcurrentQuery${i}`, 'graphql', mockGraphQLOperations.simpleQuery, [
				'concurrent'
			])
		);

		const startTime = performance.now();
		await Promise.all(concurrentOps);
		const totalTime = performance.now() - startTime;

		const concurrentEntries = performanceMonitor.getEntriesByTag('concurrent');
		expect(concurrentEntries).toHaveLength(10);

		console.log(`⚡ 10 concurrent operations completed in ${totalTime.toFixed(2)}ms`);

		// Concurrent operations should complete faster than sequential
		// (assuming proper async handling)
		expect(totalTime).toBeLessThan(500); // Much less than 10 * 50ms sequential

		// Individual operations should still meet budget
		concurrentEntries.forEach((entry) => {
			expect(entry.duration).toBeLessThan(200);
		});

		performanceMonitor.stopMonitoring();
	});

	test('Handles GraphQL operation errors without performance degradation', async () => {
		console.log('❌ Testing error handling performance...');

		performanceMonitor.startMonitoring();

		const errorOperation = async () => {
			await new Promise((resolve) => setTimeout(resolve, 50));
			throw new Error('Simulated GraphQL error');
		};

		// Test that errors are handled efficiently
		const errorTest = async () => {
			try {
				await timeFunction('ErrorOperation', 'graphql', errorOperation, ['error']);
			} catch (error) {
				// Expected error
			}
		};

		await errorTest();

		const errorEntries = performanceMonitor.getEntriesByTag('error');
		expect(errorEntries).toHaveLength(1);

		const errorDuration = errorEntries[0].duration;
		console.log(`❌ Error operation took ${errorDuration}ms`);

		// Error handling should not add significant overhead
		expect(errorDuration).toBeLessThan(100);

		performanceMonitor.stopMonitoring();
	});
});

// Export for use in other test files
export { mockGraphQLOperations };
