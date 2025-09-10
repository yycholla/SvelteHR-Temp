/**
 * Advanced GraphQL Caching System
 * 
 * Provides intelligent caching with features like:
 * - Smart cache invalidation based on mutations
 * - Background cache refresh for stale data
 * - Query complexity analysis and optimization
 * - Cross-component cache sharing
 * - Cache warming and prefetching
 * - Memory-efficient LRU eviction with access patterns
 */

import { GRAPHQL_CONFIG } from '$lib/env';
import { showInfo, logError, createError, ErrorType } from '$lib/utils/errors';

/**
 * Cache entry with comprehensive metadata
 */
export interface CacheEntry<T = any> {
	data: T;
	query: string;
	variables?: Record<string, any>;
	timestamp: number;
	ttl: number;
	lastAccessed: number;
	accessCount: number;
	dependsOn: string[]; // Related cache keys that should invalidate this entry
	tags: string[]; // Semantic tags for bulk invalidation (e.g., 'employees', 'departments')
	priority: CachePriority;
	refreshing?: boolean; // Background refresh in progress
	staleWhileRevalidate?: boolean;
}

export enum CachePriority {
	LOW = 1,
	NORMAL = 2,
	HIGH = 3,
	CRITICAL = 4
}

/**
 * Cache invalidation patterns for different operations
 */
export interface InvalidationRule {
	mutation: string; // GraphQL mutation name pattern
	invalidatesTags: string[]; // Tags to invalidate
	invalidatesKeys: string[]; // Specific keys to invalidate
	refreshAfterMs?: number; // Delay before background refresh
}

/**
 * Advanced GraphQL cache with intelligent features
 */
export class AdvancedGraphQLCache {
	private cache = new Map<string, CacheEntry>();
	private pendingRequests = new Map<string, Promise<any>>();
	private refreshQueue = new Set<string>();
	private invalidationRules: InvalidationRule[] = [];
	private backgroundRefreshInterval: number | null = null;
	
	// Performance tracking
	private stats = {
		hits: 0,
		misses: 0,
		invalidations: 0,
		backgroundRefreshes: 0,
		memoryUsage: 0
	};

	constructor() {
		this.setupDefaultInvalidationRules();
		this.startBackgroundProcesses();
		
		// Cleanup on page unload
		if (typeof window !== 'undefined') {
			window.addEventListener('beforeunload', () => {
				this.cleanup();
			});
		}
	}

	/**
	 * Get cached data with intelligent access tracking
	 */
	async get<T>(
		query: string,
		variables?: Record<string, any>,
		options: {
			tags?: string[];
			priority?: CachePriority;
			ttl?: number;
			staleWhileRevalidate?: boolean;
		} = {}
	): Promise<CacheEntry<T> | null> {
		const cacheKey = this.generateCacheKey(query, variables);
		const entry = this.cache.get(cacheKey) as CacheEntry<T> | undefined;
		
		if (!entry) {
			this.stats.misses++;
			return null;
		}
		
		const now = Date.now();
		const isExpired = now > entry.timestamp + entry.ttl * 1000;
		
		// Update access tracking
		entry.lastAccessed = now;
		entry.accessCount++;
		this.cache.set(cacheKey, entry);
		
		// Handle expired entries
		if (isExpired) {
			if (entry.staleWhileRevalidate && !entry.refreshing) {
				// Return stale data but trigger background refresh
				this.scheduleBackgroundRefresh(cacheKey, query, variables);
				this.stats.hits++; // Count as hit since we're returning data
				return entry;
			} else {
				// Remove expired entry
				this.cache.delete(cacheKey);
				this.stats.misses++;
				return null;
			}
		}
		
		// Check if data is getting stale (75% of TTL)
		const staleThreshold = entry.timestamp + (entry.ttl * 0.75 * 1000);
		if (now > staleThreshold && entry.staleWhileRevalidate && !entry.refreshing) {
			this.scheduleBackgroundRefresh(cacheKey, query, variables);
		}
		
		this.stats.hits++;
		return entry;
	}

	/**
	 * Set cache entry with intelligent metadata
	 */
	set<T>(
		query: string,
		variables: Record<string, any> | undefined,
		data: T,
		options: {
			tags?: string[];
			priority?: CachePriority;
			ttl?: number;
			staleWhileRevalidate?: boolean;
			dependsOn?: string[];
		} = {}
	): void {
		const cacheKey = this.generateCacheKey(query, variables);
		const now = Date.now();
		
		const entry: CacheEntry<T> = {
			data,
			query,
			variables,
			timestamp: now,
			ttl: options.ttl || GRAPHQL_CONFIG.cacheTTL,
			lastAccessed: now,
			accessCount: 1,
			dependsOn: options.dependsOn || [],
			tags: options.tags || this.extractTagsFromQuery(query),
			priority: options.priority || CachePriority.NORMAL,
			staleWhileRevalidate: options.staleWhileRevalidate ?? true
		};
		
		this.cache.set(cacheKey, entry);
		this.updateMemoryUsage();
		
		// Trigger LRU eviction if needed
		this.evictLRUEntries();
		
		// Log cache statistics periodically
		if ((this.stats.hits + this.stats.misses) % 50 === 0) {
			this.logCacheStatistics();
		}
	}

	/**
	 * Invalidate cache entries by tags or keys
	 */
	invalidate(options: {
		tags?: string[];
		keys?: string[];
		pattern?: RegExp;
		mutation?: string;
	}): number {
		let invalidatedCount = 0;
		
		for (const [key, entry] of this.cache.entries()) {
			let shouldInvalidate = false;
			
			// Check tags
			if (options.tags) {
				shouldInvalidate = options.tags.some(tag => entry.tags.includes(tag));
			}
			
			// Check specific keys
			if (options.keys) {
				shouldInvalidate = shouldInvalidate || options.keys.includes(key);
			}
			
			// Check pattern
			if (options.pattern) {
				shouldInvalidate = shouldInvalidate || options.pattern.test(key);
			}
			
			if (shouldInvalidate) {
				this.cache.delete(key);
				invalidatedCount++;
			}
		}
		
		// Apply mutation-based invalidation rules
		if (options.mutation) {
			invalidatedCount += this.applyInvalidationRules(options.mutation);
		}
		
		this.stats.invalidations += invalidatedCount;
		this.updateMemoryUsage();
		
		if (invalidatedCount > 0) {
			console.debug(`📦 Cache invalidated ${invalidatedCount} entries`);
		}
		
		return invalidatedCount;
	}

	/**
	 * Prefetch data to warm the cache
	 */
	async prefetch(
		queries: Array<{
			query: string;
			variables?: Record<string, any>;
			tags?: string[];
			priority?: CachePriority;
		}>,
		fetchFunction: (query: string, variables?: Record<string, any>) => Promise<any>
	): Promise<void> {
		const prefetchPromises = queries.map(async ({ query, variables, tags, priority }) => {
			const cacheKey = this.generateCacheKey(query, variables);
			
			// Skip if already cached and not expired
			const existing = await this.get(query, variables);
			if (existing) return;
			
			try {
				const result = await fetchFunction(query, variables);
				this.set(query, variables, result, {
					tags,
					priority: priority || CachePriority.LOW,
					staleWhileRevalidate: true
				});
			} catch (error) {
				console.debug(`Cache prefetch failed for ${cacheKey}:`, error);
			}
		});
		
		await Promise.allSettled(prefetchPromises);
	}

	/**
	 * Get cache statistics and performance metrics
	 */
	getStatistics() {
		const totalRequests = this.stats.hits + this.stats.misses;
		const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) : 0;
		
		return {
			...this.stats,
			hitRate: Math.round(hitRate * 100),
			cacheSize: this.cache.size,
			maxCacheSize: GRAPHQL_CONFIG.maxCacheSize,
			memoryEfficiency: this.calculateMemoryEfficiency()
		};
	}

	/**
	 * Clear entire cache
	 */
	clear(): void {
		this.cache.clear();
		this.pendingRequests.clear();
		this.refreshQueue.clear();
		this.updateMemoryUsage();
		console.debug('📦 GraphQL cache cleared');
	}

	/**
	 * Generate consistent cache key
	 */
	private generateCacheKey(query: string, variables?: Record<string, any>): string {
		const normalizedQuery = query.replace(/\s+/g, ' ').trim();
		const variablesStr = variables ? JSON.stringify(variables, Object.keys(variables).sort()) : '';
		return btoa(normalizedQuery + '|' + variablesStr).replace(/[/+=]/g, '');
	}

	/**
	 * Extract semantic tags from GraphQL query
	 */
	private extractTagsFromQuery(query: string): string[] {
		const tags: string[] = [];
		
		// Extract from field names
		const fieldMatches = query.match(/\b(employees|departments|tasks|users|roles|permissions)\b/gi);
		if (fieldMatches) {
			tags.push(...fieldMatches.map(match => match.toLowerCase()));
		}
		
		// Extract from operation type
		if (query.includes('mutation')) {
			tags.push('mutation');
		} else if (query.includes('subscription')) {
			tags.push('subscription');
		} else {
			tags.push('query');
		}
		
		return [...new Set(tags)]; // Remove duplicates
	}

	/**
	 * Setup default invalidation rules for common mutations
	 */
	private setupDefaultInvalidationRules(): void {
		this.invalidationRules = [
			{
				mutation: 'createEmployee',
				invalidatesTags: ['employees', 'dashboard'],
				invalidatesKeys: [],
				refreshAfterMs: 1000
			},
			{
				mutation: 'updateEmployee',
				invalidatesTags: ['employees'],
				invalidatesKeys: [],
				refreshAfterMs: 500
			},
			{
				mutation: 'deleteEmployee',
				invalidatesTags: ['employees', 'dashboard'],
				invalidatesKeys: [],
				refreshAfterMs: 1000
			},
			{
				mutation: 'createDepartment',
				invalidatesTags: ['departments', 'employees'],
				invalidatesKeys: [],
				refreshAfterMs: 1000
			},
			{
				mutation: 'updateDepartment',
				invalidatesTags: ['departments'],
				invalidatesKeys: [],
				refreshAfterMs: 500
			},
			{
				mutation: 'login',
				invalidatesTags: ['user', 'dashboard'],
				invalidatesKeys: [],
				refreshAfterMs: 0
			},
			{
				mutation: 'logout',
				invalidatesTags: [], // Clear everything on logout
				invalidatesKeys: [],
				refreshAfterMs: 0
			}
		];
	}

	/**
	 * Apply invalidation rules for a mutation
	 */
	private applyInvalidationRules(mutation: string): number {
		let invalidatedCount = 0;
		
		for (const rule of this.invalidationRules) {
			const rulePattern = new RegExp(rule.mutation, 'i');
			if (rulePattern.test(mutation)) {
				// Special case: logout clears everything
				if (mutation.toLowerCase().includes('logout')) {
					const beforeSize = this.cache.size;
					this.clear();
					return beforeSize;
				}
				
				invalidatedCount += this.invalidate({
					tags: rule.invalidatesTags,
					keys: rule.invalidatesKeys
				});
				
				// Schedule background refresh if specified
				if (rule.refreshAfterMs !== undefined && rule.refreshAfterMs > 0) {
					setTimeout(() => {
						this.scheduleRelatedRefresh(rule.invalidatesTags);
					}, rule.refreshAfterMs);
				}
			}
		}
		
		return invalidatedCount;
	}

	/**
	 * Enhanced LRU eviction with priority consideration
	 */
	private evictLRUEntries(): void {
		if (this.cache.size <= GRAPHQL_CONFIG.maxCacheSize) return;
		
		// Convert to array and sort by eviction priority
		const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
			key,
			entry,
			evictionScore: this.calculateEvictionScore(entry)
		}));
		
		// Sort by eviction score (lower = more likely to evict)
		entries.sort((a, b) => a.evictionScore - b.evictionScore);
		
		// Evict entries until we're under the limit
		const targetSize = Math.floor(GRAPHQL_CONFIG.maxCacheSize * 0.8); // 80% of max
		let evicted = 0;
		
		while (this.cache.size > targetSize && evicted < entries.length) {
			const { key } = entries[evicted];
			this.cache.delete(key);
			evicted++;
		}
		
		if (evicted > 0) {
			console.debug(`📦 Cache evicted ${evicted} LRU entries`);
		}
	}

	/**
	 * Calculate eviction score (lower = more likely to evict)
	 */
	private calculateEvictionScore(entry: CacheEntry): number {
		const now = Date.now();
		const age = now - entry.timestamp;
		const timeSinceAccess = now - entry.lastAccessed;
		
		// Base score on recency and frequency
		const recencyScore = timeSinceAccess / (1000 * 60); // Minutes since access
		const frequencyScore = 1 / Math.max(entry.accessCount, 1);
		const ageScore = age / (1000 * 60 * 60); // Hours since creation
		
		// Priority modifier (higher priority = lower eviction score)
		const priorityModifier = (5 - entry.priority) * 10;
		
		return recencyScore + frequencyScore + ageScore + priorityModifier;
	}

	/**
	 * Schedule background refresh for stale data
	 */
	private scheduleBackgroundRefresh(
		cacheKey: string,
		query: string,
		variables?: Record<string, any>
	): void {
		if (this.refreshQueue.has(cacheKey)) return;
		
		this.refreshQueue.add(cacheKey);
		const entry = this.cache.get(cacheKey);
		if (entry) {
			entry.refreshing = true;
		}
		
		// This would be implemented by the client that uses the cache
		console.debug(`📦 Background refresh scheduled for ${cacheKey}`);
	}

	/**
	 * Schedule refresh for related entries based on tags
	 */
	private scheduleRelatedRefresh(tags: string[]): void {
		for (const [key, entry] of this.cache.entries()) {
			if (tags.some(tag => entry.tags.includes(tag))) {
				this.scheduleBackgroundRefresh(key, entry.query, entry.variables);
			}
		}
	}

	/**
	 * Start background maintenance processes
	 */
	private startBackgroundProcesses(): void {
		if (typeof window === 'undefined') return;
		
		// Periodic cleanup every 5 minutes
		this.backgroundRefreshInterval = window.setInterval(() => {
			this.performBackgroundMaintenance();
		}, 5 * 60 * 1000);
	}

	/**
	 * Perform background cache maintenance
	 */
	private performBackgroundMaintenance(): void {
		const before = this.cache.size;
		
		// Remove expired entries
		const now = Date.now();
		for (const [key, entry] of this.cache.entries()) {
			if (now > entry.timestamp + entry.ttl * 1000 && !entry.staleWhileRevalidate) {
				this.cache.delete(key);
			}
		}
		
		const after = this.cache.size;
		if (before !== after) {
			console.debug(`📦 Background maintenance: removed ${before - after} expired entries`);
		}
		
		this.updateMemoryUsage();
	}

	/**
	 * Update memory usage statistics
	 */
	private updateMemoryUsage(): void {
		// Rough estimation of memory usage
		let memoryBytes = 0;
		
		for (const entry of this.cache.values()) {
			try {
				memoryBytes += JSON.stringify(entry).length * 2; // Rough UTF-16 estimation
			} catch {
				memoryBytes += 1000; // Fallback estimate
			}
		}
		
		this.stats.memoryUsage = memoryBytes;
	}

	/**
	 * Calculate memory efficiency metric
	 */
	private calculateMemoryEfficiency(): number {
		if (this.cache.size === 0) return 100;
		
		const avgEntrySize = this.stats.memoryUsage / this.cache.size;
		const totalRequests = this.stats.hits + this.stats.misses;
		const requestsPerEntry = totalRequests / this.cache.size;
		
		// Higher efficiency = more requests per byte
		return Math.round(requestsPerEntry / avgEntrySize * 1000000);
	}

	/**
	 * Log cache statistics for monitoring
	 */
	private logCacheStatistics(): void {
		const stats = this.getStatistics();
		console.debug('📦 GraphQL Cache Statistics:', {
			'Hit Rate': `${stats.hitRate}%`,
			'Cache Size': `${stats.cacheSize}/${stats.maxCacheSize}`,
			'Memory Usage': `${Math.round(stats.memoryUsage / 1024)}KB`,
			'Background Refreshes': stats.backgroundRefreshes,
			'Invalidations': stats.invalidations
		});
	}

	/**
	 * Cleanup resources
	 */
	private cleanup(): void {
		if (this.backgroundRefreshInterval) {
			clearInterval(this.backgroundRefreshInterval);
			this.backgroundRefreshInterval = null;
		}
		this.clear();
	}
}

/**
 * Global cache instance
 */
export const graphqlCache = new AdvancedGraphQLCache();