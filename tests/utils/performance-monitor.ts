// Performance Monitoring Utilities for SvelteHR Tests
// Comprehensive performance tracking and analysis
// Created: 2025-09-24

import { performance } from 'perf_hooks';
import { expect } from 'vitest';

// Performance metric types
interface PerformanceEntry {
	name: string;
	startTime: number;
	endTime: number;
	duration: number;
	metadata?: Record<string, any>;
	tags?: string[];
}

interface MemoryMetrics {
	heapUsed: number;
	heapTotal: number;
	external: number;
	rss: number;
	timestamp: number;
}

interface PerformanceReport {
	totalTests: number;
	averageDuration: number;
	medianDuration: number;
	p95Duration: number;
	p99Duration: number;
	slowestTest: PerformanceEntry | null;
	fastestTest: PerformanceEntry | null;
	memoryUsage: {
		peak: MemoryMetrics;
		average: MemoryMetrics;
		final: MemoryMetrics;
	};
	performanceTargets: {
		passed: number;
		failed: number;
		warnings: string[];
	};
}

// Performance thresholds
export const PERFORMANCE_TARGETS = {
	GRAPHQL_RESPONSE_TIME: 200, // ms
	PAGE_LOAD_TIME: 1000, // ms
	COMPONENT_RENDER_TIME: 50, // ms
	DATABASE_QUERY_TIME: 100, // ms
	API_REQUEST_TIME: 500, // ms
	MEMORY_GROWTH_LIMIT: 50 * 1024 * 1024, // 50MB
	GC_PRESSURE_LIMIT: 10 // collections per second
} as const;

// Global performance tracking
class PerformanceMonitor {
	private entries: PerformanceEntry[] = [];
	private memorySnapshots: MemoryMetrics[] = [];
	private startTimes: Map<string, number> = new Map();
	private isMonitoring = false;
	private memoryInterval?: NodeJS.Timeout;

	/**
	 * Start monitoring performance for a test suite
	 */
	startMonitoring(): void {
		if (this.isMonitoring) return;

		this.isMonitoring = true;
		this.entries = [];
		this.memorySnapshots = [];
		this.startTimes.clear();

		// Start memory monitoring
		this.memoryInterval = setInterval(() => {
			this.captureMemorySnapshot();
		}, 100); // Every 100ms

		// Initial memory snapshot
		this.captureMemorySnapshot();
	}

	/**
	 * Stop monitoring and generate report
	 */
	stopMonitoring(): PerformanceReport {
		this.isMonitoring = false;

		if (this.memoryInterval) {
			clearInterval(this.memoryInterval);
			this.memoryInterval = undefined;
		}

		// Final memory snapshot
		this.captureMemorySnapshot();

		return this.generateReport();
	}

	/**
	 * Mark the start of a performance-critical operation
	 */
	mark(name: string, metadata?: Record<string, any>): void {
		if (!this.isMonitoring) return;

		const startTime = performance.now();
		this.startTimes.set(name, startTime);

		// Store metadata for later use
		if (metadata) {
			const entry = this.entries.find((e) => e.name === name);
			if (entry) {
				entry.metadata = { ...entry.metadata, ...metadata };
			}
		}
	}

	/**
	 * Measure the duration of an operation
	 */
	measure(name: string, tags?: string[], metadata?: Record<string, any>): number {
		if (!this.isMonitoring) return 0;

		const endTime = performance.now();
		const startTime = this.startTimes.get(name);

		if (!startTime) {
			console.warn(`Performance measure '${name}' started without a mark`);
			return 0;
		}

		const duration = endTime - startTime;
		this.startTimes.delete(name);

		const entry: PerformanceEntry = {
			name,
			startTime,
			endTime,
			duration,
			metadata,
			tags
		};

		this.entries.push(entry);

		// Check against performance targets
		this.checkPerformanceTarget(entry);

		return duration;
	}

	/**
	 * Time a function execution
	 */
	async timeFunction<T>(
		name: string,
		fn: () => Promise<T> | T,
		tags?: string[],
		metadata?: Record<string, any>
	): Promise<{ result: T; duration: number }> {
		this.mark(name, metadata);

		try {
			const result = await fn();
			const duration = this.measure(name, tags, metadata);
			return { result, duration };
		} catch (error) {
			this.measure(name, [...(tags || []), 'error'], {
				...metadata,
				error: error instanceof Error ? error.message : 'Unknown error'
			});
			throw error;
		}
	}

	/**
	 * Measure memory usage at specific points
	 */
	private captureMemorySnapshot(): void {
		if (typeof process !== 'undefined' && process.memoryUsage) {
			const memory = process.memoryUsage();
			this.memorySnapshots.push({
				heapUsed: memory.heapUsed,
				heapTotal: memory.heapTotal,
				external: memory.external,
				rss: memory.rss,
				timestamp: Date.now()
			});
		}
	}

	/**
	 * Check performance entry against targets
	 */
	private checkPerformanceTarget(entry: PerformanceEntry): void {
		const { name, duration, tags = [] } = entry;

		// GraphQL operations
		if (tags.includes('graphql') || name.includes('graphql')) {
			if (duration > PERFORMANCE_TARGETS.GRAPHQL_RESPONSE_TIME) {
				console.warn(
					`⚠️  GraphQL operation '${name}' exceeded target: ${duration}ms > ${PERFORMANCE_TARGETS.GRAPHQL_RESPONSE_TIME}ms`
				);
			}
		}

		// Page load operations
		if (tags.includes('page-load') || name.includes('page')) {
			if (duration > PERFORMANCE_TARGETS.PAGE_LOAD_TIME) {
				console.warn(
					`⚠️  Page load '${name}' exceeded target: ${duration}ms > ${PERFORMANCE_TARGETS.PAGE_LOAD_TIME}ms`
				);
			}
		}

		// Component rendering
		if (tags.includes('component') || name.includes('render')) {
			if (duration > PERFORMANCE_TARGETS.COMPONENT_RENDER_TIME) {
				console.warn(
					`⚠️  Component render '${name}' exceeded target: ${duration}ms > ${PERFORMANCE_TARGETS.COMPONENT_RENDER_TIME}ms`
				);
			}
		}

		// Database operations
		if (tags.includes('database') || name.includes('db') || name.includes('query')) {
			if (duration > PERFORMANCE_TARGETS.DATABASE_QUERY_TIME) {
				console.warn(
					`⚠️  Database operation '${name}' exceeded target: ${duration}ms > ${PERFORMANCE_TARGETS.DATABASE_QUERY_TIME}ms`
				);
			}
		}

		// API requests
		if (tags.includes('api') || name.includes('api') || name.includes('request')) {
			if (duration > PERFORMANCE_TARGETS.API_REQUEST_TIME) {
				console.warn(
					`⚠️  API request '${name}' exceeded target: ${duration}ms > ${PERFORMANCE_TARGETS.API_REQUEST_TIME}ms`
				);
			}
		}
	}

	/**
	 * Generate comprehensive performance report
	 */
	private generateReport(): PerformanceReport {
		const entries = [...this.entries];
		const durations = entries.map((e) => e.duration).sort((a, b) => a - b);

		// Basic statistics
		const totalTests = entries.length;
		const averageDuration = totalTests > 0 ? durations.reduce((a, b) => a + b, 0) / totalTests : 0;
		const medianDuration = totalTests > 0 ? durations[Math.floor(totalTests / 2)] : 0;
		const p95Duration = totalTests > 0 ? durations[Math.floor(totalTests * 0.95)] : 0;
		const p99Duration = totalTests > 0 ? durations[Math.floor(totalTests * 0.99)] : 0;

		// Extreme values
		const slowestTest = entries.reduce(
			(prev, current) => (!prev || current.duration > prev.duration ? current : prev),
			null as PerformanceEntry | null
		);

		const fastestTest = entries.reduce(
			(prev, current) => (!prev || current.duration < prev.duration ? current : prev),
			null as PerformanceEntry | null
		);

		// Memory analysis
		const memoryUsage = this.analyzeMemoryUsage();

		// Performance target analysis
		const performanceTargets = this.analyzePerformanceTargets();

		return {
			totalTests,
			averageDuration,
			medianDuration,
			p95Duration,
			p99Duration,
			slowestTest,
			fastestTest,
			memoryUsage,
			performanceTargets
		};
	}

	/**
	 * Analyze memory usage patterns
	 */
	private analyzeMemoryUsage() {
		if (this.memorySnapshots.length === 0) {
			const empty: MemoryMetrics = { heapUsed: 0, heapTotal: 0, external: 0, rss: 0, timestamp: 0 };
			return { peak: empty, average: empty, final: empty };
		}

		const snapshots = this.memorySnapshots;
		const peak = snapshots.reduce((prev, current) =>
			current.heapUsed > prev.heapUsed ? current : prev
		);

		const average: MemoryMetrics = {
			heapUsed: snapshots.reduce((sum, s) => sum + s.heapUsed, 0) / snapshots.length,
			heapTotal: snapshots.reduce((sum, s) => sum + s.heapTotal, 0) / snapshots.length,
			external: snapshots.reduce((sum, s) => sum + s.external, 0) / snapshots.length,
			rss: snapshots.reduce((sum, s) => sum + s.rss, 0) / snapshots.length,
			timestamp: Date.now()
		};

		const final = snapshots[snapshots.length - 1];

		return { peak, average, final };
	}

	/**
	 * Analyze performance against targets
	 */
	private analyzePerformanceTargets() {
		let passed = 0;
		let failed = 0;
		const warnings: string[] = [];

		this.entries.forEach((entry) => {
			let targetMet = true;
			const { name, duration, tags = [] } = entry;

			// Check specific targets
			if (tags.includes('graphql') && duration > PERFORMANCE_TARGETS.GRAPHQL_RESPONSE_TIME) {
				targetMet = false;
				warnings.push(
					`GraphQL '${name}': ${duration}ms > ${PERFORMANCE_TARGETS.GRAPHQL_RESPONSE_TIME}ms`
				);
			}

			if (tags.includes('page-load') && duration > PERFORMANCE_TARGETS.PAGE_LOAD_TIME) {
				targetMet = false;
				warnings.push(
					`Page load '${name}': ${duration}ms > ${PERFORMANCE_TARGETS.PAGE_LOAD_TIME}ms`
				);
			}

			if (tags.includes('component') && duration > PERFORMANCE_TARGETS.COMPONENT_RENDER_TIME) {
				targetMet = false;
				warnings.push(
					`Component '${name}': ${duration}ms > ${PERFORMANCE_TARGETS.COMPONENT_RENDER_TIME}ms`
				);
			}

			if (tags.includes('database') && duration > PERFORMANCE_TARGETS.DATABASE_QUERY_TIME) {
				targetMet = false;
				warnings.push(
					`Database '${name}': ${duration}ms > ${PERFORMANCE_TARGETS.DATABASE_QUERY_TIME}ms`
				);
			}

			if (tags.includes('api') && duration > PERFORMANCE_TARGETS.API_REQUEST_TIME) {
				targetMet = false;
				warnings.push(`API '${name}': ${duration}ms > ${PERFORMANCE_TARGETS.API_REQUEST_TIME}ms`);
			}

			if (targetMet) {
				passed++;
			} else {
				failed++;
			}
		});

		return { passed, failed, warnings };
	}

	/**
	 * Get current performance entries
	 */
	getEntries(): PerformanceEntry[] {
		return [...this.entries];
	}

	/**
	 * Get entries by tag
	 */
	getEntriesByTag(tag: string): PerformanceEntry[] {
		return this.entries.filter((entry) => entry.tags?.includes(tag));
	}

	/**
	 * Clear all performance data
	 */
	clear(): void {
		this.entries = [];
		this.memorySnapshots = [];
		this.startTimes.clear();
	}
}

// Global monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Convenient wrapper functions
export function startPerformanceMonitoring(): void {
	performanceMonitor.startMonitoring();
}

export function stopPerformanceMonitoring(): PerformanceReport {
	return performanceMonitor.stopMonitoring();
}

export function markPerformance(name: string, metadata?: Record<string, any>): void {
	performanceMonitor.mark(name, metadata);
}

export function measurePerformance(
	name: string,
	tags?: string[],
	metadata?: Record<string, any>
): number {
	return performanceMonitor.measure(name, tags, metadata);
}

export async function timeFunction<T>(
	name: string,
	fn: () => Promise<T> | T,
	tags?: string[],
	metadata?: Record<string, any>
): Promise<{ result: T; duration: number }> {
	return performanceMonitor.timeFunction(name, fn, tags, metadata);
}

// Performance assertion utilities
export class PerformanceAssertions {
	/**
	 * Assert operation completed within target time
	 */
	static assertWithinTarget(
		duration: number,
		target: number,
		operationName: string = 'operation'
	): void {
		expect(duration).toBeLessThan(target);

		if (duration > target * 0.8) {
			// Warn if within 80% of target
			console.warn(`⚠️  ${operationName} close to target: ${duration}ms (target: ${target}ms)`);
		}
	}

	/**
	 * Assert GraphQL performance targets
	 */
	static assertGraphQLPerformance(duration: number, operationName: string): void {
		this.assertWithinTarget(
			duration,
			PERFORMANCE_TARGETS.GRAPHQL_RESPONSE_TIME,
			`GraphQL ${operationName}`
		);
	}

	/**
	 * Assert page load performance targets
	 */
	static assertPageLoadPerformance(duration: number, pageName: string): void {
		this.assertWithinTarget(duration, PERFORMANCE_TARGETS.PAGE_LOAD_TIME, `Page load ${pageName}`);
	}

	/**
	 * Assert component render performance targets
	 */
	static assertComponentPerformance(duration: number, componentName: string): void {
		this.assertWithinTarget(
			duration,
			PERFORMANCE_TARGETS.COMPONENT_RENDER_TIME,
			`Component ${componentName}`
		);
	}

	/**
	 * Assert database query performance targets
	 */
	static assertDatabasePerformance(duration: number, queryName: string): void {
		this.assertWithinTarget(
			duration,
			PERFORMANCE_TARGETS.DATABASE_QUERY_TIME,
			`Database ${queryName}`
		);
	}

	/**
	 * Assert API request performance targets
	 */
	static assertAPIPerformance(duration: number, endpointName: string): void {
		this.assertWithinTarget(duration, PERFORMANCE_TARGETS.API_REQUEST_TIME, `API ${endpointName}`);
	}

	/**
	 * Assert overall test suite performance
	 */
	static assertSuitePerformance(report: PerformanceReport): void {
		// Check that most operations meet performance targets
		const successRate =
			report.performanceTargets.passed /
			(report.performanceTargets.passed + report.performanceTargets.failed);

		expect(successRate).toBeGreaterThan(0.9); // 90% of operations should meet targets

		// Check that no single operation is extremely slow
		if (report.slowestTest) {
			expect(report.slowestTest.duration).toBeLessThan(10000); // No operation should take > 10s
		}

		// Memory growth check
		const memoryGrowth = report.memoryUsage.final.heapUsed - report.memoryUsage.average.heapUsed;
		expect(memoryGrowth).toBeLessThan(PERFORMANCE_TARGETS.MEMORY_GROWTH_LIMIT);
	}
}

// Export performance monitor for direct access
export default performanceMonitor;
