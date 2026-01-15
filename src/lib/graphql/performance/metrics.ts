import type { GraphQLPerformanceMetrics, QueryPerformanceProfile } from './types';

export function calculateAverageResponseTime(metrics: GraphQLPerformanceMetrics[]): number {
	if (metrics.length === 0) return 0;
	return metrics.reduce((sum, m) => sum + m.executionTime, 0) / metrics.length;
}

export function calculateOverallCacheHitRate(profiles: QueryPerformanceProfile[]): number {
	if (profiles.length === 0) return 0;

	const totalHits = profiles.reduce((sum, p) => sum + p.cacheStats.hits, 0);
	const totalRequests = profiles.reduce(
		(sum, p) => sum + p.cacheStats.hits + p.cacheStats.misses,
		0
	);

	return totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0;
}

export function calculateErrorRate(metrics: GraphQLPerformanceMetrics[]): number {
	if (metrics.length === 0) return 0;
	const errorsCount = metrics.reduce((sum, m) => sum + m.errorCount, 0);
	return errorsCount / metrics.length;
}

export function getTopCachedOperations(profiles: QueryPerformanceProfile[]): string[] {
	return profiles
		.filter((p) => p.cacheStats.hitRate > 0)
		.sort((a, b) => b.cacheStats.hitRate - a.cacheStats.hitRate)
		.slice(0, 10)
		.map((p) => p.operationName || 'Anonymous')
		.filter((name) => name !== 'Anonymous');
}

export function calculatePercentiles(metrics: GraphQLPerformanceMetrics[]): {
	p50: number;
	p95: number;
	p99: number;
} {
	const times = metrics.map((m) => m.executionTime).sort((a, b) => a - b);

	if (times.length === 0) return { p50: 0, p95: 0, p99: 0 };

	return {
		p50: percentile(times, 50),
		p95: percentile(times, 95),
		p99: percentile(times, 99)
	};
}

function percentile(sorted: number[], p: number): number {
	const index = Math.ceil((p / 100) * sorted.length) - 1;
	return sorted[Math.max(0, index)] || 0;
}

export function updateCacheStats(
	existing: QueryPerformanceProfile['cacheStats'],
	newHitRatio: number
) {
	const hits = existing.hits + (newHitRatio > 0 ? 1 : 0);
	const misses = existing.misses + (newHitRatio === 0 ? 1 : 0);

	return {
		hits,
		misses,
		hitRate: hits / (hits + misses)
	};
}

export function calculateTrend(
	metrics: GraphQLPerformanceMetrics[]
): 'improving' | 'stable' | 'degrading' {
	if (metrics.length < 10) return 'stable';

	const recent = metrics.slice(-5).map((m) => m.executionTime);
	const older = metrics.slice(0, 5).map((m) => m.executionTime);

	const recentAvg = recent.reduce((sum, time) => sum + time, 0) / recent.length;
	const olderAvg = older.reduce((sum, time) => sum + time, 0) / older.length;

	const change = (recentAvg - olderAvg) / olderAvg;

	if (change < -0.1) return 'improving'; // 10% improvement
	if (change > 0.1) return 'degrading'; // 10% degradation
	return 'stable';
}
