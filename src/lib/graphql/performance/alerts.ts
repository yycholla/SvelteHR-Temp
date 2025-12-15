import type {
	GraphQLPerformanceMetrics,
	PerformanceAlert,
	PerformanceMonitorConfig
} from './types';

export function createAlert(
	severity: 'info' | 'warning' | 'critical',
	type: PerformanceAlert['type'],
	metrics: GraphQLPerformanceMetrics,
	message: string,
	recommendations: string[]
): PerformanceAlert {
	return {
		id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
		timestamp: new Date(),
		severity,
		type,
		operationName: metrics.operationName,
		message,
		metrics,
		recommendations
	};
}

export function checkPerformanceAlerts(
	metrics: GraphQLPerformanceMetrics,
	config: PerformanceMonitorConfig
): PerformanceAlert[] {
	if (!config.alertingEnabled) return [];

	const alerts: PerformanceAlert[] = [];

	// Slow query alert
	if (metrics.executionTime > config.thresholds.criticalTime) {
		alerts.push(
			createAlert(
				'critical',
				'slow_query',
				metrics,
				`Critical slow query: ${metrics.operationName || 'Anonymous'} took ${metrics.executionTime}ms`,
				[
					'Review query complexity and optimize selection sets',
					'Check database indexes for queried fields',
					'Consider implementing query result caching',
					'Analyze N+1 query patterns'
				]
			)
		);
	} else if (metrics.executionTime > config.thresholds.warningTime) {
		alerts.push(
			createAlert(
				'warning',
				'slow_query',
				metrics,
				`Slow query warning: ${metrics.operationName || 'Anonymous'} took ${metrics.executionTime}ms`,
				['Monitor query performance trends', 'Consider query optimization if this becomes frequent']
			)
		);
	}

	// High complexity alert
	if (metrics.complexity > config.thresholds.complexityCritical) {
		alerts.push(
			createAlert(
				'critical',
				'high_complexity',
				metrics,
				`Critical query complexity: ${metrics.complexity} exceeds threshold`,
				[
					'Implement query complexity limits',
					'Break down complex queries into smaller operations',
					'Review query depth and field selection'
				]
			)
		);
	} else if (metrics.complexity > config.thresholds.complexityWarning) {
		alerts.push(
			createAlert(
				'warning',
				'high_complexity',
				metrics,
				`High query complexity warning: ${metrics.complexity}`,
				['Monitor complexity trends', 'Consider query optimization']
			)
		);
	}

	// Low cache hit rate alert
	if (metrics.cacheHitRatio < config.thresholds.cacheHitRateWarning / 100) {
		alerts.push(
			createAlert(
				'warning',
				'low_cache_hit',
				metrics,
				`Low cache hit rate: ${(metrics.cacheHitRatio * 100).toFixed(1)}%`,
				[
					'Review cache configuration and policies',
					'Analyze cache key patterns',
					'Consider cache warming strategies'
				]
			)
		);
	}

	return alerts;
}
