import { writable } from 'svelte/store';
import type {
	PerformanceMetric,
	UserMetric,
	SystemMetric,
	CustomMetric,
	MetricsConfig
} from '$lib/types';

// Stores for metrics
export const performanceMetrics = writable<PerformanceMetric[]>([]);
export const userMetrics = writable<UserMetric[]>([]);
export const systemMetrics = writable<SystemMetric[]>([]);
export const customMetrics = writable<CustomMetric[]>([]);
export const isCollectingMetrics = writable(true);

interface NavigationTiming {
	startTime: number;
	endTime: number;
	duration: number;
	route: string;
	method: string;
}

class MetricsService {
	private config: MetricsConfig = {
		enabled: false, // Disabled during PostGraphile migration
		sampleRate: 1.0, // 100% sampling by default
		maxBufferSize: 1000,
		batchSize: 50,
		flushInterval: 30000, // 30 seconds
		endpoint: '/api/metrics'
	};

	private buffer: any[] = [];
	private flushTimer: NodeJS.Timeout | null = null;

	constructor() {
		this.initializeMetricsCollection();
	}

	// Initialize metrics collection
	private initializeMetricsCollection() {
		if (typeof window === 'undefined') return;

		// Performance Observer for navigation timing
		if ('PerformanceObserver' in window) {
			const observer = new PerformanceObserver((list) => {
				for (const entry of list.getEntries()) {
					this.trackPerformanceEntry(entry);
				}
			});

			observer.observe({
				entryTypes: ['navigation', 'measure', 'mark', 'resource']
			});
		}

		// Web Vitals tracking
		this.initializeWebVitals();

		// Start automatic flushing
		this.startAutoFlush();
	}

	// Initialize Web Vitals tracking
	private initializeWebVitals() {
		if (typeof window === 'undefined') return;

		// Largest Contentful Paint (LCP)
		const observer = new PerformanceObserver((list) => {
			const entries = list.getEntries();
			const lastEntry = entries[entries.length - 1];

			this.trackMetric({
				name: 'web_vitals_lcp',
				value: lastEntry.startTime,
				timestamp: Date.now(),
				tags: { metric_type: 'web_vital' },
				metadata: { url: window.location.href }
			});
		});

		if ('largest-contentful-paint' in PerformanceObserver.supportedEntryTypes) {
			observer.observe({ type: 'largest-contentful-paint', buffered: true });
		}

		// First Input Delay (FID) approximation using event timing
		let firstInputProcessed = false;
		const handleFirstInput = (event: Event) => {
			if (firstInputProcessed) return;
			firstInputProcessed = true;

			const eventTime = event.timeStamp;
			const processingStart = performance.now();
			const delay = processingStart - eventTime;

			this.trackMetric({
				name: 'web_vitals_fid',
				value: delay,
				timestamp: Date.now(),
				tags: { metric_type: 'web_vital' },
				metadata: {
					eventType: event.type,
					url: window.location.href
				}
			});

			// Remove listeners after first input
			window.removeEventListener('click', handleFirstInput);
			window.removeEventListener('keydown', handleFirstInput);
		};

		window.addEventListener('click', handleFirstInput);
		window.addEventListener('keydown', handleFirstInput);
	}

	// Track custom metric
	trackMetric(metric: Partial<PerformanceMetric>) {
		if (!this.config.enabled || Math.random() > this.config.sampleRate) return;

		const fullMetric: PerformanceMetric = {
			id: crypto.randomUUID(),
			name: metric.name || 'unknown',
			value: metric.value || 0,
			timestamp: metric.timestamp || Date.now(),
			tags: metric.tags || {},
			metadata: metric.metadata || {},
			sessionId: this.getSessionId(),
			userId: this.getCurrentUserId()
		};

		this.addToBuffer(fullMetric);

		// Update store
		performanceMetrics.update((metrics) => [...metrics, fullMetric]);
	}

	// Track navigation timing
	trackNavigation(route: string, duration: number, method: 'route' | 'link' | 'browser' = 'route') {
		this.trackMetric({
			name: 'navigation_timing',
			value: duration,
			tags: {
				route,
				method,
				metric_type: 'navigation'
			},
			metadata: {
				userAgent: navigator.userAgent,
				connectionType: this.getConnectionType()
			}
		});
	}

	// Track GraphQL query performance
	trackGraphQLQuery(operationName: string, duration: number, variables?: any, errors?: any[]) {
		this.trackMetric({
			name: 'graphql_query',
			value: duration,
			tags: {
				operation: operationName,
				metric_type: 'graphql',
				has_errors: errors && errors.length > 0 ? 'true' : 'false'
			},
			metadata: {
				variables: variables || {},
				errorCount: errors?.length || 0,
				errors: errors?.map((e) => e.message) || []
			}
		});
	}

	// Track user interaction
	trackUserInteraction(action: string, component: string, duration?: number, metadata?: any) {
		this.trackMetric({
			name: 'user_interaction',
			value: duration || 0,
			tags: {
				action,
				component,
				metric_type: 'interaction'
			},
			metadata: metadata || {}
		});
	}

	// Track page load performance
	trackPageLoad(route: string) {
		if (typeof window === 'undefined') return;

		const timing = performance.timing;
		const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

		if (navigation) {
			// Track various timing metrics
			this.trackMetric({
				name: 'page_load_complete',
				value: navigation.loadEventEnd - navigation.fetchStart,
				tags: { route, metric_type: 'page_load' },
				metadata: {
					domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
					firstPaint: this.getFirstPaintTime(),
					firstContentfulPaint: this.getFirstContentfulPaintTime(),
					redirectCount: navigation.redirectCount,
					transferSize: navigation.transferSize,
					encodedBodySize: navigation.encodedBodySize,
					decodedBodySize: navigation.decodedBodySize
				}
			});
		}
	}

	// Track error occurrences
	trackError(error: Error, context?: string, metadata?: any) {
		this.trackMetric({
			name: 'error_occurrence',
			value: 1,
			tags: {
				error_type: error.name,
				context: context || 'unknown',
				metric_type: 'error'
			},
			metadata: {
				message: error.message,
				stack: error.stack,
				url: window.location.href,
				userAgent: navigator.userAgent,
				...metadata
			}
		});
	}

	// Track API response times
	trackAPIResponse(
		endpoint: string,
		method: string,
		status: number,
		duration: number,
		size?: number
	) {
		this.trackMetric({
			name: 'api_response',
			value: duration,
			tags: {
				endpoint,
				method,
				status: status.toString(),
				metric_type: 'api'
			},
			metadata: {
				responseSize: size || 0,
				success: status >= 200 && status < 300
			}
		});
	}

	// Track custom business metrics
	trackBusinessMetric(name: string, value: number, tags?: Record<string, string>, metadata?: any) {
		this.trackMetric({
			name,
			value,
			tags: {
				...tags,
				metric_type: 'business'
			},
			metadata
		});
	}

	// Performance entry handler
	private trackPerformanceEntry(entry: PerformanceEntry) {
		switch (entry.entryType) {
			case 'navigation':
				const navEntry = entry as PerformanceNavigationTiming;
				this.trackMetric({
					name: 'performance_navigation',
					value: navEntry.duration,
					tags: { metric_type: 'performance' },
					metadata: {
						redirectCount: navEntry.redirectCount,
						type: navEntry.type,
						transferSize: navEntry.transferSize
					}
				});
				break;

			case 'resource':
				const resEntry = entry as PerformanceResourceTiming;
				if (resEntry.name.includes('/api/') || resEntry.name.includes('graphql')) {
					this.trackMetric({
						name: 'resource_timing',
						value: resEntry.duration,
						tags: {
							resource_type: resEntry.initiatorType,
							metric_type: 'resource'
						},
						metadata: {
							name: resEntry.name,
							transferSize: resEntry.transferSize,
							encodedBodySize: resEntry.encodedBodySize
						}
					});
				}
				break;

			case 'measure':
				this.trackMetric({
					name: 'custom_measure',
					value: entry.duration,
					tags: {
						measure_name: entry.name,
						metric_type: 'measure'
					}
				});
				break;
		}
	}

	// Helper methods
	private getSessionId(): string {
		if (typeof window === 'undefined') return 'server';

		let sessionId = sessionStorage.getItem('metrics_session_id');
		if (!sessionId) {
			sessionId = crypto.randomUUID();
			sessionStorage.setItem('metrics_session_id', sessionId);
		}
		return sessionId;
	}

	private getCurrentUserId(): string | null {
		// This would integrate with your auth system
		return null; // Placeholder
	}

	private getConnectionType(): string {
		if (typeof window === 'undefined') return 'unknown';

		// @ts-ignore - Navigator.connection is not standard
		const connection =
			navigator.connection || navigator.mozConnection || navigator.webkitConnection;
		return connection?.effectiveType || 'unknown';
	}

	private getFirstPaintTime(): number {
		if (typeof window === 'undefined') return 0;

		const paintEntry = performance
			.getEntriesByType('paint')
			.find((entry) => entry.name === 'first-paint') as PerformancePaintTiming;
		return paintEntry?.startTime || 0;
	}

	private getFirstContentfulPaintTime(): number {
		if (typeof window === 'undefined') return 0;

		const paintEntry = performance
			.getEntriesByType('paint')
			.find((entry) => entry.name === 'first-contentful-paint') as PerformancePaintTiming;
		return paintEntry?.startTime || 0;
	}

	// Buffer management
	private addToBuffer(metric: PerformanceMetric) {
		this.buffer.push(metric);

		if (this.buffer.length >= this.config.maxBufferSize) {
			this.flush();
		}
	}

	private startAutoFlush() {
		if (this.flushTimer) {
			clearInterval(this.flushTimer);
		}

		this.flushTimer = setInterval(() => {
			this.flush();
		}, this.config.flushInterval);
	}

	// Flush metrics to server
	async flush() {
		if (this.buffer.length === 0) return;

		const batch = this.buffer.splice(0, this.config.batchSize);

		try {
			await fetch(this.config.endpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					metrics: batch,
					timestamp: Date.now(),
					sessionId: this.getSessionId()
				})
			});
		} catch (error) {
			console.error('Failed to send metrics:', error);
			// Put metrics back in buffer to retry
			this.buffer.unshift(...batch);
		}
	}

	// Configuration methods
	configure(config: Partial<MetricsConfig>) {
		this.config = { ...this.config, ...config };

		if (config.flushInterval) {
			this.startAutoFlush();
		}
	}

	enable() {
		this.config.enabled = true;
		isCollectingMetrics.set(true);
	}

	disable() {
		this.config.enabled = false;
		isCollectingMetrics.set(false);
	}

	// Mark custom performance markers
	mark(name: string) {
		if (typeof window !== 'undefined' && 'performance' in window) {
			performance.mark(name);
		}
	}

	// Measure between markers
	measure(name: string, startMark?: string, endMark?: string) {
		if (typeof window !== 'undefined' && 'performance' in window) {
			if (startMark && endMark) {
				performance.measure(name, startMark, endMark);
			} else if (startMark) {
				performance.measure(name, startMark);
			} else {
				performance.measure(name);
			}
		}
	}

	// Get current metrics summary
	getMetricsSummary() {
		return {
			totalMetrics: this.buffer.length,
			sessionId: this.getSessionId(),
			isEnabled: this.config.enabled,
			bufferSize: this.buffer.length,
			config: this.config
		};
	}

	// Clear all metrics
	clearMetrics() {
		this.buffer = [];
		performanceMetrics.set([]);
		userMetrics.set([]);
		systemMetrics.set([]);
		customMetrics.set([]);
	}

	// Cleanup on destroy
	destroy() {
		if (this.flushTimer) {
			clearInterval(this.flushTimer);
		}
		this.flush(); // Final flush
	}
}

export const metricsService = new MetricsService();

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
	window.addEventListener('beforeunload', () => {
		metricsService.destroy();
	});

	// Track unhandled errors
	window.addEventListener('error', (event) => {
		metricsService.trackError(new Error(event.message), 'unhandled_error', {
			filename: event.filename,
			lineno: event.lineno,
			colno: event.colno
		});
	});

	// Track unhandled promise rejections
	window.addEventListener('unhandledrejection', (event) => {
		metricsService.trackError(new Error(event.reason), 'unhandled_promise_rejection');
	});
}
