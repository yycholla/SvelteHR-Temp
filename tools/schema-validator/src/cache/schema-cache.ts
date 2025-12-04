/**
 * Schema Cache - Multi-level caching for database, API, and operations
 * Improves validation performance by caching introspection results
 */

import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import type { ApiField, DatabaseColumn, GraphQLOperation } from '../types/models.js';

/**
 * Cache entry metadata
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hash: string;
}

/**
 * Cache type identifiers
 */
type CacheType = 'database' | 'api' | 'operations';

/**
 * Schema Cache class
 * Manages persistent caching of schema data with TTL
 */
export class SchemaCache {
  private cacheDir: string;
  private readonly DEFAULT_TTL = 3600; // 1 hour in seconds

  constructor(cacheDir: string) {
    this.cacheDir = cacheDir;
  }

  /**
   * Initialize cache directory
   */
  async init(): Promise<void> {
    if (!existsSync(this.cacheDir)) {
      await mkdir(this.cacheDir, { recursive: true });
    }
  }

  /**
   * Save database schema to cache
   */
  async saveDatabase(data: DatabaseColumn[], ttl?: number): Promise<void> {
    await this.set('database', data, ttl);
  }

  /**
   * Load database schema from cache
   */
  async loadDatabase(): Promise<DatabaseColumn[] | null> {
    return this.get<DatabaseColumn[]>('database');
  }

  /**
   * Save API schema to cache
   */
  async saveApi(data: ApiField[], ttl?: number): Promise<void> {
    await this.set('api', data, ttl);
  }

  /**
   * Load API schema from cache
   */
  async loadApi(): Promise<ApiField[] | null> {
    return this.get<ApiField[]>('api');
  }

  /**
   * Save GraphQL operations to cache
   */
  async saveOperations(data: Map<string, GraphQLOperation[]>, ttl?: number): Promise<void> {
    // Convert Map to array for JSON serialization
    const serializable = Array.from(data.entries());
    await this.set('operations', serializable, ttl);
  }

  /**
   * Load GraphQL operations from cache
   */
  async loadOperations(): Promise<Map<string, GraphQLOperation[]> | null> {
    const data = await this.get<Array<[string, GraphQLOperation[]]>>('operations');
    if (!data) {
      return null;
    }

    // Convert array back to Map
    return new Map(data);
  }

  /**
   * Check if cache entry is valid (exists and not expired)
   */
  async isValid(type: CacheType): Promise<boolean> {
    try {
      const entry = await this.load<any>(type);
      if (!entry) {
        return false;
      }

      const now = Date.now();
      const age = (now - entry.timestamp) / 1000; // Convert to seconds
      return age < entry.ttl;
    } catch {
      return false;
    }
  }

  /**
   * Get cache age in seconds
   */
  async getCacheAge(type: CacheType): Promise<number | null> {
    try {
      const entry = await this.load<any>(type);
      if (!entry) {
        return null;
      }

      const now = Date.now();
      return (now - entry.timestamp) / 1000;
    } catch {
      return null;
    }
  }

  /**
   * Clear specific cache type
   */
  async clear(type: CacheType): Promise<void> {
    const filePath = this.getCachePath(type);
    try {
      if (existsSync(filePath)) {
        await unlink(filePath);
      }
    } catch (error) {
      console.error(`Failed to clear ${type} cache:`, error);
    }
  }

  /**
   * Clear all cache types
   */
  async clearAll(): Promise<void> {
    await Promise.all([this.clear('database'), this.clear('api'), this.clear('operations')]);
  }

  /**
   * Compute hash of data for change detection
   */
  computeHash(data: any): string {
    const json = JSON.stringify(data);
    return createHash('sha256').update(json).digest('hex');
  }

  /**
   * Check if data has changed compared to cache
   */
  async hasChanged(type: CacheType, data: any): Promise<boolean> {
    try {
      const entry = await this.load<any>(type);
      if (!entry) {
        return true; // No cache = changed
      }

      const newHash = this.computeHash(data);
      return newHash !== entry.hash;
    } catch {
      return true;
    }
  }

  /**
   * Generic set method
   * @private
   */
  private async set<T>(type: CacheType, data: T, ttl?: number): Promise<void> {
    await this.init();

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl ?? this.DEFAULT_TTL,
      hash: this.computeHash(data),
    };

    const filePath = this.getCachePath(type);
    const json = JSON.stringify(entry, null, 2);

    try {
      await writeFile(filePath, json, 'utf-8');
    } catch (error) {
      throw new Error(
        `Failed to write ${type} cache: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Generic get method
   * @private
   */
  private async get<T>(type: CacheType): Promise<T | null> {
    const entry = await this.load<T>(type);

    if (!entry) {
      return null;
    }

    // Check if cache is expired
    const now = Date.now();
    const age = (now - entry.timestamp) / 1000;

    if (age >= entry.ttl) {
      // Cache expired - delete it
      await this.clear(type);
      return null;
    }

    return entry.data;
  }

  /**
   * Load cache entry from disk
   * @private
   */
  private async load<T>(type: CacheType): Promise<CacheEntry<T> | null> {
    const filePath = this.getCachePath(type);

    if (!existsSync(filePath)) {
      return null;
    }

    try {
      const content = await readFile(filePath, 'utf-8');
      return JSON.parse(content) as CacheEntry<T>;
    } catch (error) {
      console.error(`Failed to read ${type} cache:`, error);
      return null;
    }
  }

  /**
   * Get cache file path
   * @private
   */
  private getCachePath(type: CacheType): string {
    return join(this.cacheDir, `.cache-${type}.json`);
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    database: { exists: boolean; age: number | null; valid: boolean };
    api: { exists: boolean; age: number | null; valid: boolean };
    operations: { exists: boolean; age: number | null; valid: boolean };
  }> {
    const types: CacheType[] = ['database', 'api', 'operations'];

    const stats = await Promise.all(
      types.map(async (type) => {
        const exists = existsSync(this.getCachePath(type));
        const age = await this.getCacheAge(type);
        const valid = await this.isValid(type);

        return { type, exists, age, valid };
      })
    );

    return {
      database: { exists: stats[0]!.exists, age: stats[0]!.age, valid: stats[0]!.valid },
      api: { exists: stats[1]!.exists, age: stats[1]!.age, valid: stats[1]!.valid },
      operations: { exists: stats[2]!.exists, age: stats[2]!.age, valid: stats[2]!.valid },
    };
  }
}
