/**
 * Server-side Performance Monitor for SvelteHR
 *
 * Monitors server-side performance including:
 * - GraphQL query execution times
 * - Database query performance
 * - API endpoint response times
 * - Memory usage on the server
 * - Request/response analysis
 *
 * This integrates with SvelteKit's server-side hooks and provides
 * performance data for server-rendered pages and API endpoints.
 */

import type { Handle, RequestEvent } from '@sveltejs/kit';
import { performance } from 'perf_hooks';

export interface ServerPerformanceMetric {
	id: string;
	timestamp: number;
	type: 'request' | 'graphql' | 'database' | 'api';
	method?: string;
	path: string;
	duration: number;
	status: number;
	contentLength?: number;
	userAgent?: string;
	ip?: string;
	memory?: {
		heapUsed: number;
		heapTotal: number;
		external: number;
		rss: number;
	};
	error?: string;
	metadata?: Record<string, any>;
}

export interface ServerPerformanceConfig {
	enabled: boolean;
	sampleRate: number; // 0-1, percentage of requests to monitor
	slowRequestThreshold: number; // ms
	memoryThreshold: number; // bytes
	maxMetricsStorage: number;
	enableDetailedLogging: boolean;
	excludePaths: string[];
}

const DEFAULT_CONFIG: ServerPerformanceConfig = {
	enabled: true,
	sampleRate: 1.0, // Monitor all requests in development
	slowRequestThreshold: 500, // 500ms
	memoryThreshold: 1024 * 1024 * 1024, // 1GB
	maxMetricsStorage: 1000,
	enableDetailedLogging: false,
	excludePaths: ['/favicon.ico', '/_app/', '/static/']
};

class ServerPerformanceMonitor {
	private static instance: ServerPerformanceMonitor;
	private config: ServerPerformanceConfig;
	private metrics: ServerPerformanceMetric[] = [];
	private requestTiming = new Map<string, number>();

	private constructor(config: Partial<ServerPerformanceConfig> = {}) {
		this.config = { ...DEFAULT_CONFIG, ...config };

		if (this.config.enabled) {
			this.startMemoryMonitoring();
		}
	}

	static getInstance(config?: Partial<ServerPerformanceConfig>): ServerPerformanceMonitor {
		if (!ServerPerformanceMonitor.instance) {
			ServerPerformanceMonitor.instance = new ServerPerformanceMonitor(config);
		}
		return ServerPerformanceMonitor.instance;
	}

	/**
	 * SvelteKit handle hook for performance monitoring
	 */
	createHandle(): Handle {
		if (!this.config.enabled) {
			return ({ event, resolve }) => resolve(event);
		}

		return async ({ event, resolve }: { event: RequestEvent; resolve: any }) => {
			const startTime = performance.now();
			const requestId = this.generateRequestId();

			// Skip monitoring for excluded paths
			if (this.shouldSkipPath(event.url.pathname)) {
				return resolve(event);
			}

			// Apply sampling
			if (Math.random() > this.config.sampleRate) {
				return resolve(event);
			}

			// Store request start time
			this.requestTiming.set(requestId, startTime);

			// Add request tracking to event locals
			(event.locals as any).performanceRequestId = requestId;
			(event.locals as any).performanceStartTime = startTime;

			try {
				const response = await resolve(event);
				const duration = performance.now() - startTime;

				// Record successful request metric
				this.recordMetric({
					type: 'request',
					method: event.request.method,
					path: event.url.pathname,
					duration,
					status: response.status,
					contentLength: this.getContentLength(response),
					userAgent: event.request.headers.get('user-agent') || undefined,
					ip: this.getClientIP(event),
					memory: this.getCurrentMemoryUsage(),
					metadata: {
						query: Object.fromEntries(event.url.searchParams),
						route: event.route?.id
					}
				});

				// Log slow requests
				if (duration > this.config.slowRequestThreshold) {
					console.warn(
						`🐌 Slow request: ${event.request.method} ${event.url.pathname} took ${Math.round(duration)}ms`
					);
				}

				return response;
			} catch (error) {
				const duration = performance.now() - startTime;

				// Record error metric
				this.recordMetric({
					type: 'request',
					method: event.request.method,
					path: event.url.pathname,
					duration,
					status: 500,
					error: error instanceof Error ? error.message : 'Unknown error',
					memory: this.getCurrentMemoryUsage()
				});

				throw error;
			} finally {
				this.requestTiming.delete(requestId);
			}
		};
	}

	/**
	 * Record GraphQL operation performance
	 */
	recordGraphQLOperation(
		operationName: string,
		duration: number,
		requestEvent?: RequestEvent,
		metadata?: Record<string, any>
	): void {
		this.recordMetric({
			type: 'graphql',
			method: 'POST',
			path: '/api/graphql',
			duration,
			status: 200,
			memory: this.getCurrentMemoryUsage(),
			metadata: {
				operationName,
				...metadata
			}
		});

		if (duration > 200) {
			// GraphQL budget
			console.warn(`🐌 Slow GraphQL operation: ${operationName} took ${Math.round(duration)}ms`);
		}
	}

	/**
	 * Record database query performance
	 */
	recordDatabaseQuery(query: string, duration: number, rows?: number, error?: string): void {
		this.recordMetric({
			type: 'database',
			method: 'QUERY',
			path: '/database',
			duration,
			status: error ? 500 : 200,
			error,
			metadata: {
				query: this.sanitizeQuery(query),
				rowCount: rows
			}
		});

		if (duration > 100) {
			// Database budget
			console.warn(
				`🐌 Slow database query took ${Math.round(duration)}ms:`,
				this.sanitizeQuery(query)
			);
		}
	}

	/**
	 * Record API endpoint performance
	 */
	recordAPIEndpoint(
		endpoint: string,
		method: string,
		duration: number,
		status: number,
		requestEvent?: RequestEvent
	): void {
		this.recordMetric({
			type: 'api',
			method,
			path: endpoint,
			duration,
			status,
			memory: this.getCurrentMemoryUsage(),
			metadata: {
				userAgent: requestEvent?.request.headers.get('user-agent'),
				ip: requestEvent ? this.getClientIP(requestEvent) : undefined
			}
		});
	}

	/**
	 * Get current performance statistics
	 */
	getStatistics(timeframe: number = 60000): {
		totalRequests: number;
		averageResponseTime: number;
		p95ResponseTime: number;
		slowRequestsCount: number;
		errorRate: number;
		memoryUsage: {
			current: number;
			peak: number;
			average: number;
		};
		topSlowEndpoints: Array<{ path: string; avgDuration: number; count: number }>;
	} {
		const cutoffTime = Date.now() - timeframe;
		const recentMetrics = this.metrics.filter((m) => m.timestamp && m.timestamp > cutoffTime);

		const durations = recentMetrics.map((m) => m.duration).sort((a, b) => a - b);
		const averageResponseTime =
			durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0;

		const p95Index = Math.floor(durations.length * 0.95);
		const p95ResponseTime = durations[p95Index] || 0;

		const slowRequestsCount = recentMetrics.filter(
			(m) => m.duration > this.config.slowRequestThreshold
		).length;

		const errorCount = recentMetrics.filter((m) => m.status >= 400).length;
		const errorRate = recentMetrics.length > 0 ? errorCount / recentMetrics.length : 0;

		// Memory statistics
		const memoryMetrics = recentMetrics.filter((m) => m.memory).map((m) => m.memory!.rss);

		const memoryUsage = {
			current: process.memoryUsage().rss,
			peak: memoryMetrics.length > 0 ? Math.max(...memoryMetrics) : 0,
			average:
				memoryMetrics.length > 0
					? memoryMetrics.reduce((sum, m) => sum + m, 0) / memoryMetrics.length
					: 0
		};

		// Analyze slowest endpoints
		const endpointStats = new Map<string, { totalDuration: number; count: number }>();

		recentMetrics.forEach((metric) => {
			const key = `${metric.method} ${metric.path}`;
			const existing = endpointStats.get(key) || { totalDuration: 0, count: 0 };
			endpointStats.set(key, {
				totalDuration: existing.totalDuration + metric.duration,
				count: existing.count + 1
			});
		});

		const topSlowEndpoints = Array.from(endpointStats.entries())
			.map(([path, stats]) => ({
				path,
				avgDuration: stats.totalDuration / stats.count,
				count: stats.count
			}))
			.sort((a, b) => b.avgDuration - a.avgDuration)
			.slice(0, 10);

		return {
			totalRequests: recentMetrics.length,
			averageResponseTime: Math.round(averageResponseTime * 100) / 100,
			p95ResponseTime: Math.round(p95ResponseTime * 100) / 100,
			slowRequestsCount,
			errorRate: Math.round(errorRate * 100) / 100,
			memoryUsage,
			topSlowEndpoints
		};
	}

	/**
	 * Get recent metrics
	 */
	getRecentMetrics(limit: number = 50): ServerPerformanceMetric[] {
		return this.metrics.slice(-limit);
	}

	/**
	 * Clear stored metrics
	 */
	clearMetrics(): void {
		this.metrics = [];
		console.log('🗑️ Server performance metrics cleared');
	}

	/**
	 * Export performance report
	 */
	exportReport(): {
		timestamp: string;
		config: ServerPerformanceConfig;
		statistics: ReturnType<ServerPerformanceMonitor['getStatistics']>;
		recentMetrics: ServerPerformanceMetric[];
		systemInfo: {
			nodeVersion: string;
			platform: string;
			cpus: number;
			memoryLimit: number;
		};
	} {
		return {
			timestamp: new Date().toISOString(),
			config: this.config,
			statistics: this.getStatistics(),
			recentMetrics: this.getRecentMetrics(100),
			systemInfo: {
				nodeVersion: process.version,
				platform: process.platform,
				cpus: require('os').cpus().length,
				memoryLimit: require('v8').getHeapStatistics().heap_size_limit
			}
		};
	}

	// Private methods

	private recordMetric(metric: Omit<ServerPerformanceMetric, 'id' | 'timestamp'>): void {
		const fullMetric: ServerPerformanceMetric = {
			...metric,
			id: this.generateRequestId(),
			timestamp: Date.now()
		};

		this.metrics.push(fullMetric);

		// Keep metrics within storage limit
		if (this.metrics.length > this.config.maxMetricsStorage) {
			this.metrics = this.metrics.slice(-this.config.maxMetricsStorage);
		}

		// Detailed logging if enabled
		if (this.config.enableDetailedLogging) {
			console.log(`📊 Performance metric:`, {
				type: fullMetric.type,
				path: fullMetric.path,
				duration: `${Math.round(fullMetric.duration)}ms`,
				status: fullMetric.status
			});
		}
	}

	private generateRequestId(): string {
		return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	private shouldSkipPath(path: string): boolean {
		return this.config.excludePaths.some(
			(excluded) => path.startsWith(excluded) || path.includes(excluded)
		);
	}

	private getContentLength(response: Response): number | undefined {
		const contentLength = response.headers.get('content-length');
		return contentLength ? parseInt(contentLength, 10) : undefined;
	}

	private getClientIP(event: RequestEvent): string | undefined {
		// Try various headers for client IP
		const headers = ['x-forwarded-for', 'x-real-ip', 'x-client-ip', 'cf-connecting-ip'];

		for (const header of headers) {
			const value = event.request.headers.get(header);
			if (value) {
				return value.split(',')[0].trim();
			}
		}

		return undefined;
	}

	private getCurrentMemoryUsage() {
		try {
			return process.memoryUsage();
		} catch (error) {
			return undefined;
		}
	}

	private sanitizeQuery(query: string): string {
		// Remove sensitive data from query strings for logging
		return query
			.replace(/password\s*=\s*'[^']*'/gi, "password='***'")
			.replace(/token\s*=\s*'[^']*'/gi, "token='***'")
			.replace(/secret\s*=\s*'[^']*'/gi, "secret='***'")
			.substring(0, 200); // Truncate long queries
	}

	private startMemoryMonitoring(): void {
		// Monitor memory usage every 30 seconds
		setInterval(() => {
			const memUsage = process.memoryUsage();

			if (memUsage.rss > this.config.memoryThreshold) {
				console.warn(`⚠️ High memory usage detected: ${Math.round(memUsage.rss / 1024 / 1024)}MB`);
			}

			// Force garbage collection if available and memory is high
			if (global.gc && memUsage.rss > this.config.memoryThreshold * 0.9) {
				console.log('🗑️ Forcing garbage collection due to high memory usage');
				global.gc();
			}
		}, 30000);
	}
}

// GraphQL Performance Wrapper
export function withGraphQLPerformanceTracking<T extends any[], R>(
	operationName: string,
	fn: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
	return async (...args: T): Promise<R> => {
		const startTime = performance.now();
		const monitor = ServerPerformanceMonitor.getInstance();

		try {
			const result = await fn(...args);
			const duration = performance.now() - startTime;

			monitor.recordGraphQLOperation(operationName, duration, undefined, {
				success: true,
				resultSize: JSON.stringify(result).length
			});

			return result;
		} catch (error) {
			const duration = performance.now() - startTime;

			monitor.recordGraphQLOperation(operationName, duration, undefined, {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			});

			throw error;
		}
	};
}

// Database Performance Wrapper
export function withDatabasePerformanceTracking<T extends any[], R>(
	fn: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
	return async (...args: T): Promise<R> => {
		const startTime = performance.now();
		const monitor = ServerPerformanceMonitor.getInstance();

		// Try to extract query from arguments (implementation-specific)
		const query =
			(args.find((arg) => typeof arg === 'string' && arg.includes('SELECT')) as string) ||
			'Unknown query';

		try {
			const result = await fn(...args);
			const duration = performance.now() - startTime;

			// Try to get row count from result
			const rowCount = Array.isArray(result) ? result.length : undefined;

			monitor.recordDatabaseQuery(query, duration, rowCount);

			return result;
		} catch (error) {
			const duration = performance.now() - startTime;

			monitor.recordDatabaseQuery(
				query,
				duration,
				undefined,
				error instanceof Error ? error.message : 'Unknown error'
			);

			throw error;
		}
	};
}

// Export singleton and factory
export const serverPerformanceMonitor = ServerPerformanceMonitor.getInstance();

export function createServerPerformanceMonitor(
	config?: Partial<ServerPerformanceConfig>
): ServerPerformanceMonitor {
	return ServerPerformanceMonitor.getInstance(config);
}

// Performance analysis utilities
export function analyzePerformanceTrends(
	metrics: ServerPerformanceMetric[],
	timeWindow: number = 3600000 // 1 hour
): {
	trends: {
		responseTime: 'improving' | 'stable' | 'degrading';
		errorRate: 'improving' | 'stable' | 'degrading';
		throughput: 'improving' | 'stable' | 'degrading';
	};
	insights: string[];
} {
	const now = Date.now();
	const recent = metrics.filter((m) => m.timestamp && now - m.timestamp < timeWindow / 2);
	const older = metrics.filter(
		(m) => m.timestamp && now - m.timestamp >= timeWindow / 2 && now - m.timestamp < timeWindow
	);

	if (recent.length === 0 || older.length === 0) {
		return {
			trends: { responseTime: 'stable', errorRate: 'stable', throughput: 'stable' },
			insights: ['Insufficient data for trend analysis']
		};
	}

	// Response time trend
	const recentAvgResponse = recent.reduce((sum, m) => sum + m.duration, 0) / recent.length;
	const olderAvgResponse = older.reduce((sum, m) => sum + m.duration, 0) / older.length;
	const responseTimeChange = (recentAvgResponse - olderAvgResponse) / olderAvgResponse;

	// Error rate trend
	const recentErrorRate = recent.filter((m) => m.status >= 400).length / recent.length;
	const olderErrorRate = older.filter((m) => m.status >= 400).length / older.length;

	// Throughput trend (requests per minute)
	const recentThroughput = (recent.length / (timeWindow / 2)) * 60000;
	const olderThroughput = (older.length / (timeWindow / 2)) * 60000;
	const throughputChange = (recentThroughput - olderThroughput) / olderThroughput;

	const trendData = {
		responseTime:
			responseTimeChange < -0.1 ? 'improving' : responseTimeChange > 0.1 ? 'degrading' : 'stable',
		errorRate:
			recentErrorRate < olderErrorRate * 0.9
				? 'improving'
				: recentErrorRate > olderErrorRate * 1.1
					? 'degrading'
					: 'stable',
		throughput:
			throughputChange > 0.1 ? 'improving' : throughputChange < -0.1 ? 'degrading' : 'stable'
	} as const;

	const insights: string[] = [];

	if (trendData.responseTime === 'degrading') {
		insights.push(`Response times have increased by ${Math.round(responseTimeChange * 100)}%`);
	}
	if (trendData.errorRate === 'degrading') {
		insights.push(
			`Error rate has increased from ${(olderErrorRate * 100).toFixed(1)}% to ${(recentErrorRate * 100).toFixed(1)}%`
		);
	}
	if (trendData.throughput === 'degrading') {
		insights.push(
			`Request throughput has decreased by ${Math.round(Math.abs(throughputChange) * 100)}%`
		);
	}

	if (insights.length === 0) {
		insights.push('Performance appears stable');
	}

	return { trends: trendData, insights };
}

export default ServerPerformanceMonitor;
