import { browser } from '$app/environment';
import { derived, readonly, writable } from 'svelte/store';
import type { Readable, Writable } from 'svelte/store';
import { logger } from '$lib/utils/logger';
import type {
	CoreWebVitals,
	MemoryUsage,
	PerformanceAlert,
	PerformanceMetric
} from './types';
import { PERFORMANCE_BUDGET } from './config';
import { generateUUID, getRecommendations } from './utils';
import { initializeCoreWebVitalsTracking, initializePerformanceObservers } from './observers';
import { startMemoryMonitoring } from './memory';

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
			const { navigationObserver, longTaskObserver } = initializePerformanceObservers(
				(path, duration, entry) => this.trackPageLoad(path, duration, entry),
				(metric) => this.recordMetric(metric)
			);
			this.navigationObserver = navigationObserver;
			this.longTaskObserver = longTaskObserver;

			initializeCoreWebVitalsTracking((updater) => this.coreWebVitals.update(updater));
			this.memoryMonitoringInterval = startMemoryMonitoring(
				(updater) => this.memoryUsage.update(updater),
				(alert) => this.createAlert(alert)
			);
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
		
		// Memory monitoring already started in constructor if browser, but interval might need reset if stopped
		if (!this.memoryMonitoringInterval) {
			this.memoryMonitoringInterval = startMemoryMonitoring(
				(updater) => this.memoryUsage.update(updater),
				(alert) => this.createAlert(alert)
			);
		}
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
			this.memoryMonitoringInterval = undefined;
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
				recommendations: getRecommendations(metric.type, metric.duration, budget)
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

export default ClientPerformanceMonitor;
