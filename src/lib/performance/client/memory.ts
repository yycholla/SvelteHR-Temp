import { browser } from '$app/environment';
import { PERFORMANCE_BUDGET } from './config';
import type { MemoryUsage, PerformanceMetric, PerformanceAlert } from './types';

/**
 * Start memory usage monitoring
 */
export function startMemoryMonitoring(
	updateMemory: (updater: (usages: MemoryUsage[]) => MemoryUsage[]) => void,
	createAlert: (alert: Omit<PerformanceAlert, 'id' | 'timestamp'>) => void
): number | undefined {
	if (!browser || !('memory' in performance)) return;

	return window.setInterval(() => {
		const memInfo = (performance as any).memory;
		if (memInfo) {
			const usage: MemoryUsage = {
				usedJSHeapSize: memInfo.usedJSHeapSize,
				totalJSHeapSize: memInfo.totalJSHeapSize,
				jsHeapSizeLimit: memInfo.jsHeapSizeLimit,
				timestamp: Date.now()
			};

			updateMemory((usages) => {
				const newUsages = [...usages, usage];
				// Keep only last 100 measurements (10 minutes at 6-second intervals)
				return newUsages.slice(-100);
			});

			// Check for memory leaks
			if (usage.usedJSHeapSize > PERFORMANCE_BUDGET.memoryLimit) {
				createAlert({
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
