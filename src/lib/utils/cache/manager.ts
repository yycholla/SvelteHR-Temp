import type { Client } from '@urql/core';
import type { CacheConfig } from './types';
import { CacheInvalidator } from './invalidator';
import { CacheWarmer } from './warmer';

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
