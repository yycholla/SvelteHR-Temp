import { logger } from '$lib/utils/logger';
/**
 * Cache Management Utilities
 * SvelteHR GraphQL Integration Error Resolution
 *
 * Provides comprehensive cache management for GraphQL operations with:
 * - 30-minute TTL enforcement
 * - Intelligent cache invalidation
 * - Integration with URQL cache exchange
 * - Cache warming and preloading strategies
 * - Performance monitoring and optimization
 */

import type { Client } from '@urql/core';
import { Kind } from 'graphql';
import type {
	CachePolicy,
	InvalidateCacheResponse,
	InvalidateCacheVariables
} from '$lib/types/graphql-contracts';
import { GRAPHQL_OPERATION_CONSTANTS } from '$lib/types/graphql-contracts';

// =============================================================================
// Cache Configuration and Types
// =============================================================================

export interface CacheConfig {
	defaultTTL: number; // Default TTL in minutes (max 30)
	maxTTL: number; // Maximum allowed TTL in minutes
	enableStaleWhileRevalidate: boolean;
	enableCacheWarming: boolean;
	invalidationStrategies: InvalidationStrategy[];
	performanceTracking: boolean;
}

export interface InvalidationStrategy {
	name: string;
	pattern: RegExp | string;
	scope: 'user' | 'department' | 'global';
	cascading: boolean; // Whether to invalidate dependent queries
	delay?: number; // Optional delay before invalidation (ms)
}

export interface CacheEntry {
	key: string;
	data: any;
	timestamp: Date;
	ttl: number; // TTL in minutes
	accessCount: number;
	lastAccessed: Date;
	operationName: string;
	variables: any;
	tags: string[];
}

export interface CacheMetrics {
	hitRate: number;
	missRate: number;
	totalRequests: number;
	averageResponseTime: number;
	staleCacheHits: number;
	invalidationCount: number;
	memoryUsage: number; // Estimated cache size in bytes
}

// =============================================================================
// Default Configuration
// =============================================================================

export const DEFAULT_CACHE_CONFIG: CacheConfig = {
	defaultTTL: GRAPHQL_OPERATION_CONSTANTS.MAX_CACHE_TTL_MINUTES, // 30 minutes
	maxTTL: GRAPHQL_OPERATION_CONSTANTS.MAX_CACHE_TTL_MINUTES,
	enableStaleWhileRevalidate: true,
	enableCacheWarming: false, // Disabled by default for performance
	invalidationStrategies: [
		{
			name: 'user_data',
			pattern: /^(getUser|getCurrentUser|getUserProfile)/,
			scope: 'user',
			cascading: true
		},
		{
			name: 'employee_data',
			pattern: /^(getEmployee|getEmployees|createEmployee|updateEmployee)/,
			scope: 'department',
			cascading: true
		},
		{
			name: 'department_data',
			pattern: /^(getDepartment|getDepartments|createDepartment)/,
			scope: 'global',
			cascading: true
		},
		{
			name: 'dashboard_data',
			pattern: /^(getDashboard|getCompleteDashboardData)/,
			scope: 'user',
			cascading: false
		}
	],
	performanceTracking: true
};

// =============================================================================
// Cache Key Generation
// =============================================================================

export function generateCacheKey(
	operationName: string,
	variables: any = {},
	userContext?: { userId: string; roles: string[] }
): string {
	// Create a stable key from variables
	const variablesKey = JSON.stringify(variables, Object.keys(variables).sort());

	// Include user context for user-specific queries
	const contextKey = userContext
		? `${userContext.userId}:${userContext.roles.sort().join(',')}`
		: '';

	// Create the final cache key
	return `${operationName}:${variablesKey}:${contextKey}`;
}

export function generateCacheTag(operationName: string, scope: string): string {
	return `${scope}:${operationName}`;
}

// =============================================================================
// Cache Policy Management
// =============================================================================

export function createCachePolicy(
	ttlMinutes?: number,
	invalidateOnChange = true,
	staleWhileRevalidate = true
): CachePolicy {
	const effectiveTTL = Math.min(
		ttlMinutes || DEFAULT_CACHE_CONFIG.defaultTTL,
		DEFAULT_CACHE_CONFIG.maxTTL
	);

	return {
		ttlMinutes: effectiveTTL,
		invalidateOnChange,
		staleWhileRevalidate
	};
}

export function validateCachePolicy(policy: CachePolicy): boolean {
	if (policy.ttlMinutes > GRAPHQL_OPERATION_CONSTANTS.MAX_CACHE_TTL_MINUTES) {
		logger.warn(
			`Cache TTL ${policy.ttlMinutes} exceeds maximum allowed ${GRAPHQL_OPERATION_CONSTANTS.MAX_CACHE_TTL_MINUTES} minutes`
		);
		return false;
	}

	if (policy.ttlMinutes <= 0) {
		logger.warn('Cache TTL must be positive');
		return false;
	}

	return true;
}

// =============================================================================
// Cache Invalidation Logic
// =============================================================================

export class CacheInvalidator {
	private config: CacheConfig;
	private client: Client | null = null;
	private metrics: CacheMetrics;
	private invalidationHistory: Array<{
		timestamp: Date;
		keys: string[];
		strategy: string;
		scope: string;
	}> = [];

	constructor(config: Partial<CacheConfig> = {}) {
		this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
		this.metrics = {
			hitRate: 0,
			missRate: 0,
			totalRequests: 0,
			averageResponseTime: 0,
			staleCacheHits: 0,
			invalidationCount: 0,
			memoryUsage: 0
		};
	}

	setClient(client: Client): void {
		this.client = client;
	}

	/**
	 * Invalidate cache based on operation patterns
	 */
	async invalidateByOperation(
		operationName: string,
		variables: InvalidateCacheVariables
	): Promise<InvalidateCacheResponse> {
		if (!this.client) {
			throw new Error('URQL client not configured for cache invalidation');
		}

		const matchingStrategies = this.config.invalidationStrategies.filter((strategy) => {
			if (typeof strategy.pattern === 'string') {
				return operationName.includes(strategy.pattern);
			}
			return strategy.pattern.test(operationName);
		});

		const invalidatedKeys: string[] = [];
		const affectedOperations: string[] = [];

		for (const strategy of matchingStrategies) {
			const keys = await this.invalidateByStrategy(strategy, variables);
			invalidatedKeys.push(...keys);

			if (strategy.cascading) {
				const cascadingOps = await this.getCascadingOperations(strategy, variables);
				affectedOperations.push(...cascadingOps);
			}
		}

		// Record invalidation
		this.invalidationHistory.push({
			timestamp: new Date(),
			keys: invalidatedKeys,
			strategy: matchingStrategies.map((s) => s.name).join(', '),
			scope: variables.scope
		});

		this.metrics.invalidationCount += invalidatedKeys.length;

		const response: InvalidateCacheResponse = {
			cacheInvalidation: {
				success: true,
				invalidatedKeys,
				affectedOperations,
				timestamp: new Date().toISOString(),
				nextRefreshAt: new Date(Date.now() + this.config.defaultTTL * 60 * 1000).toISOString()
			}
		};

		return response;
	}

	/**
	 * Invalidate cache by specific keys
	 */
	async invalidateByKeys(keys: string[]): Promise<boolean> {
		if (!this.client) {
			return false;
		}

		try {
			// URQL cache invalidation
			keys.forEach((key) => {
				this.client!.reexecuteOperation(
					this.client!.createRequestOperation('query', {
						key: parseInt(key.split(':')[0], 36), // Convert string key back to numeric
						query: { kind: Kind.DOCUMENT, definitions: [] }, // Minimal query structure
						variables: {}
					})
				);
			});

			this.metrics.invalidationCount += keys.length;
			return true;
		} catch (error) {
			logger.error('Cache invalidation failed:', error as Error);
			return false;
		}
	}

	/**
	 * Invalidate all cache entries for a user
	 */
	async invalidateUserCache(userId: string): Promise<number> {
		// This would require custom URQL cache implementation
		// For now, we'll use a simplified approach
		const pattern = new RegExp(`.*:.*userId.*${userId}.*:.*`);
		return this.invalidateByPattern(pattern);
	}

	/**
	 * Invalidate cache entries matching a pattern
	 */
	async invalidateByPattern(pattern: RegExp): Promise<number> {
		if (!this.client) {
			return 0;
		}

		// This is a simplified implementation
		// In a real scenario, you'd need to integrate with URQL's cache introspection
		logger.info(`Would invalidate cache entries matching pattern: ${pattern}`);

		return 0; // Return number of invalidated entries
	}

	/**
	 * Get cache metrics
	 */
	getMetrics(): CacheMetrics {
		return { ...this.metrics };
	}

	/**
	 * Get invalidation history
	 */
	getInvalidationHistory(): typeof this.invalidationHistory {
		return [...this.invalidationHistory];
	}

	private async invalidateByStrategy(
		strategy: InvalidationStrategy,
		variables: InvalidateCacheVariables
	): Promise<string[]> {
		const keys: string[] = [];

		// Apply delay if specified
		if (strategy.delay) {
			await new Promise((resolve) => setTimeout(resolve, strategy.delay));
		}

		// Generate keys based on strategy scope
		switch (strategy.scope) {
			case 'user':
				keys.push(...this.generateUserScopedKeys(variables.userId, strategy));
				break;
			case 'department':
				keys.push(...this.generateDepartmentScopedKeys(variables.userId, strategy));
				break;
			case 'global':
				keys.push(...this.generateGlobalScopedKeys(strategy));
				break;
		}

		// Invalidate the keys
		await this.invalidateByKeys(keys);

		return keys;
	}

	private generateUserScopedKeys(userId: string, strategy: InvalidationStrategy): string[] {
		// Generate cache keys that would be affected by this user-scoped strategy
		const keys: string[] = [];

		// Example patterns based on common operations
		if (strategy.name === 'user_data') {
			keys.push(
				`getUser:${JSON.stringify({ id: userId })}:${userId}`,
				`getCurrentUser:::${userId}`,
				`getUserProfile:${JSON.stringify({ userId })}:${userId}`
			);
		} else if (strategy.name === 'dashboard_data') {
			keys.push(
				`getDashboardData:${JSON.stringify({ userId })}:${userId}`,
				`getCompleteDashboardData:${JSON.stringify({ userId })}:${userId}`
			);
		}

		return keys;
	}

	private generateDepartmentScopedKeys(userId: string, strategy: InvalidationStrategy): string[] {
		// Generate department-scoped cache keys
		// In a real implementation, you'd query the user's department first
		return [`getEmployees:{}:${userId}`, `getDepartmentEmployees:{}:${userId}`];
	}

	private generateGlobalScopedKeys(strategy: InvalidationStrategy): string[] {
		// Generate globally-scoped cache keys
		return [`getDepartments:{}:`, `getAllUsers:{}:`, `getSystemSettings:{}:`];
	}

	private async getCascadingOperations(
		strategy: InvalidationStrategy,
		variables: InvalidateCacheVariables
	): Promise<string[]> {
		// Return operations that should be re-executed due to cascading invalidation
		const operations: string[] = [];

		if (strategy.cascading) {
			switch (strategy.name) {
				case 'user_data':
					operations.push('getDashboardData', 'getTeamMembers');
					break;
				case 'employee_data':
					operations.push('getDepartmentStats', 'getEmployeeCount');
					break;
				case 'department_data':
					operations.push('getOrganizationChart', 'getDashboardData');
					break;
			}
		}

		return operations;
	}
}

// =============================================================================
// Cache Warming
// =============================================================================

export class CacheWarmer {
	private client: Client | null = null;
	private config: CacheConfig;

	constructor(config: Partial<CacheConfig> = {}) {
		this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
	}

	setClient(client: Client): void {
		this.client = client;
	}

	/**
	 * Warm cache with commonly accessed queries
	 */
	async warmCache(
		operations: Array<{
			operationName: string;
			query: any;
			variables: any;
			priority: number;
		}>
	): Promise<void> {
		if (!this.client || !this.config.enableCacheWarming) {
			return;
		}

		// Sort by priority (higher number = higher priority)
		const sortedOps = operations.sort((a, b) => b.priority - a.priority);

		for (const op of sortedOps) {
			try {
				await this.client
					.query(op.query, op.variables, {
						requestPolicy: 'cache-and-network'
					})
					.toPromise();

				// Small delay between operations to avoid overwhelming the server
				await new Promise((resolve) => setTimeout(resolve, 100));
			} catch (error) {
				logger.warn(`Cache warming failed for ${op.operationName}: ${error}`);
			}
		}
	}

	/**
	 * Pre-warm user-specific cache
	 */
	async warmUserCache(userId: string, userRole: string): Promise<void> {
		const commonOperations = [
			{
				operationName: 'getDashboardData',
				query: null, // Would contain actual GraphQL query
				variables: { userId, userRole },
				priority: 10
			},
			{
				operationName: 'getCurrentUser',
				query: null,
				variables: {},
				priority: 9
			},
			{
				operationName: 'getUserNotifications',
				query: null,
				variables: { userId },
				priority: 8
			}
		];

		await this.warmCache(commonOperations);
	}
}

// =============================================================================
// Cache Utilities
// =============================================================================

export function isCacheStale(entry: CacheEntry): boolean {
	const ageMinutes = (Date.now() - entry.timestamp.getTime()) / (1000 * 60);
	return ageMinutes > entry.ttl;
}

export function shouldRefreshCache(entry: CacheEntry, staleTolerance = 0.8): boolean {
	const ageMinutes = (Date.now() - entry.timestamp.getTime()) / (1000 * 60);
	return ageMinutes > entry.ttl * staleTolerance;
}

export function estimateCacheSize(entries: CacheEntry[]): number {
	return entries.reduce((total, entry) => {
		// Rough estimation of memory usage
		const dataSize = JSON.stringify(entry.data).length * 2; // UTF-16
		const metadataSize = 200; // Approximate metadata overhead
		return total + dataSize + metadataSize;
	}, 0);
}

// =============================================================================
// Factory Functions
// =============================================================================

export function createCacheInvalidator(
	client: Client,
	config: Partial<CacheConfig> = {}
): CacheInvalidator {
	const invalidator = new CacheInvalidator(config);
	invalidator.setClient(client);
	return invalidator;
}

export function createCacheWarmer(client: Client, config: Partial<CacheConfig> = {}): CacheWarmer {
	const warmer = new CacheWarmer(config);
	warmer.setClient(client);
	return warmer;
}

// =============================================================================
// Integration Helpers
// =============================================================================

/**
 * Create URQL request policy based on cache configuration
 */
export function createRequestPolicy(
	cachePolicy: CachePolicy
): 'cache-first' | 'cache-and-network' | 'network-only' {
	if (cachePolicy.staleWhileRevalidate) {
		return 'cache-and-network';
	}

	if (cachePolicy.ttlMinutes > 0) {
		return 'cache-first';
	}

	return 'network-only';
}

/**
 * Validate cache configuration on startup
 */
export function validateCacheConfiguration(config: CacheConfig): string[] {
	const errors: string[] = [];

	if (config.defaultTTL > GRAPHQL_OPERATION_CONSTANTS.MAX_CACHE_TTL_MINUTES) {
		errors.push(
			`Default TTL ${config.defaultTTL} exceeds maximum ${GRAPHQL_OPERATION_CONSTANTS.MAX_CACHE_TTL_MINUTES} minutes`
		);
	}

	if (config.maxTTL > GRAPHQL_OPERATION_CONSTANTS.MAX_CACHE_TTL_MINUTES) {
		errors.push(
			`Max TTL ${config.maxTTL} exceeds maximum ${GRAPHQL_OPERATION_CONSTANTS.MAX_CACHE_TTL_MINUTES} minutes`
		);
	}

	if (config.defaultTTL > config.maxTTL) {
		errors.push('Default TTL cannot be greater than max TTL');
	}

	return errors;
}

// =============================================================================
// Development and Debug Helpers
// =============================================================================

export function logCacheOperation(
	operation: string,
	key: string,
	hit: boolean,
	duration?: number
): void {
	if (import.meta.env.DEV) {
		const status = hit ? '🎯 HIT' : '❌ MISS';
		const durationStr = duration ? ` (${duration}ms)` : '';
		logger.info(`📦 Cache ${status}: ${operation} - ${key}${durationStr}`);
	}
}

export function debugCacheState(invalidator: CacheInvalidator): void {
	if (import.meta.env.DEV) {
		console.group('📊 Cache Debug Information');
		logger.info('Metrics:', { metrics: invalidator.getMetrics() });
		logger.info('Invalidation History:', { history: invalidator.getInvalidationHistory() });
		console.groupEnd();
	}
}
