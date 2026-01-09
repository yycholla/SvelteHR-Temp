import { logger } from '$lib/utils/logger';
import type { PerformanceMetric, CoreWebVitals } from './types';

/**
 * Initialize performance observers for various metrics
 */
export function initializePerformanceObservers(
	trackPageLoad: (path: string, duration: number, entry: PerformanceNavigationTiming) => void,
	recordMetric: (metric: Omit<PerformanceMetric, 'id' | 'timestamp'>) => void
): {
	navigationObserver?: PerformanceObserver;
	longTaskObserver?: PerformanceObserver;
} {
	let navigationObserver: PerformanceObserver | undefined;
	let longTaskObserver: PerformanceObserver | undefined;

	if (typeof window === 'undefined' || !window.PerformanceObserver) return {};

	// Observe navigation timing
	try {
		navigationObserver = new PerformanceObserver((list) => {
			list.getEntries().forEach((entry) => {
				if (entry.entryType === 'navigation') {
					const navEntry = entry as PerformanceNavigationTiming;
					const loadTime = navEntry.loadEventEnd - navEntry.fetchStart;

					trackPageLoad(window.location.pathname, loadTime, navEntry);
				}
			});
		});

		navigationObserver.observe({ entryTypes: ['navigation'] });
	} catch (error) {
		logger.warn('Navigation timing observer not supported:', { error: error as Error });
	}

	// Observe long tasks (>50ms)
	try {
		longTaskObserver = new PerformanceObserver((list) => {
			list.getEntries().forEach((entry) => {
				if (entry.duration > 100) {
					recordMetric({
						name: 'Long Task',
						type: 'component',
						duration: entry.duration,
						status: 'warning',
						metadata: {
							startTime: entry.startTime,
							attribution: (entry as any).attribution
						},
						tags: ['long-task', 'performance-issue']
					} as any);
				}
			});
		});

		longTaskObserver.observe({ entryTypes: ['longtask'] });
	} catch (error) {
		logger.warn('Long task observer not supported:', { error: error as Error });
	}

	return { navigationObserver, longTaskObserver };
}

/**
 * Initialize Core Web Vitals tracking
 */
export function initializeCoreWebVitalsTracking(
	updateVitals: (updater: (vitals: CoreWebVitals) => CoreWebVitals) => void
): void {
	if (typeof window === 'undefined' || !window.PerformanceObserver) return;

	// Track Largest Contentful Paint (LCP)
	try {
		const lcpObserver = new PerformanceObserver((list) => {
			const entries = list.getEntries();
			const lastEntry = entries[entries.length - 1] as PerformancePaintTiming;

			updateVitals((vitals) => ({
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
					updateVitals((vitals) => ({
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

			updateVitals((vitals) => ({
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
		updateVitals((vitals) => ({
			...vitals,
			ttfb
		}));
	}
}
