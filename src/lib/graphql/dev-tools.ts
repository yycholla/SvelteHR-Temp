/**
 * GraphQL Development Tools
 * 
 * Provides query complexity analyzer, performance profiler, schema validator,
 * and other development utilities for GraphQL API migration and debugging.
 * 
 * Only available in development environment for security and performance reasons.
 */

import type { GraphQLRequest, GraphQLResponse, GraphQLError } from './types';

/**
 * Query complexity analysis result
 */
export interface QueryComplexityAnalysis {
	complexity: number;
	maxAllowed: number;
	isValid: boolean;
	breakdown: {
		fields: number;
		depth: number;
		connections: number;
		resolvers: number;
	};
	warnings: string[];
	suggestions: string[];
}

/**
 * Performance profile for GraphQL query
 */
export interface QueryPerformanceProfile {
	queryId: string;
	query: string;
	variables: Record<string, any>;
	startTime: number;
	endTime: number;
	duration: number;
	networkTime: number;
	parseTime?: number;
	validationTime?: number;
	executionTime?: number;
	cacheHit: boolean;
	errors: GraphQLError[];
	warnings: string[];
	memoryUsage?: {
		peak: number;
		current: number;
	};
}

/**
 * Schema validation result
 */
export interface SchemaValidationResult {
	isValid: boolean;
	errors: string[];
	warnings: string[];
	metrics: {
		typeCount: number;
		fieldCount: number;
		enumCount: number;
		complexityScore: number;
	};
	suggestions: string[];
}

/**
 * Development tools configuration
 */
export interface DevToolsConfig {
	enableComplexityAnalysis: boolean;
	enablePerformanceProfiler: boolean;
	enableSchemaValidation: boolean;
	complexityLimits: {
		Admin: number;
		HR_Manager: number;
		Manager: number;
		Employee: number;
	};
	performanceThresholds: {
		warning: number; // ms
		error: number; // ms
	};
	logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Default development tools configuration
 */
const DEFAULT_CONFIG: DevToolsConfig = {
	enableComplexityAnalysis: true,
	enablePerformanceProfiler: true,
	enableSchemaValidation: true,
	complexityLimits: {
		Admin: 1000,
		HR_Manager: 500,
		Manager: 200,
		Employee: 100
	},
	performanceThresholds: {
		warning: 200, // 200ms
		error: 1000   // 1 second
	},
	logLevel: 'debug'
};

/**
 * GraphQL Development Tools Class
 */
export class GraphQLDevTools {
	private config: DevToolsConfig;
	private profiles: Map<string, QueryPerformanceProfile> = new Map();
	private activeProfiles: Map<string, Partial<QueryPerformanceProfile>> = new Map();

	constructor(config: Partial<DevToolsConfig> = {}) {
		if (process.env.NODE_ENV === 'production') {
			console.warn('GraphQL DevTools should not be used in production');
		}
		
		this.config = { ...DEFAULT_CONFIG, ...config };
	}

	/**
	 * Analyze query complexity
	 */
	analyzeComplexity(query: string, userRole: string = 'Employee'): QueryComplexityAnalysis {
		if (!this.config.enableComplexityAnalysis) {
			return {
				complexity: 0,
				maxAllowed: this.config.complexityLimits[userRole as keyof typeof this.config.complexityLimits] || 100,
				isValid: true,
				breakdown: { fields: 0, depth: 0, connections: 0, resolvers: 0 },
				warnings: [],
				suggestions: []
			};
		}

		const analysis = this.calculateComplexity(query);
		const maxAllowed = this.config.complexityLimits[userRole as keyof typeof this.config.complexityLimits] || 100;
		
		const result: QueryComplexityAnalysis = {
			...analysis,
			maxAllowed,
			isValid: analysis.complexity <= maxAllowed,
			warnings: [],
			suggestions: []
		};

		// Add warnings and suggestions
		if (result.complexity > maxAllowed * 0.8) {
			result.warnings.push(`Query complexity (${result.complexity}) is approaching limit (${maxAllowed})`);
		}

		if (result.breakdown.depth > 10) {
			result.warnings.push(`Query depth (${result.breakdown.depth}) is very deep - consider pagination`);
			result.suggestions.push('Use pagination with "first" and "after" parameters');
		}

		if (result.breakdown.connections > 5) {
			result.suggestions.push('Consider breaking query into multiple smaller queries');
		}

		this.log('debug', `Query complexity analysis: ${result.complexity}/${maxAllowed}`, result);
		
		return result;
	}

	/**
	 * Start performance profiling for a query
	 */
	startProfiling(query: string, variables: Record<string, any> = {}): string {
		if (!this.config.enablePerformanceProfiler) {
			return '';
		}

		const queryId = this.generateQueryId(query, variables);
		const startTime = performance.now();

		this.activeProfiles.set(queryId, {
			queryId,
			query,
			variables,
			startTime,
			cacheHit: false,
			errors: []
		});

		this.log('debug', `Started profiling query: ${queryId.substring(0, 8)}`);
		
		return queryId;
	}

	/**
	 * End performance profiling and return profile
	 */
	endProfiling(queryId: string, response: GraphQLResponse, cacheHit: boolean = false): QueryPerformanceProfile | null {
		if (!this.config.enablePerformanceProfiler || !queryId) {
			return null;
		}

		const activeProfile = this.activeProfiles.get(queryId);
		if (!activeProfile) {
			this.log('warn', `No active profile found for query ID: ${queryId}`);
			return null;
		}

		const endTime = performance.now();
		const duration = endTime - activeProfile.startTime!;

		const profile: QueryPerformanceProfile = {
			...activeProfile,
			endTime,
			duration,
			networkTime: duration, // In browser context, this is total time
			cacheHit,
			errors: response.errors || [],
			warnings: []
		} as QueryPerformanceProfile;

		// Add performance warnings
		if (duration > this.config.performanceThresholds.error) {
			profile.warnings.push(`Query took ${Math.round(duration)}ms (exceeds error threshold)`);
		} else if (duration > this.config.performanceThresholds.warning) {
			profile.warnings.push(`Query took ${Math.round(duration)}ms (exceeds warning threshold)`);
		}

		// Store completed profile
		this.profiles.set(queryId, profile);
		this.activeProfiles.delete(queryId);

		this.log('debug', `Query ${queryId.substring(0, 8)} completed in ${Math.round(duration)}ms`, profile);

		return profile;
	}

	/**
	 * Get performance profile by query ID
	 */
	getProfile(queryId: string): QueryPerformanceProfile | undefined {
		return this.profiles.get(queryId);
	}

	/**
	 * Get all performance profiles
	 */
	getAllProfiles(): QueryPerformanceProfile[] {
		return Array.from(this.profiles.values());
	}

	/**
	 * Get performance statistics
	 */
	getPerformanceStats(): {
		totalQueries: number;
		averageResponseTime: number;
		cacheHitRate: number;
		errorRate: number;
		slowQueries: QueryPerformanceProfile[];
	} {
		const profiles = this.getAllProfiles();
		
		if (profiles.length === 0) {
			return {
				totalQueries: 0,
				averageResponseTime: 0,
				cacheHitRate: 0,
				errorRate: 0,
				slowQueries: []
			};
		}

		const totalTime = profiles.reduce((sum, p) => sum + p.duration, 0);
		const cacheHits = profiles.filter(p => p.cacheHit).length;
		const errors = profiles.filter(p => p.errors.length > 0).length;
		const slowQueries = profiles.filter(p => p.duration > this.config.performanceThresholds.warning);

		return {
			totalQueries: profiles.length,
			averageResponseTime: Math.round(totalTime / profiles.length),
			cacheHitRate: Math.round((cacheHits / profiles.length) * 100),
			errorRate: Math.round((errors / profiles.length) * 100),
			slowQueries
		};
	}

	/**
	 * Validate GraphQL schema structure
	 */
	validateSchema(schema: string): SchemaValidationResult {
		if (!this.config.enableSchemaValidation) {
			return {
				isValid: true,
				errors: [],
				warnings: [],
				metrics: { typeCount: 0, fieldCount: 0, enumCount: 0, complexityScore: 0 },
				suggestions: []
			};
		}

		const result: SchemaValidationResult = {
			isValid: true,
			errors: [],
			warnings: [],
			metrics: this.calculateSchemaMetrics(schema),
			suggestions: []
		};

		// Basic schema validation
		if (!schema.includes('type Query')) {
			result.errors.push('Schema missing Query root type');
			result.isValid = false;
		}

		if (!schema.includes('type Mutation')) {
			result.warnings.push('Schema missing Mutation root type');
		}

		if (!schema.includes('type Subscription')) {
			result.warnings.push('Schema missing Subscription root type');
		}

		// Check for common issues
		if (result.metrics.complexityScore > 1000) {
			result.warnings.push('Schema complexity is very high - consider breaking into modules');
		}

		if (result.metrics.typeCount > 100) {
			result.suggestions.push('Consider using schema federation for large schemas');
		}

		this.log('info', `Schema validation completed`, result);

		return result;
	}

	/**
	 * Clear all profiles and reset tools
	 */
	reset(): void {
		this.profiles.clear();
		this.activeProfiles.clear();
		this.log('debug', 'DevTools reset completed');
	}

	/**
	 * Export performance data as JSON
	 */
	exportPerformanceData(): string {
		const data = {
			config: this.config,
			profiles: this.getAllProfiles(),
			stats: this.getPerformanceStats(),
			timestamp: new Date().toISOString()
		};

		return JSON.stringify(data, null, 2);
	}

	/**
	 * Calculate query complexity (simplified implementation)
	 */
	private calculateComplexity(query: string): Omit<QueryComplexityAnalysis, 'maxAllowed' | 'isValid' | 'warnings' | 'suggestions'> {
		// Simple field counting - in production, use a proper GraphQL parser
		const fieldMatches = query.match(/\w+(?=\s*[:{])/g) || [];
		const depthMatches = query.match(/{/g) || [];
		const connectionMatches = query.match(/\b(edges|nodes|connection)\b/gi) || [];
		const resolverMatches = query.match(/\w+\s*\(/g) || [];

		const fields = fieldMatches.length;
		const depth = depthMatches.length;
		const connections = connectionMatches.length;
		const resolvers = resolverMatches.length;

		// Weighted complexity calculation
		const complexity = fields + (depth * 2) + (connections * 10) + (resolvers * 5);

		return {
			complexity,
			breakdown: { fields, depth, connections, resolvers }
		};
	}

	/**
	 * Calculate schema metrics
	 */
	private calculateSchemaMetrics(schema: string): SchemaValidationResult['metrics'] {
		const typeMatches = schema.match(/type\s+\w+/g) || [];
		const fieldMatches = schema.match(/\w+\s*:/g) || [];
		const enumMatches = schema.match(/enum\s+\w+/g) || [];
		
		return {
			typeCount: typeMatches.length,
			fieldCount: fieldMatches.length,
			enumCount: enumMatches.length,
			complexityScore: fieldMatches.length + (typeMatches.length * 10)
		};
	}

	/**
	 * Generate unique query ID
	 */
	private generateQueryId(query: string, variables: Record<string, any>): string {
		const queryHash = this.simpleHash(query + JSON.stringify(variables));
		return `${queryHash}_${Date.now()}`;
	}

	/**
	 * Simple hash function
	 */
	private simpleHash(str: string): string {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash = hash & hash; // Convert to 32-bit integer
		}
		return Math.abs(hash).toString(16).substring(0, 8);
	}

	/**
	 * Logging utility
	 */
	private log(level: DevToolsConfig['logLevel'], message: string, data?: any): void {
		if (process.env.NODE_ENV === 'production') return;

		const levels = { debug: 0, info: 1, warn: 2, error: 3 };
		const currentLevel = levels[this.config.logLevel];
		const messageLevel = levels[level];

		if (messageLevel >= currentLevel) {
			const timestamp = new Date().toISOString();
			const logMessage = `[GraphQL DevTools] ${timestamp} ${level.toUpperCase()}: ${message}`;
			
			console[level](logMessage, data || '');
		}
	}
}

/**
 * Global DevTools instance (development only)
 */
let devToolsInstance: GraphQLDevTools | null = null;

/**
 * Get or create global DevTools instance
 */
export function getDevTools(config?: Partial<DevToolsConfig>): GraphQLDevTools {
	if (process.env.NODE_ENV === 'production') {
		throw new Error('DevTools are not available in production');
	}

	if (!devToolsInstance) {
		devToolsInstance = new GraphQLDevTools(config);
	}

	return devToolsInstance;
}

/**
 * Utility function to wrap GraphQL client with development tools
 */
export function withDevTools<T extends { query: Function; mutate?: Function }>(
	client: T,
	devTools?: GraphQLDevTools
): T & { devTools: GraphQLDevTools } {
	if (process.env.NODE_ENV === 'production') {
		return client as T & { devTools: GraphQLDevTools };
	}

	const tools = devTools || getDevTools();
	const originalQuery = client.query.bind(client);
	const originalMutate = client.mutate?.bind(client);

	// Wrap query method
	client.query = async (query: string, variables?: any, options?: any) => {
		const complexity = tools.analyzeComplexity(query, options?.userRole);
		
		if (!complexity.isValid) {
			throw new Error(`Query complexity (${complexity.complexity}) exceeds limit (${complexity.maxAllowed})`);
		}

		const queryId = tools.startProfiling(query, variables);
		
		try {
			const result = await originalQuery(query, variables, options);
			tools.endProfiling(queryId, result, result.fromCache || false);
			return result;
		} catch (error) {
			tools.endProfiling(queryId, { errors: [{ message: error.message }] }, false);
			throw error;
		}
	};

	// Wrap mutate method if it exists
	if (originalMutate) {
		client.mutate = async (mutation: string, variables?: any, options?: any) => {
			const complexity = tools.analyzeComplexity(mutation, options?.userRole);
			
			if (!complexity.isValid) {
				throw new Error(`Mutation complexity (${complexity.complexity}) exceeds limit (${complexity.maxAllowed})`);
			}

			const queryId = tools.startProfiling(mutation, variables);
			
			try {
				const result = await originalMutate(mutation, variables, options);
				tools.endProfiling(queryId, result, false); // Mutations are never cached
				return result;
			} catch (error) {
				tools.endProfiling(queryId, { errors: [{ message: error.message }] }, false);
				throw error;
			}
		};
	}

	return Object.assign(client, { devTools: tools });
}

/**
 * Export types for TypeScript support
 */
export type {
	QueryComplexityAnalysis,
	QueryPerformanceProfile,
	SchemaValidationResult,
	DevToolsConfig
};