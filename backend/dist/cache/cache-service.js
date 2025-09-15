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
import NodeCache from 'node-cache';
import { createLogger, format, transports } from 'winston';
const logger = createLogger({
    level: 'debug',
    format: format.combine(format.timestamp(), format.errors({ stack: true }), format.json()),
    transports: [new transports.Console()]
});
/**
 * Advanced caching service with multi-layer caching
 */
export class CacheService {
    memoryCache;
    redis;
    config;
    stats;
    cacheKeys = new Set();
    versionCache = new Map();
    constructor(redis, config) {
        this.redis = redis;
        this.config = {
            defaultTTL: 3600, // 1 hour
            memoryCacheTTL: 300, // 5 minutes
            redisCacheTTL: 3600, // 1 hour
            enableCompression: false,
            maxKeys: 10000,
            ...config
        };
        // Initialize memory cache (LRU cache for hot data)
        this.memoryCache = new NodeCache({
            stdTTL: this.config.memoryCacheTTL,
            maxKeys: this.config.maxKeys,
            useClones: false,
            checkperiod: this.config.memoryCacheTTL / 2
        });
        // Initialize stats
        this.stats = {
            hits: 0,
            misses: 0,
            errors: 0,
            hitRate: 0,
            memoryUsage: 0,
            redisUsage: 0
        };
        // Set up memory cache event listeners
        this.memoryCache.on('set', (key) => {
            this.stats.memoryUsage = this.memoryCache.keys().length;
            this.cacheKeys.add(key);
        });
        this.memoryCache.on('del', (key) => {
            this.stats.memoryUsage = this.memoryCache.keys().length;
            this.cacheKeys.delete(key);
        });
        logger.info('Cache service initialized', {
            memoryTTL: this.config.memoryCacheTTL,
            redisTTL: this.config.redisCacheTTL,
            maxKeys: this.config.maxKeys
        });
    }
    /**
     * Generate standardized cache key
     */
    generateCacheKey(prefixOrKey, identifier) {
        if (typeof prefixOrKey === 'string') {
            return `${prefixOrKey}:${identifier || 'default'}`;
        }
        const { prefix, identifier: id, version } = prefixOrKey;
        let key = `${prefix}:${id}`;
        if (version) {
            key += `:${version}`;
        }
        return key;
    }
    /**
     * Get cached value (memory first, then Redis)
     */
    async get(key, identifier) {
        try {
            const cacheKey = this.generateCacheKey(key, identifier);
            // Check memory cache first (fastest)
            let value = this.memoryCache.get(cacheKey);
            if (value !== undefined) {
                this.stats.hits++;
                logger.debug('Cache hit - memory', { key: cacheKey });
                return value;
            }
            // Check Redis cache
            try {
                const redisValue = await this.redis.get(cacheKey);
                if (redisValue) {
                    value = JSON.parse(redisValue);
                    // Store in memory cache for faster subsequent access
                    this.memoryCache.set(cacheKey, value);
                    this.stats.hits++;
                    logger.debug('Cache hit - Redis', { key: cacheKey });
                    return value;
                }
            }
            catch (redisError) {
                this.stats.errors++;
                logger.error('Redis cache read error', {
                    key: cacheKey,
                    error: redisError.message
                });
            }
            this.stats.misses++;
            logger.debug('Cache miss', { key: cacheKey });
            return null;
        }
        finally {
            this.updateHitRate();
        }
    }
    /**
     * Set cached value (both memory and Redis)
     */
    async set(key, value, identifier, ttl) {
        try {
            const cacheKey = this.generateCacheKey(key, identifier);
            const effectiveTTL = ttl || this.config.defaultTTL;
            // Set in memory cache
            this.memoryCache.set(cacheKey, value, effectiveTTL);
            // Set in Redis cache
            try {
                await this.redis.setex(cacheKey, effectiveTTL, JSON.stringify(value));
                logger.debug('Cache set', { key: cacheKey, ttl: effectiveTTL });
            }
            catch (redisError) {
                this.stats.errors++;
                logger.error('Redis cache write error', {
                    key: cacheKey,
                    error: redisError.message
                });
                // Continue even if Redis fails (memory cache still works)
            }
        }
        catch (error) {
            this.stats.errors++;
            logger.error('Cache set error', {
                error: error.message
            });
        }
    }
    /**
     * Delete cached value
     */
    async delete(key, identifier) {
        try {
            const cacheKey = this.generateCacheKey(key, identifier);
            // Remove from memory cache
            this.memoryCache.del(cacheKey);
            // Remove from Redis cache
            await this.redis.del(cacheKey);
            this.cacheKeys.delete(cacheKey);
            logger.debug('Cache deleted', { key: cacheKey });
            return true;
        }
        catch (error) {
            this.stats.errors++;
            logger.error('Cache delete error', {
                error: error.message,
                key
            });
            return false;
        }
    }
    /**
     * Cache invalidation by pattern
     */
    async invalidate(pattern) {
        try {
            let deletedCount = 0;
            // Invalidate memory cache keys
            const memoryKeys = this.memoryCache.keys();
            for (const key of memoryKeys) {
                if (key.includes(pattern)) {
                    this.memoryCache.del(key);
                    this.cacheKeys.delete(key);
                    deletedCount++;
                }
            }
            // Invalidate Redis cache keys
            try {
                const redisKeys = await this.redis.keys(`*${pattern}*`);
                if (redisKeys.length > 0) {
                    deletedCount += redisKeys.length;
                    await this.redis.del(...redisKeys);
                }
            }
            catch (redisError) {
                this.stats.errors++;
                logger.error('Redis cache invalidate error', {
                    pattern,
                    error: redisError.message
                });
            }
            logger.info('Cache invalidated by pattern', {
                pattern,
                deletedCount
            });
            return deletedCount;
        }
        catch (error) {
            this.stats.errors++;
            logger.error('Cache invalidate error', {
                pattern,
                error: error.message
            });
            return 0;
        }
    }
    /**
     * Clear all cache
     */
    async clear() {
        try {
            // Clear memory cache
            this.memoryCache.flushAll();
            this.cacheKeys.clear();
            // Clear Redis cache (with prefix to avoid clearing completely)
            try {
                const keys = await this.redis.keys('sveltehr:*');
                if (keys.length > 0) {
                    await this.redis.del(...keys);
                }
            }
            catch (redisError) {
                this.stats.errors++;
                logger.error('Redis cache clear error', {
                    error: redisError.message
                });
            }
            // Reset stats
            this.stats.hits = 0;
            this.stats.misses = 0;
            this.stats.errors = 0;
            logger.info('Cache cleared');
            return true;
        }
        catch (error) {
            this.stats.errors++;
            logger.error('Cache clear error', {
                error: error.message
            });
            return false;
        }
    }
    /**
     * Cache warming - prepopulate frequently accessed data
     */
    async warmCache(cacheWarmers) {
        logger.info('Starting cache warming');
        for (const warmer of cacheWarmers) {
            try {
                await warmer();
                logger.debug('Cache warmer executed', { warmer: warmer.name || 'anonymous' });
            }
            catch (error) {
                logger.error('Cache warmer failed', {
                    warmer: warmer.name || 'anonymous',
                    error: error.message
                });
            }
        }
        logger.info('Cache warming completed');
    }
    /**
     * Get cache statistics
     */
    getStats() {
        return { ...this.stats };
    }
    /**
     * Update hit rate
     */
    updateHitRate() {
        const total = this.stats.hits + this.stats.misses;
        if (total > 0) {
            this.stats.hitRate = this.stats.hits / total;
        }
    }
    /**
     * Monitor cache performance
     */
    getPerformanceMetrics() {
        const memoryInfo = this.memoryCache.getStats();
        return {
            memoryCache: {
                keys: memoryInfo.keys,
                hits: memoryInfo.hits,
                misses: memoryInfo.misses,
                hitRate: memoryInfo.hits > 0 ? memoryInfo.hits / (memoryInfo.hits + memoryInfo.misses) : 0,
                vsize: memoryInfo.vsize
            },
            serviceStats: this.stats,
            totalKeys: this.cacheKeys.size,
            uptime: process.uptime()
        };
    }
}
/**
 * GraphQL Query Cache Service
 * Specialized caching for GraphQL queries and results
 */
export class GraphQLQueryCache {
    cache;
    queryParser;
    constructor(cacheService) {
        this.cache = cacheService;
        this.queryParser = new QueryParser();
    }
    /**
     * Cache GraphQL query result
     */
    async cacheQueryResult(query, variables, result, userContext) {
        try {
            // Parse query to determine cacheability
            const queryHash = this.queryParser.getQueryHash(query, variables);
            const cachePolicy = this.queryParser.getCachePolicy(query);
            if (!cachePolicy.cacheable) {
                return; // Don't cache non-cacheable queries
            }
            // Generate cache key based on query hash and user context
            const cacheKey = {
                prefix: 'graphql_query',
                identifier: queryHash,
                version: userContext?.userId ? `user:${userContext.userId}` : undefined
            };
            await this.cache.set(cacheKey, result, undefined, cachePolicy.ttl);
        }
        catch (error) {
            logger.error('GraphQL query cache error', {
                error: error.message,
                query: query.substring(0, 100)
            });
        }
    }
    /**
     * Get cached GraphQL query result
     */
    async getCachedQueryResult(query, variables, userContext) {
        try {
            const queryHash = this.queryParser.getQueryHash(query, variables);
            const cachePolicy = this.queryParser.getCachePolicy(query);
            if (!cachePolicy.cacheable) {
                return null;
            }
            const cacheKey = {
                prefix: 'graphql_query',
                identifier: queryHash,
                version: userContext?.userId ? `user:${userContext.userId}` : undefined
            };
            return await this.cache.get(cacheKey);
        }
        catch (error) {
            logger.error('GraphQL cache get error', {
                error: error.message,
                query: query.substring(0, 100)
            });
            return null;
        }
    }
    /**
     * Invalidate GraphQL cache for specific entities
     */
    async invalidateEntity(entityType, entityId) {
        const pattern = `graphql_query:*:${entityType}:${entityId}`;
        await this.cache.invalidate(pattern);
    }
}
/**
 * Simple GraphQL query parser for caching
 */
class QueryParser {
    /**
     * Generate hash for query + variables
     */
    getQueryHash(query, variables) {
        const crypto = require('crypto');
        const queryNormalized = query.replace(/\s+/g, ' ').trim();
        const variablesString = JSON.stringify(variables || {});
        const hashInput = `${queryNormalized}:${variablesString}`;
        return crypto.createHash('sha256').update(hashInput).digest('hex');
    }
    /**
     * Determine if query is cacheable and get TTL
     */
    getCachePolicy(query) {
        // Don't cache mutations
        if (this.isMutation(query)) {
            return { cacheable: false, ttl: 0 };
        }
        // Don't cache subscription queries
        if (this.isSubscription(query)) {
            return { cacheable: false, ttl: 0 };
        }
        // Queries with sensitive fields should not be cached
        if (this.hasSensitiveFields(query)) {
            return { cacheable: false, ttl: 0 };
        }
        // Read-only queries are generally cacheable
        if (this.isReadOnly(query)) {
            return { cacheable: true, ttl: 300 }; // 5 minutes for read queries
        }
        // Default: cacheable with short TTL
        return { cacheable: true, ttl: 60 }; // 1 minute default
    }
    /**
     * Check if query is a mutation
     */
    isMutation(query) {
        return /\bmutation\b/i.test(query);
    }
    /**
     * Check if query is a subscription
     */
    isSubscription(query) {
        return /\bsubscription\b/i.test(query);
    }
    /**
     * Check if query has sensitive fields
     */
    hasSensitiveFields(query) {
        const sensitivePatterns = [
            /password/i,
            /secret/i,
            /token/i,
            /auth/i,
            /sensitive/i
        ];
        return sensitivePatterns.some(pattern => pattern.test(query));
    }
    /**
     * Check if query is read-only
     */
    isReadOnly(query) {
        const readOnlyPatterns = [
            /\bquery\s*[{]/i,
            /\b(\w+)\s*[({][^}]*\b(id|ids|ids_in|email|email_in)\b/i
        ];
        return readOnlyPatterns.some(pattern => pattern.test(query));
    }
}
export default CacheService;
//# sourceMappingURL=cache-service.js.map