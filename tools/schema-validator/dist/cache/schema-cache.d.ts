/**
 * Schema Cache - Multi-level caching for database, API, and operations
 * Improves validation performance by caching introspection results
 */
import type { DatabaseColumn, ApiField, GraphQLOperation } from '../types/models.js';
/**
 * Cache type identifiers
 */
type CacheType = 'database' | 'api' | 'operations';
/**
 * Schema Cache class
 * Manages persistent caching of schema data with TTL
 */
export declare class SchemaCache {
  private cacheDir;
  private readonly DEFAULT_TTL;
  constructor(cacheDir: string);
  /**
   * Initialize cache directory
   */
  init(): Promise<void>;
  /**
   * Save database schema to cache
   */
  saveDatabase(data: DatabaseColumn[], ttl?: number): Promise<void>;
  /**
   * Load database schema from cache
   */
  loadDatabase(): Promise<DatabaseColumn[] | null>;
  /**
   * Save API schema to cache
   */
  saveApi(data: ApiField[], ttl?: number): Promise<void>;
  /**
   * Load API schema from cache
   */
  loadApi(): Promise<ApiField[] | null>;
  /**
   * Save GraphQL operations to cache
   */
  saveOperations(data: Map<string, GraphQLOperation[]>, ttl?: number): Promise<void>;
  /**
   * Load GraphQL operations from cache
   */
  loadOperations(): Promise<Map<string, GraphQLOperation[]> | null>;
  /**
   * Check if cache entry is valid (exists and not expired)
   */
  isValid(type: CacheType): Promise<boolean>;
  /**
   * Get cache age in seconds
   */
  getCacheAge(type: CacheType): Promise<number | null>;
  /**
   * Clear specific cache type
   */
  clear(type: CacheType): Promise<void>;
  /**
   * Clear all cache types
   */
  clearAll(): Promise<void>;
  /**
   * Compute hash of data for change detection
   */
  computeHash(data: any): string;
  /**
   * Check if data has changed compared to cache
   */
  hasChanged(type: CacheType, data: any): Promise<boolean>;
  /**
   * Generic set method
   * @private
   */
  private set;
  /**
   * Generic get method
   * @private
   */
  private get;
  /**
   * Load cache entry from disk
   * @private
   */
  private load;
  /**
   * Get cache file path
   * @private
   */
  private getCachePath;
  /**
   * Get cache statistics
   */
  getStats(): Promise<{
    database: {
      exists: boolean;
      age: number | null;
      valid: boolean;
    };
    api: {
      exists: boolean;
      age: number | null;
      valid: boolean;
    };
    operations: {
      exists: boolean;
      age: number | null;
      valid: boolean;
    };
  }>;
}
export {};
//# sourceMappingURL=schema-cache.d.ts.map
