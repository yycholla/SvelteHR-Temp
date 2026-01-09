import { logger } from '$lib/utils/logger';
import type { CacheEntry } from './types';
import type { CacheInvalidator } from './invalidator';

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
