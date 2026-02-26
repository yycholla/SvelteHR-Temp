import type { AnyVariables, Client, DocumentInput } from '@urql/core';
import { logger } from '$lib/utils/logger';
import type { CacheConfig } from './types';
import { DEFAULT_CACHE_CONFIG } from './config';

type WarmOperation = {
	operationName: string;
	query: DocumentInput<unknown, AnyVariables> | null;
	variables: AnyVariables;
	priority: number;
};

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
	async warmCache(operations: WarmOperation[]): Promise<void> {
		if (!this.client || !this.config.enableCacheWarming) {
			return;
		}

		// Sort by priority (higher number = higher priority)
		const sortedOps = operations.sort((a, b) => b.priority - a.priority);

		for (const op of sortedOps) {
			if (!op.query) {
				continue;
			}

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
