import type { DocumentNode } from 'graphql';
import { print } from 'graphql';
import type {
	GraphQLPerformanceMetrics,
	PerformanceAlert,
	PerformanceMonitorConfig,
	PerformanceReport,
	QueryPerformanceProfile
} from './types';
import { DEFAULT_CONFIG } from './config';
import {
	calculateAverageResponseTime,
	calculateErrorRate,
	calculateOverallCacheHitRate,
	calculatePercentiles,
	calculateTrend,
	getTopCachedOperations,
	updateCacheStats
} from './metrics';
import { checkPerformanceAlerts } from './alerts';
import {
	analyzeTrends,
	generateRecommendations,
	identifyCacheOptimizations
} from './reports';

export class GraphQLPerformanceMonitor {
	private config: PerformanceMonitorConfig;
	private queryProfiles: Map<string, QueryPerformanceProfile> = new Map();
	private rawMetrics: (GraphQLPerformanceMetrics & { timestamp: number })[] = [];
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
		const newAlerts = checkPerformanceAlerts(timestampedMetrics, this.config);
		newAlerts.forEach((alert) => {
			this.alerts.push(alert);
			this.alertHandlers.forEach((handler) => handler(alert));
		});

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
				averageResponseTime: calculateAverageResponseTime(relevantMetrics),
				slowestQueries: profiles.slice(0, 10), // Top 10 slowest
				mostComplexQueries: this.getAllQueryProfiles('complexity').slice(0, 10),
				cachePerformance: {
					overallHitRate: calculateOverallCacheHitRate(profiles),
					topCachedOperations: getTopCachedOperations(profiles),
					cacheOptimizationOpportunities: identifyCacheOptimizations(profiles)
				}
			},
			alerts: this.getAlertsInRange(range.start, range.end),
			recommendations: generateRecommendations(profiles, this.config),
			trends: analyzeTrends(relevantMetrics)
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
			averageResponseTime: calculateAverageResponseTime(recentMetrics),
			cacheHitRate: calculateOverallCacheHitRate(profiles),
			errorRate: calculateErrorRate(recentMetrics),
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
				percentiles: calculatePercentiles(this.getMetricsForQuery(metrics.queryHash)),
				complexityStats: {
					average:
						(existing.complexityStats.average * existing.executionCount + metrics.complexity) /
						newCount,
					max: Math.max(existing.complexityStats.max, metrics.complexity),
					min: Math.min(existing.complexityStats.min, metrics.complexity)
				},
				cacheStats: updateCacheStats(existing.cacheStats, metrics.cacheHitRatio),
				errorRate: calculateErrorRate(this.getMetricsForQuery(metrics.queryHash)),
				lastExecuted: new Date(metrics.timestamp),
				trending: calculateTrend(this.getMetricsForQuery(metrics.queryHash))
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
		if (operationName?.toLowerCase().includes('introspection')) {
			return true;
		}

		if (document) {
			const queryString = print(document);
			return queryString.includes('__schema') || queryString.includes('__type');
		}

		return false;
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
			(m) => m.timestamp && m.timestamp >= start.getTime() && m.timestamp <= end.getTime()
		);
	}

	private getRecentMetrics(
		timeframe: number
	): (GraphQLPerformanceMetrics & { timestamp: number })[] {
		const cutoff = Date.now() - timeframe;
		return this.rawMetrics.filter((m) => m.timestamp && m.timestamp > cutoff);
	}

	private getAlertsInRange(start: Date, end: Date): PerformanceAlert[] {
		return this.alerts.filter((alert) => alert.timestamp >= start && alert.timestamp <= end);
	}

	private generateReportId(): string {
		return `perf-report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	private cleanupOldMetrics(): void {
		const cutoff = Date.now() - this.config.retentionPeriod * 24 * 60 * 60 * 1000;
		this.rawMetrics = this.rawMetrics.filter((m) => m.timestamp && m.timestamp > cutoff);
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
