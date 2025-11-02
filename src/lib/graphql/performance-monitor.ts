/**
 * GraphQL Performance Monitor
 *
 * Comprehensive performance monitoring system for GraphQL operations with PostGraphile.
 * Tracks execution times, query complexity, cache performance, and provides optimization
 * recommendations for maintaining <200ms response targets.
 *
 * Features:
 * - Real-time performance tracking
 * - Query execution time analysis
 * - Cache hit rate monitoring
 * - Bottleneck identification
 * - Performance regression detection
 * - Automated alert system
 * - Optimization recommendations
 */

import { DocumentNode, print } from 'graphql';
import type { GraphQLPerformanceMetrics, QueryAnalysis } from '../../tests/generated/test-types';

export interface PerformanceThresholds {
	warningTime: number; // ms
	criticalTime: number; // ms
	complexityWarning: number;
	complexityCritical: number;
	cacheHitRateWarning: number; // percentage
	slowQueryPercentile: number; // 95th percentile
}

export interface PerformanceAlert {
	id: string;
	timestamp: Date;
	severity: 'info' | 'warning' | 'critical';
	type: 'slow_query' | 'high_complexity' | 'low_cache_hit' | 'memory_leak' | 'error_spike';
	operationName?: string;
	message: string;
	metrics: GraphQLPerformanceMetrics;
	recommendations: string[];
}

export interface QueryPerformanceProfile {
	operationName?: string;
	queryHash: string;
	executionCount: number;
	totalExecutionTime: number;
	averageExecutionTime: number;
	minExecutionTime: number;
	maxExecutionTime: number;
	percentiles: {
		p50: number;
		p95: number;
		p99: number;
	};
	complexityStats: {
		average: number;
		max: number;
		min: number;
	};
	cacheStats: {
		hits: number;
		misses: number;
		hitRate: number;
	};
	errorRate: number;
	lastExecuted: Date;
	trending: 'improving' | 'stable' | 'degrading';
}

export interface PerformanceReport {
	reportId: string;
	generatedAt: Date;
	timeRange: {
		start: Date;
		end: Date;
	};
	summary: {
		totalQueries: number;
		averageResponseTime: number;
		slowestQueries: QueryPerformanceProfile[];
		mostComplexQueries: QueryPerformanceProfile[];
		cachePerformance: {
			overallHitRate: number;
			topCachedOperations: string[];
			cacheOptimizationOpportunities: string[];
		};
	};
	alerts: PerformanceAlert[];
	recommendations: PerformanceRecommendation[];
	trends: PerformanceTrend[];
}

export interface PerformanceRecommendation {
	category: 'query_optimization' | 'caching' | 'indexing' | 'schema_design' | 'infrastructure';
	priority: 'low' | 'medium' | 'high' | 'critical';
	title: string;
	description: string;
	estimatedImpact: string;
	implementationEffort: 'low' | 'medium' | 'high';
	actionItems: string[];
}

export interface PerformanceTrend {
	metric: 'response_time' | 'complexity' | 'cache_hit_rate' | 'error_rate';
	timeFrame: '1h' | '24h' | '7d' | '30d';
	direction: 'up' | 'down' | 'stable';
	changePercent: number;
	significance: 'low' | 'medium' | 'high';
}

export interface PerformanceMonitorConfig {
	enabled: boolean;
	sampleRate: number; // 0-1, percentage of queries to sample
	alertingEnabled: boolean;
	reportingInterval: number; // minutes
	retentionPeriod: number; // days
	thresholds: PerformanceThresholds;
	excludeIntrospectionQueries: boolean;
	enableTrendAnalysis: boolean;
	enableRecommendations: boolean;
}

const DEFAULT_CONFIG: PerformanceMonitorConfig = {
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

export class GraphQLPerformanceMonitor {
	private config: PerformanceMonitorConfig;
	private queryProfiles: Map<string, QueryPerformanceProfile> = new Map();
	private rawMetrics: GraphQLPerformanceMetrics[] = [];
	private alerts: PerformanceAlert[] = [];
	private alertHandlers: ((alert: PerformanceAlert) => void)[] = [];
	private reportHandlers: ((report: PerformanceReport) => void)[] = [];
	private intervalId?: NodeJS.Timeout;
	private startTime = Date.now();

	constructor(config: Partial<PerformanceMonitorConfig> = {}) {
		this.config = { ...DEFAULT_CONFIG, ...config };

		if (this.config.enabled && this.config.reportingInterval > 0) {
			this.startPeriodicReporting();
		}
	}

	/**
	 * Record performance metrics for a GraphQL operation
	 */
	recordMetrics(metrics: GraphQLPerformanceMetrics, document?: DocumentNode): void {
		if (!this.config.enabled || Math.random() > this.config.sampleRate) {
			return;
		}

		// Skip introspection queries if configured
		if (
			this.config.excludeIntrospectionQueries &&
			this.isIntrospectionQuery(document, metrics.operationName)
		) {
			return;
		}

		// Add timestamp if not present
		const timestampedMetrics = {
			...metrics,
			timestamp: Date.now(),
			queryHash: this.generateQueryHash(document, metrics.operationName)
		};

		// Store raw metrics
		this.rawMetrics.push(timestampedMetrics);

		// Update query profile
		this.updateQueryProfile(timestampedMetrics);

		// Check for performance alerts
		this.checkPerformanceAlerts(timestampedMetrics);

		// Clean up old metrics
		this.cleanupOldMetrics();
	}

	/**
	 * Get performance profile for a specific operation
	 */
	getQueryProfile(operationName?: string, queryHash?: string): QueryPerformanceProfile | undefined {
		if (queryHash) {
			return this.queryProfiles.get(queryHash);
		}

		if (operationName) {
			return Array.from(this.queryProfiles.values()).find(
				(profile) => profile.operationName === operationName
			);
		}

		return undefined;
	}

	/**
	 * Get all query profiles sorted by performance impact
	 */
	getAllQueryProfiles(
		sortBy: 'execution_time' | 'complexity' | 'frequency' | 'error_rate' = 'execution_time'
	): QueryPerformanceProfile[] {
		const profiles = Array.from(this.queryProfiles.values());

		return profiles.sort((a, b) => {
			switch (sortBy) {
				case 'execution_time':
					return b.averageExecutionTime - a.averageExecutionTime;
				case 'complexity':
					return b.complexityStats.average - a.complexityStats.average;
				case 'frequency':
					return b.executionCount - a.executionCount;
				case 'error_rate':
					return b.errorRate - a.errorRate;
				default:
					return 0;
			}
		});
	}

	/**
	 * Generate comprehensive performance report
	 */
	generateReport(timeRange?: { start: Date; end: Date }): PerformanceReport {
		const now = new Date();
		const defaultTimeRange = {
			start: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Last 24 hours
			end: now
		};

		const range = timeRange || defaultTimeRange;
		const relevantMetrics = this.getMetricsInRange(range.start, range.end);
		const profiles = this.getAllQueryProfiles();

		const report: PerformanceReport = {
			reportId: this.generateReportId(),
			generatedAt: now,
			timeRange: range,
			summary: {
				totalQueries: relevantMetrics.length,
				averageResponseTime: this.calculateAverageResponseTime(relevantMetrics),
				slowestQueries: profiles.slice(0, 10), // Top 10 slowest
				mostComplexQueries: this.getAllQueryProfiles('complexity').slice(0, 10),
				cachePerformance: {
					overallHitRate: this.calculateOverallCacheHitRate(profiles),
					topCachedOperations: this.getTopCachedOperations(profiles),
					cacheOptimizationOpportunities: this.identifyCacheOptimizations(profiles)
				}
			},
			alerts: this.getAlertsInRange(range.start, range.end),
			recommendations: this.generateRecommendations(profiles, relevantMetrics),
			trends: this.analyzeTrends(relevantMetrics)
		};

		// Notify report handlers
		this.reportHandlers.forEach((handler) => handler(report));

		return report;
	}

	/**
	 * Get current performance metrics summary
	 */
	getCurrentMetrics(): {
		activeQueries: number;
		averageResponseTime: number;
		cacheHitRate: number;
		errorRate: number;
		slowQueriesCount: number;
		complexQueriesCount: number;
	} {
		const recentMetrics = this.getRecentMetrics(5 * 60 * 1000); // Last 5 minutes
		const profiles = Array.from(this.queryProfiles.values());

		return {
			activeQueries: recentMetrics.length,
			averageResponseTime: this.calculateAverageResponseTime(recentMetrics),
			cacheHitRate: this.calculateOverallCacheHitRate(profiles),
			errorRate: this.calculateErrorRate(recentMetrics),
			slowQueriesCount: profiles.filter(
				(p) => p.averageExecutionTime > this.config.thresholds.warningTime
			).length,
			complexQueriesCount: profiles.filter(
				(p) => p.complexityStats.average > this.config.thresholds.complexityWarning
			).length
		};
	}

	/**
	 * Add alert handler
	 */
	onAlert(handler: (alert: PerformanceAlert) => void): void {
		this.alertHandlers.push(handler);
	}

	/**
	 * Add report handler
	 */
	onReport(handler: (report: PerformanceReport) => void): void {
		this.reportHandlers.push(handler);
	}

	/**
	 * Get recent alerts
	 */
	getRecentAlerts(timeframe: number = 60 * 60 * 1000): PerformanceAlert[] {
		const cutoff = Date.now() - timeframe;
		return this.alerts.filter((alert) => alert.timestamp.getTime() > cutoff);
	}

	/**
	 * Update configuration
	 */
	updateConfig(newConfig: Partial<PerformanceMonitorConfig>): void {
		this.config = { ...this.config, ...newConfig };

		// Restart periodic reporting if interval changed
		if (newConfig.reportingInterval !== undefined) {
			this.stopPeriodicReporting();
			if (this.config.enabled && this.config.reportingInterval > 0) {
				this.startPeriodicReporting();
			}
		}
	}

	/**
	 * Reset all metrics and profiles
	 */
	reset(): void {
		this.queryProfiles.clear();
		this.rawMetrics = [];
		this.alerts = [];
		this.startTime = Date.now();
	}

	/**
	 * Stop monitoring and cleanup
	 */
	stop(): void {
		this.stopPeriodicReporting();
		this.reset();
	}

	// Private methods

	private updateQueryProfile(
		metrics: GraphQLPerformanceMetrics & { timestamp: number; queryHash: string }
	): void {
		const existing = this.queryProfiles.get(metrics.queryHash);

		if (existing) {
			// Update existing profile
			const newCount = existing.executionCount + 1;
			const newTotalTime = existing.totalExecutionTime + metrics.executionTime;

			const updatedProfile: QueryPerformanceProfile = {
				...existing,
				executionCount: newCount,
				totalExecutionTime: newTotalTime,
				averageExecutionTime: newTotalTime / newCount,
				minExecutionTime: Math.min(existing.minExecutionTime, metrics.executionTime),
				maxExecutionTime: Math.max(existing.maxExecutionTime, metrics.executionTime),
				percentiles: this.calculatePercentiles(metrics.queryHash),
				complexityStats: {
					average:
						(existing.complexityStats.average * existing.executionCount + metrics.complexity) /
						newCount,
					max: Math.max(existing.complexityStats.max, metrics.complexity),
					min: Math.min(existing.complexityStats.min, metrics.complexity)
				},
				cacheStats: this.updateCacheStats(existing.cacheStats, metrics.cacheHitRatio),
				errorRate: this.calculateErrorRate(this.getMetricsForQuery(metrics.queryHash)),
				lastExecuted: new Date(metrics.timestamp),
				trending: this.calculateTrend(metrics.queryHash)
			};

			this.queryProfiles.set(metrics.queryHash, updatedProfile);
		} else {
			// Create new profile
			const newProfile: QueryPerformanceProfile = {
				operationName: metrics.operationName,
				queryHash: metrics.queryHash,
				executionCount: 1,
				totalExecutionTime: metrics.executionTime,
				averageExecutionTime: metrics.executionTime,
				minExecutionTime: metrics.executionTime,
				maxExecutionTime: metrics.executionTime,
				percentiles: {
					p50: metrics.executionTime,
					p95: metrics.executionTime,
					p99: metrics.executionTime
				},
				complexityStats: {
					average: metrics.complexity,
					max: metrics.complexity,
					min: metrics.complexity
				},
				cacheStats: {
					hits: metrics.cacheHitRatio > 0 ? 1 : 0,
					misses: metrics.cacheHitRatio === 0 ? 1 : 0,
					hitRate: metrics.cacheHitRatio
				},
				errorRate: metrics.errorCount > 0 ? 1.0 : 0.0,
				lastExecuted: new Date(metrics.timestamp),
				trending: 'stable'
			};

			this.queryProfiles.set(metrics.queryHash, newProfile);
		}
	}

	private checkPerformanceAlerts(
		metrics: GraphQLPerformanceMetrics & { timestamp: number; queryHash: string }
	): void {
		if (!this.config.alertingEnabled) return;

		const alerts: PerformanceAlert[] = [];

		// Slow query alert
		if (metrics.executionTime > this.config.thresholds.criticalTime) {
			alerts.push(
				this.createAlert(
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
		} else if (metrics.executionTime > this.config.thresholds.warningTime) {
			alerts.push(
				this.createAlert(
					'warning',
					'slow_query',
					metrics,
					`Slow query warning: ${metrics.operationName || 'Anonymous'} took ${metrics.executionTime}ms`,
					[
						'Monitor query performance trends',
						'Consider query optimization if this becomes frequent'
					]
				)
			);
		}

		// High complexity alert
		if (metrics.complexity > this.config.thresholds.complexityCritical) {
			alerts.push(
				this.createAlert(
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
		} else if (metrics.complexity > this.config.thresholds.complexityWarning) {
			alerts.push(
				this.createAlert(
					'warning',
					'high_complexity',
					metrics,
					`High query complexity warning: ${metrics.complexity}`,
					['Monitor complexity trends', 'Consider query optimization']
				)
			);
		}

		// Low cache hit rate alert
		if (metrics.cacheHitRatio < this.config.thresholds.cacheHitRateWarning / 100) {
			alerts.push(
				this.createAlert(
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

		// Store and notify about alerts
		alerts.forEach((alert) => {
			this.alerts.push(alert);
			this.alertHandlers.forEach((handler) => handler(alert));
		});
	}

	private createAlert(
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

	private generateQueryHash(document?: DocumentNode, operationName?: string): string {
		if (document) {
			const queryString = print(document);
			return this.simpleHash(queryString);
		}

		return operationName ? this.simpleHash(operationName) : 'anonymous';
	}

	private simpleHash(str: string): string {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash; // Convert to 32-bit integer
		}
		return Math.abs(hash).toString(36);
	}

	private isIntrospectionQuery(document?: DocumentNode, operationName?: string): boolean {
		if (operationName && operationName.toLowerCase().includes('introspection')) {
			return true;
		}

		if (document) {
			const queryString = print(document);
			return queryString.includes('__schema') || queryString.includes('__type');
		}

		return false;
	}

	private calculatePercentiles(queryHash: string): { p50: number; p95: number; p99: number } {
		const metrics = this.getMetricsForQuery(queryHash);
		const times = metrics.map((m) => m.executionTime).sort((a, b) => a - b);

		if (times.length === 0) return { p50: 0, p95: 0, p99: 0 };

		return {
			p50: this.percentile(times, 50),
			p95: this.percentile(times, 95),
			p99: this.percentile(times, 99)
		};
	}

	private percentile(sorted: number[], p: number): number {
		const index = Math.ceil((p / 100) * sorted.length) - 1;
		return sorted[Math.max(0, index)] || 0;
	}

	private updateCacheStats(existing: QueryPerformanceProfile['cacheStats'], newHitRatio: number) {
		const hits = existing.hits + (newHitRatio > 0 ? 1 : 0);
		const misses = existing.misses + (newHitRatio === 0 ? 1 : 0);

		return {
			hits,
			misses,
			hitRate: hits / (hits + misses)
		};
	}

	private calculateTrend(queryHash: string): 'improving' | 'stable' | 'degrading' {
		const metrics = this.getMetricsForQuery(queryHash, 20); // Last 20 executions
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

	private getMetricsForQuery(
		queryHash: string,
		limit?: number
	): (GraphQLPerformanceMetrics & { timestamp: number })[] {
		const filtered = this.rawMetrics.filter((m) => (m as any).queryHash === queryHash);
		return limit ? filtered.slice(-limit) : filtered;
	}

	private getMetricsInRange(
		start: Date,
		end: Date
	): (GraphQLPerformanceMetrics & { timestamp: number })[] {
		return this.rawMetrics.filter(
			(m) => m.timestamp >= start.getTime() && m.timestamp <= end.getTime()
		);
	}

	private getRecentMetrics(
		timeframe: number
	): (GraphQLPerformanceMetrics & { timestamp: number })[] {
		const cutoff = Date.now() - timeframe;
		return this.rawMetrics.filter((m) => m.timestamp > cutoff);
	}

	private calculateAverageResponseTime(metrics: GraphQLPerformanceMetrics[]): number {
		if (metrics.length === 0) return 0;
		return metrics.reduce((sum, m) => sum + m.executionTime, 0) / metrics.length;
	}

	private calculateOverallCacheHitRate(profiles: QueryPerformanceProfile[]): number {
		if (profiles.length === 0) return 0;

		const totalHits = profiles.reduce((sum, p) => sum + p.cacheStats.hits, 0);
		const totalRequests = profiles.reduce(
			(sum, p) => sum + p.cacheStats.hits + p.cacheStats.misses,
			0
		);

		return totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0;
	}

	private calculateErrorRate(metrics: GraphQLPerformanceMetrics[]): number {
		if (metrics.length === 0) return 0;
		const errorsCount = metrics.reduce((sum, m) => sum + m.errorCount, 0);
		return errorsCount / metrics.length;
	}

	private getTopCachedOperations(profiles: QueryPerformanceProfile[]): string[] {
		return profiles
			.filter((p) => p.cacheStats.hitRate > 0)
			.sort((a, b) => b.cacheStats.hitRate - a.cacheStats.hitRate)
			.slice(0, 10)
			.map((p) => p.operationName || 'Anonymous')
			.filter((name) => name !== 'Anonymous');
	}

	private identifyCacheOptimizations(profiles: QueryPerformanceProfile[]): string[] {
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

	private generateRecommendations(
		profiles: QueryPerformanceProfile[],
		metrics: GraphQLPerformanceMetrics[]
	): PerformanceRecommendation[] {
		const recommendations: PerformanceRecommendation[] = [];

		// Query optimization recommendations
		const slowQueries = profiles.filter(
			(p) => p.averageExecutionTime > this.config.thresholds.warningTime
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
			this.calculateOverallCacheHitRate(profiles) < this.config.thresholds.cacheHitRateWarning;
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
			(p) => p.complexityStats.average > this.config.thresholds.complexityWarning
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

	private analyzeTrends(metrics: GraphQLPerformanceMetrics[]): PerformanceTrend[] {
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

	private getAlertsInRange(start: Date, end: Date): PerformanceAlert[] {
		return this.alerts.filter((alert) => alert.timestamp >= start && alert.timestamp <= end);
	}

	private generateReportId(): string {
		return `perf-report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	private cleanupOldMetrics(): void {
		const cutoff = Date.now() - this.config.retentionPeriod * 24 * 60 * 60 * 1000;
		this.rawMetrics = this.rawMetrics.filter((m) => m.timestamp > cutoff);
		this.alerts = this.alerts.filter((a) => a.timestamp.getTime() > cutoff);
	}

	private startPeriodicReporting(): void {
		this.intervalId = setInterval(
			() => {
				this.generateReport();
			},
			this.config.reportingInterval * 60 * 1000
		);
	}

	private stopPeriodicReporting(): void {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = undefined;
		}
	}
}

export default GraphQLPerformanceMonitor;
