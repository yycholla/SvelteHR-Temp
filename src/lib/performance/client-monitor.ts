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
 * Refactored: Moved to src/lib/performance/client/
 */

import { browser } from '$app/environment';
import ClientPerformanceMonitor from './client/monitor';
import type { PerformanceMetric } from './client/types';

// Export types
export * from './client/types';
export * from './client/config';
export * from './client/utils';
export * from './client/observers';
export * from './client/memory';
export * from './client/monitor';

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