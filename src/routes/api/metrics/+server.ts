import { json } from '@sveltejs/kit';
import { serverPerformanceMonitor } from '$lib/performance/server-monitor.js';
import { logger } from '$lib/utils/logger.js';
import type { RequestEvent } from '@sveltejs/kit';

export async function GET({ locals }: RequestEvent) {
	try {
		const metrics = {
			performance: {
				statistics: serverPerformanceMonitor.getStatistics(),
				recentMetrics: serverPerformanceMonitor.getRecentMetrics(20)
			},
			system: {
				uptime: process.uptime(),
				memory: process.memoryUsage(),
				pid: process.pid,
				nodeVersion: process.version,
				platform: process.platform,
				architecture: process.arch
			},
			timestamp: new Date().toISOString(),
			requestId: locals.requestId
		};

		logger.info('Metrics requested', {
			requestId: locals.requestId,
			recentMetricsCount: metrics.performance.recentMetrics.length
		});

		return json(metrics, {
			headers: {
				'X-Request-ID': locals.requestId || 'unknown',
				'Cache-Control': 'no-cache, no-store, must-revalidate'
			}
		});
	} catch (error) {
		logger.error('Metrics endpoint failed', error as Error, {
			requestId: locals.requestId
		});

		return json(
			{
				error: 'Failed to retrieve metrics',
				timestamp: new Date().toISOString()
			},
			{ status: 500 }
		);
	}
}
