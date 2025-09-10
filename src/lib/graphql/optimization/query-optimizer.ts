/**
 * GraphQL Query Optimizer
 * 
 * Provides intelligent query analysis and optimization including:
 * - Query complexity analysis and scoring
 * - Field selection optimization
 * - Query batching recommendations
 * - Performance monitoring and suggestions
 * - Automatic query simplification
 */

import { GRAPHQL_CONFIG } from '$lib/env';
import { logError, createError, ErrorType } from '$lib/utils/errors';

/**
 * Query complexity metrics
 */
export interface QueryComplexity {
	score: number;
	depth: number;
	fieldCount: number;
	aliasCount: number;
	fragmentCount: number;
	hasNestedLists: boolean;
	estimatedCost: number;
	suggestions: OptimizationSuggestion[];
}

/**
 * Optimization suggestion
 */
export interface OptimizationSuggestion {
	type: 'warning' | 'error' | 'info';
	category: 'performance' | 'caching' | 'complexity' | 'structure';
	message: string;
	suggestion: string;
	impact: 'low' | 'medium' | 'high';
	autoFixable: boolean;
}

/**
 * Query analysis result
 */
export interface QueryAnalysis {
	query: string;
	operationType: 'query' | 'mutation' | 'subscription';
	operationName?: string;
	complexity: QueryComplexity;
	cacheability: {
		canCache: boolean;
		ttlSuggestion: number;
		tags: string[];
		priority: 'low' | 'normal' | 'high' | 'critical';
	};
	performance: {
		estimatedExecutionTime: number;
		networkOverhead: number;
		parsingCost: number;
		optimizationPotential: number;
	};
}

/**
 * Query batch optimization
 */
export interface QueryBatch {
	queries: string[];
	combinedQuery?: string;
	estimatedSavings: {
		networkRequests: number;
		totalTime: number;
		bandwidth: number;
	};
	feasible: boolean;
	reason?: string;
}

/**
 * GraphQL Query Optimizer
 */
export class GraphQLQueryOptimizer {
	private complexityCache = new Map<string, QueryComplexity>();
	private fieldWeights = new Map<string, number>();
	private performanceHistory = new Map<string, number[]>();

	constructor() {
		this.initializeFieldWeights();
	}

	/**
	 * Analyze query for complexity and optimization opportunities
	 */
	analyzeQuery(query: string, variables?: Record<string, any>): QueryAnalysis {
		const complexity = this.calculateComplexity(query);
		const operationType = this.extractOperationType(query);
		const operationName = this.extractOperationName(query);
		
		return {
			query,
			operationType,
			operationName,
			complexity,
			cacheability: this.analyzeCacheability(query, complexity, operationType),
			performance: this.analyzePerformance(query, complexity, variables)
		};
	}

	/**
	 * Optimize query by removing unnecessary fields and restructuring
	 */
	optimizeQuery(query: string, options: {
		removeUnusedFields?: string[];
		maxDepth?: number;
		maxComplexity?: number;
		preferFragments?: boolean;
	} = {}): {
		optimizedQuery: string;
		improvements: OptimizationSuggestion[];
		complexityReduction: number;
	} {
		let optimizedQuery = query;
		const improvements: OptimizationSuggestion[] = [];
		const originalComplexity = this.calculateComplexity(query);

		// Remove unused fields
		if (options.removeUnusedFields && options.removeUnusedFields.length > 0) {
			const result = this.removeUnusedFields(optimizedQuery, options.removeUnusedFields);
			optimizedQuery = result.query;
			improvements.push(...result.improvements);
		}

		// Limit query depth
		if (options.maxDepth && originalComplexity.depth > options.maxDepth) {
			const result = this.limitQueryDepth(optimizedQuery, options.maxDepth);
			optimizedQuery = result.query;
			improvements.push(...result.improvements);
		}

		// Convert repeated field patterns to fragments
		if (options.preferFragments) {
			const result = this.extractFragments(optimizedQuery);
			optimizedQuery = result.query;
			improvements.push(...result.improvements);
		}

		// Add pagination where beneficial
		const paginationResult = this.addPagination(optimizedQuery);
		optimizedQuery = paginationResult.query;
		improvements.push(...paginationResult.improvements);

		const optimizedComplexity = this.calculateComplexity(optimizedQuery);
		const complexityReduction = originalComplexity.score - optimizedComplexity.score;

		return {
			optimizedQuery,
			improvements,
			complexityReduction
		};
	}

	/**
	 * Batch multiple queries into a single request where possible
	 */
	batchQueries(queries: string[]): QueryBatch {
		if (queries.length < 2) {
			return {
				queries,
				feasible: false,
				reason: 'Need at least 2 queries to batch',
				estimatedSavings: { networkRequests: 0, totalTime: 0, bandwidth: 0 }
			};
		}

		// Check if all queries are the same operation type
		const operationTypes = queries.map(q => this.extractOperationType(q));
		const allSameType = operationTypes.every(type => type === operationTypes[0]);

		if (!allSameType) {
			return {
				queries,
				feasible: false,
				reason: 'Cannot batch queries of different operation types',
				estimatedSavings: { networkRequests: 0, totalTime: 0, bandwidth: 0 }
			};
		}

		// For mutations, batching may not be safe due to side effects
		if (operationTypes[0] === 'mutation') {
			return {
				queries,
				feasible: false,
				reason: 'Mutation batching requires careful side effect analysis',
				estimatedSavings: { networkRequests: 0, totalTime: 0, bandwidth: 0 }
			};
		}

		// Attempt to create batched query
		const batchResult = this.createBatchedQuery(queries);
		
		return {
			queries,
			combinedQuery: batchResult.combinedQuery,
			feasible: batchResult.feasible,
			reason: batchResult.reason,
			estimatedSavings: this.calculateBatchSavings(queries, batchResult.combinedQuery)
		};
	}

	/**
	 * Record query performance for optimization analysis
	 */
	recordPerformance(query: string, executionTime: number, dataSize: number): void {
		const queryHash = this.hashQuery(query);
		const history = this.performanceHistory.get(queryHash) || [];
		
		history.push(executionTime);
		
		// Keep only recent performance data
		if (history.length > 100) {
			history.splice(0, history.length - 100);
		}
		
		this.performanceHistory.set(queryHash, history);
		
		// Log slow queries
		if (executionTime > GRAPHQL_CONFIG.slowQueryThreshold) {
			const analysis = this.analyzeQuery(query);
			console.warn('🐌 Slow GraphQL query detected:', {
				executionTime: `${executionTime}ms`,
				complexity: analysis.complexity.score,
				suggestions: analysis.complexity.suggestions.length,
				operationName: analysis.operationName
			});
		}
	}

	/**
	 * Get performance recommendations for a query
	 */
	getPerformanceRecommendations(query: string): OptimizationSuggestion[] {
		const analysis = this.analyzeQuery(query);
		const suggestions: OptimizationSuggestion[] = [];
		
		// Add complexity-based suggestions
		suggestions.push(...analysis.complexity.suggestions);
		
		// Add caching suggestions
		if (analysis.cacheability.canCache) {
			suggestions.push({
				type: 'info',
				category: 'caching',
				message: 'This query can be cached effectively',
				suggestion: `Consider caching with TTL of ${analysis.cacheability.ttlSuggestion}s`,
				impact: 'medium',
				autoFixable: true
			});
		}
		
		// Add performance suggestions based on history
		const queryHash = this.hashQuery(query);
		const history = this.performanceHistory.get(queryHash);
		if (history && history.length > 5) {
			const avgTime = history.reduce((sum, time) => sum + time, 0) / history.length;
			const recentTime = history[history.length - 1];
			
			if (recentTime > avgTime * 1.5) {
				suggestions.push({
					type: 'warning',
					category: 'performance',
					message: `Query performance degraded: ${recentTime}ms vs ${Math.round(avgTime)}ms average`,
					suggestion: 'Consider optimizing query structure or checking server performance',
					impact: 'high',
					autoFixable: false
				});
			}
		}
		
		return suggestions;
	}

	/**
	 * Calculate query complexity score
	 */
	private calculateComplexity(query: string): QueryComplexity {
		const queryHash = this.hashQuery(query);
		const cached = this.complexityCache.get(queryHash);
		if (cached) {
			return cached;
		}

		const suggestions: OptimizationSuggestion[] = [];
		
		// Basic metrics
		const depth = this.calculateDepth(query);
		const fieldCount = this.countFields(query);
		const aliasCount = this.countAliases(query);
		const fragmentCount = this.countFragments(query);
		const hasNestedLists = this.hasNestedLists(query);

		// Calculate base complexity score
		let score = fieldCount;
		score += depth * 10; // Depth is expensive
		score += aliasCount * 2; // Aliases add some overhead
		score += fragmentCount * 5; // Fragments add parsing complexity
		if (hasNestedLists) score *= 1.5; // Nested lists are expensive

		// Apply field-specific weights
		const fieldNames = this.extractFieldNames(query);
		for (const fieldName of fieldNames) {
			const weight = this.fieldWeights.get(fieldName) || 1;
			score += weight;
		}

		// Generate suggestions based on complexity
		if (depth > 8) {
			suggestions.push({
				type: 'warning',
				category: 'complexity',
				message: `Query depth is ${depth}, which may impact performance`,
				suggestion: 'Consider breaking deep queries into multiple requests or using pagination',
				impact: 'high',
				autoFixable: true
			});
		}

		if (fieldCount > 50) {
			suggestions.push({
				type: 'warning',
				category: 'performance',
				message: `Query selects ${fieldCount} fields, which increases parsing time`,
				suggestion: 'Consider selecting only necessary fields or using fragments',
				impact: 'medium',
				autoFixable: true
			});
		}

		if (hasNestedLists && fieldCount > 20) {
			suggestions.push({
				type: 'error',
				category: 'performance',
				message: 'Nested lists with many fields can cause N+1 query problems',
				suggestion: 'Use pagination, limit nested list sizes, or implement dataloader patterns',
				impact: 'high',
				autoFixable: false
			});
		}

		const complexity: QueryComplexity = {
			score: Math.round(score),
			depth,
			fieldCount,
			aliasCount,
			fragmentCount,
			hasNestedLists,
			estimatedCost: this.estimateExecutionCost(score, depth, fieldCount),
			suggestions
		};

		this.complexityCache.set(queryHash, complexity);
		return complexity;
	}

	/**
	 * Analyze query cacheability
	 */
	private analyzeCacheability(
		query: string, 
		complexity: QueryComplexity, 
		operationType: string
	): QueryAnalysis['cacheability'] {
		// Mutations and subscriptions are generally not cacheable
		if (operationType !== 'query') {
			return {
				canCache: false,
				ttlSuggestion: 0,
				tags: [],
				priority: 'low'
			};
		}

		// Extract semantic information
		const tags = this.extractSemanticTags(query);
		
		// Determine cache priority based on query characteristics
		let priority: 'low' | 'normal' | 'high' | 'critical' = 'normal';
		if (complexity.score > 100) priority = 'high';
		if (tags.includes('dashboard') || tags.includes('summary')) priority = 'high';
		if (tags.includes('user') || tags.includes('profile')) priority = 'critical';

		// Suggest TTL based on data type
		let ttlSuggestion = GRAPHQL_CONFIG.cacheTTL;
		if (tags.includes('dashboard')) ttlSuggestion = 300; // 5 minutes
		if (tags.includes('employees')) ttlSuggestion = 600; // 10 minutes
		if (tags.includes('departments')) ttlSuggestion = 1800; // 30 minutes
		if (tags.includes('static')) ttlSuggestion = 3600; // 1 hour

		return {
			canCache: true,
			ttlSuggestion,
			tags,
			priority
		};
	}

	/**
	 * Analyze query performance characteristics
	 */
	private analyzePerformance(
		query: string, 
		complexity: QueryComplexity, 
		variables?: Record<string, any>
	): QueryAnalysis['performance'] {
		const estimatedExecutionTime = this.estimateExecutionTime(complexity, variables);
		const networkOverhead = this.estimateNetworkOverhead(query);
		const parsingCost = this.estimateParsingCost(complexity);
		
		// Calculate optimization potential (0-100)
		let optimizationPotential = 0;
		if (complexity.depth > 5) optimizationPotential += 20;
		if (complexity.fieldCount > 30) optimizationPotential += 15;
		if (complexity.hasNestedLists) optimizationPotential += 25;
		if (complexity.suggestions.length > 2) optimizationPotential += 20;
		
		return {
			estimatedExecutionTime,
			networkOverhead,
			parsingCost,
			optimizationPotential: Math.min(optimizationPotential, 100)
		};
	}

	/**
	 * Initialize field weights for complexity calculation
	 */
	private initializeFieldWeights(): void {
		// Common expensive fields
		this.fieldWeights.set('employees', 10);
		this.fieldWeights.set('tasks', 8);
		this.fieldWeights.set('documents', 6);
		this.fieldWeights.set('activities', 5);
		this.fieldWeights.set('permissions', 4);
		
		// Metadata fields are cheap
		this.fieldWeights.set('id', 0.1);
		this.fieldWeights.set('name', 0.5);
		this.fieldWeights.set('email', 0.5);
		this.fieldWeights.set('created_at', 0.5);
		this.fieldWeights.set('updated_at', 0.5);
	}

	// Helper methods for query analysis
	private extractOperationType(query: string): 'query' | 'mutation' | 'subscription' {
		if (query.trim().startsWith('mutation')) return 'mutation';
		if (query.trim().startsWith('subscription')) return 'subscription';
		return 'query';
	}

	private extractOperationName(query: string): string | undefined {
		const match = query.match(/(?:query|mutation|subscription)\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
		return match ? match[1] : undefined;
	}

	private calculateDepth(query: string): number {
		const lines = query.split('\n');
		let maxDepth = 0;
		let currentDepth = 0;
		
		for (const line of lines) {
			const openBraces = (line.match(/\{/g) || []).length;
			const closeBraces = (line.match(/\}/g) || []).length;
			currentDepth += openBraces - closeBraces;
			maxDepth = Math.max(maxDepth, currentDepth);
		}
		
		return maxDepth;
	}

	private countFields(query: string): number {
		// Simple field counting - more sophisticated parsing would be better
		const fieldMatches = query.match(/\s+[a-zA-Z_][a-zA-Z0-9_]*\s*(\(.*?\))?\s*[^{]/g);
		return fieldMatches ? fieldMatches.length : 0;
	}

	private countAliases(query: string): number {
		const aliasMatches = query.match(/\s+[a-zA-Z_][a-zA-Z0-9_]*\s*:\s*[a-zA-Z_][a-zA-Z0-9_]*/g);
		return aliasMatches ? aliasMatches.length : 0;
	}

	private countFragments(query: string): number {
		const fragmentMatches = query.match(/\.\.\.[a-zA-Z_][a-zA-Z0-9_]*/g);
		return fragmentMatches ? fragmentMatches.length : 0;
	}

	private hasNestedLists(query: string): boolean {
		// Look for array field patterns within nested structures
		return /\{\s*[^}]*\[\s*[^}]*\{/.test(query);
	}

	private extractFieldNames(query: string): string[] {
		const fieldMatches = query.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g);
		return fieldMatches ? [...new Set(fieldMatches)] : [];
	}

	private extractSemanticTags(query: string): string[] {
		const tags: string[] = [];
		const lowerQuery = query.toLowerCase();
		
		if (lowerQuery.includes('employee')) tags.push('employees');
		if (lowerQuery.includes('department')) tags.push('departments');
		if (lowerQuery.includes('task')) tags.push('tasks');
		if (lowerQuery.includes('dashboard')) tags.push('dashboard');
		if (lowerQuery.includes('user') || lowerQuery.includes('profile')) tags.push('user');
		if (lowerQuery.includes('role') || lowerQuery.includes('permission')) tags.push('permissions');
		
		return tags;
	}

	private estimateExecutionCost(score: number, depth: number, fieldCount: number): number {
		// Simple cost model - in practice this would be based on actual profiling
		return score * 0.1 + depth * 2 + fieldCount * 0.5;
	}

	private estimateExecutionTime(complexity: QueryComplexity, variables?: Record<string, any>): number {
		// Base time + complexity factor
		let baseTime = 50; // 50ms base
		baseTime += complexity.score * 2;
		baseTime += complexity.depth * 10;
		
		// Variable-based adjustments
		if (variables) {
			const hasLargeLimit = Object.values(variables).some(v => 
				typeof v === 'number' && v > 100
			);
			if (hasLargeLimit) baseTime *= 1.5;
		}
		
		return Math.round(baseTime);
	}

	private estimateNetworkOverhead(query: string): number {
		// Estimate based on query size
		return Math.round(query.length * 0.1 + 20); // Base 20ms + size factor
	}

	private estimateParsingCost(complexity: QueryComplexity): number {
		return Math.round(complexity.fieldCount * 0.5 + complexity.depth * 2);
	}

	private hashQuery(query: string): string {
		// Simple hash function for query caching
		let hash = 0;
		const normalized = query.replace(/\s+/g, ' ').trim();
		for (let i = 0; i < normalized.length; i++) {
			const char = normalized.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash = hash & hash; // Convert to 32-bit integer
		}
		return hash.toString(36);
	}

	private removeUnusedFields(query: string, unusedFields: string[]): {
		query: string;
		improvements: OptimizationSuggestion[];
	} {
		// This is a simplified implementation
		let optimizedQuery = query;
		const improvements: OptimizationSuggestion[] = [];
		
		for (const field of unusedFields) {
			const fieldRegex = new RegExp(`\\s+${field}\\s*`, 'g');
			if (fieldRegex.test(optimizedQuery)) {
				optimizedQuery = optimizedQuery.replace(fieldRegex, ' ');
				improvements.push({
					type: 'info',
					category: 'performance',
					message: `Removed unused field: ${field}`,
					suggestion: 'Removing unused fields reduces query complexity and network overhead',
					impact: 'low',
					autoFixable: true
				});
			}
		}
		
		return { query: optimizedQuery, improvements };
	}

	private limitQueryDepth(query: string, maxDepth: number): {
		query: string;
		improvements: OptimizationSuggestion[];
	} {
		// This would require more sophisticated GraphQL parsing
		return {
			query,
			improvements: [{
				type: 'info',
				category: 'complexity',
				message: `Query depth limiting would require GraphQL AST parsing`,
				suggestion: 'Consider implementing query depth limiting at the server level',
				impact: 'medium',
				autoFixable: false
			}]
		};
	}

	private extractFragments(query: string): {
		query: string;
		improvements: OptimizationSuggestion[];
	} {
		// Fragment extraction would require pattern analysis
		return {
			query,
			improvements: [{
				type: 'info',
				category: 'structure',
				message: 'Fragment extraction could reduce query duplication',
				suggestion: 'Consider extracting common field patterns into reusable fragments',
				impact: 'low',
				autoFixable: true
			}]
		};
	}

	private addPagination(query: string): {
		query: string;
		improvements: OptimizationSuggestion[];
	} {
		const improvements: OptimizationSuggestion[] = [];
		
		// Check if query could benefit from pagination
		const hasListFields = /\b(employees|tasks|documents|activities)\b/.test(query);
		const hasPagination = /\b(first|last|limit|offset|after|before)\b/.test(query);
		
		if (hasListFields && !hasPagination) {
			improvements.push({
				type: 'warning',
				category: 'performance',
				message: 'Query fetches list data without pagination',
				suggestion: 'Add pagination parameters (first, after) to limit data transfer',
				impact: 'high',
				autoFixable: true
			});
		}
		
		return { query, improvements };
	}

	private createBatchedQuery(queries: string[]): {
		combinedQuery?: string;
		feasible: boolean;
		reason?: string;
	} {
		// This would require sophisticated query merging
		return {
			feasible: false,
			reason: 'Query batching requires advanced GraphQL query merging capabilities'
		};
	}

	private calculateBatchSavings(queries: string[], combinedQuery?: string): {
		networkRequests: number;
		totalTime: number;
		bandwidth: number;
	} {
		const networkRequests = queries.length - 1; // One combined request vs N separate
		const totalTime = networkRequests * 50; // Assume 50ms per request overhead
		const bandwidth = networkRequests * 200; // Assume 200 bytes overhead per request
		
		return { networkRequests, totalTime, bandwidth };
	}
}

/**
 * Global query optimizer instance
 */
export const queryOptimizer = new GraphQLQueryOptimizer();