/**
 * Enhanced GraphQL Client Factory
 * 
 * Creates optimized GraphQL clients with advanced features:
 * - Intelligent caching with background refresh
 * - Query optimization and complexity analysis
 * - Performance monitoring and suggestions
 * - Automatic query batching where beneficial
 * - Smart cache invalidation and prefetching
 */

import { browser } from '$app/environment';
import { GRAPHQL_CONFIG } from '$lib/env';
import { ServerGraphQLClient, BrowserGraphQLClient, GraphQLClientError, type ClientConfig } from './client';
import { graphqlCache, type CachePriority } from './cache/advanced-cache';
import { queryOptimizer, type QueryAnalysis } from './optimization/query-optimizer';
import { handleGraphQLError } from './error-handler';
import type { GraphQLResponse, QueryOptions, MutationOptions } from './types';

/**
 * Enhanced client options
 */
export interface EnhancedClientConfig extends ClientConfig {
	enableOptimization?: boolean;
	enableAdvancedCaching?: boolean;
	enablePerformanceMonitoring?: boolean;
	enableQueryBatching?: boolean;
	optimizationLevel?: 'conservative' | 'balanced' | 'aggressive';
	cacheStrategy?: 'memory' | 'hybrid' | 'persistent';
}

/**
 * Query execution context for enhanced features
 */
export interface QueryContext {
	operationName?: string;
	tags?: string[];
	priority?: CachePriority;
	cacheTTL?: number;
	staleWhileRevalidate?: boolean;
	enableOptimization?: boolean;
	maxComplexity?: number;
}

/**
 * Enhanced Browser GraphQL Client with advanced features
 */
export class EnhancedBrowserGraphQLClient extends BrowserGraphQLClient {
	private config: EnhancedClientConfig;
	private queryBatch: Array<{ query: string; variables?: any; resolve: Function; reject: Function }> = [];
	private batchTimeout: number | null = null;
	private performanceMetrics = new Map<string, number[]>();

	constructor(config: EnhancedClientConfig = {}) {
		super(config);
		this.config = {
			enableOptimization: true,
			enableAdvancedCaching: true,
			enablePerformanceMonitoring: true,
			enableQueryBatching: false, // Disabled by default for safety
			optimizationLevel: 'balanced',
			cacheStrategy: 'memory',
			...config
		};
	}

	/**
	 * Enhanced query execution with optimization and caching
	 */
	override async query<T = any>(
		query: string,
		variables?: Record<string, any>,
		options: QueryOptions & QueryContext = {}
	): Promise<GraphQLResponse<T>> {
		const startTime = Date.now();
		let optimizedQuery = query;
		let analysis: QueryAnalysis | undefined;

		try {
			// Step 1: Query optimization (if enabled)
			if (this.config.enableOptimization && options.enableOptimization !== false) {
				analysis = queryOptimizer.analyzeQuery(query, variables);
				
				// Check complexity limits
				if (options.maxComplexity && analysis.complexity.score > options.maxComplexity) {
					throw new GraphQLClientError(
						`Query complexity ${analysis.complexity.score} exceeds limit ${options.maxComplexity}`,
						undefined,
						400,
						{ code: 'QUERY_TOO_COMPLEX', complexity: analysis.complexity.score },
						analysis.operationName,
						variables
					);
				}

				// Apply automatic optimizations for aggressive mode
				if (this.config.optimizationLevel === 'aggressive') {
					const optimizationResult = queryOptimizer.optimizeQuery(query, {
						maxDepth: 10,
						maxComplexity: 200,
						preferFragments: true
					});
					optimizedQuery = optimizationResult.optimizedQuery;
					
					if (optimizationResult.complexityReduction > 10) {
						console.debug(`📊 Query optimized: complexity reduced by ${optimizationResult.complexityReduction}`);
					}
				}
			}

			// Step 2: Advanced caching check (if enabled)
			if (this.config.enableAdvancedCaching && !options.skipCache) {
				const cacheResult = await this.checkAdvancedCache<T>(
					optimizedQuery, 
					variables, 
					analysis, 
					options
				);
				if (cacheResult) {
					this.recordPerformance(query, Date.now() - startTime, 'cache-hit');
					return cacheResult;
				}
			}

			// Step 3: Execute query
			let result: GraphQLResponse<T>;
			
			if (this.config.enableQueryBatching && analysis?.operationType === 'query') {
				result = await this.executeBatchedQuery<T>(optimizedQuery, variables, options);
			} else {
				result = await super.query<T>(optimizedQuery, variables, options);
			}

			// Step 4: Cache result (if applicable)
			if (this.config.enableAdvancedCaching && result.success && result.data) {
				await this.cacheQueryResult(optimizedQuery, variables, result.data, analysis, options);
			}

			// Step 5: Record performance metrics
			const executionTime = Date.now() - startTime;
			this.recordPerformance(query, executionTime, 'execution', result);
			
			// Handle mutation cache invalidation
			if (analysis?.operationType === 'mutation' && result.success) {
				this.handleMutationInvalidation(analysis.operationName || 'UnknownMutation');
			}

			return result;

		} catch (error) {
			const executionTime = Date.now() - startTime;
			this.recordPerformance(query, executionTime, 'error');
			
			// Enhanced error handling with context
			if (error instanceof GraphQLClientError) {
				handleGraphQLError(error, 'enhanced-client-query', {
					showToast: options.showErrorToast !== false,
					showActions: true
				});
			}
			
			throw error;
		}
	}

	/**
	 * Enhanced mutation with optimized cache invalidation
	 */
	override async mutate<T = any>(
		mutation: string,
		variables?: Record<string, any>,
		options: MutationOptions & QueryContext = {}
	): Promise<GraphQLResponse<T>> {
		const startTime = Date.now();
		let analysis: QueryAnalysis | undefined;

		try {
			// Analyze mutation for cache invalidation planning
			if (this.config.enableOptimization) {
				analysis = queryOptimizer.analyzeQuery(mutation, variables);
			}

			// Execute mutation
			const result = await super.mutate<T>(mutation, variables, options);

			// Handle successful mutation cache invalidation
			if (result.success && this.config.enableAdvancedCaching) {
				const operationName = analysis?.operationName || this.extractOperationName(mutation);
				this.handleMutationInvalidation(operationName);
				
				// Prefetch likely needed data after mutation
				await this.prefetchAfterMutation(operationName, variables);
			}

			// Record performance
			const executionTime = Date.now() - startTime;
			this.recordPerformance(mutation, executionTime, 'mutation', result);

			return result;

		} catch (error) {
			const executionTime = Date.now() - startTime;
			this.recordPerformance(mutation, executionTime, 'error');
			throw error;
		}
	}

	/**
	 * Prefetch queries to warm the cache
	 */
	async prefetch(
		queries: Array<{
			query: string;
			variables?: Record<string, any>;
			tags?: string[];
			priority?: CachePriority;
		}>
	): Promise<void> {
		if (!this.config.enableAdvancedCaching) return;

		await graphqlCache.prefetch(queries, async (query, variables) => {
			try {
				const result = await super.query(query, variables, { skipCache: true });
				return result.data;
			} catch (error) {
				console.debug('Prefetch failed:', error);
				return null;
			}
		});
	}

	/**
	 * Get performance analytics and optimization suggestions
	 */
	getPerformanceAnalytics(): {
		metrics: Record<string, any>;
		suggestions: Array<{
			type: string;
			message: string;
			impact: string;
		}>;
		cacheStats: any;
	} {
		const cacheStats = graphqlCache.getStatistics();
		const suggestions: any[] = [];

		// Analyze performance patterns
		for (const [queryHash, times] of this.performanceMetrics.entries()) {
			if (times.length > 5) {
				const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
				const recentTime = times[times.length - 1];
				
				if (recentTime > avgTime * 1.5) {
					suggestions.push({
						type: 'performance-degradation',
						message: `Query performance degraded: ${recentTime}ms vs ${Math.round(avgTime)}ms average`,
						impact: 'high'
					});
				}
			}
		}

		// Cache performance suggestions
		if (cacheStats.hitRate < 60) {
			suggestions.push({
				type: 'cache-optimization',
				message: `Cache hit rate is ${cacheStats.hitRate}% - consider optimizing cache strategy`,
				impact: 'medium'
			});
		}

		return {
			metrics: {
				totalQueries: this.performanceMetrics.size,
				cacheHitRate: cacheStats.hitRate,
				averageResponseTime: this.calculateAverageResponseTime(),
				memoryUsage: cacheStats.memoryUsage
			},
			suggestions,
			cacheStats
		};
	}

	/**
	 * Clear all caches and reset performance metrics
	 */
	reset(): void {
		if (this.config.enableAdvancedCaching) {
			graphqlCache.clear();
		}
		super.clearCache();
		this.performanceMetrics.clear();
		this.queryBatch = [];
		if (this.batchTimeout) {
			clearTimeout(this.batchTimeout);
			this.batchTimeout = null;
		}
	}

	/**
	 * Check advanced cache for query result
	 */
	private async checkAdvancedCache<T>(
		query: string,
		variables: Record<string, any> | undefined,
		analysis: QueryAnalysis | undefined,
		options: QueryContext
	): Promise<GraphQLResponse<T> | null> {
		const cacheEntry = await graphqlCache.get<T>(query, variables, {
			tags: options.tags || analysis?.cacheability.tags,
			priority: options.priority || (analysis?.cacheability.priority as any),
			ttl: options.cacheTTL || analysis?.cacheability.ttlSuggestion,
			staleWhileRevalidate: options.staleWhileRevalidate ?? true
		});

		if (cacheEntry) {
			return {
				data: cacheEntry.data,
				success: true,
				fromCache: true,
				cacheMetadata: {
					timestamp: cacheEntry.timestamp,
					age: Date.now() - cacheEntry.timestamp,
					accessCount: cacheEntry.accessCount
				}
			};
		}

		return null;
	}

	/**
	 * Cache query result with intelligent metadata
	 */
	private async cacheQueryResult<T>(
		query: string,
		variables: Record<string, any> | undefined,
		data: T,
		analysis: QueryAnalysis | undefined,
		options: QueryContext
	): Promise<void> {
		if (analysis?.operationType !== 'query') return;

		graphqlCache.set(query, variables, data, {
			tags: options.tags || analysis.cacheability.tags,
			priority: options.priority || (analysis.cacheability.priority as any),
			ttl: options.cacheTTL || analysis.cacheability.ttlSuggestion,
			staleWhileRevalidate: options.staleWhileRevalidate ?? true
		});
	}

	/**
	 * Execute query with batching (experimental)
	 */
	private async executeBatchedQuery<T>(
		query: string,
		variables: Record<string, any> | undefined,
		options: QueryOptions
	): Promise<GraphQLResponse<T>> {
		return new Promise((resolve, reject) => {
			this.queryBatch.push({ query, variables, resolve, reject });

			if (!this.batchTimeout) {
				this.batchTimeout = window.setTimeout(() => {
					this.flushQueryBatch();
				}, 10); // 10ms batch window
			}
		});
	}

	/**
	 * Flush batched queries
	 */
	private async flushQueryBatch(): Promise<void> {
		if (this.queryBatch.length === 0) return;

		const batch = [...this.queryBatch];
		this.queryBatch = [];
		this.batchTimeout = null;

		// For now, execute individually (proper batching would require query merging)
		for (const { query, variables, resolve, reject } of batch) {
			try {
				const result = await super.query(query, variables, { skipCache: true });
				resolve(result);
			} catch (error) {
				reject(error);
			}
		}
	}

	/**
	 * Handle cache invalidation after mutations
	 */
	private handleMutationInvalidation(operationName: string): void {
		if (!this.config.enableAdvancedCaching) return;

		// Use the cache's smart invalidation
		graphqlCache.invalidate({ mutation: operationName });
	}

	/**
	 * Prefetch data likely to be needed after a mutation
	 */
	private async prefetchAfterMutation(
		operationName: string,
		variables?: Record<string, any>
	): Promise<void> {
		// Define prefetch patterns based on mutations
		const prefetchPatterns: Record<string, string[]> = {
			'createEmployee': ['GetEmployees', 'GetDashboardStats'],
			'updateEmployee': ['GetEmployee', 'GetEmployees'],
			'deleteEmployee': ['GetEmployees', 'GetDashboardStats'],
			'createDepartment': ['GetDepartments', 'GetEmployees'],
			'updateDepartment': ['GetDepartment', 'GetDepartments']
		};

		const queries = prefetchPatterns[operationName] || [];
		if (queries.length === 0) return;

		// This would need actual query definitions - simplified for demo
		console.debug(`🔄 Prefetching ${queries.length} queries after ${operationName}`);
	}

	/**
	 * Record query performance metrics
	 */
	private recordPerformance(
		query: string,
		duration: number,
		type: 'execution' | 'cache-hit' | 'error' | 'mutation',
		result?: any
	): void {
		if (!this.config.enablePerformanceMonitoring) return;

		const queryHash = this.hashQuery(query);
		const history = this.performanceMetrics.get(queryHash) || [];
		history.push(duration);

		// Keep only recent metrics
		if (history.length > 50) {
			history.splice(0, history.length - 50);
		}

		this.performanceMetrics.set(queryHash, history);

		// Record with query optimizer for analysis
		queryOptimizer.recordPerformance(query, duration, JSON.stringify(result?.data || {}).length);
	}

	/**
	 * Calculate average response time across all queries
	 */
	private calculateAverageResponseTime(): number {
		let totalTime = 0;
		let totalQueries = 0;

		for (const times of this.performanceMetrics.values()) {
			totalTime += times.reduce((sum, time) => sum + time, 0);
			totalQueries += times.length;
		}

		return totalQueries > 0 ? Math.round(totalTime / totalQueries) : 0;
	}

	/**
	 * Extract operation name from query
	 */
	private extractOperationName(query: string): string {
		const match = query.match(/(?:query|mutation|subscription)\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
		return match ? match[1] : 'UnnamedOperation';
	}

	/**
	 * Simple query hashing for performance tracking
	 */
	private hashQuery(query: string): string {
		let hash = 0;
		const normalized = query.replace(/\s+/g, ' ').trim();
		for (let i = 0; i < normalized.length; i++) {
			const char = normalized.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash = hash & hash;
		}
		return hash.toString(36);
	}
}

/**
 * Enhanced Server GraphQL Client (minimal enhancements for server-side)
 */
export class EnhancedServerGraphQLClient extends ServerGraphQLClient {
	private config: EnhancedClientConfig;

	constructor(config: EnhancedClientConfig = {}) {
		super(config);
		this.config = {
			enableOptimization: true,
			enablePerformanceMonitoring: true,
			...config
		};
	}

	override async query<T = any>(
		query: string,
		variables?: Record<string, any>,
		options: QueryOptions & QueryContext = {}
	): Promise<GraphQLResponse<T>> {
		const startTime = Date.now();

		// Server-side optimization (if enabled)
		if (this.config.enableOptimization && options.enableOptimization !== false) {
			const analysis = queryOptimizer.analyzeQuery(query, variables);
			
			// Log complex queries on server
			if (analysis.complexity.score > 100) {
				console.warn(`🔍 Complex query detected on server: ${analysis.complexity.score} complexity`, {
					operationName: analysis.operationName,
					suggestions: analysis.complexity.suggestions.length
				});
			}
		}

		try {
			const result = await super.query<T>(query, variables, options);
			
			// Record server-side performance
			if (this.config.enablePerformanceMonitoring) {
				const duration = Date.now() - startTime;
				queryOptimizer.recordPerformance(query, duration, JSON.stringify(result.data || {}).length);
			}

			return result;
		} catch (error) {
			const duration = Date.now() - startTime;
			console.error(`GraphQL query failed on server after ${duration}ms:`, error);
			throw error;
		}
	}
}

/**
 * Factory functions for enhanced clients
 */
export function createEnhancedGraphQLClient(config: EnhancedClientConfig = {}): EnhancedBrowserGraphQLClient {
	if (!browser) {
		throw new Error('Enhanced browser client can only be created in browser environment');
	}
	return new EnhancedBrowserGraphQLClient(config);
}

export function createEnhancedServerClient(
	token?: string,
	config: EnhancedClientConfig = {}
): EnhancedServerGraphQLClient {
	const client = new EnhancedServerGraphQLClient(config);
	if (token) {
		client.setToken(token);
	}
	return client;
}

/**
 * Create optimized client with recommended settings
 */
export function createOptimizedClient(
	level: 'performance' | 'memory' | 'balanced' = 'balanced'
): EnhancedBrowserGraphQLClient {
	const configs: Record<string, EnhancedClientConfig> = {
		performance: {
			enableOptimization: true,
			enableAdvancedCaching: true,
			enablePerformanceMonitoring: true,
			enableQueryBatching: true,
			optimizationLevel: 'aggressive',
			cacheStrategy: 'memory'
		},
		memory: {
			enableOptimization: true,
			enableAdvancedCaching: false, // Reduce memory usage
			enablePerformanceMonitoring: false,
			enableQueryBatching: false,
			optimizationLevel: 'conservative'
		},
		balanced: {
			enableOptimization: true,
			enableAdvancedCaching: true,
			enablePerformanceMonitoring: true,
			enableQueryBatching: false,
			optimizationLevel: 'balanced',
			cacheStrategy: 'memory'
		}
	};

	return createEnhancedGraphQLClient(configs[level]);
}