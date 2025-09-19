/**
 * Redis Caching Service for SvelteHR
 *
 * Comprehensive caching strategy with:
 * - Memory cache for hot data
 * - Redis cache for distributed caching
 * - Cache invalidation strategies
 * - Performance monitoring
 * - Cache warming and prefetching
 */
import { Redis } from 'ioredis';
interface CacheConfig {
  defaultTTL: number;
  memoryCacheTTL: number;
  redisCacheTTL: number;
  enableCompression: boolean;
  maxKeys: number;
}
interface CacheKey {
  prefix: string;
  identifier: string;
  version?: string;
}
interface CacheStats {
  hits: number;
  misses: number;
  errors: number;
  hitRate: number;
  memoryUsage: number;
  redisUsage: number;
}
/**
 * Advanced caching service with multi-layer caching
 */
export declare class CacheService {
  private memoryCache;
  private redis;
  private config;
  private stats;
  private cacheKeys;
  private versionCache;
  constructor(redis: Redis, config?: Partial<CacheConfig>);
  /**
   * Generate standardized cache key
   */
  private generateCacheKey;
  /**
   * Get cached value (memory first, then Redis)
   */
  get<T>(key: CacheKey | string, identifier?: string): Promise<T | null>;
  /**
   * Set cached value (both memory and Redis)
   */
  set<T>(
    key: CacheKey | string,
    value: T,
    identifier?: string,
    ttl?: number
  ): Promise<void>;
  /**
   * Delete cached value
   */
  delete(key: CacheKey | string, identifier?: string): Promise<boolean>;
  /**
   * Cache invalidation by pattern
   */
  invalidate(pattern: string): Promise<number>;
  /**
   * Clear all cache
   */
  clear(): Promise<boolean>;
  /**
   * Cache warming - prepopulate frequently accessed data
   */
  warmCache(cacheWarmers: Array<() => Promise<void>>): Promise<void>;
  /**
   * Get cache statistics
   */
  getStats(): CacheStats;
  /**
   * Update hit rate
   */
  private updateHitRate;
  /**
   * Monitor cache performance
   */
  getPerformanceMetrics(): {
    memoryCache: {
      keys: number;
      hits: number;
      misses: number;
      hitRate: number;
      vsize: number;
    };
    serviceStats: CacheStats;
    totalKeys: number;
    uptime: number;
  };
}
/**
 * GraphQL Query Cache Service
 * Specialized caching for GraphQL queries and results
 */
export declare class GraphQLQueryCache {
  private cache;
  private queryParser;
  constructor(cacheService: CacheService);
  /**
   * Cache GraphQL query result
   */
  cacheQueryResult(
    query: string,
    variables: Record<string, any>,
    result: any,
    userContext?: any
  ): Promise<void>;
  /**
   * Get cached GraphQL query result
   */
  getCachedQueryResult(
    query: string,
    variables: Record<string, any>,
    userContext?: any
  ): Promise<any | null>;
  /**
   * Invalidate GraphQL cache for specific entities
   */
  invalidateEntity(entityType: string, entityId: string): Promise<void>;
}
export default CacheService;
