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

export interface CacheEntry<TData = unknown, TVariables = Record<string, unknown>> {
	key: string;
	data: TData;
	timestamp: Date;
	ttl: number; // TTL in minutes
	accessCount: number;
	lastAccessed: Date;
	operationName: string;
	variables: TVariables;
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
