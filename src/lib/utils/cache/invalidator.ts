import type { Client } from '@urql/core';
import { Kind } from 'graphql';
import { logger } from '$lib/utils/logger';
import type {
	InvalidateCacheResponse,
	InvalidateCacheVariables
} from '$lib/types/graphql-contracts';
import type { CacheConfig, CacheMetrics, InvalidationStrategy } from './types';
import { DEFAULT_CACHE_CONFIG } from './config';

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
