/**
 * Client-side caching utilities for GraphQL responses and computed data
 * Implements intelligent caching strategies with TTL and memory management
 */

interface CacheItem<T = any> {
	data: T;
	timestamp: number;
	ttl: number;
	size: number;
}

interface CacheOptions {
	ttl?: number; // Time to live in milliseconds
	maxSize?: number; // Maximum cache size in bytes
	maxItems?: number; // Maximum number of items
}

class SmartCache {
	private cache = new Map<string, CacheItem>();
	private totalSize = 0;
	private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes
	private readonly maxSize = 10 * 1024 * 1024; // 10MB
	private readonly maxItems = 1000;

	// Set item in cache with automatic cleanup
	set<T>(key: string, data: T, options: CacheOptions = {}): void {
		const ttl = options.ttl || this.defaultTTL;
		const size = this.calculateSize(data);
		const timestamp = Date.now();

		// Clean up expired items first
		this.cleanup();

		// Evict items if necessary
		this.evictIfNeeded(size);

		// Store the item
		const item: CacheItem<T> = {
			data,
			timestamp,
			ttl,
			size
		};

		// Remove old item if it exists
		if (this.cache.has(key)) {
			const oldItem = this.cache.get(key)!;
			this.totalSize -= oldItem.size;
		}

		this.cache.set(key, item);
		this.totalSize += size;
	}

	// Get item from cache (returns null if expired or not found)
	get<T>(key: string): T | null {
		const item = this.cache.get(key);

		if (!item) {
			return null;
		}

		// Check if expired
		if (Date.now() - item.timestamp > item.ttl) {
			this.delete(key);
			return null;
		}

		return item.data as T;
	}

	// Check if item exists and is not expired
	has(key: string): boolean {
		const item = this.cache.get(key);

		if (!item) {
			return false;
		}

		// Check if expired
		if (Date.now() - item.timestamp > item.ttl) {
			this.delete(key);
			return false;
		}

		return true;
	}

	// Delete item from cache
	delete(key: string): boolean {
		const item = this.cache.get(key);

		if (item) {
			this.totalSize -= item.size;
			this.cache.delete(key);
			return true;
		}

		return false;
	}

	// Clear all items
	clear(): void {
		this.cache.clear();
		this.totalSize = 0;
	}

	// Get cache statistics
	getStats() {
		return {
			size: this.cache.size,
			totalSize: this.totalSize,
			totalSizeMB: (this.totalSize / (1024 * 1024)).toFixed(2),
			hitRate: this.calculateHitRate(),
			maxSize: this.maxSize,
			maxItems: this.maxItems
		};
	}

	// Clean up expired items
	private cleanup(): void {
		const now = Date.now();
		const expiredKeys: string[] = [];

		for (const [key, item] of this.cache.entries()) {
			if (now - item.timestamp > item.ttl) {
				expiredKeys.push(key);
			}
		}

		for (const key of expiredKeys) {
			this.delete(key);
		}
	}

	// Evict items if cache is too large
	private evictIfNeeded(newItemSize: number): void {
		// Check size constraint
		while (this.totalSize + newItemSize > this.maxSize && this.cache.size > 0) {
			this.evictOldestItem();
		}

		// Check item count constraint
		while (this.cache.size >= this.maxItems) {
			this.evictOldestItem();
		}
	}

	// Evict the oldest item (LRU strategy)
	private evictOldestItem(): void {
		let oldestKey: string | null = null;
		let oldestTimestamp = Infinity;

		for (const [key, item] of this.cache.entries()) {
			if (item.timestamp < oldestTimestamp) {
				oldestTimestamp = item.timestamp;
				oldestKey = key;
			}
		}

		if (oldestKey) {
			this.delete(oldestKey);
		}
	}

	// Calculate approximate size of data
	private calculateSize(data: any): number {
		const jsonString = JSON.stringify(data);
		return jsonString.length * 2; // Rough approximation (UTF-16)
	}

	// Calculate cache hit rate (placeholder - would need hit/miss tracking)
	private calculateHitRate(): number {
		// This is a placeholder - in a real implementation, you'd track hits/misses
		return 0;
	}
}

// Global cache instance
export const cache = new SmartCache();

// GraphQL Query Cache with operation-specific TTL
class GraphQLCache {
	private cache = new SmartCache();

	// Cache GraphQL query result
	setQuery(operationName: string, variables: any, data: any, ttl?: number): void {
		const key = this.createQueryKey(operationName, variables);

		// Different TTL for different operation types
		const defaultTTL = this.getDefaultTTL(operationName);
		this.cache.set(key, data, { ttl: ttl || defaultTTL });
	}

	// Get cached GraphQL query result
	getQuery<T>(operationName: string, variables: any): T | null {
		const key = this.createQueryKey(operationName, variables);
		return this.cache.get<T>(key);
	}

	// Check if query result is cached
	hasQuery(operationName: string, variables: any): boolean {
		const key = this.createQueryKey(operationName, variables);
		return this.cache.has(key);
	}

	// Invalidate queries by pattern
	invalidateQueries(pattern: RegExp): void {
		// This would require extending the cache to support pattern-based invalidation
		// For now, we'll clear the entire cache
		this.cache.clear();
	}

	// Clear all cached queries
	clear(): void {
		this.cache.clear();
	}

	// Get cache statistics
	getStats() {
		return this.cache.getStats();
	}

	// Create consistent cache key from operation and variables
	private createQueryKey(operationName: string, variables: any): string {
		const normalizedVariables = this.normalizeVariables(variables);
		return `${operationName}:${JSON.stringify(normalizedVariables)}`;
	}

	// Get default TTL based on operation type
	private getDefaultTTL(operationName: string): number {
		// Shorter TTL for frequently changing data
		const shortTTL = 1 * 60 * 1000; // 1 minute
		const mediumTTL = 5 * 60 * 1000; // 5 minutes
		const longTTL = 15 * 60 * 1000; // 15 minutes

		// Configure TTL based on operation patterns
		if (operationName.includes('Dashboard') || operationName.includes('Stats')) {
			return shortTTL; // Dashboard data changes frequently
		}

		if (operationName.includes('User') || operationName.includes('Employee')) {
			return mediumTTL; // User data changes occasionally
		}

		if (operationName.includes('Department') || operationName.includes('Role')) {
			return longTTL; // Organizational data changes rarely
		}

		return mediumTTL; // Default
	}

	// Normalize variables for consistent caching
	private normalizeVariables(variables: any): any {
		if (!variables) return {};

		// Sort object keys for consistent stringification
		const sorted: any = {};
		Object.keys(variables)
			.sort()
			.forEach((key) => {
				sorted[key] = variables[key];
			});

		return sorted;
	}
}

// Global GraphQL cache instance
export const graphqlCache = new GraphQLCache();

// Computed value cache for expensive calculations
class ComputedCache {
	private cache = new SmartCache();

	// Cache computed value with dependency tracking
	setComputed<T>(key: string, computeFn: () => T, dependencies: any[], ttl?: number): T {
		const depKey = this.createDependencyKey(key, dependencies);
		const cached = this.cache.get<T>(depKey);

		if (cached !== null) {
			return cached;
		}

		// Compute the value
		const computed = computeFn();
		this.cache.set(depKey, computed, { ttl });

		return computed;
	}

	// Get computed value if still valid
	getComputed<T>(key: string, dependencies: any[]): T | null {
		const depKey = this.createDependencyKey(key, dependencies);
		return this.cache.get<T>(depKey);
	}

	// Clear computed values
	clear(): void {
		this.cache.clear();
	}

	// Create key that includes dependencies
	private createDependencyKey(key: string, dependencies: any[]): string {
		const depHash = JSON.stringify(dependencies);
		return `${key}:${depHash}`;
	}
}

// Global computed cache instance
export const computedCache = new ComputedCache();

// Cache management utilities
export const cacheUtils = {
	// Warm up cache with critical data
	async warmup(
		criticalQueries: Array<{ operation: string; variables?: any; fetcher: () => Promise<any> }>
	) {
		console.log('🔥 Warming up cache...');

		const promises = criticalQueries.map(async ({ operation, variables = {}, fetcher }) => {
			try {
				const data = await fetcher();
				graphqlCache.setQuery(operation, variables, data);
			} catch (error) {
				console.warn(`Failed to warm up cache for ${operation}:`, error);
			}
		});

		await Promise.allSettled(promises);
		console.log('✅ Cache warmup complete');
	},

	// Preload critical resources
	preloadResources(resources: string[]) {
		if (typeof window === 'undefined') return;

		resources.forEach((resource) => {
			const link = document.createElement('link');
			link.rel = 'preload';

			if (resource.endsWith('.js')) {
				link.as = 'script';
			} else if (resource.endsWith('.css')) {
				link.as = 'style';
			} else if (resource.match(/\.(woff2?|ttf|eot)$/)) {
				link.as = 'font';
				link.crossOrigin = 'anonymous';
			} else if (resource.match(/\.(jpg|jpeg|png|webp|svg)$/)) {
				link.as = 'image';
			}

			link.href = resource;
			document.head.appendChild(link);
		});
	},

	// Get overall cache health
	getCacheHealth() {
		return {
			main: cache.getStats(),
			graphql: graphqlCache.getStats(),
			timestamp: Date.now()
		};
	}
};
