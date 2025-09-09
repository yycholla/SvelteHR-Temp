/**
 * Simple in-memory API cache for server-side operations
 * Optimized for caching frequently accessed data like employee lists
 */

interface CacheItem<T> {
	data: T;
	timestamp: number;
	ttl: number; // Time to live in milliseconds
}

class ApiCache {
	private cache = new Map<string, CacheItem<any>>();
	private defaultTTL = 5 * 60 * 1000; // 5 minutes default

	/**
	 * Generate cache key from endpoint and parameters
	 */
	private generateKey(endpoint: string, params?: Record<string, any>): string {
		const baseKey = endpoint.toLowerCase();
		if (!params || Object.keys(params).length === 0) {
			return baseKey;
		}

		// Sort params for consistent key generation
		const sortedParams = Object.keys(params)
			.sort()
			.reduce((result: Record<string, any>, key) => {
				result[key] = params[key];
				return result;
			}, {});

		const paramString = new URLSearchParams(sortedParams).toString();
		return `${baseKey}?${paramString}`;
	}

	/**
	 * Check if cached item is still valid
	 */
	private isValid(item: CacheItem<any>): boolean {
		return Date.now() - item.timestamp < item.ttl;
	}

	/**
	 * Get cached data if valid
	 */
	get<T>(endpoint: string, params?: Record<string, any>): T | null {
		const key = this.generateKey(endpoint, params);
		const item = this.cache.get(key);

		if (!item) {
			return null;
		}

		if (!this.isValid(item)) {
			this.cache.delete(key);
			return null;
		}

		console.log(`📋 Cache HIT: ${key}`);
		return item.data;
	}

	/**
	 * Set cached data with optional TTL
	 */
	set<T>(endpoint: string, data: T, params?: Record<string, any>, ttl?: number): void {
		const key = this.generateKey(endpoint, params);
		const cacheItem: CacheItem<T> = {
			data,
			timestamp: Date.now(),
			ttl: ttl || this.defaultTTL
		};

		this.cache.set(key, cacheItem);
		console.log(`💾 Cache SET: ${key} (TTL: ${cacheItem.ttl}ms)`);
	}

	/**
	 * Check if data exists in cache and is valid
	 */
	has(endpoint: string, params?: Record<string, any>): boolean {
		const key = this.generateKey(endpoint, params);
		const item = this.cache.get(key);

		if (!item) {
			return false;
		}

		if (!this.isValid(item)) {
			this.cache.delete(key);
			return false;
		}

		return true;
	}

	/**
	 * Invalidate cache for specific endpoint
	 */
	invalidate(endpoint: string, params?: Record<string, any>): void {
		const key = this.generateKey(endpoint, params);
		if (this.cache.delete(key)) {
			console.log(`🗑️ Cache INVALIDATED: ${key}`);
		}
	}

	/**
	 * Invalidate all cache entries matching endpoint pattern
	 */
	invalidatePattern(pattern: string): void {
		const keys = Array.from(this.cache.keys());
		const invalidatedKeys: string[] = [];

		keys.forEach((key) => {
			if (key.includes(pattern.toLowerCase())) {
				this.cache.delete(key);
				invalidatedKeys.push(key);
			}
		});

		if (invalidatedKeys.length > 0) {
			console.log(`🗑️ Cache INVALIDATED pattern "${pattern}":`, invalidatedKeys);
		}
	}

	/**
	 * Clear all cache
	 */
	clear(): void {
		const size = this.cache.size;
		this.cache.clear();
		console.log(`🧹 Cache CLEARED: ${size} items removed`);
	}

	/**
	 * Get cache statistics
	 */
	getStats() {
		const now = Date.now();
		let valid = 0;
		let expired = 0;

		this.cache.forEach((item) => {
			if (this.isValid(item)) {
				valid++;
			} else {
				expired++;
			}
		});

		return {
			total: this.cache.size,
			valid,
			expired,
			keys: Array.from(this.cache.keys())
		};
	}

	/**
	 * Clean up expired entries
	 */
	cleanup(): void {
		const expiredKeys: string[] = [];

		this.cache.forEach((item, key) => {
			if (!this.isValid(item)) {
				expiredKeys.push(key);
			}
		});

		expiredKeys.forEach((key) => this.cache.delete(key));

		if (expiredKeys.length > 0) {
			console.log(`🧹 Cache CLEANUP: ${expiredKeys.length} expired items removed`);
		}
	}
}

// Create singleton instance
export const apiCache = new ApiCache();

// Cleanup expired entries every 10 minutes
if (typeof setInterval !== 'undefined') {
	setInterval(
		() => {
			apiCache.cleanup();
		},
		10 * 60 * 1000
	);
}

// Cache configuration constants
export const CACHE_KEYS = {
	EMPLOYEES: 'employees',
	DEPARTMENTS: 'departments',
	ROLES: 'roles',
	EMPLOYEE_DETAIL: 'employee',
	DASHBOARD: 'dashboard'
} as const;

export const CACHE_TTL = {
	SHORT: 2 * 60 * 1000, // 2 minutes
	MEDIUM: 5 * 60 * 1000, // 5 minutes
	LONG: 15 * 60 * 1000, // 15 minutes
	VERY_LONG: 60 * 60 * 1000 // 1 hour
} as const;
