// GraphQL Test Client for SvelteHR
// Utilities for GraphQL operations in tests with performance monitoring
// Created: 2025-09-24

import { expect } from 'vitest';

// GraphQL Client Configuration
interface GraphQLClientConfig {
  endpoint: string;
  timeout: number;
  defaultHeaders: Record<string, string>;
}

const DEFAULT_CONFIG: GraphQLClientConfig = {
  endpoint: process.env.GRAPHQL_ENDPOINT || 'http://localhost:4000/graphql',
  timeout: 30000,
  defaultHeaders: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};

// Performance metrics tracking
interface PerformanceMetrics {
  operationName: string;
  variables?: Record<string, any>;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  error?: string;
}

const performanceMetrics: PerformanceMetrics[] = [];

// GraphQL Response types
interface GraphQLResponse<T = any> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: (string | number)[];
    extensions?: Record<string, any>;
  }>;
  extensions?: Record<string, any>;
}

interface GraphQLRequest {
  query: string;
  variables?: Record<string, any>;
  operationName?: string;
}

// GraphQL Test Client Class
export class GraphQLTestClient {
  private config: GraphQLClientConfig;

  constructor(config: Partial<GraphQLClientConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Execute a GraphQL query with performance monitoring
   */
  async query<T = any>(
    query: string,
    variables?: Record<string, any>,
    token?: string,
    customConfig?: Partial<GraphQLClientConfig>
  ): Promise<GraphQLResponse<T>> {
    const startTime = Date.now();
    const operationName = this.extractOperationName(query);

    try {
      const config = { ...this.config, ...customConfig };
      const headers = {
        ...config.defaultHeaders,
        ...(token && { Authorization: `Bearer ${token}` }),
      };

      const requestBody: GraphQLRequest = {
        query,
        variables,
        operationName,
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout);

      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: GraphQLResponse<T> = await response.json();
      const endTime = Date.now();

      // Record performance metrics
      const metrics: PerformanceMetrics = {
        operationName: operationName || 'unknown',
        variables,
        startTime,
        endTime,
        duration: endTime - startTime,
        success: !result.errors || result.errors.length === 0,
        error: result.errors?.[0]?.message,
      };

      performanceMetrics.push(metrics);

      // Performance assertions for critical operations
      if (metrics.duration > 200) {
        console.warn(`⚠️  Slow GraphQL operation: ${operationName} took ${metrics.duration}ms`);
      }

      return result;
    } catch (error) {
      const endTime = Date.now();

      // Record failed operation metrics
      const metrics: PerformanceMetrics = {
        operationName: operationName || 'unknown',
        variables,
        startTime,
        endTime,
        duration: endTime - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      performanceMetrics.push(metrics);

      throw error;
    }
  }

  /**
   * Execute a GraphQL mutation with performance monitoring
   */
  async mutate<T = any>(
    mutation: string,
    variables?: Record<string, any>,
    token?: string,
    customConfig?: Partial<GraphQLClientConfig>
  ): Promise<GraphQLResponse<T>> {
    return this.query<T>(mutation, variables, token, customConfig);
  }

  /**
   * Extract operation name from GraphQL query/mutation
   */
  private extractOperationName(query: string): string | undefined {
    const match = query.match(/(?:query|mutation|subscription)\s+(\w+)/);
    return match?.[1];
  }

  /**
   * Get performance metrics for analysis
   */
  getPerformanceMetrics(): PerformanceMetrics[] {
    return [...performanceMetrics];
  }

  /**
   * Clear performance metrics
   */
  clearPerformanceMetrics(): void {
    performanceMetrics.length = 0;
  }

  /**
   * Get average response time for operations
   */
  getAverageResponseTime(operationName?: string): number {
    const filteredMetrics = operationName
      ? performanceMetrics.filter(m => m.operationName === operationName)
      : performanceMetrics;

    if (filteredMetrics.length === 0) return 0;

    const totalDuration = filteredMetrics.reduce((sum, m) => sum + m.duration, 0);
    return totalDuration / filteredMetrics.length;
  }

  /**
   * Get success rate for operations
   */
  getSuccessRate(operationName?: string): number {
    const filteredMetrics = operationName
      ? performanceMetrics.filter(m => m.operationName === operationName)
      : performanceMetrics;

    if (filteredMetrics.length === 0) return 100;

    const successfulOps = filteredMetrics.filter(m => m.success).length;
    return (successfulOps / filteredMetrics.length) * 100;
  }
}

// Default client instance
const defaultClient = new GraphQLTestClient();

// Convenience functions for backward compatibility
export async function performGraphQLQuery<T = any>(
  query: string,
  variables?: Record<string, any>,
  token?: string,
  config?: Partial<GraphQLClientConfig>
): Promise<GraphQLResponse<T>> {
  return defaultClient.query<T>(query, variables, token, config);
}

export async function performGraphQLMutation<T = any>(
  mutation: string,
  variables?: Record<string, any>,
  token?: string,
  config?: Partial<GraphQLClientConfig>
): Promise<GraphQLResponse<T>> {
  return defaultClient.mutate<T>(mutation, variables, token, config);
}

// GraphQL Test Assertions
export class GraphQLAssertions {
  /**
   * Assert GraphQL response has no errors
   */
  static assertNoErrors(response: GraphQLResponse): void {
    if (response.errors && response.errors.length > 0) {
      const errorMessages = response.errors.map(e => e.message).join(', ');
      throw new Error(`GraphQL errors: ${errorMessages}`);
    }
    expect(response.errors).toBeUndefined();
  }

  /**
   * Assert GraphQL response has specific error
   */
  static assertHasError(response: GraphQLResponse, errorMessage: string): void {
    expect(response.errors).toBeDefined();
    expect(response.errors!.length).toBeGreaterThan(0);

    const hasExpectedError = response.errors!.some(error =>
      error.message.toLowerCase().includes(errorMessage.toLowerCase())
    );

    expect(hasExpectedError).toBe(true);
  }

  /**
   * Assert GraphQL response data structure
   */
  static assertDataStructure(response: GraphQLResponse, expectedStructure: any): void {
    expect(response.data).toBeDefined();
    expect(response.data).toMatchObject(expectedStructure);
  }

  /**
   * Assert GraphQL response performance
   */
  static assertResponseTime(response: GraphQLResponse, maxDuration: number = 200): void {
    const operationName = defaultClient.extractOperationName('') || 'unknown';
    const metrics = defaultClient.getPerformanceMetrics();
    const latestMetric = metrics[metrics.length - 1];

    if (latestMetric) {
      expect(latestMetric.duration).toBeLessThan(maxDuration);
    }
  }

  /**
   * Assert pagination structure
   */
  static assertPaginationStructure(data: any): void {
    expect(data).toHaveProperty('data');
    expect(data).toHaveProperty('pagination');
    expect(data.pagination).toMatchObject({
      page: expect.any(Number),
      limit: expect.any(Number),
      total: expect.any(Number),
      totalPages: expect.any(Number),
      hasNext: expect.any(Boolean),
      hasPrev: expect.any(Boolean),
    });
    expect(Array.isArray(data.data)).toBe(true);
  }

  /**
   * Assert UUID format
   */
  static assertUUIDFormat(value: string): void {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(value).toMatch(uuidRegex);
  }

  /**
   * Assert ISO date format
   */
  static assertISODateFormat(value: string): void {
    const date = new Date(value);
    expect(date).toBeInstanceOf(Date);
    expect(date.toISOString()).toBe(value);
  }

  /**
   * Assert enum values
   */
  static assertEnumValue(value: string, allowedValues: string[]): void {
    expect(allowedValues).toContain(value);
  }

  /**
   * Assert rating range
   */
  static assertRatingRange(rating: number, min: number = 1, max: number = 5): void {
    expect(rating).toBeGreaterThanOrEqual(min);
    expect(rating).toBeLessThanOrEqual(max);
  }

  /**
   * Assert progress percentage
   */
  static assertProgressPercentage(progress: number): void {
    expect(progress).toBeGreaterThanOrEqual(0);
    expect(progress).toBeLessThanOrEqual(100);
  }
}

// Performance monitoring utilities
export class GraphQLPerformanceMonitor {
  /**
   * Start performance monitoring for a test suite
   */
  static startMonitoring(): void {
    defaultClient.clearPerformanceMetrics();
  }

  /**
   * Get performance report
   */
  static getPerformanceReport(): {
    totalOperations: number;
    averageResponseTime: number;
    successRate: number;
    slowestOperation: PerformanceMetrics | null;
    fastestOperation: PerformanceMetrics | null;
    operationBreakdown: Record<string, {
      count: number;
      averageTime: number;
      successRate: number;
    }>;
  } {
    const metrics = defaultClient.getPerformanceMetrics();

    if (metrics.length === 0) {
      return {
        totalOperations: 0,
        averageResponseTime: 0,
        successRate: 100,
        slowestOperation: null,
        fastestOperation: null,
        operationBreakdown: {},
      };
    }

    const slowestOperation = metrics.reduce((prev, current) =>
      prev.duration > current.duration ? prev : current
    );

    const fastestOperation = metrics.reduce((prev, current) =>
      prev.duration < current.duration ? prev : current
    );

    // Create operation breakdown
    const operationBreakdown: Record<string, {
      count: number;
      averageTime: number;
      successRate: number;
    }> = {};

    metrics.forEach(metric => {
      if (!operationBreakdown[metric.operationName]) {
        operationBreakdown[metric.operationName] = {
          count: 0,
          averageTime: 0,
          successRate: 0,
        };
      }

      const breakdown = operationBreakdown[metric.operationName];
      breakdown.count++;
      breakdown.averageTime = ((breakdown.averageTime * (breakdown.count - 1)) + metric.duration) / breakdown.count;
    });

    // Calculate success rates
    Object.keys(operationBreakdown).forEach(operationName => {
      const operationMetrics = metrics.filter(m => m.operationName === operationName);
      const successfulOps = operationMetrics.filter(m => m.success).length;
      operationBreakdown[operationName].successRate = (successfulOps / operationMetrics.length) * 100;
    });

    return {
      totalOperations: metrics.length,
      averageResponseTime: defaultClient.getAverageResponseTime(),
      successRate: defaultClient.getSuccessRate(),
      slowestOperation,
      fastestOperation,
      operationBreakdown,
    };
  }

  /**
   * Assert overall performance targets
   */
  static assertPerformanceTargets(targets: {
    maxAverageResponseTime?: number;
    minSuccessRate?: number;
    maxSlowOperationTime?: number;
  }): void {
    const report = this.getPerformanceReport();

    if (targets.maxAverageResponseTime) {
      expect(report.averageResponseTime).toBeLessThan(targets.maxAverageResponseTime);
    }

    if (targets.minSuccessRate) {
      expect(report.successRate).toBeGreaterThanOrEqual(targets.minSuccessRate);
    }

    if (targets.maxSlowOperationTime && report.slowestOperation) {
      expect(report.slowestOperation.duration).toBeLessThan(targets.maxSlowOperationTime);
    }
  }
}

// Export default client
export default defaultClient;