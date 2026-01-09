import { logger } from '$lib/utils/logger';
import type { CachePolicy } from '$lib/types/graphql-contracts';
import { GRAPHQL_OPERATION_CONSTANTS } from '$lib/types/graphql-contracts';
import type { CacheConfig } from './types';
import { DEFAULT_CACHE_CONFIG } from './config';

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
