import type { DocumentNode } from 'graphql';

export interface GraphQLPerformanceMetrics {
	operationName?: string;
	operationType: 'query' | 'mutation' | 'subscription';
	executionTime: number;
	complexity: number;
	depth: number;
	fieldCount: number;
	errorCount: number;
	cacheHitRatio: number;
	timestamp?: number;
	queryHash?: string;
}

export interface QueryAnalysis {
	operationName?: string;
	resolverCalls: ResolverCall[];
	potentialNPlusOne: boolean;
	duplicateQueries: string[];
	recommendations: string[];
}

export interface ResolverCall {
	fieldName: string;
	parentType: string;
	returnType: string;
	executionTime: number;
	callCount: number;
}

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
