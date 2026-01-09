import type {
	GraphQLPerformanceMetrics,
	PerformanceMonitorConfig,
	PerformanceRecommendation,
	PerformanceTrend,
	QueryPerformanceProfile
} from './types';
import { calculateOverallCacheHitRate } from './metrics';

export function identifyCacheOptimizations(profiles: QueryPerformanceProfile[]): string[] {
	const opportunities: string[] = [];

	// Find frequently executed queries with low cache hit rates
	const frequentSlowQueries = profiles.filter(
		(p) => p.executionCount > 10 && p.cacheStats.hitRate < 0.5 && p.averageExecutionTime > 100
	);

	if (frequentSlowQueries.length > 0) {
		opportunities.push(
			`${frequentSlowQueries.length} frequently executed queries have low cache hit rates`
		);
	}

	// Find queries that could benefit from longer cache TTL
	const shortCachedQueries = profiles.filter(
		(p) => p.cacheStats.hitRate > 0.8 && p.executionCount > 50
	);

	if (shortCachedQueries.length > 0) {
		opportunities.push(
			`${shortCachedQueries.length} queries have high cache hit rates and could benefit from extended TTL`
		);
	}

	return opportunities;
}

export function generateRecommendations(
	profiles: QueryPerformanceProfile[],
	config: PerformanceMonitorConfig
): PerformanceRecommendation[] {
	const recommendations: PerformanceRecommendation[] = [];

	// Query optimization recommendations
	const slowQueries = profiles.filter(
		(p) => p.averageExecutionTime > config.thresholds.warningTime
	);
	if (slowQueries.length > 0) {
		recommendations.push({
			category: 'query_optimization',
			priority: 'high',
			title: 'Optimize slow queries',
			description: `${slowQueries.length} queries are consistently slow`,
			estimatedImpact: 'Reduce average response time by 30-50%',
			implementationEffort: 'medium',
			actionItems: [
				'Analyze query execution plans',
				'Optimize field selections',
				'Implement query result caching',
				'Consider query batching'
			]
		});
	}

	// Cache optimization recommendations
	const lowCacheHitRate =
		calculateOverallCacheHitRate(profiles) < config.thresholds.cacheHitRateWarning;
	if (lowCacheHitRate) {
		recommendations.push({
			category: 'caching',
			priority: 'medium',
			title: 'Improve cache performance',
			description: 'Overall cache hit rate is below optimal threshold',
			estimatedImpact: 'Reduce database load by 40-60%',
			implementationEffort: 'low',
			actionItems: [
				'Review cache key patterns',
				'Implement cache warming',
				'Optimize cache TTL settings',
				'Add cache tags for better invalidation'
			]
		});
	}

	// Schema design recommendations
	const highComplexityQueries = profiles.filter(
		(p) => p.complexityStats.average > config.thresholds.complexityWarning
	);
	if (highComplexityQueries.length > 0) {
		recommendations.push({
			category: 'schema_design',
			priority: 'medium',
			title: 'Reduce query complexity',
			description: `${highComplexityQueries.length} queries have high complexity scores`,
			estimatedImpact: 'Improve query performance and reduce server load',
			implementationEffort: 'high',
			actionItems: [
				'Implement query complexity analysis',
				'Add query depth limiting',
				'Consider schema denormalization',
				'Implement field-level batching'
			]
		});
	}

	return recommendations;
}

export function analyzeTrends(metrics: GraphQLPerformanceMetrics[]): PerformanceTrend[] {
	// This would implement time-series analysis
	// For now, return basic trends
	return [
		{
			metric: 'response_time',
			timeFrame: '24h',
			direction: 'stable',
			changePercent: 0,
			significance: 'low'
		}
	];
}
