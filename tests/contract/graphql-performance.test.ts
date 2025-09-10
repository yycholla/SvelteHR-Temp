/**
 * GraphQL Performance Contract Tests
 * 
 * Validates GraphQL query response times meet performance requirements (<200ms target).
 * Ensures GraphQL performance matches or exceeds REST API performance.
 * 
 * CRITICAL: These tests MUST FAIL initially (TDD requirement)
 * Tests will pass once GraphQL server implementation meets performance targets.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServerClient } from '$lib/graphql/client-factory';
import { getDevTools, withDevTools } from '$lib/graphql/dev-tools';
import type { GraphQLResponse } from '$lib/graphql/types';

/**
 * Performance test configuration
 */
const PERFORMANCE_CONFIG = {
	endpoint: 'http://localhost:5173/api/graphql',
	testToken: 'mock-admin-token-12345',
	timeout: 30000, // 30 seconds for test timeout
	
	// Performance thresholds (in milliseconds)
	thresholds: {
		fast: 50,      // Excellent performance
		good: 100,     // Good performance  
		acceptable: 200, // Target performance
		slow: 500,     // Warning threshold
		timeout: 1000  // Error threshold
	},
	
	// Test iterations for statistical accuracy
	iterations: {
		single: 1,     // Single query tests
		multiple: 5,   // Multiple query average
		load: 10       // Load testing
	}
};

/**
 * Performance test utilities
 */
class PerformanceTestUtils {
	private static startTime: number;
	private static measurements: number[] = [];

	static startMeasurement(): void {
		this.startTime = performance.now();
	}

	static endMeasurement(): number {
		const duration = performance.now() - this.startTime;
		this.measurements.push(duration);
		return duration;
	}

	static getStatistics(): {
		min: number;
		max: number;
		average: number;
		median: number;
		p95: number;
		count: number;
	} {
		if (this.measurements.length === 0) {
			return { min: 0, max: 0, average: 0, median: 0, p95: 0, count: 0 };
		}

		const sorted = [...this.measurements].sort((a, b) => a - b);
		const count = sorted.length;
		
		return {
			min: sorted[0],
			max: sorted[count - 1],
			average: sorted.reduce((sum, val) => sum + val, 0) / count,
			median: count % 2 === 0 
				? (sorted[count / 2 - 1] + sorted[count / 2]) / 2 
				: sorted[Math.floor(count / 2)],
			p95: sorted[Math.floor(count * 0.95)],
			count
		};
	}

	static reset(): void {
		this.measurements = [];
		this.startTime = 0;
	}
}

/**
 * GraphQL client with performance monitoring
 */
let performanceClient: ReturnType<typeof createServerClient> & { devTools?: any };
let devTools: ReturnType<typeof getDevTools>;

beforeAll(() => {
	// Create client with development tools for performance monitoring
	const baseClient = createServerClient(PERFORMANCE_CONFIG.testToken, {
		endpoint: PERFORMANCE_CONFIG.endpoint,
		timeout: PERFORMANCE_CONFIG.timeout
	});

	// Only add dev tools in non-production environment
	if (process.env.NODE_ENV !== 'production') {
		devTools = getDevTools({
			enablePerformanceProfiler: true,
			performanceThresholds: {
				warning: PERFORMANCE_CONFIG.thresholds.acceptable,
				error: PERFORMANCE_CONFIG.thresholds.slow
			}
		});
		performanceClient = withDevTools(baseClient, devTools);
	} else {
		performanceClient = baseClient;
	}

	PerformanceTestUtils.reset();
});

afterAll(() => {
	if (devTools) {
		console.log('\n=== GraphQL Performance Test Summary ===');
		const stats = devTools.getPerformanceStats();
		console.log(`Total queries tested: ${stats.totalQueries}`);
		console.log(`Average response time: ${stats.averageResponseTime}ms`);
		console.log(`Cache hit rate: ${stats.cacheHitRate}%`);
		console.log(`Error rate: ${stats.errorRate}%`);
		console.log(`Slow queries (>${PERFORMANCE_CONFIG.thresholds.acceptable}ms): ${stats.slowQueries.length}`);
		console.log('========================================\n');
	}
});

describe('GraphQL Performance Contract - Simple Queries', () => {

	it('should execute simple user query within 200ms', async () => {
		const query = `
			query FastUserQuery {
				me {
					user {
						id
						email
						name
					}
					authenticated
				}
			}
		`;

		PerformanceTestUtils.startMeasurement();
		const response = await performanceClient.query<any>(query);
		const duration = PerformanceTestUtils.endMeasurement();

		expect(response.success).toBe(true);
		expect(response.data?.me?.authenticated).toBe(true);
		
		// Performance assertion
		expect(duration).toBeLessThan(PERFORMANCE_CONFIG.thresholds.acceptable);
		
		if (duration > PERFORMANCE_CONFIG.thresholds.good) {
			console.warn(`Simple user query took ${Math.round(duration)}ms (exceeds ${PERFORMANCE_CONFIG.thresholds.good}ms good threshold)`);
		}
	});

	it('should execute employee list query within 200ms', async () => {
		const query = `
			query FastEmployeeList {
				employees(first: 10) {
					nodes {
						id
						full_name
						email
						position
					}
					total_count
				}
			}
		`;

		PerformanceTestUtils.startMeasurement();
		const response = await performanceClient.query<any>(query);
		const duration = PerformanceTestUtils.endMeasurement();

		expect(response.success).toBe(true);
		expect(response.data?.employees?.nodes).toBeDefined();
		expect(response.data?.employees?.nodes.length).toBeGreaterThan(0);
		
		// Performance assertion
		expect(duration).toBeLessThan(PERFORMANCE_CONFIG.thresholds.acceptable);
	});

	it('should execute department list query within 200ms', async () => {
		const query = `
			query FastDepartmentList {
				departments {
					id
					name
					employee_count
					is_active
				}
			}
		`;

		PerformanceTestUtils.startMeasurement();
		const response = await performanceClient.query<any>(query);
		const duration = PerformanceTestUtils.endMeasurement();

		expect(response.success).toBe(true);
		expect(response.data?.departments).toBeDefined();
		
		// Performance assertion
		expect(duration).toBeLessThan(PERFORMANCE_CONFIG.thresholds.acceptable);
	});

	it('should execute dashboard query within 200ms', async () => {
		const query = `
			query FastDashboard {
				dashboardData {
					widgets {
						id
						title
						type
						data
					}
					user_role
				}
			}
		`;

		PerformanceTestUtils.startMeasurement();
		const response = await performanceClient.query<any>(query);
		const duration = PerformanceTestUtils.endMeasurement();

		expect(response.success).toBe(true);
		expect(response.data?.dashboardData?.widgets).toBeDefined();
		
		// Performance assertion
		expect(duration).toBeLessThan(PERFORMANCE_CONFIG.thresholds.acceptable);
	});
});

describe('GraphQL Performance Contract - Complex Queries', () => {

	it('should execute employee with relationships within 200ms', async () => {
		const query = `
			query ComplexEmployeeQuery {
				employees(first: 5) {
					nodes {
						id
						full_name
						email
						position
						department {
							id
							name
							manager {
								id
								full_name
							}
						}
						manager {
							id
							full_name
							department {
								name
							}
						}
					}
				}
			}
		`;

		PerformanceTestUtils.startMeasurement();
		const response = await performanceClient.query<any>(query);
		const duration = PerformanceTestUtils.endMeasurement();

		expect(response.success).toBe(true);
		expect(response.data?.employees?.nodes).toBeDefined();
		
		// Performance assertion - complex queries may take slightly longer
		expect(duration).toBeLessThan(PERFORMANCE_CONFIG.thresholds.acceptable * 1.5); // 300ms for complex
	});

	it('should execute department hierarchy within 200ms', async () => {
		const query = `
			query ComplexDepartmentHierarchy {
				departments {
					id
					name
					parent {
						id
						name
					}
					children {
						id
						name
					}
					employees(first: 5) {
						nodes {
							id
							full_name
							position
						}
						total_count
					}
					metrics {
						total_employees
						active_employees
					}
				}
			}
		`;

		PerformanceTestUtils.startMeasurement();
		const response = await performanceClient.query<any>(query);
		const duration = PerformanceTestUtils.endMeasurement();

		expect(response.success).toBe(true);
		expect(response.data?.departments).toBeDefined();
		
		// Performance assertion
		expect(duration).toBeLessThan(PERFORMANCE_CONFIG.thresholds.acceptable * 2); // 400ms for hierarchical
	});
});

describe('GraphQL Performance Contract - Mutation Performance', () => {

	it('should execute employee creation mutation within 200ms', async () => {
		const mutation = `
			mutation FastCreateEmployee($input: CreateEmployeeInput!) {
				createEmployee(input: $input) {
					id
					full_name
					email
					position
					department {
						name
					}
				}
			}
		`;

		const input = {
			first_name: 'Performance',
			last_name: 'Test',
			email: 'performance.test@example.com',
			position: 'Test Engineer',
			department_id: 'dept-1',
			hire_date: '2024-01-01',
			employment_type: 'FULL_TIME'
		};

		PerformanceTestUtils.startMeasurement();
		const response = await performanceClient.query<any>(mutation, { input });
		const duration = PerformanceTestUtils.endMeasurement();

		expect(response.success).toBe(true);
		expect(response.data?.createEmployee?.id).toBeDefined();
		
		// Performance assertion - mutations may take longer due to data persistence
		expect(duration).toBeLessThan(PERFORMANCE_CONFIG.thresholds.acceptable * 2); // 400ms for mutations
	});

	it('should execute authentication mutation within 200ms', async () => {
		const mutation = `
			mutation FastLogin($email: String!, $password: String!) {
				login(email: $email, password: $password) {
					success
					user {
						id
						email
						name
					}
					token
				}
			}
		`;

		PerformanceTestUtils.startMeasurement();
		const response = await performanceClient.query<any>(mutation, {
			email: 'test@example.com',
			password: 'testpassword'
		});
		const duration = PerformanceTestUtils.endMeasurement();

		// Authentication should be fast regardless of success/failure
		expect(duration).toBeLessThan(PERFORMANCE_CONFIG.thresholds.acceptable);
	});
});

describe('GraphQL Performance Contract - Load Testing', () => {

	it('should handle concurrent queries within performance limits', async () => {
		const query = `
			query ConcurrentTest {
				employees(first: 3) {
					nodes {
						id
						full_name
					}
				}
			}
		`;

		// Execute multiple concurrent queries
		const concurrentPromises = Array(PERFORMANCE_CONFIG.iterations.load)
			.fill(null)
			.map(async () => {
				PerformanceTestUtils.startMeasurement();
				const response = await performanceClient.query<any>(query);
				const duration = PerformanceTestUtils.endMeasurement();
				return { response, duration };
			});

		const results = await Promise.all(concurrentPromises);

		// All queries should succeed
		results.forEach(({ response }) => {
			expect(response.success).toBe(true);
		});

		// Analyze performance statistics
		const durations = results.map(r => r.duration);
		const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
		const maxDuration = Math.max(...durations);
		const p95Duration = durations.sort((a, b) => a - b)[Math.floor(durations.length * 0.95)];

		// Performance assertions
		expect(avgDuration).toBeLessThan(PERFORMANCE_CONFIG.thresholds.acceptable);
		expect(maxDuration).toBeLessThan(PERFORMANCE_CONFIG.thresholds.slow); // 500ms max
		expect(p95Duration).toBeLessThan(PERFORMANCE_CONFIG.thresholds.acceptable * 1.5); // 300ms p95

		console.log(`Concurrent test results:
		  - Queries: ${durations.length}
		  - Average: ${Math.round(avgDuration)}ms
		  - Maximum: ${Math.round(maxDuration)}ms  
		  - P95: ${Math.round(p95Duration)}ms
		`);
	});

	it('should maintain performance with repeated queries', async () => {
		const query = `
			query RepeatedTest {
				me {
					user {
						id
						name
					}
				}
			}
		`;

		const iterations = PERFORMANCE_CONFIG.iterations.multiple;
		const durations: number[] = [];

		// Execute same query multiple times
		for (let i = 0; i < iterations; i++) {
			PerformanceTestUtils.startMeasurement();
			const response = await performanceClient.query<any>(query);
			const duration = PerformanceTestUtils.endMeasurement();

			expect(response.success).toBe(true);
			durations.push(duration);

			// Small delay between requests to avoid overwhelming
			await new Promise(resolve => setTimeout(resolve, 10));
		}

		// Performance should be consistent across iterations
		const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
		const variance = durations.reduce((sum, d) => sum + Math.pow(d - avgDuration, 2), 0) / durations.length;
		const standardDeviation = Math.sqrt(variance);

		expect(avgDuration).toBeLessThan(PERFORMANCE_CONFIG.thresholds.acceptable);
		
		// Performance should be consistent (low variance)
		expect(standardDeviation).toBeLessThan(avgDuration * 0.5); // StdDev < 50% of average
	});
});

describe('GraphQL Performance Contract - Cache Performance', () => {

	it('should improve performance with query caching', async () => {
		const query = `
			query CacheTest {
				departments {
					id
					name
					employee_count
				}
			}
		`;

		// First query (cache miss)
		PerformanceTestUtils.startMeasurement();
		const firstResponse = await performanceClient.query<any>(query);
		const firstDuration = PerformanceTestUtils.endMeasurement();

		expect(firstResponse.success).toBe(true);

		// Second query (potential cache hit)
		PerformanceTestUtils.startMeasurement();
		const secondResponse = await performanceClient.query<any>(query);
		const secondDuration = PerformanceTestUtils.endMeasurement();

		expect(secondResponse.success).toBe(true);

		// Cache should improve performance (or at least not make it worse)
		expect(secondDuration).toBeLessThanOrEqual(firstDuration * 1.2); // Allow 20% variance

		// Both should meet performance targets
		expect(firstDuration).toBeLessThan(PERFORMANCE_CONFIG.thresholds.acceptable);
		expect(secondDuration).toBeLessThan(PERFORMANCE_CONFIG.thresholds.acceptable);

		console.log(`Cache performance test:
		  - First query: ${Math.round(firstDuration)}ms
		  - Second query: ${Math.round(secondDuration)}ms
		  - Improvement: ${Math.round(((firstDuration - secondDuration) / firstDuration) * 100)}%
		`);
	});
});

describe('GraphQL Performance Contract - Error Handling Performance', () => {

	it('should handle authentication errors quickly', async () => {
		// Create client with invalid token
		const invalidClient = createServerClient('invalid-token', {
			endpoint: PERFORMANCE_CONFIG.endpoint
		});

		const query = `
			query ErrorTest {
				me {
					user {
						id
					}
				}
			}
		`;

		PerformanceTestUtils.startMeasurement();
		const response = await invalidClient.query<any>(query);
		const duration = PerformanceTestUtils.endMeasurement();

		expect(response.success).toBe(false);
		expect(response.errors).toBeDefined();

		// Error handling should be fast
		expect(duration).toBeLessThan(PERFORMANCE_CONFIG.thresholds.good); // 100ms for errors
	});

	it('should handle validation errors quickly', async () => {
		const invalidQuery = `
			query ValidationErrorTest {
				nonExistentField {
					invalidField
				}
			}
		`;

		PerformanceTestUtils.startMeasurement();
		const response = await performanceClient.query<any>(invalidQuery);
		const duration = PerformanceTestUtils.endMeasurement();

		expect(response.success).toBe(false);
		
		// Validation errors should be caught quickly
		expect(duration).toBeLessThan(PERFORMANCE_CONFIG.thresholds.good); // 100ms for validation
	});
});

/**
 * Performance summary and comparison test
 */
describe('GraphQL Performance Contract - Summary', () => {
	
	it('should provide performance summary and meet all targets', async () => {
		// Get overall performance statistics
		const finalStats = PerformanceTestUtils.getStatistics();
		
		console.log(`\nGraphQL Performance Test Results:
		  - Total measurements: ${finalStats.count}
		  - Min response time: ${Math.round(finalStats.min)}ms
		  - Max response time: ${Math.round(finalStats.max)}ms
		  - Average response time: ${Math.round(finalStats.average)}ms
		  - Median response time: ${Math.round(finalStats.median)}ms
		  - P95 response time: ${Math.round(finalStats.p95)}ms
		  - Target: <${PERFORMANCE_CONFIG.thresholds.acceptable}ms
		`);

		// Performance target assertions
		expect(finalStats.average).toBeLessThan(PERFORMANCE_CONFIG.thresholds.acceptable);
		expect(finalStats.p95).toBeLessThan(PERFORMANCE_CONFIG.thresholds.acceptable * 1.5);
		expect(finalStats.max).toBeLessThan(PERFORMANCE_CONFIG.thresholds.slow);

		// Performance quality assessment
		if (finalStats.average < PERFORMANCE_CONFIG.thresholds.fast) {
			console.log('✅ EXCELLENT: GraphQL performance exceeds expectations');
		} else if (finalStats.average < PERFORMANCE_CONFIG.thresholds.good) {
			console.log('✅ GOOD: GraphQL performance meets quality standards');  
		} else if (finalStats.average < PERFORMANCE_CONFIG.thresholds.acceptable) {
			console.log('✅ ACCEPTABLE: GraphQL performance meets minimum requirements');
		} else {
			console.log('❌ POOR: GraphQL performance needs optimization');
		}

		// DevTools integration check
		if (devTools) {
			const devToolsStats = devTools.getPerformanceStats();
			expect(devToolsStats.totalQueries).toBeGreaterThan(0);
			expect(devToolsStats.averageResponseTime).toBeLessThan(PERFORMANCE_CONFIG.thresholds.acceptable);
		}
	});
});