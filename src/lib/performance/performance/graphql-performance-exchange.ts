/**
 * GraphQL Performance Exchange for Urql
 *
 * Custom Urql exchange that automatically tracks GraphQL operation performance
 * and integrates with the client-side performance monitor.
 *
 * Features:
 * - Automatic timing of all GraphQL operations
 * - Query complexity analysis
 * - Cache hit/miss tracking
 * - Performance budget validation
 * - Real-time alerting for slow operations
 */

import type { Exchange, Operation, OperationResult } from '../types/urql.js';
import { pipe, tap, map } from 'wonka';
import { trackGraphQL, performanceMonitor } from './client-monitor.js';
import type { PerformanceMetric } from './client-monitor.js';

export interface GraphQLOperationContext {
	operationName?: string;
	variables?: Record<string, any>;
	query: string;
	operationType: 'query' | 'mutation' | 'subscription';
	complexity?: number;
}

export interface GraphQLPerformanceConfig {
	enabled: boolean;
	trackAllOperations: boolean;
	complexityThreshold: number;
	slowQueryThreshold: number; // ms
	enableCacheTracking: boolean;
	enableComplexityAnalysis: boolean;
}

const DEFAULT_CONFIG: GraphQLPerformanceConfig = {
	enabled: true,
	trackAllOperations: true,
	complexityThreshold: 500,
	slowQueryThreshold: 200,
	enableCacheTracking: true,
	enableComplexityAnalysis: true
};

/**
 * Calculate basic query complexity based on field depth and breadth
 */
function calculateQueryComplexity(query: string): number {
	let complexity = 0;

	// Count field selections (simplified complexity calculation)
	const fieldMatches = query.match(/\w+\s*\{/g) || [];
	complexity += fieldMatches.length * 2;

	// Count scalar field selections
	const scalarMatches = query.match(/\w+(?!\s*\{)/g) || [];
	complexity += scalarMatches.length;

	// Add complexity for nested objects (approximate depth)
	const depth = (query.match(/\{/g) || []).length;
	complexity += depth * 5;

	// Add complexity for arrays/connections
	const connectionMatches = query.match(/edges|nodes|pageInfo/g) || [];
	complexity += connectionMatches.length * 10;

	return Math.max(1, complexity);
}

/**
 * Extract operation details from Urql operation
 */
function extractOperationContext(operation: Operation): GraphQLOperationContext {
	const query = operation.query.loc?.source.body || '';
	const operationName = operation.operationName || extractOperationName(query);
	const operationType = operation.kind;

	return {
		operationName,
		variables: operation.variables,
		query,
		operationType,
		complexity: calculateQueryComplexity(query)
	};
}

/**
 * Extract operation name from GraphQL query string
 */
function extractOperationName(query: string): string {
	const operationMatch = query.match(/(?:query|mutation|subscription)\s+(\w+)/);
	return operationMatch?.[1] || 'Anonymous';
}

/**
 * Determine if operation result came from cache
 */
function isFromCache(result: OperationResult): boolean {
	// Urql sets this in the operation context
	return result.operation.context.meta?.cacheOutcome === 'hit';
}

/**
 * Create performance exchange for Urql GraphQL client
 */
export function createPerformanceExchange(
	config: Partial<GraphQLPerformanceConfig> = {}
): Exchange {
	const mergedConfig = { ...DEFAULT_CONFIG, ...config };

	if (!mergedConfig.enabled) {
		// Return pass-through exchange if disabled
		return ({ forward }) =>
			(ops$) =>
				forward(ops$);
	}

	return ({ forward }) =>
		(ops$) => {
			return pipe(
				ops$,
				map((operation: Operation) => {
					// Store start time in operation context
					const startTime = performance.now();

					return {
						...operation,
						context: {
							...operation.context,
							performanceStartTime: startTime,
							performanceConfig: mergedConfig
						}
					};
				}),
				forward,
				tap((result: OperationResult) => {
					// Calculate operation duration
					const startTime = result.operation.context.performanceStartTime;
					if (!startTime) return;

					const duration = performance.now() - startTime;
					const context = extractOperationContext(result.operation);
					const fromCache = isFromCache(result);

					// Track the operation performance
					if (mergedConfig.trackAllOperations) {
						const operationName = context.operationName || 'Anonymous';

						// Track with performance monitor
						trackGraphQL(operationName, duration, context.variables);

						// Record additional metadata
						const metadata = {
							operationType: context.operationType,
							complexity: context.complexity,
							fromCache,
							hasErrors: result.error ? true : false,
							errorCount: result.error?.graphQLErrors?.length || 0,
							networkError: result.error?.networkError ? true : false,
							variablesSize: context.variables ? JSON.stringify(context.variables).length : 0,
							responseSize: result.data ? JSON.stringify(result.data).length : 0
						};

						// Record detailed performance metric
						const performanceMetric: Omit<PerformanceMetric, 'id' | 'timestamp'> = {
							name: `GraphQL: ${operationName}`,
							type: 'graphql',
							duration,
							status: result.error
								? 'error'
								: duration > mergedConfig.slowQueryThreshold
									? 'warning'
									: 'success',
							metadata,
							tags: [
								'graphql',
								'urql',
								context.operationType,
								fromCache ? 'cached' : 'network',
								...(result.error ? ['error'] : []),
								...(context.complexity && context.complexity > mergedConfig.complexityThreshold
									? ['complex']
									: [])
							]
						};

						performanceMonitor.recordMetric(performanceMetric);
					}

					// Log performance warnings
					if (duration > mergedConfig.slowQueryThreshold) {
						console.warn(
							`🐌 Slow GraphQL operation: ${context.operationName} took ${Math.round(duration)}ms`,
							{
								operation: context.operationName,
								duration: Math.round(duration),
								complexity: context.complexity,
								fromCache,
								variables: context.variables
							}
						);
					}

					// Log complex operations
					if (
						mergedConfig.enableComplexityAnalysis &&
						context.complexity &&
						context.complexity > mergedConfig.complexityThreshold
					) {
						console.warn(
							`🔍 Complex GraphQL operation detected: ${context.operationName} has complexity ${context.complexity}`,
							{
								operation: context.operationName,
								complexity: context.complexity,
								duration: Math.round(duration),
								query: context.query
							}
						);
					}
				})
			);
		};
}

/**
 * Performance-aware GraphQL query wrapper
 * Provides easy way to track specific operations with custom metadata
 */
export function createPerformanceAwareOperation<T = any>(
	operationName: string,
	operationFn: () => Promise<T>,
	metadata?: Record<string, any>
): Promise<T> {
	const startTime = performance.now();

	return operationFn()
		.then((result) => {
			const duration = performance.now() - startTime;

			trackGraphQL(operationName, duration, metadata);

			return result;
		})
		.catch((error) => {
			const duration = performance.now() - startTime;

			// Track failed operation
			const performanceMetric: Omit<PerformanceMetric, 'id' | 'timestamp'> = {
				name: `GraphQL: ${operationName}`,
				type: 'graphql',
				duration,
				status: 'error',
				metadata: {
					...metadata,
					error: error instanceof Error ? error.message : 'Unknown error'
				},
				tags: ['graphql', 'error']
			};

			performanceMonitor.recordMetric(performanceMetric);

			throw error;
		});
}

/**
 * GraphQL performance testing utilities
 */
export class GraphQLPerformanceTester {
	private static instance: GraphQLPerformanceTester;
	private testResults: Map<
		string,
		{
			attempts: number;
			totalDuration: number;
			minDuration: number;
			maxDuration: number;
			errorCount: number;
			lastRun: number;
		}
	> = new Map();

	static getInstance(): GraphQLPerformanceTester {
		if (!GraphQLPerformanceTester.instance) {
			GraphQLPerformanceTester.instance = new GraphQLPerformanceTester();
		}
		return GraphQLPerformanceTester.instance;
	}

	/**
	 * Run performance test for specific GraphQL operation
	 */
	async testOperation<T>(
		name: string,
		operationFn: () => Promise<T>,
		options: {
			iterations?: number;
			warmupIterations?: number;
			maxDuration?: number;
			logResults?: boolean;
		} = {}
	): Promise<{
		name: string;
		iterations: number;
		averageDuration: number;
		minDuration: number;
		maxDuration: number;
		p95Duration: number;
		successRate: number;
		results: number[];
	}> {
		const {
			iterations = 10,
			warmupIterations = 3,
			maxDuration = 1000,
			logResults = true
		} = options;

		const results: number[] = [];
		let errorCount = 0;

		// Warmup runs
		console.log(`🔄 Warming up ${name} with ${warmupIterations} iterations...`);
		for (let i = 0; i < warmupIterations; i++) {
			try {
				const start = performance.now();
				await operationFn();
				const duration = performance.now() - start;
				console.log(`  Warmup ${i + 1}: ${Math.round(duration)}ms`);
			} catch (error) {
				console.warn(`  Warmup ${i + 1} failed:`, error);
			}
		}

		// Performance test runs
		console.log(`🚀 Running performance test for ${name} with ${iterations} iterations...`);

		for (let i = 0; i < iterations; i++) {
			try {
				const start = performance.now();
				await operationFn();
				const duration = performance.now() - start;
				results.push(duration);

				if (logResults) {
					const status = duration > maxDuration ? '❌' : duration > maxDuration * 0.8 ? '⚠️' : '✅';
					console.log(`  ${status} Iteration ${i + 1}: ${Math.round(duration)}ms`);
				}
			} catch (error) {
				errorCount++;
				console.error(`  ❌ Iteration ${i + 1} failed:`, error);
			}
		}

		// Calculate statistics
		results.sort((a, b) => a - b);
		const averageDuration = results.reduce((sum, d) => sum + d, 0) / results.length;
		const minDuration = results[0] || 0;
		const maxResultDuration = results[results.length - 1] || 0;
		const p95Index = Math.floor(results.length * 0.95);
		const p95Duration = results[p95Index] || 0;
		const successRate = ((iterations - errorCount) / iterations) * 100;

		const testResult = {
			name,
			iterations: results.length,
			averageDuration: Math.round(averageDuration * 100) / 100,
			minDuration: Math.round(minDuration * 100) / 100,
			maxDuration: Math.round(maxResultDuration * 100) / 100,
			p95Duration: Math.round(p95Duration * 100) / 100,
			successRate: Math.round(successRate * 100) / 100,
			results
		};

		// Store results
		this.testResults.set(name, {
			attempts: iterations,
			totalDuration: results.reduce((sum, d) => sum + d, 0),
			minDuration,
			maxDuration,
			errorCount,
			lastRun: Date.now()
		});

		// Log summary
		console.log(`📊 Performance Test Results for ${name}:`);
		console.log(`  Average: ${testResult.averageDuration}ms`);
		console.log(`  Min: ${testResult.minDuration}ms`);
		console.log(`  Max: ${testResult.maxDuration}ms`);
		console.log(`  P95: ${testResult.p95Duration}ms`);
		console.log(`  Success Rate: ${testResult.successRate}%`);

		// Performance warnings
		if (testResult.averageDuration > maxDuration) {
			console.warn(
				`⚠️ Average duration (${testResult.averageDuration}ms) exceeds target (${maxDuration}ms)`
			);
		}
		if (testResult.p95Duration > maxDuration * 1.5) {
			console.warn(`⚠️ P95 duration (${testResult.p95Duration}ms) significantly exceeds target`);
		}
		if (testResult.successRate < 95) {
			console.warn(`⚠️ Success rate (${testResult.successRate}%) is below acceptable threshold`);
		}

		return testResult;
	}

	/**
	 * Get historical test results
	 */
	getTestResults(): Record<string, any> {
		const results: Record<string, any> = {};

		this.testResults.forEach((value, key) => {
			results[key] = {
				...value,
				averageDuration: value.attempts > 0 ? value.totalDuration / value.attempts : 0,
				lastRunDate: new Date(value.lastRun).toISOString()
			};
		});

		return results;
	}

	/**
	 * Clear test results
	 */
	clearResults(): void {
		this.testResults.clear();
	}
}

// Export singleton tester instance
export const graphqlPerformanceTester = GraphQLPerformanceTester.getInstance();

export default createPerformanceExchange;
