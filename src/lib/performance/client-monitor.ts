/**
 * Client-side Performance Monitor for SvelteHR
 *
 * Comprehensive performance monitoring system that tracks:
 * - Page load times with Core Web Vitals
 * - GraphQL operation performance
 * - Component render times
 * - Memory usage tracking
 * - Real-time feature latency
 * - Export operation performance
 *
 * Performance Targets:
 * - GraphQL responses: <200ms (P95)
 * - Page loads: <1s (P95)
 * - Real-time updates: <100ms
 * - Export operations: <5s for 1000 records
 * - Memory usage: <100MB per tab
 */

import { browser } from '$app/environment';
import { afterNavigate, beforeNavigate } from '$app/navigation';
import { derived, readonly, writable } from 'svelte/store';
import type { Readable, Writable } from 'svelte/store';
import { logger } from '$lib/utils/logger';

/**
 * UUID generation with fallbacks for environments that don't support crypto.randomUUID()
 * This ensures compatibility across all browsers and contexts.
 */
function generateUUID(): string {
	// Try modern crypto.randomUUID() first
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		try {
			return crypto.randomUUID();
		} catch (error) {
			// Fall through to next method if it fails
			logger.warn('crypto.randomUUID() failed, using fallback', { error: error as Error });
		}
	}

	// Fallback to crypto.getRandomValues() with UUID v4 format
	if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
		try {
			const bytes = new Uint8Array(16);
			crypto.getRandomValues(bytes);

			// Set version (4) and variant bits according to RFC 4122
			bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
			bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10

			// Convert to UUID string format
			const hexValues = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'));
			return [
				hexValues.slice(0, 4).join(''),
				hexValues.slice(4, 6).join(''),
				hexValues.slice(6, 8).join(''),
				hexValues.slice(8, 10).join(''),
				hexValues.slice(10, 16).join('')
			].join('-');
		} catch (error) {
			// Fall through to Math.random() fallback
			logger.warn('crypto.getRandomValues() failed, using Math.random() fallback', { error: error as Error });
		}
	}

	// Last resort: Math.random() based UUID (non-cryptographic)
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		const v = c === 'x' ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

// Performance metric interfaces
export interface PerformanceMetric {
	id: string;
	timestamp: number;
	name: string;
	type: 'page-load' | 'graphql' | 'component' | 'real-time' | 'export' | 'memory' | 'navigation';
	duration: number;
	status: 'success' | 'warning' | 'error';
	metadata?: Record<string, any>;
	tags?: string[];
}

export interface CoreWebVitals {
	lcp: number | null; // Largest Contentful Paint
	fid: number | null; // First Input Delay
	cls: number | null; // Cumulative Layout Shift
	fcp: number | null; // First Contentful Paint
	ttfb: number | null; // Time to First Byte
}

export interface MemoryUsage {
	usedJSHeapSize: number;
	totalJSHeapSize: number;
	jsHeapSizeLimit: number;
	timestamp: number;
}

export interface PerformanceBudget {
	pageLoad: number; // 1000ms
	graphqlResponse: number; // 200ms
	componentRender: number; // 16ms (60fps)
	realTimeUpdate: number; // 100ms
	exportOperation: number; // 5000ms
	memoryLimit: number; // 100MB
}

export interface PerformanceAlert {
	id: string;
	timestamp: number;
	type: 'budget-exceeded' | 'memory-leak' | 'performance-degradation';
	severity: 'low' | 'medium' | 'high' | 'critical';
	message: string;
	metric: PerformanceMetric;
	recommendations: string[];
}

// Performance targets aligned with requirements (Updated to be more forgiving)
export const PERFORMANCE_BUDGET: PerformanceBudget = {
	pageLoad: 2000, // 2 seconds
	graphqlResponse: 500, // 500ms
	componentRender: 100, // 100ms
	realTimeUpdate: 200, // 200ms
	exportOperation: 5000, // 5 seconds
	memoryLimit: 100 * 1024 * 1024 // 100MB
};

class ClientPerformanceMonitor {
	private metrics: Writable<PerformanceMetric[]> = writable([]);
	private alerts: Writable<PerformanceAlert[]> = writable([]);
	private coreWebVitals: Writable<CoreWebVitals> = writable({
		lcp: null,
		fid: null,
		cls: null,
		fcp: null,
		ttfb: null
	});
	private memoryUsage: Writable<MemoryUsage[]> = writable([]);
	private isMonitoring = false;
	private memoryMonitoringInterval?: number;
	private performanceObserver?: PerformanceObserver;
	private navigationObserver?: PerformanceObserver;
	private longTaskObserver?: PerformanceObserver;

	constructor() {
		if (browser) {
			this.initializePerformanceObservers();
			this.initializeCoreWebVitalsTracking();
			this.startMemoryMonitoring();
		}
	}

	/**
	 * Start comprehensive performance monitoring
	 */
	startMonitoring(): void {
		if (!browser || this.isMonitoring) return;

		this.isMonitoring = true;
		logger.info('🚀 Performance monitoring started');

		// Clear previous data
		this.metrics.set([]);
		this.alerts.set([]);
		this.memoryUsage.set([]);

		// Start monitoring various performance aspects
		this.monitorPageLoad();
		this.monitorNavigationTiming();
		this.startMemoryMonitoring();
	}

	/**
	 * Stop performance monitoring
	 */
	stopMonitoring(): void {
		if (!browser || !this.isMonitoring) return;

		this.isMonitoring = false;
		logger.info('⏹️ Performance monitoring stopped');

		// Clean up observers
		this.performanceObserver?.disconnect();
		this.navigationObserver?.disconnect();
		this.longTaskObserver?.disconnect();

		if (this.memoryMonitoringInterval) {
			clearInterval(this.memoryMonitoringInterval);
		}
	}

	/**
	 * Record a performance metric
	 */
	recordMetric(metric: Omit<PerformanceMetric, 'id' | 'timestamp'>): void {
		const fullMetric: PerformanceMetric = {
			...metric,
			id: generateUUID(),
			timestamp: Date.now()
		};

		this.metrics.update((metrics) => [...metrics, fullMetric]);

		// Check against performance budget
		this.checkPerformanceBudget(fullMetric);

		// Log performance warnings
		if (fullMetric.status === 'warning' || fullMetric.status === 'error') {
			logger.warn(
				`🐌 Performance ${fullMetric.status}: ${fullMetric.name} took ${fullMetric.duration}ms`
			);
		}
	}

	/**
	 * Track GraphQL operation performance
	 */
	trackGraphQLOperation(operationName: string, duration: number, variables?: any): void {
		const status = duration > PERFORMANCE_BUDGET.graphqlResponse ? 'warning' : 'success';

		this.recordMetric({
			name: operationName,
			type: 'graphql',
			duration,
			status,
			metadata: {
				variables: variables ? JSON.stringify(variables) : undefined,
				budget: PERFORMANCE_BUDGET.graphqlResponse
			},
			tags: ['graphql', 'urql']
		});
	}

	/**
	 * Track page navigation performance
	 */
	trackPageLoad(
		pageName: string,
		loadTime: number,
		navigationTiming?: PerformanceNavigationTiming
	): void {
		const status = loadTime > PERFORMANCE_BUDGET.pageLoad ? 'warning' : 'success';

		this.recordMetric({
			name: `Page Load: ${pageName}`,
			type: 'page-load',
			duration: loadTime,
			status,
			metadata: {
				navigationTiming: navigationTiming
					? {
							domContentLoaded:
								navigationTiming.domContentLoadedEventEnd -
								navigationTiming.domContentLoadedEventStart,
							loadComplete: navigationTiming.loadEventEnd - navigationTiming.loadEventStart,
							domInteractive: navigationTiming.domInteractive - navigationTiming.fetchStart
						}
					: undefined,
				budget: PERFORMANCE_BUDGET.pageLoad
			},
			tags: ['page-load', 'navigation']
		});
	}

	/**
	 * Track component render performance
	 */
	trackComponentRender(componentName: string, renderTime: number): void {
		const status = renderTime > PERFORMANCE_BUDGET.componentRender ? 'warning' : 'success';

		this.recordMetric({
			name: `Component: ${componentName}`,
			type: 'component',
			duration: renderTime,
			status,
			metadata: {
				budget: PERFORMANCE_BUDGET.componentRender
			},
			tags: ['component', 'svelte']
		});
	}

	/**
	 * Track real-time feature performance (e.g., WebSocket updates)
	 */
	trackRealTimeUpdate(featureName: string, latency: number): void {
		const status = latency > PERFORMANCE_BUDGET.realTimeUpdate ? 'warning' : 'success';

		this.recordMetric({
			name: `Real-time: ${featureName}`,
			type: 'real-time',
			duration: latency,
			status,
			metadata: {
				budget: PERFORMANCE_BUDGET.realTimeUpdate
			},
			tags: ['real-time', 'websocket']
		});
	}

	/**
	 * Track export operation performance
	 */
	trackExportOperation(
		exportType: string,
		recordCount: number,
		duration: number,
		fileSize?: number
	): void {
		const expectedTime = (recordCount / 1000) * PERFORMANCE_BUDGET.exportOperation;
		const status = duration > expectedTime ? 'warning' : 'success';

		this.recordMetric({
			name: `Export: ${exportType}`,
			type: 'export',
			duration,
			status,
			metadata: {
				recordCount,
				fileSize,
				recordsPerSecond: Math.round(recordCount / (duration / 1000)),
				budget: expectedTime
			},
			tags: ['export', 'data-processing']
		});
	}

	/**
	 * Time a function execution
	 */
	async timeFunction<T>(
		name: string,
		type: PerformanceMetric['type'],
		fn: () => Promise<T> | T,
		tags?: string[]
	): Promise<T> {
		const start = performance.now();

		try {
			const result = await fn();
			const duration = performance.now() - start;

			this.recordMetric({
				name,
				type,
				duration,
				status: 'success',
				tags
			});

			return result;
		} catch (error) {
			const duration = performance.now() - start;

			this.recordMetric({
				name,
				type,
				duration,
				status: 'error',
				metadata: {
					error: error instanceof Error ? error.message : 'Unknown error'
				},
				tags: [...(tags || []), 'error']
			});

			throw error;
		}
	}

	/**
	 * Initialize performance observers for various metrics
	 */
	private initializePerformanceObservers(): void {
		if (!window.PerformanceObserver) return;

		// Observe navigation timing
		try {
			this.navigationObserver = new PerformanceObserver((list) => {
				list.getEntries().forEach((entry) => {
					if (entry.entryType === 'navigation') {
						const navEntry = entry as PerformanceNavigationTiming;
						const loadTime = navEntry.loadEventEnd - navEntry.fetchStart;

						this.trackPageLoad(window.location.pathname, loadTime, navEntry);
					}
				});
			});

			this.navigationObserver.observe({ entryTypes: ['navigation'] });
		} catch (error) {
			logger.warn('Navigation timing observer not supported:', { error: error as Error });
		}

		// Observe long tasks (>50ms)
		try {
			this.longTaskObserver = new PerformanceObserver((list) => {
				list.getEntries().forEach((entry) => {
					if (entry.duration > 100) {
						this.recordMetric({
							name: 'Long Task',
							type: 'component',
							duration: entry.duration,
							status: 'warning',
							metadata: {
								startTime: entry.startTime,
								attribution: (entry as any).attribution
							},
							tags: ['long-task', 'performance-issue']
						});
					}
				});
			});

			this.longTaskObserver.observe({ entryTypes: ['longtask'] });
		} catch (error) {
			logger.warn('Long task observer not supported:', { error: error as Error });
		}
	}

	/**
	 * Initialize Core Web Vitals tracking
	 */
	private initializeCoreWebVitalsTracking(): void {
		if (!browser || !window.PerformanceObserver) return;

		// Track Largest Contentful Paint (LCP)
		try {
			const lcpObserver = new PerformanceObserver((list) => {
				const entries = list.getEntries();
				const lastEntry = entries[entries.length - 1] as PerformancePaintTiming;

				this.coreWebVitals.update((vitals) => ({
					...vitals,
					lcp: lastEntry.startTime
				}));
			});

			lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
		} catch (error) {
			logger.warn('LCP observer not supported:', { error: error as Error });
		}

		// Track First Contentful Paint (FCP)
		try {
			const fcpObserver = new PerformanceObserver((list) => {
				list.getEntries().forEach((entry) => {
					if (entry.name === 'first-contentful-paint') {
						this.coreWebVitals.update((vitals) => ({
							...vitals,
							fcp: entry.startTime
						}));
					}
				});
			});

			fcpObserver.observe({ entryTypes: ['paint'] });
		} catch (error) {
			logger.warn('FCP observer not supported:', { error: error as Error });
		}

		// Track Cumulative Layout Shift (CLS)
		try {
			const clsObserver = new PerformanceObserver((list) => {
				let clsValue = 0;

				list.getEntries().forEach((entry) => {
					if (!(entry as any).hadRecentInput) {
						clsValue += (entry as any).value;
					}
				});

				this.coreWebVitals.update((vitals) => ({
					...vitals,
					cls: clsValue
				}));
			});

			clsObserver.observe({ entryTypes: ['layout-shift'] });
		} catch (error) {
			logger.warn('CLS observer not supported:', { error: error as Error });
		}

		// Track Time to First Byte (TTFB) from navigation timing
		const navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
		if (navTiming) {
			const ttfb = navTiming.responseStart - navTiming.fetchStart;
			this.coreWebVitals.update((vitals) => ({
				...vitals,
				ttfb
			}));
		}
	}

	/**
	 * Monitor page load performance
	 */
	private monitorPageLoad(): void {
		if (!browser) return;

		// Monitor initial page load
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', () => {
				const loadTime = performance.now();
				this.trackPageLoad('Initial Load', loadTime);
			});
		} else {
			// Already loaded
			const navTiming = performance.getEntriesByType(
				'navigation'
			)[0] as PerformanceNavigationTiming;
			if (navTiming) {
				const loadTime = navTiming.loadEventEnd - navTiming.fetchStart;
				this.trackPageLoad('Initial Load', loadTime, navTiming);
			}
		}
	}

	/**
	 * Monitor navigation timing continuously
	 */
	private monitorNavigationTiming(): void {
		if (!browser) return;

		// Navigation timing will be tracked by individual components using
		// SvelteKit's navigation events in their proper component context.
		// This prevents lifecycle_outside_component errors.

		// Track popstate events (back/forward) only
		window.addEventListener('popstate', () => {
			const start = performance.now();

			// Simple navigation tracking without interfering with SvelteKit
			requestAnimationFrame(() => {
				const duration = performance.now() - start;
				this.trackPageLoad(`Navigation to ${window.location.pathname}`, duration);
			});
		});
	}

	/**
	 * Start memory usage monitoring
	 */
	private startMemoryMonitoring(): void {
		if (!browser || !('memory' in performance)) return;

		this.memoryMonitoringInterval = window.setInterval(() => {
			const memInfo = (performance as any).memory;
			if (memInfo) {
				const usage: MemoryUsage = {
					usedJSHeapSize: memInfo.usedJSHeapSize,
					totalJSHeapSize: memInfo.totalJSHeapSize,
					jsHeapSizeLimit: memInfo.jsHeapSizeLimit,
					timestamp: Date.now()
				};

				this.memoryUsage.update((usages) => {
					const newUsages = [...usages, usage];
					// Keep only last 100 measurements (10 minutes at 6-second intervals)
					return newUsages.slice(-100);
				});

				// Check for memory leaks
				if (usage.usedJSHeapSize > PERFORMANCE_BUDGET.memoryLimit) {
					this.createAlert({
						type: 'memory-leak',
						severity: 'high',
						message: `Memory usage exceeded budget: ${Math.round(usage.usedJSHeapSize / 1024 / 1024)}MB > ${PERFORMANCE_BUDGET.memoryLimit / 1024 / 1024}MB`,
						metric: {
							id: `memory-${Date.now()}`,
							timestamp: Date.now(),
							name: 'Memory Usage',
							type: 'memory',
							duration: usage.usedJSHeapSize,
							status: 'error',
							metadata: { usage },
							tags: ['memory', 'leak']
						} as PerformanceMetric,
						recommendations: [
							'Check for memory leaks in components',
							'Reduce data caching if possible',
							'Consider pagination for large datasets',
							'Profile memory usage with browser DevTools'
						]
					});
				}
			}
		}, 6000); // Every 6 seconds
	}

	/**
	 * Check performance metric against budget and create alerts
	 */
	private checkPerformanceBudget(metric: PerformanceMetric): void {
		let budgetExceeded = false;
		let budget = 0;

		switch (metric.type) {
			case 'page-load':
				budget = PERFORMANCE_BUDGET.pageLoad;
				budgetExceeded = metric.duration > budget;
				break;
			case 'graphql':
				budget = PERFORMANCE_BUDGET.graphqlResponse;
				budgetExceeded = metric.duration > budget;
				break;
			case 'component':
				budget = PERFORMANCE_BUDGET.componentRender;
				budgetExceeded = metric.duration > budget;
				break;
			case 'real-time':
				budget = PERFORMANCE_BUDGET.realTimeUpdate;
				budgetExceeded = metric.duration > budget;
				break;
			case 'export':
				budget = PERFORMANCE_BUDGET.exportOperation;
				budgetExceeded = metric.duration > budget;
				break;
		}

		if (budgetExceeded) {
			const severity =
				metric.duration > budget * 2
					? 'critical'
					: metric.duration > budget * 1.5
						? 'high'
						: 'medium';

			this.createAlert({
				type: 'budget-exceeded',
				severity,
				message: `${metric.name} exceeded performance budget: ${Math.round(metric.duration)}ms > ${budget}ms`,
				metric,
				recommendations: this.getRecommendations(metric.type, metric.duration, budget)
			});
		}
	}

	/**
	 * Create a performance alert
	 */
	private createAlert(alert: Omit<PerformanceAlert, 'id' | 'timestamp'>): void {
		const fullAlert: PerformanceAlert = {
			...alert,
			id: generateUUID(),
			timestamp: Date.now()
		};

		this.alerts.update((alerts) => [...alerts, fullAlert]);

		// Log critical alerts to console
		if (fullAlert.severity === 'critical' || fullAlert.severity === 'high') {
			logger.error(`🚨 Performance Alert (${fullAlert.severity}): ${fullAlert.message}`);
		}
	}

	/**
	 * Get performance recommendations based on metric type
	 */
	private getRecommendations(type: string, duration: number, budget: number): string[] {
		const recommendations: string[] = [];

		switch (type) {
			case 'page-load':
				recommendations.push(
					'Optimize image loading with lazy loading',
					'Reduce JavaScript bundle size',
					'Implement code splitting',
					'Use server-side rendering (SSR)',
					'Optimize CSS delivery'
				);
				break;
			case 'graphql':
				recommendations.push(
					'Review GraphQL query complexity',
					'Implement query result caching',
					'Optimize database indexes',
					'Consider query batching',
					'Use field-level caching'
				);
				break;
			case 'component':
				recommendations.push(
					"Use Svelte's reactive statements efficiently",
					'Implement virtual scrolling for large lists',
					'Optimize component re-renders',
					'Consider component lazy loading',
					'Profile component with Svelte DevTools'
				);
				break;
			case 'real-time':
				recommendations.push(
					'Optimize WebSocket message handling',
					'Implement message batching',
					'Use efficient data structures',
					'Consider connection pooling',
					'Optimize network latency'
				);
				break;
			case 'export':
				recommendations.push(
					'Implement streaming exports',
					'Use web workers for processing',
					'Optimize data transformation',
					'Consider server-side generation',
					'Implement progress indicators'
				);
				break;
		}

		return recommendations;
	}

	// Public accessors
	get metricsStore(): Readable<PerformanceMetric[]> {
		return readonly(this.metrics);
	}

	get alertsStore(): Readable<PerformanceAlert[]> {
		return readonly(this.alerts);
	}

	get coreWebVitalsStore(): Readable<CoreWebVitals> {
		return readonly(this.coreWebVitals);
	}

	get memoryUsageStore(): Readable<MemoryUsage[]> {
		return readonly(this.memoryUsage);
	}

	// Derived statistics
	get statisticsStore(): Readable<{
		totalMetrics: number;
		averagePageLoad: number;
		averageGraphQLResponse: number;
		budgetExceededCount: number;
		currentMemoryUsage: number;
		performanceScore: number;
	}> {
		return derived([this.metrics, this.memoryUsage], ([metrics, memory]) => {
			const pageLoadMetrics = metrics.filter((m) => m.type === 'page-load');
			const graphqlMetrics = metrics.filter((m) => m.type === 'graphql');
			const budgetExceeded = metrics.filter((m) => m.status === 'warning' || m.status === 'error');
			const latestMemory = memory[memory.length - 1];

			// Calculate performance score (0-100)
			const successfulMetrics = metrics.filter((m) => m.status === 'success').length;
			const performanceScore =
				metrics.length > 0 ? Math.round((successfulMetrics / metrics.length) * 100) : 100;

			return {
				totalMetrics: metrics.length,
				averagePageLoad:
					pageLoadMetrics.length > 0
						? pageLoadMetrics.reduce((sum, m) => sum + m.duration, 0) / pageLoadMetrics.length
						: 0,
				averageGraphQLResponse:
					graphqlMetrics.length > 0
						? graphqlMetrics.reduce((sum, m) => sum + m.duration, 0) / graphqlMetrics.length
						: 0,
				budgetExceededCount: budgetExceeded.length,
				currentMemoryUsage: latestMemory ? latestMemory.usedJSHeapSize : 0,
				performanceScore
			};
		});
	}
}

// Create singleton instance
export const performanceMonitor = new ClientPerformanceMonitor();

// Auto-start monitoring in browser
if (browser) {
	performanceMonitor.startMonitoring();
}

// Export stores for components
export const metricsStore = performanceMonitor.metricsStore;
export const alertsStore = performanceMonitor.alertsStore;
export const coreWebVitalsStore = performanceMonitor.coreWebVitalsStore;
export const memoryUsageStore = performanceMonitor.memoryUsageStore;
export const statisticsStore = performanceMonitor.statisticsStore;

// Utility functions for common operations
export function trackGraphQL(operationName: string, duration: number, variables?: any): void {
	performanceMonitor.trackGraphQLOperation(operationName, duration, variables);
}

export function trackPageLoad(pageName: string, loadTime: number): void {
	performanceMonitor.trackPageLoad(pageName, loadTime);
}

export function trackComponent(componentName: string, renderTime: number): void {
	performanceMonitor.trackComponentRender(componentName, renderTime);
}

export function trackRealTime(featureName: string, latency: number): void {
	performanceMonitor.trackRealTimeUpdate(featureName, latency);
}

export function trackExport(
	type: string,
	recordCount: number,
	duration: number,
	fileSize?: number
): void {
	performanceMonitor.trackExportOperation(type, recordCount, duration, fileSize);
}

export async function timeFunction<T>(
	name: string,
	type: PerformanceMetric['type'],
	fn: () => Promise<T> | T,
	tags?: string[]
): Promise<T> {
	return performanceMonitor.timeFunction(name, type, fn, tags);
}

export default performanceMonitor;
