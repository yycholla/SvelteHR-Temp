/**
 * Schema Cache - Multi-level caching for database, API, and operations
 * Improves validation performance by caching introspection results
 */
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
/**
 * Schema Cache class
 * Manages persistent caching of schema data with TTL
 */
export class SchemaCache {
  cacheDir;
  DEFAULT_TTL = 3600; // 1 hour in seconds
  constructor(cacheDir) {
    this.cacheDir = cacheDir;
  }
  /**
   * Initialize cache directory
   */
  async init() {
    if (!existsSync(this.cacheDir)) {
      await mkdir(this.cacheDir, { recursive: true });
    }
  }
  /**
   * Save database schema to cache
   */
  async saveDatabase(data, ttl) {
    await this.set('database', data, ttl);
  }
  /**
   * Load database schema from cache
   */
  async loadDatabase() {
    return this.get('database');
  }
  /**
   * Save API schema to cache
   */
  async saveApi(data, ttl) {
    await this.set('api', data, ttl);
  }
  /**
   * Load API schema from cache
   */
  async loadApi() {
    return this.get('api');
  }
  /**
   * Save GraphQL operations to cache
   */
  async saveOperations(data, ttl) {
    // Convert Map to array for JSON serialization
    const serializable = Array.from(data.entries());
    await this.set('operations', serializable, ttl);
  }
  /**
   * Load GraphQL operations from cache
   */
  async loadOperations() {
    const data = await this.get('operations');
    if (!data) {
      return null;
    }
    // Convert array back to Map
    return new Map(data);
  }
  /**
   * Check if cache entry is valid (exists and not expired)
   */
  async isValid(type) {
    try {
      const entry = await this.load(type);
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
  async getCacheAge(type) {
    try {
      const entry = await this.load(type);
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
  async clear(type) {
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
  async clearAll() {
    await Promise.all([this.clear('database'), this.clear('api'), this.clear('operations')]);
  }
  /**
   * Compute hash of data for change detection
   */
  computeHash(data) {
    const json = JSON.stringify(data);
    return createHash('sha256').update(json).digest('hex');
  }
  /**
   * Check if data has changed compared to cache
   */
  async hasChanged(type, data) {
    try {
      const entry = await this.load(type);
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
  async set(type, data, ttl) {
    await this.init();
    const entry = {
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
  async get(type) {
    const entry = await this.load(type);
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
  async load(type) {
    const filePath = this.getCachePath(type);
    if (!existsSync(filePath)) {
      return null;
    }
    try {
      const content = await readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`Failed to read ${type} cache:`, error);
      return null;
    }
  }
  /**
   * Get cache file path
   * @private
   */
  getCachePath(type) {
    return join(this.cacheDir, `.cache-${type}.json`);
  }
  /**
   * Get cache statistics
   */
  async getStats() {
    const types = ['database', 'api', 'operations'];
    const stats = await Promise.all(
      types.map(async (type) => {
        const exists = existsSync(this.getCachePath(type));
        const age = await this.getCacheAge(type);
        const valid = await this.isValid(type);
        return { type, exists, age, valid };
      })
    );
    return {
      database: { exists: stats[0].exists, age: stats[0].age, valid: stats[0].valid },
      api: { exists: stats[1].exists, age: stats[1].age, valid: stats[1].valid },
      operations: { exists: stats[2].exists, age: stats[2].age, valid: stats[2].valid },
    };
  }
}
//# sourceMappingURL=schema-cache.js.map
