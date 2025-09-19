import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Metrics Collection API
 * Receives and processes frontend performance metrics
 */

interface MetricsBatch {
	metrics: PerformanceMetric[];
	timestamp: number;
	sessionId: string;
}

interface PerformanceMetric {
	id: string;
	name: string;
	value: number;
	timestamp: number;
	tags: Record<string, string>;
	metadata: Record<string, any>;
	sessionId: string;
	userId?: string | null;
}

// In-memory storage for development (replace with proper DB in production)
const metricsStore: PerformanceMetric[] = [];
const sessionMetrics = new Map<string, PerformanceMetric[]>();

// Aggregated metrics cache
let metricsCache: any = null;
let cacheLastUpdated = 0;
const CACHE_TTL = 30000; // 30 seconds

export const POST: RequestHandler = async ({ request }) => {
	try {
		const batch: MetricsBatch = await request.json();

		if (!batch.metrics || !Array.isArray(batch.metrics)) {
			return json({ error: 'Invalid metrics data' }, { status: 400 });
		}

		// Validate and process metrics
		const processedMetrics = batch.metrics
			.filter((metric) => isValidMetric(metric))
			.map((metric) => ({
				...metric,
				receivedAt: Date.now(),
				userAgent: request.headers.get('user-agent') || 'unknown',
				ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
			}));

		// Store metrics
		metricsStore.push(...processedMetrics);

		// Update session-specific metrics
		const sessionMetricsList = sessionMetrics.get(batch.sessionId) || [];
		sessionMetricsList.push(...processedMetrics);
		sessionMetrics.set(batch.sessionId, sessionMetricsList);

		// Clean up old sessions (keep last 1000 sessions)
		if (sessionMetrics.size > 1000) {
			const oldestSession = sessionMetrics.keys().next().value;
			sessionMetrics.delete(oldestSession);
		}

		// Invalidate cache
		metricsCache = null;

		// Log important metrics for monitoring
		logCriticalMetrics(processedMetrics);

		return json({
			success: true,
			processed: processedMetrics.length,
			timestamp: Date.now()
		});
	} catch (error) {
		console.error('Metrics processing error:', error);
		return json(
			{
				error: 'Internal server error',
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

export const GET: RequestHandler = async ({ url }) => {
	try {
		const sessionId = url.searchParams.get('session');
		const metricType = url.searchParams.get('type');
		const limit = parseInt(url.searchParams.get('limit') || '100');
		const aggregated = url.searchParams.get('aggregated') === 'true';

		if (aggregated) {
			return json(await getAggregatedMetrics());
		}

		let metrics = sessionId ? sessionMetrics.get(sessionId) || [] : metricsStore;

		// Filter by metric type
		if (metricType) {
			metrics = metrics.filter(
				(m) => m.tags.metric_type === metricType || m.name.includes(metricType)
			);
		}

		// Apply limit
		metrics = metrics.slice(-limit);

		return json({
			metrics,
			total: metrics.length,
			sessionId,
			metricType,
			timestamp: Date.now()
		});
	} catch (error) {
		console.error('Metrics retrieval error:', error);
		return json(
			{
				error: 'Internal server error',
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

// Validation helper
function isValidMetric(metric: any): boolean {
	return (
		typeof metric.id === 'string' &&
		typeof metric.name === 'string' &&
		typeof metric.value === 'number' &&
		typeof metric.timestamp === 'number' &&
		typeof metric.tags === 'object' &&
		typeof metric.metadata === 'object'
	);
}

// Logging helper for critical metrics
function logCriticalMetrics(metrics: PerformanceMetric[]) {
	metrics.forEach((metric) => {
		// Log slow operations
		if (metric.name === 'navigation_timing' && metric.value > 2000) {
			console.warn(`Slow navigation detected: ${metric.tags.route} took ${metric.value}ms`);
		}

		// Log GraphQL errors
		if (metric.name === 'graphql_query' && metric.tags.has_errors === 'true') {
			console.error(`GraphQL error in ${metric.tags.operation}:`, metric.metadata.errors);
		}

		// Log performance issues
		if (metric.name === 'web_vitals_lcp' && metric.value > 2500) {
			console.warn(`Poor LCP detected: ${metric.value}ms at ${metric.metadata.url}`);
		}

		// Log API issues
		if (metric.name === 'api_response' && parseInt(metric.tags.status) >= 400) {
			console.error(
				`API error: ${metric.tags.method} ${metric.tags.endpoint} - ${metric.tags.status}`
			);
		}
	});
}

// Aggregated metrics calculation
async function getAggregatedMetrics() {
	const now = Date.now();

	// Return cached data if still valid
	if (metricsCache && now - cacheLastUpdated < CACHE_TTL) {
		return metricsCache;
	}

	const recentMetrics = metricsStore.filter(
		(m) => now - m.timestamp < 3600000 // Last hour
	);

	const aggregated = {
		summary: {
			totalMetrics: recentMetrics.length,
			uniqueSessions: new Set(recentMetrics.map((m) => m.sessionId)).size,
			timeRange: '1 hour',
			lastUpdated: now
		},
		performance: {
			navigation: calculateAverages(
				recentMetrics.filter((m) => m.name === 'navigation_timing'),
				'value'
			),
			graphqlQueries: calculateAverages(
				recentMetrics.filter((m) => m.name === 'graphql_query'),
				'value'
			),
			apiRequests: calculateAverages(
				recentMetrics.filter((m) => m.name === 'api_response'),
				'value'
			),
			webVitals: {
				lcp: calculateAverages(
					recentMetrics.filter((m) => m.name === 'web_vitals_lcp'),
					'value'
				),
				fid: calculateAverages(
					recentMetrics.filter((m) => m.name === 'web_vitals_fid'),
					'value'
				)
			}
		},
		errors: {
			total: recentMetrics.filter((m) => m.name === 'error_occurrence').length,
			byType: groupBy(
				recentMetrics.filter((m) => m.name === 'error_occurrence'),
				(m) => m.tags.error_type
			),
			byContext: groupBy(
				recentMetrics.filter((m) => m.name === 'error_occurrence'),
				(m) => m.tags.context
			)
		},
		business: {
			userInteractions: recentMetrics.filter((m) => m.name === 'user_interaction').length,
			topRoutes: getTopRoutes(recentMetrics),
			slowestOperations: getSlowestOperations(recentMetrics)
		}
	};

	// Cache the results
	metricsCache = aggregated;
	cacheLastUpdated = now;

	return aggregated;
}

// Helper functions for aggregation
function calculateAverages(metrics: PerformanceMetric[], field: keyof PerformanceMetric) {
	if (metrics.length === 0) {
		return { count: 0, average: 0, min: 0, max: 0, p95: 0 };
	}

	const values = metrics.map((m) => Number(m[field])).sort((a, b) => a - b);
	const count = values.length;
	const average = values.reduce((sum, val) => sum + val, 0) / count;
	const min = values[0];
	const max = values[count - 1];
	const p95Index = Math.floor(count * 0.95);
	const p95 = values[p95Index] || max;

	return { count, average: Math.round(average), min, max, p95 };
}

function groupBy<T>(array: T[], keyFn: (item: T) => string): Record<string, number> {
	return array.reduce(
		(acc, item) => {
			const key = keyFn(item);
			acc[key] = (acc[key] || 0) + 1;
			return acc;
		},
		{} as Record<string, number>
	);
}

function getTopRoutes(metrics: PerformanceMetric[]) {
	const navigationMetrics = metrics.filter((m) => m.name === 'navigation_timing');
	const routeCounts = groupBy(navigationMetrics, (m) => m.tags.route);

	return Object.entries(routeCounts)
		.sort(([, a], [, b]) => b - a)
		.slice(0, 10)
		.map(([route, count]) => ({
			route,
			count,
			avgDuration: Math.round(
				navigationMetrics
					.filter((m) => m.tags.route === route)
					.reduce((sum, m) => sum + m.value, 0) / count
			)
		}));
}

function getSlowestOperations(metrics: PerformanceMetric[]) {
	const operationMetrics = metrics.filter(
		(m) => m.name === 'navigation_timing' || m.name === 'graphql_query' || m.name === 'api_response'
	);

	return operationMetrics
		.sort((a, b) => b.value - a.value)
		.slice(0, 10)
		.map((m) => ({
			type: m.name,
			operation: m.tags.operation || m.tags.route || m.tags.endpoint,
			duration: m.value,
			timestamp: m.timestamp
		}));
}
