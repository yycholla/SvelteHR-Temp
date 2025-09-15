import Redis from 'ioredis';

/**
 * Redis Client for Session Management and Caching
 * Handles user sessions, refresh tokens, and application caching
 */

interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  retryDelayOnFailover: number;
  maxRetriesPerRequest: number;
  lazyConnect: boolean;
}

export class RedisClient {
  private client: Redis;
  private isConnected = false;

  constructor() {
    const config: RedisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0', 10),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    };

    this.client = new Redis(config);
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      console.log('✅ Redis connected successfully');
      this.isConnected = true;
    });

    this.client.on('error', (error) => {
      console.error('❌ Redis connection error:', error);
      this.isConnected = false;
    });

    this.client.on('close', () => {
      console.log('🔐 Redis connection closed');
      this.isConnected = false;
    });

    this.client.on('reconnecting', () => {
      console.log('🔄 Redis reconnecting...');
    });
  }

  /**
   * Ensure connection is established
   */
  private async ensureConnection(): Promise<void> {
    if (!this.isConnected) {
      try {
        await this.client.connect();
      } catch (error) {
        console.error('Failed to connect to Redis:', error);
        throw new Error('Redis connection failed');
      }
    }
  }

  /**
   * Set a key-value pair with optional expiration
   */
  async set(key: string, value: string, expirationSeconds?: number): Promise<void> {
    await this.ensureConnection();
    
    if (expirationSeconds) {
      await this.client.set(key, value, 'EX', expirationSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  /**
   * Set with expiration (convenience method)
   */
  async setex(key: string, seconds: number, value: string): Promise<void> {
    await this.ensureConnection();
    await this.client.setex(key, seconds, value);
  }

  /**
   * Get value by key
   */
  async get(key: string): Promise<string | null> {
    await this.ensureConnection();
    return await this.client.get(key);
  }

  /**
   * Delete one or more keys
   */
  async del(...keys: string[]): Promise<number> {
    await this.ensureConnection();
    return await this.client.del(...keys);
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    await this.ensureConnection();
    const result = await this.client.exists(key);
    return result === 1;
  }

  /**
   * Set expiration for a key
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    await this.ensureConnection();
    const result = await this.client.expire(key, seconds);
    return result === 1;
  }

  /**
   * Get time to live for a key
   */
  async ttl(key: string): Promise<number> {
    await this.ensureConnection();
    return await this.client.ttl(key);
  }

  /**
   * Increment a numeric value
   */
  async incr(key: string): Promise<number> {
    await this.ensureConnection();
    return await this.client.incr(key);
  }

  /**
   * Increment by specific amount
   */
  async incrby(key: string, increment: number): Promise<number> {
    await this.ensureConnection();
    return await this.client.incrby(key, increment);
  }

  /**
   * Set multiple key-value pairs
   */
  async mset(keyValuePairs: Record<string, string>): Promise<void> {
    await this.ensureConnection();
    const args: string[] = [];
    Object.entries(keyValuePairs).forEach(([key, value]) => {
      args.push(key, value);
    });
    await this.client.mset(...args);
  }

  /**
   * Get multiple values by keys
   */
  async mget(...keys: string[]): Promise<(string | null)[]> {
    await this.ensureConnection();
    return await this.client.mget(...keys);
  }

  /**
   * Add to set
   */
  async sadd(key: string, ...members: string[]): Promise<number> {
    await this.ensureConnection();
    return await this.client.sadd(key, ...members);
  }

  /**
   * Remove from set
   */
  async srem(key: string, ...members: string[]): Promise<number> {
    await this.ensureConnection();
    return await this.client.srem(key, ...members);
  }

  /**
   * Check if member exists in set
   */
  async sismember(key: string, member: string): Promise<boolean> {
    await this.ensureConnection();
    const result = await this.client.sismember(key, member);
    return result === 1;
  }

  /**
   * Get all members of a set
   */
  async smembers(key: string): Promise<string[]> {
    await this.ensureConnection();
    return await this.client.smembers(key);
  }

  /**
   * Push to list (left side)
   */
  async lpush(key: string, ...values: string[]): Promise<number> {
    await this.ensureConnection();
    return await this.client.lpush(key, ...values);
  }

  /**
   * Pop from list (left side)
   */
  async lpop(key: string): Promise<string | null> {
    await this.ensureConnection();
    return await this.client.lpop(key);
  }

  /**
   * Get list range
   */
  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    await this.ensureConnection();
    return await this.client.lrange(key, start, stop);
  }

  /**
   * Hash operations: set field
   */
  async hset(key: string, field: string, value: string): Promise<number> {
    await this.ensureConnection();
    return await this.client.hset(key, field, value);
  }

  /**
   * Hash operations: get field
   */
  async hget(key: string, field: string): Promise<string | null> {
    await this.ensureConnection();
    return await this.client.hget(key, field);
  }

  /**
   * Hash operations: get all fields
   */
  async hgetall(key: string): Promise<Record<string, string>> {
    await this.ensureConnection();
    return await this.client.hgetall(key);
  }

  /**
   * Hash operations: delete field
   */
  async hdel(key: string, ...fields: string[]): Promise<number> {
    await this.ensureConnection();
    return await this.client.hdel(key, ...fields);
  }

  /**
   * Pattern-based key search (use carefully in production)
   */
  async keys(pattern: string): Promise<string[]> {
    await this.ensureConnection();
    return await this.client.keys(pattern);
  }

  /**
   * Scan for keys with cursor (production-safe alternative to keys)
   */
  async scan(cursor: number = 0, match?: string, count?: number): Promise<[string, string[]]> {
    await this.ensureConnection();
    const args: any[] = [cursor];
    
    if (match) {
      args.push('MATCH', match);
    }
    
    if (count) {
      args.push('COUNT', count);
    }
    
    return await this.client.scan(...args);
  }

  /**
   * Execute Redis transaction
   */
  async multi(operations: ((multi: Redis.Pipeline) => void)): Promise<any[]> {
    await this.ensureConnection();
    const multi = this.client.multi();
    operations(multi);
    return await multi.exec();
  }

  /**
   * Publish message to channel (for pub/sub)
   */
  async publish(channel: string, message: string): Promise<number> {
    await this.ensureConnection();
    return await this.client.publish(channel, message);
  }

  /**
   * Flush specific database
   */
  async flushdb(): Promise<void> {
    await this.ensureConnection();
    await this.client.flushdb();
  }

  /**
   * Get Redis info
   */
  async info(section?: string): Promise<string> {
    await this.ensureConnection();
    return section ? await this.client.info(section) : await this.client.info();
  }

  /**
   * Ping Redis server
   */
  async ping(): Promise<string> {
    await this.ensureConnection();
    return await this.client.ping();
  }

  /**
   * Get current database size
   */
  async dbsize(): Promise<number> {
    await this.ensureConnection();
    return await this.client.dbsize();
  }

  /**
   * Check connection status
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Close Redis connection
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
    }
  }

  /**
   * Session-specific helper methods
   */
  
  /**
   * Store user session
   */
  async setUserSession(userId: string, sessionData: any, expirationSeconds: number = 900): Promise<void> {
    await this.set(`session:${userId}`, JSON.stringify(sessionData), expirationSeconds);
  }

  /**
   * Get user session
   */
  async getUserSession(userId: string): Promise<any | null> {
    const data = await this.get(`session:${userId}`);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Delete user session
   */
  async deleteUserSession(userId: string): Promise<void> {
    await this.del(`session:${userId}`);
  }

  /**
   * Rate limiting: increment counter
   */
  async incrementRateLimit(key: string, windowSeconds: number): Promise<number> {
    const current = await this.incr(key);
    if (current === 1) {
      await this.expire(key, windowSeconds);
    }
    return current;
  }

  /**
   * Cache GraphQL query results
   */
  async cacheGraphQLResult(queryHash: string, result: any, ttlSeconds: number = 300): Promise<void> {
    await this.setex(`graphql:${queryHash}`, ttlSeconds, JSON.stringify(result));
  }

  /**
   * Get cached GraphQL result
   */
  async getCachedGraphQLResult(queryHash: string): Promise<any | null> {
    const cached = await this.get(`graphql:${queryHash}`);
    return cached ? JSON.parse(cached) : null;
  }
}

// Export a singleton instance
export const redisClient = new RedisClient();
export default redisClient;