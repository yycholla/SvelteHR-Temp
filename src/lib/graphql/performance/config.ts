import type { PerformanceMonitorConfig } from './types';

export const DEFAULT_CONFIG: PerformanceMonitorConfig = {
	enabled: true,
	sampleRate: 1.0, // Monitor all queries in development
	alertingEnabled: true,
	reportingInterval: 60, // 1 hour
	retentionPeriod: 30, // 30 days
	thresholds: {
		warningTime: 200, // 200ms warning threshold
		criticalTime: 500, // 500ms critical threshold
		complexityWarning: 500,
		complexityCritical: 1000,
		cacheHitRateWarning: 80, // Warn if cache hit rate < 80%
		slowQueryPercentile: 95
	},
	excludeIntrospectionQueries: true,
	enableTrendAnalysis: true,
	enableRecommendations: true
};
