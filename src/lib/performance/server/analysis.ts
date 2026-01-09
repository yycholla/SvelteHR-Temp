import type { ServerPerformanceMetric } from './types';

// Performance analysis utilities
export function analyzePerformanceTrends(
	metrics: ServerPerformanceMetric[],
	timeWindow: number = 3600000 // 1 hour
): {
	trends: {
		responseTime: 'improving' | 'stable' | 'degrading';
		errorRate: 'improving' | 'stable' | 'degrading';
		throughput: 'improving' | 'stable' | 'degrading';
	};
	insights: string[];
} {
	const now = Date.now();
	const recent = metrics.filter((m) => m.timestamp && now - m.timestamp < timeWindow / 2);
	const older = metrics.filter(
		(m) => m.timestamp && now - m.timestamp >= timeWindow / 2 && now - m.timestamp < timeWindow
	);

	if (recent.length === 0 || older.length === 0) {
		return {
			trends: { responseTime: 'stable', errorRate: 'stable', throughput: 'stable' },
			insights: ['Insufficient data for trend analysis']
		};
	}

	// Response time trend
	const recentAvgResponse = recent.reduce((sum, m) => sum + m.duration, 0) / recent.length;
	const olderAvgResponse = older.reduce((sum, m) => sum + m.duration, 0) / older.length;
	const responseTimeChange = (recentAvgResponse - olderAvgResponse) / olderAvgResponse;

	// Error rate trend
	const recentErrorRate = recent.filter((m) => m.status >= 400).length / recent.length;
	const olderErrorRate = older.filter((m) => m.status >= 400).length / older.length;

	// Throughput trend (requests per minute)
	const recentThroughput = (recent.length / (timeWindow / 2)) * 60000;
	const olderThroughput = (older.length / (timeWindow / 2)) * 60000;
	const throughputChange = (recentThroughput - olderThroughput) / olderThroughput;

	const trendData = {
		responseTime:
			responseTimeChange < -0.1 ? 'improving' : responseTimeChange > 0.1 ? 'degrading' : 'stable',
		errorRate:
			recentErrorRate < olderErrorRate * 0.9
				? 'improving'
				: recentErrorRate > olderErrorRate * 1.1
					? 'degrading'
					: 'stable',
		throughput:
			throughputChange > 0.1 ? 'improving' : throughputChange < -0.1 ? 'degrading' : 'stable'
	} as const;

	const insights: string[] = [];

	if (trendData.responseTime === 'degrading') {
		insights.push(`Response times have increased by ${Math.round(responseTimeChange * 100)}%`);
	}
	if (trendData.errorRate === 'degrading') {
		insights.push(
			`Error rate has increased from ${(olderErrorRate * 100).toFixed(1)}% to ${(recentErrorRate * 100).toFixed(1)}%`
		);
	}
	if (trendData.throughput === 'degrading') {
		insights.push(
			`Request throughput has decreased by ${Math.round(Math.abs(throughputChange) * 100)}%`
		);
	}

	if (insights.length === 0) {
		insights.push('Performance appears stable');
	}

	return { trends: trendData, insights };
}
