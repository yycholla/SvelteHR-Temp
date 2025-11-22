/**
 * Task Cache Store (Svelte 5 Runes)
 * Feature: 028-task-system-expansion - T064
 *
 * Intelligent caching strategy for task data:
 * - SWR (Stale-While-Revalidate) pattern for task lists
 * - Request deduplication to prevent duplicate queries
 * - TTL-based cache invalidation with background refresh
 * - Optimistic updates for mutations
 * - Cache warming for predictable data access
 */

// ============================================================================
// CACHE CONFIGURATION
// ============================================================================

export interface CacheConfig {
	/** Time to live for cached data (ms) */
	ttl: number;
	/** Time before data is considered stale (ms) */
	staleTime: number;
	/** Maximum cache size (number of entries) */
	maxSize: number;
	/** Enable background refresh for stale data */
	backgroundRefresh: boolean;
	/** Enable request deduplication */
	deduplication: boolean;
}

const DEFAULT_CACHE_CONFIG: CacheConfig = {
	ttl: 5 * 60 * 1000, // 5 minutes
	staleTime: 2 * 60 * 1000, // 2 minutes (stale after 2min, invalid after 5min)
	maxSize: 100,
	backgroundRefresh: true,
	deduplication: true
};

// Task-specific cache configurations
export const TASK_CACHE_CONFIGS = {
	taskList: {
		...DEFAULT_CACHE_CONFIG,
		ttl: 3 * 60 * 1000, // 3 minutes
		staleTime: 1 * 60 * 1000 // 1 minute
	},
	taskDetail: {
		...DEFAULT_CACHE_CONFIG,
		ttl: 10 * 60 * 1000, // 10 minutes
		staleTime: 5 * 60 * 1000 // 5 minutes
	},
	taskStatistics: {
		...DEFAULT_CACHE_CONFIG,
		ttl: 2 * 60 * 1000, // 2 minutes
		staleTime: 30 * 1000 // 30 seconds
	},
	myTasks: {
		...DEFAULT_CACHE_CONFIG,
		ttl: 5 * 60 * 1000, // 5 minutes
		staleTime: 2 * 60 * 1000, // 2 minutes
		backgroundRefresh: true
	}
} as const;

// ============================================================================
// CACHE ENTRY TYPES
// ============================================================================

export interface CacheEntry<T> {
	/** Cached data */
	data: T;
	/** Timestamp when data was cached */
	timestamp: number;
	/** Cache key for identification */
	key: string;
	/** Is data currently being refreshed? */
	isRefreshing: boolean;
	/** Last error during refresh (if any) */
	error: Error | null;
	/** Number of times this entry has been accessed */
	accessCount: number;
	/** Last access timestamp */
	lastAccess: number;
}

export interface CacheState<T> {
	/** Current cached data (may be stale) */
	data: T | null;
	/** Is data currently loading? */
	isLoading: boolean;
	/** Is cached data stale? */
	isStale: boolean;
	/** Is data being refreshed in background? */
	isRefreshing: boolean;
	/** Last error */
	error: Error | null;
	/** Timestamp of last successful fetch */
	lastFetch: number | null;
}

// ============================================================================
// TASK CACHE IMPLEMENTATION
// ============================================================================

class TaskCacheManager {
	private cache = new Map<string, CacheEntry<any>>();
	private pendingRequests = new Map<string, Promise<any>>();
	private refreshTimers = new Map<string, ReturnType<typeof setTimeout>>();

	/**
	 * Generate cache key from query parameters
	 */
	private generateKey(operation: string, variables?: Record<string, any>): string {
		if (!variables) return operation;
		const sortedVars = Object.keys(variables)
			.sort()
			.map((key) => `${key}:${JSON.stringify(variables[key])}`)
			.join('|');
		return `${operation}:${sortedVars}`;
	}

	/**
	 * Check if cache entry is stale
	 */
	private isStale(entry: CacheEntry<any>, config: CacheConfig): boolean {
		const age = Date.now() - entry.timestamp;
		return age > config.staleTime;
	}

	/**
	 * Check if cache entry is expired
	 */
	private isExpired(entry: CacheEntry<any>, config: CacheConfig): boolean {
		const age = Date.now() - entry.timestamp;
		return age > config.ttl;
	}

	/**
	 * Evict least recently used entries if cache is full
	 */
	private evictIfNeeded(maxSize: number): void {
		if (this.cache.size < maxSize) return;

		// Sort by last access time
		const entries = Array.from(this.cache.entries()).sort(
			([, a], [, b]) => a.lastAccess - b.lastAccess
		);

		// Remove oldest 20% of entries
		const toRemove = Math.ceil(entries.length * 0.2);
		for (let i = 0; i < toRemove; i++) {
			const [key] = entries[i];
			this.cache.delete(key);
			this.clearRefreshTimer(key);
		}
	}

	/**
	 * Clear refresh timer for a key
	 */
	private clearRefreshTimer(key: string): void {
		const timer = this.refreshTimers.get(key);
		if (timer) {
			clearTimeout(timer);
			this.refreshTimers.delete(key);
		}
	}

	/**
	 * Schedule background refresh for stale data
	 */
	private scheduleRefresh<T>(
		key: string,
		fetchFn: () => Promise<T>,
		config: CacheConfig
	): void {
		if (!config.backgroundRefresh) return;

		this.clearRefreshTimer(key);

		const timer = setTimeout(async () => {
			const entry = this.cache.get(key);
			if (!entry || entry.isRefreshing) return;

			try {
				entry.isRefreshing = true;
				const data = await fetchFn();
				this.set(key, data, config);
			} catch (error) {
				console.error(`Background refresh failed for ${key}:`, error);
				entry.error = error instanceof Error ? error : new Error(String(error));
			} finally {
				entry.isRefreshing = false;
			}
		}, config.staleTime);

		this.refreshTimers.set(key, timer);
	}

	/**
	 * Get data from cache or fetch if needed (SWR pattern)
	 */
	async get<T>(
		operation: string,
		fetchFn: () => Promise<T>,
		variables?: Record<string, any>,
		config: CacheConfig = DEFAULT_CACHE_CONFIG
	): Promise<T> {
		const key = this.generateKey(operation, variables);
		const entry = this.cache.get(key);

		// If data exists and is not expired
		if (entry && !this.isExpired(entry, config)) {
			// Update access stats
			entry.accessCount++;
			entry.lastAccess = Date.now();

			// If data is stale, schedule background refresh
			if (this.isStale(entry, config) && !entry.isRefreshing) {
				this.scheduleRefresh(key, fetchFn, config);
			}

			return entry.data as T;
		}

		// Deduplicate concurrent requests
		if (config.deduplication && this.pendingRequests.has(key)) {
			return this.pendingRequests.get(key) as Promise<T>;
		}

		// Fetch fresh data
		const fetchPromise = fetchFn()
			.then((data) => {
				this.set(key, data, config);
				this.pendingRequests.delete(key);
				return data;
			})
			.catch((error) => {
				this.pendingRequests.delete(key);
				// If we have stale data, return it on error
				if (entry) {
					console.warn(`Fetch failed for ${key}, returning stale data:`, error);
					entry.error = error instanceof Error ? error : new Error(String(error));
					return entry.data as T;
				}
				throw error;
			});

		if (config.deduplication) {
			this.pendingRequests.set(key, fetchPromise);
		}

		return fetchPromise;
	}

	/**
	 * Set cache entry
	 */
	set<T>(key: string, data: T, config: CacheConfig = DEFAULT_CACHE_CONFIG): void {
		this.evictIfNeeded(config.maxSize);

		const entry: CacheEntry<T> = {
			data,
			timestamp: Date.now(),
			key,
			isRefreshing: false,
			error: null,
			accessCount: 1,
			lastAccess: Date.now()
		};

		this.cache.set(key, entry);
		this.scheduleRefresh(key, async () => data, config);
	}

	/**
	 * Invalidate cache entry or pattern
	 */
	invalidate(pattern: string): void {
		const keysToDelete: string[] = [];

		this.cache.forEach((_, key) => {
			if (key.startsWith(pattern)) {
				keysToDelete.push(key);
			}
		});

		keysToDelete.forEach((key) => {
			this.cache.delete(key);
			this.clearRefreshTimer(key);
			this.pendingRequests.delete(key);
		});
	}

	/**
	 * Clear all cache
	 */
	clear(): void {
		this.cache.clear();
		this.refreshTimers.forEach((timer) => clearTimeout(timer));
		this.refreshTimers.clear();
		this.pendingRequests.clear();
	}

	/**
	 * Get cache statistics
	 */
	getStats() {
		const entries = Array.from(this.cache.values());
		return {
			size: this.cache.size,
			pendingRequests: this.pendingRequests.size,
			refreshTimers: this.refreshTimers.size,
			totalAccesses: entries.reduce((sum, e) => sum + e.accessCount, 0),
			averageAge: entries.reduce((sum, e) => sum + (Date.now() - e.timestamp), 0) / entries.length,
			staleEntries: entries.filter((e) => this.isStale(e, DEFAULT_CACHE_CONFIG)).length
		};
	}

	/**
	 * Warm cache with predictable data
	 */
	async warm<T>(
		operation: string,
		fetchFn: () => Promise<T>,
		variables?: Record<string, any>,
		config: CacheConfig = DEFAULT_CACHE_CONFIG
	): Promise<void> {
		const key = this.generateKey(operation, variables);

		// Skip if already cached and fresh
		const entry = this.cache.get(key);
		if (entry && !this.isStale(entry, config)) {
			return;
		}

		// Fetch and cache
		try {
			const data = await fetchFn();
			this.set(key, data, config);
		} catch (error) {
			console.warn(`Cache warming failed for ${operation}:`, error);
		}
	}
}

// Singleton cache manager
export const taskCache = new TaskCacheManager();

// ============================================================================
// SVELTE STORE INTEGRATION (using Svelte 5 runes)
// ============================================================================

/**
 * Create a cached store for task data with SWR pattern
 * Returns a reactive store class instance
 */
export function createCachedTaskStore<T>(
	operation: string,
	fetchFn: () => Promise<T>,
	variables?: Record<string, any>,
	config: CacheConfig = DEFAULT_CACHE_CONFIG
) {
	class CachedTaskStore {
		data = $state<T | null>(null);
		isLoading = $state(true);
		isStale = $state(false);
		isRefreshing = $state(false);
		error = $state<Error | null>(null);
		lastFetch = $state<number | null>(null);

		constructor() {
			// Initial fetch
			taskCache
				.get(operation, fetchFn, variables, config)
				.then((data) => {
					this.data = data;
					this.isLoading = false;
					this.lastFetch = Date.now();
				})
				.catch((error) => {
					this.error = error instanceof Error ? error : new Error(String(error));
					this.isLoading = false;
				});
		}
	}

	return new CachedTaskStore();
}

/**
 * Optimistic update helper for task mutations
 */
export function optimisticUpdate<T>(cacheKey: string, updateFn: (current: T) => T): void {
	const entry = (taskCache as any).cache.get(cacheKey);
	if (entry) {
		entry.data = updateFn(entry.data);
		entry.timestamp = Date.now();
	}
}

/**
 * Preload task data for anticipated navigation
 */
export async function preloadTask(taskId: string): Promise<void> {
	const operation = 'GetTaskDetail';
	const fetchFn = async () => {
		// This would be replaced with actual GraphQL fetch
		const response = await fetch(`/api/tasks/${taskId}`);
		return response.json();
	};

	await taskCache.warm(operation, fetchFn, { taskId }, TASK_CACHE_CONFIGS.taskDetail);
}

/**
 * Preload task list for common views
 */
export async function preloadMyTasks(userId: string): Promise<void> {
	const operation = 'GetMyTasks';
	const fetchFn = async () => {
		// This would be replaced with actual GraphQL fetch
		const response = await fetch(`/api/tasks/my-tasks?userId=${userId}`);
		return response.json();
	};

	await taskCache.warm(operation, fetchFn, { userId }, TASK_CACHE_CONFIGS.myTasks);
}

// Export cache management functions
export const cacheActions = {
	invalidate: (pattern: string) => taskCache.invalidate(pattern),
	clear: () => taskCache.clear(),
	getStats: () => taskCache.getStats(),
	preloadTask,
	preloadMyTasks
};
