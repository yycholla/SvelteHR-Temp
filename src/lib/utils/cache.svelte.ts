/**
 * Cache Utility - Svelte 5 Runes
 * 
 * Modern caching system using Svelte 5 runes for reactive state management.
 * Provides memory caching, TTL support, and automatic cleanup.
 */

// Cache entry type
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  hits: number;
}

// Cache statistics type
interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
}

// Cache configuration
interface CacheConfig {
  maxSize?: number;
  defaultTtl?: number; // Default TTL in milliseconds
  cleanupInterval?: number; // Cleanup interval in milliseconds
}

class ReactiveCache<T = any> {
  private cache = $state<Map<string, CacheEntry<T>>>(new Map());
  private stats = $state({
    hits: 0,
    misses: 0
  });
  
  private config: Required<CacheConfig>;
  private cleanupTimer: number | null = null;

  constructor(config: CacheConfig = {}) {
    this.config = {
      maxSize: config.maxSize ?? 100,
      defaultTtl: config.defaultTtl ?? 5 * 60 * 1000, // 5 minutes
      cleanupInterval: config.cleanupInterval ?? 60 * 1000 // 1 minute
    };

    // Start automatic cleanup
    this.startCleanup();
  }

  /**
   * Get cache statistics (reactive)
   */
  get statistics(): CacheStats {
    return $derived(() => ({
      size: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: this.stats.hits + this.stats.misses > 0 
        ? this.stats.hits / (this.stats.hits + this.stats.misses) 
        : 0
    }));
  }

  /**
   * Set a value in the cache
   */
  set(key: string, value: T, ttl?: number): void {
    const actualTtl = ttl ?? this.config.defaultTtl;
    
    // If cache is at max size, remove oldest entry
    if (this.cache.size >= this.config.maxSize) {
      const oldestKey = this.getOldestKey();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data: value,
      timestamp: Date.now(),
      ttl: actualTtl,
      hits: 0
    });
  }

  /**
   * Get a value from the cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update hit count and stats
    entry.hits++;
    this.stats.hits++;
    
    return entry.data;
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Delete a specific key
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
  }

  /**
   * Get or set pattern - fetch if not cached
   */
  async getOrSet<U extends T>(
    key: string, 
    fetcher: () => Promise<U>, 
    ttl?: number
  ): Promise<U> {
    // Try to get from cache first
    const cached = this.get(key);
    if (cached !== null) {
      return cached as U;
    }

    // Fetch and cache the result
    try {
      const result = await fetcher();
      this.set(key, result, ttl);
      return result;
    } catch (error) {
      // Don't cache errors, just re-throw
      throw error;
    }
  }

  /**
   * Get multiple keys at once
   */
  getMultiple(keys: string[]): Record<string, T | null> {
    const result: Record<string, T | null> = {};
    
    for (const key of keys) {
      result[key] = this.get(key);
    }
    
    return result;
  }

  /**
   * Set multiple key-value pairs at once
   */
  setMultiple(entries: Record<string, T>, ttl?: number): void {
    for (const [key, value] of Object.entries(entries)) {
      this.set(key, value, ttl);
    }
  }

  /**
   * Get all keys (useful for debugging)
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  // Private methods

  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private getOldestKey(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  private startCleanup(): void {
    this.cleanupTimer = window.setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }

    if (keysToDelete.length > 0) {
      console.log(`Cache cleanup: removed ${keysToDelete.length} expired entries`);
    }
  }

  /**
   * Stop the cache cleanup timer (call on component unmount)
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

// Global cache instances
let apiCache: ReactiveCache | null = null;
let userCache: ReactiveCache | null = null;

/**
 * Get or create the API data cache
 */
export function getApiCache(): ReactiveCache {
  if (!apiCache) {
    apiCache = new ReactiveCache({
      maxSize: 200,
      defaultTtl: 10 * 60 * 1000, // 10 minutes
      cleanupInterval: 2 * 60 * 1000 // 2 minutes
    });
  }
  return apiCache;
}

/**
 * Get or create the user-specific cache
 */
export function getUserCache(): ReactiveCache {
  if (!userCache) {
    userCache = new ReactiveCache({
      maxSize: 50,
      defaultTtl: 30 * 60 * 1000, // 30 minutes
      cleanupInterval: 5 * 60 * 1000 // 5 minutes
    });
  }
  return userCache;
}

/**
 * Create cache key from multiple parts
 */
export function createCacheKey(...parts: (string | number | boolean)[]): string {
  return parts.map(p => String(p)).join(':');
}

/**
 * Cache decorator for functions (utility)
 */
export function cached<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  cache: ReactiveCache = getApiCache(),
  keyGenerator?: (...args: Parameters<T>) => string,
  ttl?: number
): T {
  return (async (...args: Parameters<T>) => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
    
    return cache.getOrSet(key, () => fn(...args), ttl);
  }) as T;
}

/**
 * Hook for using cache in components
 */
export function useCache(config?: CacheConfig) {
  const cache = new ReactiveCache(config);
  
  // Cleanup on component unmount
  $effect(() => {
    return () => cache.destroy();
  });
  
  return cache;
}

// Export the cache class for direct usage
export { ReactiveCache };

// Cache utility for common patterns
export const CacheUtils = {
  // Employee cache key patterns
  employee: (id: string) => `employee:${id}`,
  employees: (filters?: Record<string, any>) => `employees:${JSON.stringify(filters || {})}`,
  
  // Department cache key patterns
  department: (id: string) => `department:${id}`,
  departments: () => 'departments:all',
  
  // User cache key patterns
  user: (id: string) => `user:${id}`,
  userProfile: (userId: string) => `user:${userId}:profile`,
  userPermissions: (userId: string) => `user:${userId}:permissions`,
  
  // Report cache key patterns
  report: (type: string, params?: Record<string, any>) => 
    `report:${type}:${JSON.stringify(params || {})}`,
    
  // Analytics cache key patterns
  analytics: (metric: string, timeframe: string) => `analytics:${metric}:${timeframe}`,
};