/**
 * Prometheus Metrics Endpoint
 *
 * Exposes application metrics in Prometheus text format for scraping.
 * This endpoint is unauthenticated and only accessible within the cluster.
 */

import { text } from '@sveltejs/kit';
import { serverPerformanceMonitor } from '$lib/performance/server-monitor.js';
import type { RequestEvent } from '@sveltejs/kit';

export async function GET({ locals }: RequestEvent) {
	try {
		const stats = serverPerformanceMonitor.getStatistics();
		const memUsage = process.memoryUsage();

		// Prometheus text format metrics
		const metrics = [
			// Help and type declarations
			'# HELP nodejs_process_uptime_seconds Node.js process uptime in seconds',
			'# TYPE nodejs_process_uptime_seconds gauge',
			`nodejs_process_uptime_seconds ${process.uptime()}`,
			'',

			'# HELP nodejs_memory_heap_used_bytes Heap memory used in bytes',
			'# TYPE nodejs_memory_heap_used_bytes gauge',
			`nodejs_memory_heap_used_bytes ${memUsage.heapUsed}`,
			'',

			'# HELP nodejs_memory_heap_total_bytes Total heap memory in bytes',
			'# TYPE nodejs_memory_heap_total_bytes gauge',
			`nodejs_memory_heap_total_bytes ${memUsage.heapTotal}`,
			'',

			'# HELP nodejs_memory_rss_bytes Resident set size in bytes',
			'# TYPE nodejs_memory_rss_bytes gauge',
			`nodejs_memory_rss_bytes ${memUsage.rss}`,
			'',

			'# HELP nodejs_memory_external_bytes External memory in bytes',
			'# TYPE nodejs_memory_external_bytes gauge',
			`nodejs_memory_external_bytes ${memUsage.external}`,
			'',

			'# HELP http_requests_total Total HTTP requests',
			'# TYPE http_requests_total counter',
			`http_requests_total ${stats.totalRequests}`,
			'',

			'# HELP http_request_duration_seconds HTTP request duration in seconds',
			'# TYPE http_request_duration_seconds summary',
			`http_request_duration_seconds{quantile="0.5"} ${stats.medianResponseTime / 1000}`,
			`http_request_duration_seconds{quantile="0.95"} ${stats.percentile95 / 1000}`,
			`http_request_duration_seconds{quantile="0.99"} ${stats.percentile99 / 1000}`,
			`http_request_duration_seconds_sum ${(stats.totalRequests * stats.avgResponseTime) / 1000}`,
			`http_request_duration_seconds_count ${stats.totalRequests}`,
			'',

			'# HELP http_errors_total Total HTTP errors',
			'# TYPE http_errors_total counter',
			`http_errors_total ${stats.errorCount}`,
			'',

			'# HELP http_error_rate Error rate (errors per request)',
			'# TYPE http_error_rate gauge',
			`http_error_rate ${stats.errorRate}`,
			''
		];

		return text(metrics.join('\n'), {
			headers: {
				'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
				'Cache-Control': 'no-cache, no-store, must-revalidate'
			}
		});
	} catch (error) {
		// Return minimal metrics on error
		const errorMetrics = [
			'# HELP nodejs_process_uptime_seconds Node.js process uptime in seconds',
			'# TYPE nodejs_process_uptime_seconds gauge',
			`nodejs_process_uptime_seconds ${process.uptime()}`,
			'',
			'# HELP scrape_error Metrics scrape error',
			'# TYPE scrape_error gauge',
			'scrape_error 1'
		];

		return text(errorMetrics.join('\n'), {
			status: 500,
			headers: {
				'Content-Type': 'text/plain; version=0.0.4; charset=utf-8'
			}
		});
	}
}
