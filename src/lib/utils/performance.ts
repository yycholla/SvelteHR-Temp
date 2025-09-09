/**
 * Performance optimization utilities
 * Provides lazy loading, code splitting, and performance monitoring
 */

/**
 * Lazy load a component with loading fallback
 */
export function lazyLoad<T>(
	componentLoader: () => Promise<T>,
	loadingComponent?: any
) {
	return {
		component: componentLoader,
		loading: loadingComponent
	};
}

/**
 * Dynamic import with error handling
 */
export async function dynamicImport<T>(
	importFn: () => Promise<T>,
	fallback?: T
): Promise<T> {
	try {
		return await importFn();
	} catch (error) {
		console.error('Dynamic import failed:', error);
		if (fallback) {
			return fallback;
		}
		throw error;
	}
}

/**
 * Intersection Observer for lazy loading elements
 */
export function createIntersectionObserver(
	callback: (entries: IntersectionObserverEntry[]) => void,
	options: IntersectionObserverInit = {}
): IntersectionObserver {
	const defaultOptions: IntersectionObserverInit = {
		root: null,
		rootMargin: '50px',
		threshold: 0.1,
		...options
	};

	return new IntersectionObserver(callback, defaultOptions);
}

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: any[]) => any>(
	func: T,
	wait: number
): (...args: Parameters<T>) => void {
	let timeout: ReturnType<typeof setTimeout>;
	
	return function executedFunction(...args: Parameters<T>) {
		const later = () => {
			clearTimeout(timeout);
			func(...args);
		};
		
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
	};
}

/**
 * Throttle function for performance optimization
 */
export function throttle<T extends (...args: any[]) => any>(
	func: T,
	limit: number
): (...args: Parameters<T>) => void {
	let inThrottle: boolean;
	
	return function executedFunction(...args: Parameters<T>) {
		if (!inThrottle) {
			func.apply(this, args);
			inThrottle = true;
			setTimeout(() => (inThrottle = false), limit);
		}
	};
}

/**
 * Virtual scrolling utility for large lists
 */
export class VirtualScroller {
	private container: HTMLElement;
	private itemHeight: number;
	private items: any[];
	private visibleStart: number = 0;
	private visibleEnd: number = 0;
	private scrollTop: number = 0;

	constructor(
		container: HTMLElement,
		items: any[],
		itemHeight: number
	) {
		this.container = container;
		this.items = items;
		this.itemHeight = itemHeight;
		this.calculateVisible();
	}

	private calculateVisible() {
		const containerHeight = this.container.clientHeight;
		const visibleCount = Math.ceil(containerHeight / this.itemHeight);
		const startIndex = Math.floor(this.scrollTop / this.itemHeight);
		
		this.visibleStart = Math.max(0, startIndex - 5); // Buffer
		this.visibleEnd = Math.min(
			this.items.length,
			startIndex + visibleCount + 5
		);
	}

	public getVisibleItems() {
		return {
			items: this.items.slice(this.visibleStart, this.visibleEnd),
			startIndex: this.visibleStart,
			offsetY: this.visibleStart * this.itemHeight
		};
	}

	public updateScrollPosition(scrollTop: number) {
		this.scrollTop = scrollTop;
		this.calculateVisible();
	}

	public getTotalHeight() {
		return this.items.length * this.itemHeight;
	}
}

/**
 * Image lazy loading utility
 */
export function lazyLoadImage(
	img: HTMLImageElement,
	src: string,
	placeholder?: string
) {
	if (placeholder) {
		img.src = placeholder;
	}

	const observer = createIntersectionObserver(
		(entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) {
					img.src = src;
					img.onload = () => {
						img.classList.add('loaded');
					};
					observer.unobserve(img);
				}
			});
		},
		{ threshold: 0.1 }
	);

	observer.observe(img);
}

/**
 * Preload critical resources
 */
export function preloadResource(href: string, as: string): void {
	const link = document.createElement('link');
	link.rel = 'preload';
	link.href = href;
	link.as = as;
	document.head.appendChild(link);
}

/**
 * Web Vitals monitoring
 */
export interface WebVitalsMetrics {
	CLS?: number;
	FID?: number;
	FCP?: number;
	LCP?: number;
	TTFB?: number;
}

export function measureWebVitals(): Promise<WebVitalsMetrics> {
	return new Promise((resolve) => {
		const metrics: WebVitalsMetrics = {};

		// Core Web Vitals measurements
		if ('PerformanceObserver' in window) {
			// Largest Contentful Paint (LCP)
			const lcpObserver = new PerformanceObserver((entryList) => {
				const entries = entryList.getEntries();
				const lastEntry = entries[entries.length - 1] as any;
				metrics.LCP = lastEntry.startTime;
			});

			try {
				lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
			} catch (e) {
				// LCP not supported
			}

			// First Input Delay (FID)
			const fidObserver = new PerformanceObserver((entryList) => {
				const entries = entryList.getEntries();
				entries.forEach((entry: any) => {
					metrics.FID = entry.processingStart - entry.startTime;
				});
			});

			try {
				fidObserver.observe({ entryTypes: ['first-input'] });
			} catch (e) {
				// FID not supported
			}

			// Cumulative Layout Shift (CLS)
			const clsObserver = new PerformanceObserver((entryList) => {
				let clsValue = 0;
				entryList.getEntries().forEach((entry: any) => {
					if (!entry.hadRecentInput) {
						clsValue += entry.value;
					}
				});
				metrics.CLS = clsValue;
			});

			try {
				clsObserver.observe({ entryTypes: ['layout-shift'] });
			} catch (e) {
				// CLS not supported
			}
		}

		// Navigation timing metrics
		if ('performance' in window && window.performance.timing) {
			const timing = window.performance.timing;
			metrics.TTFB = timing.responseStart - timing.requestStart;
			metrics.FCP = timing.loadEventEnd - timing.navigationStart;
		}

		// Resolve after a delay to collect metrics
		setTimeout(() => resolve(metrics), 2000);
	});
}

/**
 * Bundle size analyzer helper
 */
export function analyzeBundleSize(): void {
	if (typeof window !== 'undefined' && 'performance' in window) {
		const resources = performance.getEntriesByType('resource');
		
		console.group('📦 Bundle Analysis');
		resources
			.filter((resource) => 
				resource.name.includes('.js') || 
				resource.name.includes('.css')
			)
			.forEach((resource) => {
				console.log(
					`${resource.name.split('/').pop()}: ${(
						(resource as any).transferSize / 1024
					).toFixed(2)}KB`
				);
			});
		console.groupEnd();
	}
}

/**
 * Memory usage monitoring
 */
export function getMemoryUsage(): any {
	if ('memory' in performance) {
		return {
			used: Math.round((performance as any).memory.usedJSHeapSize / 1048576),
			total: Math.round((performance as any).memory.totalJSHeapSize / 1048576),
			limit: Math.round((performance as any).memory.jsHeapSizeLimit / 1048576)
		};
	}
	return null;
}

/**
 * Critical CSS inlining helper
 */
export function inlineCriticalCSS(css: string): void {
	const style = document.createElement('style');
	style.textContent = css;
	document.head.appendChild(style);
}

/**
 * Service Worker registration with performance caching
 */
export async function registerServiceWorker(
	swUrl: string = '/service-worker.js'
): Promise<boolean> {
	if ('serviceWorker' in navigator) {
		try {
			const registration = await navigator.serviceWorker.register(swUrl);
			console.log('Service Worker registered:', registration);
			
			// Handle updates
			registration.addEventListener('updatefound', () => {
				const newWorker = registration.installing;
				if (newWorker) {
					newWorker.addEventListener('statechange', () => {
						if (newWorker.state === 'installed') {
							// New content available
							console.log('New content available, refresh to update');
						}
					});
				}
			});
			
			return true;
		} catch (error) {
			console.error('Service Worker registration failed:', error);
			return false;
		}
	}
	return false;
}

/**
 * Font loading optimization
 */
export function optimizeFontLoading(fonts: string[]): void {
	fonts.forEach((font) => {
		const link = document.createElement('link');
		link.rel = 'preload';
		link.href = font;
		link.as = 'font';
		link.type = 'font/woff2';
		link.crossOrigin = 'anonymous';
		document.head.appendChild(link);
	});
}