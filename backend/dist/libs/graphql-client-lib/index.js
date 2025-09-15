/**
 * GraphQL Client Library
 *
 * High-performance GraphQL client optimized for Hasura integration with
 * advanced caching, subscription management, and query optimization.
 *
 * Features:
 * - Intelligent query caching with TTL and invalidation
 * - Real-time subscription multiplexing
 * - Automatic query optimization and batching
 * - JWT authentication integration
 * - Performance monitoring and metrics
 * - Error handling and retry logic
 * - Type-safe operations
 */
import { EventEmitter } from 'events';
import WebSocket from 'ws';
import fetch from 'node-fetch';
import { createHash } from 'crypto';
import Redis from 'ioredis';
export class GraphQLClientLib extends EventEmitter {
    config;
    redis;
    inMemoryCache;
    wsConnection;
    subscriptions;
    batchQueue;
    batchTimer;
    nextSubscriptionId;
    queryMetrics;
    reconnectAttempts;
    reconnectTimer;
    heartbeatTimer;
    constructor(config) {
        super();
        this.config = {
            ...config,
            cache: {
                defaultTTL: 300, // 5 minutes
                maxSize: 1000,
                enableInMemory: true,
                ...config.cache
            },
            performance: {
                enableMetrics: true,
                slowQueryThreshold: 1000, // 1 second
                enableBatching: false, // Disabled by default for Hasura
                batchInterval: 10,
                ...config.performance
            },
            subscriptions: {
                reconnectInterval: 5000,
                maxReconnectAttempts: 10,
                heartbeatInterval: 30000,
                ...config.subscriptions
            }
        };
        this.redis = new Redis(config.redis.connectionString, {
            keyPrefix: config.redis.keyPrefix || 'gql:',
            retryDelayOnFailover: 100,
            maxRetriesPerRequest: 3,
        });
        this.inMemoryCache = new Map();
        this.subscriptions = new Map();
        this.batchQueue = [];
        this.nextSubscriptionId = 1;
        this.queryMetrics = [];
        this.reconnectAttempts = 0;
        // Setup cleanup intervals
        this.setupCleanupIntervals();
    }
    /**
     * Execute GraphQL query with caching and optimization
     */
    async query(query, variables, options = {}) {
        const startTime = Date.now();
        const queryHash = this.generateQueryHash(query, variables);
        const operation = { query, variables };
        try {
            // Check cache first
            if (!options.skipCache) {
                const cachedResult = await this.getCachedResult(queryHash);
                if (cachedResult) {
                    this.recordMetrics({
                        executionTime: Date.now() - startTime,
                        cacheHit: true,
                        queryHash,
                        variables: variables || {},
                        timestamp: new Date()
                    });
                    return {
                        ...cachedResult,
                        extensions: {
                            ...cachedResult.extensions,
                            responseTime: Date.now() - startTime,
                            cacheHit: true
                        }
                    };
                }
            }
            // Execute query
            let result;
            if (this.config.performance.enableBatching && options.priority !== 'high') {
                result = await this.executeBatchedQuery(operation, options);
            }
            else {
                result = await this.executeQuery(operation, options);
            }
            // Cache successful results
            if (!result.errors && !options.skipCache) {
                const ttl = options.ttl || this.config.cache.defaultTTL;
                await this.cacheResult(queryHash, result, ttl);
            }
            // Record metrics
            this.recordMetrics({
                executionTime: Date.now() - startTime,
                cacheHit: false,
                queryHash,
                variables: variables || {},
                errors: result.errors,
                timestamp: new Date()
            });
            return {
                ...result,
                extensions: {
                    ...result.extensions,
                    responseTime: Date.now() - startTime,
                    cacheHit: false
                }
            };
        }
        catch (error) {
            this.recordMetrics({
                executionTime: Date.now() - startTime,
                cacheHit: false,
                queryHash,
                variables: variables || {},
                errors: [{ message: error.message }],
                timestamp: new Date()
            });
            throw error;
        }
    }
    /**
     * Execute GraphQL mutation (never cached)
     */
    async mutate(mutation, variables, options = {}) {
        const operation = { query: mutation, variables };
        const result = await this.executeQuery(operation, { ...options, skipCache: true });
        // Invalidate related cache entries
        await this.invalidateCache(mutation, variables);
        return result;
    }
    /**
     * Subscribe to GraphQL subscription with auto-reconnect
     */
    subscribe(subscription, variables, options = {}) {
        const subscriptionId = (this.nextSubscriptionId++).toString();
        const query = { query: subscription, variables };
        const subscriptionInfo = {
            id: subscriptionId,
            query,
            options,
            reconnectCount: 0,
            lastActivity: new Date()
        };
        this.subscriptions.set(subscriptionId, subscriptionInfo);
        // Ensure WebSocket connection
        this.ensureWebSocketConnection().then(() => {
            this.sendSubscription(subscriptionInfo);
        });
        return {
            id: subscriptionId,
            unsubscribe: () => this.unsubscribe(subscriptionId)
        };
    }
    /**
     * Unsubscribe from a subscription
     */
    unsubscribe(subscriptionId) {
        const subscription = this.subscriptions.get(subscriptionId);
        if (!subscription)
            return;
        // Send stop message to server
        if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
            this.wsConnection.send(JSON.stringify({
                id: subscriptionId,
                type: 'stop'
            }));
        }
        this.subscriptions.delete(subscriptionId);
    }
    /**
     * Execute single GraphQL query
     */
    async executeQuery(operation, options) {
        const headers = {
            'Content-Type': 'application/json',
        };
        // Add authentication header
        if (this.config.auth.getToken) {
            const token = await this.config.auth.getToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }
        const timeout = options.timeout || 30000;
        const maxRetries = options.retries || 3;
        let lastError;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeout);
                const response = await fetch(this.config.endpoint, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(operation),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                if (!response.ok) {
                    // Handle authentication errors
                    if (response.status === 401 && this.config.auth.tokenRefreshCallback) {
                        const newToken = await this.config.auth.tokenRefreshCallback();
                        if (newToken) {
                            headers['Authorization'] = `Bearer ${newToken}`;
                            continue; // Retry with new token
                        }
                    }
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                const result = await response.json();
                // Check for GraphQL errors
                if (result.errors?.length) {
                    const authError = result.errors.find(error => error.extensions?.code === 'access-denied' ||
                        error.message.toLowerCase().includes('unauthorized'));
                    if (authError && this.config.auth.tokenRefreshCallback) {
                        const newToken = await this.config.auth.tokenRefreshCallback();
                        if (newToken) {
                            headers['Authorization'] = `Bearer ${newToken}`;
                            continue; // Retry with new token
                        }
                    }
                }
                return result;
            }
            catch (error) {
                lastError = error;
                if (attempt < maxRetries && this.isRetryableError(error)) {
                    // Exponential backoff
                    const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
                break;
            }
        }
        throw lastError;
    }
    /**
     * Execute batched GraphQL queries (for performance optimization)
     */
    async executeBatchedQuery(operation, options) {
        return new Promise((resolve, reject) => {
            const batchedQuery = {
                id: crypto.randomBytes(8).toString('hex'),
                query: operation,
                options,
                resolve: resolve,
                reject
            };
            this.batchQueue.push(batchedQuery);
            // Process batch if it's high priority or queue is full
            if (options.priority === 'high' || this.batchQueue.length >= 10) {
                this.processBatch();
            }
            else if (!this.batchTimer) {
                // Set timer for batch processing
                this.batchTimer = setTimeout(() => {
                    this.processBatch();
                }, this.config.performance.batchInterval);
            }
        });
    }
    /**
     * Process batched queries
     */
    async processBatch() {
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
            this.batchTimer = undefined;
        }
        if (this.batchQueue.length === 0)
            return;
        const batch = this.batchQueue.splice(0);
        try {
            // For Hasura, we'll send individual requests but with connection reuse
            // True batching would require GraphQL batching support
            const promises = batch.map(item => this.executeQuery(item.query, item.options)
                .then(result => ({ item, result }))
                .catch(error => ({ item, error })));
            const results = await Promise.all(promises);
            results.forEach(({ item, result, error }) => {
                if (error) {
                    item.reject(error);
                }
                else {
                    item.resolve(result);
                }
            });
        }
        catch (error) {
            // Reject all queries in batch
            batch.forEach(item => item.reject(error));
        }
    }
    /**
     * Generate cache key for query
     */
    generateQueryHash(query, variables) {
        const normalized = query.replace(/\s+/g, ' ').trim();
        const variablesStr = variables ? JSON.stringify(variables) : '';
        return createHash('sha256').update(normalized + variablesStr).digest('hex');
    }
    /**
     * Get cached result
     */
    async getCachedResult(queryHash) {
        // Check in-memory cache first
        if (this.config.cache.enableInMemory) {
            const cached = this.inMemoryCache.get(queryHash);
            if (cached && cached.expires > Date.now()) {
                return cached.data;
            }
            // Remove expired entry
            if (cached) {
                this.inMemoryCache.delete(queryHash);
            }
        }
        // Check Redis cache
        try {
            const cached = await this.redis.get(queryHash);
            if (cached) {
                const result = JSON.parse(cached);
                // Also store in memory cache if enabled
                if (this.config.cache.enableInMemory) {
                    this.inMemoryCache.set(queryHash, {
                        data: result,
                        expires: Date.now() + (this.config.cache.defaultTTL * 1000)
                    });
                }
                return result;
            }
        }
        catch (error) {
            console.warn('Redis cache read failed:', error.message);
        }
        return null;
    }
    /**
     * Cache query result
     */
    async cacheResult(queryHash, result, ttlSeconds) {
        const data = JSON.stringify(result);
        // Store in Redis
        try {
            await this.redis.setex(queryHash, ttlSeconds, data);
        }
        catch (error) {
            console.warn('Redis cache write failed:', error.message);
        }
        // Store in memory cache if enabled
        if (this.config.cache.enableInMemory) {
            // Enforce max size limit
            if (this.inMemoryCache.size >= this.config.cache.maxSize) {
                const oldestKey = this.inMemoryCache.keys().next().value;
                this.inMemoryCache.delete(oldestKey);
            }
            this.inMemoryCache.set(queryHash, {
                data: result,
                expires: Date.now() + (ttlSeconds * 1000)
            });
        }
    }
    /**
     * Invalidate cache entries related to mutation
     */
    async invalidateCache(mutation, variables) {
        // Extract table/entity names from mutation
        const tableMatches = mutation.match(/(?:insert|update|delete)_(\w+)/gi);
        if (tableMatches) {
            const tables = tableMatches.map(match => match.split('_').slice(1).join('_'));
            // Clear Redis cache patterns
            for (const table of tables) {
                try {
                    const keys = await this.redis.keys(`*${table}*`);
                    if (keys.length > 0) {
                        await this.redis.del(...keys);
                    }
                }
                catch (error) {
                    console.warn('Cache invalidation failed:', error.message);
                }
            }
            // Clear in-memory cache entries
            if (this.config.cache.enableInMemory) {
                for (const [key, value] of this.inMemoryCache.entries()) {
                    if (tables.some(table => key.includes(table))) {
                        this.inMemoryCache.delete(key);
                    }
                }
            }
        }
        this.emit('cacheInvalidated', { tables: tableMatches, variables });
    }
    /**
     * Ensure WebSocket connection for subscriptions
     */
    async ensureWebSocketConnection() {
        if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
            return;
        }
        if (!this.config.subscriptionEndpoint) {
            throw new Error('Subscription endpoint not configured');
        }
        return new Promise((resolve, reject) => {
            const wsUrl = this.config.subscriptionEndpoint;
            const protocols = ['graphql-ws'];
            this.wsConnection = new WebSocket(wsUrl, protocols);
            this.wsConnection.on('open', async () => {
                console.log('WebSocket connection established');
                this.reconnectAttempts = 0;
                // Send connection init with auth
                const initPayload = {};
                if (this.config.auth.getToken) {
                    const token = await this.config.auth.getToken();
                    if (token) {
                        initPayload.Authorization = `Bearer ${token}`;
                    }
                }
                this.wsConnection.send(JSON.stringify({
                    type: 'connection_init',
                    payload: initPayload
                }));
                // Start heartbeat
                this.startHeartbeat();
                resolve();
            });
            this.wsConnection.on('message', (data) => {
                this.handleWebSocketMessage(JSON.parse(data));
            });
            this.wsConnection.on('close', (code, reason) => {
                console.log(`WebSocket closed: ${code} ${reason}`);
                this.stopHeartbeat();
                // Attempt to reconnect
                this.attemptReconnect();
            });
            this.wsConnection.on('error', (error) => {
                console.error('WebSocket error:', error);
                reject(error);
            });
        });
    }
    /**
     * Handle WebSocket messages
     */
    handleWebSocketMessage(message) {
        const { type, id, payload } = message;
        switch (type) {
            case 'connection_ack':
                console.log('WebSocket connection acknowledged');
                // Re-establish all active subscriptions
                this.reestablishSubscriptions();
                break;
            case 'connection_error':
                console.error('WebSocket connection error:', payload);
                this.emit('connectionError', payload);
                break;
            case 'data':
                this.handleSubscriptionData(id, payload);
                break;
            case 'error':
                this.handleSubscriptionError(id, payload);
                break;
            case 'complete':
                this.handleSubscriptionComplete(id);
                break;
            case 'ka': // Keep alive
                // Update last activity for connection health
                break;
            default:
                console.warn('Unknown WebSocket message type:', type);
        }
    }
    /**
     * Send subscription to server
     */
    sendSubscription(subscription) {
        if (!this.wsConnection || this.wsConnection.readyState !== WebSocket.OPEN) {
            return;
        }
        this.wsConnection.send(JSON.stringify({
            id: subscription.id,
            type: 'start',
            payload: subscription.query
        }));
    }
    /**
     * Handle subscription data
     */
    handleSubscriptionData(subscriptionId, data) {
        const subscription = this.subscriptions.get(subscriptionId);
        if (!subscription)
            return;
        subscription.lastActivity = new Date();
        if (subscription.options.onData) {
            subscription.options.onData(data);
        }
        this.emit('subscriptionData', { subscriptionId, data });
    }
    /**
     * Handle subscription error
     */
    handleSubscriptionError(subscriptionId, error) {
        const subscription = this.subscriptions.get(subscriptionId);
        if (!subscription)
            return;
        if (subscription.options.onError) {
            subscription.options.onError(error);
        }
        this.emit('subscriptionError', { subscriptionId, error });
    }
    /**
     * Handle subscription completion
     */
    handleSubscriptionComplete(subscriptionId) {
        const subscription = this.subscriptions.get(subscriptionId);
        if (!subscription)
            return;
        if (subscription.options.onComplete) {
            subscription.options.onComplete();
        }
        this.emit('subscriptionComplete', { subscriptionId });
        this.subscriptions.delete(subscriptionId);
    }
    /**
     * Re-establish all active subscriptions after reconnect
     */
    reestablishSubscriptions() {
        for (const subscription of this.subscriptions.values()) {
            this.sendSubscription(subscription);
            if (subscription.options.onReconnect) {
                subscription.options.onReconnect();
            }
        }
        this.emit('subscriptionsReestablished', this.subscriptions.size);
    }
    /**
     * Attempt to reconnect WebSocket
     */
    attemptReconnect() {
        if (this.reconnectAttempts >= this.config.subscriptions.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            this.emit('reconnectFailed', this.reconnectAttempts);
            return;
        }
        this.reconnectAttempts++;
        const delay = Math.min(this.config.subscriptions.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1), 30000);
        console.log(`Attempting reconnect #${this.reconnectAttempts} in ${delay}ms`);
        this.reconnectTimer = setTimeout(() => {
            this.ensureWebSocketConnection().catch((error) => {
                console.error('Reconnection failed:', error);
                this.attemptReconnect();
            });
        }, delay);
    }
    /**
     * Start heartbeat to keep connection alive
     */
    startHeartbeat() {
        this.heartbeatTimer = setInterval(() => {
            if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
                this.wsConnection.ping();
            }
        }, this.config.subscriptions.heartbeatInterval);
    }
    /**
     * Stop heartbeat timer
     */
    stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = undefined;
        }
    }
    /**
     * Record query metrics
     */
    recordMetrics(metrics) {
        if (!this.config.performance.enableMetrics)
            return;
        this.queryMetrics.push(metrics);
        // Keep only last 1000 metrics
        if (this.queryMetrics.length > 1000) {
            this.queryMetrics.shift();
        }
        // Emit slow query warning
        if (metrics.executionTime > this.config.performance.slowQueryThreshold) {
            this.emit('slowQuery', metrics);
        }
        this.emit('queryMetrics', metrics);
    }
    /**
     * Get performance metrics
     */
    getMetrics() {
        if (this.queryMetrics.length === 0) {
            return {
                totalQueries: 0,
                averageResponseTime: 0,
                cacheHitRate: 0,
                slowQueries: 0,
                errorRate: 0
            };
        }
        const totalQueries = this.queryMetrics.length;
        const averageResponseTime = this.queryMetrics.reduce((sum, m) => sum + m.executionTime, 0) / totalQueries;
        const cacheHits = this.queryMetrics.filter(m => m.cacheHit).length;
        const cacheHitRate = cacheHits / totalQueries;
        const slowQueries = this.queryMetrics.filter(m => m.executionTime > this.config.performance.slowQueryThreshold).length;
        const errorsCount = this.queryMetrics.filter(m => m.errors?.length).length;
        const errorRate = errorsCount / totalQueries;
        return {
            totalQueries,
            averageResponseTime: Math.round(averageResponseTime),
            cacheHitRate: Math.round(cacheHitRate * 100) / 100,
            slowQueries,
            errorRate: Math.round(errorRate * 100) / 100
        };
    }
    /**
     * Check if error is retryable
     */
    isRetryableError(error) {
        if (error.name === 'AbortError')
            return false; // Timeout
        if (error.message?.includes('401') || error.message?.includes('403'))
            return false; // Auth
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND')
            return true; // Network
        if (error.message?.includes('500') || error.message?.includes('502'))
            return true; // Server errors
        return false;
    }
    /**
     * Setup cleanup intervals
     */
    setupCleanupIntervals() {
        // Clean up expired in-memory cache entries every 5 minutes
        setInterval(() => {
            if (this.config.cache.enableInMemory) {
                const now = Date.now();
                for (const [key, value] of this.inMemoryCache.entries()) {
                    if (value.expires < now) {
                        this.inMemoryCache.delete(key);
                    }
                }
            }
        }, 300000);
        // Clean up old metrics every hour
        setInterval(() => {
            const cutoff = new Date(Date.now() - 3600000); // 1 hour ago
            this.queryMetrics = this.queryMetrics.filter(m => m.timestamp > cutoff);
        }, 3600000);
    }
    /**
     * Close all connections and clean up
     */
    async close() {
        // Clear timers
        if (this.batchTimer)
            clearTimeout(this.batchTimer);
        if (this.reconnectTimer)
            clearTimeout(this.reconnectTimer);
        this.stopHeartbeat();
        // Close WebSocket
        if (this.wsConnection) {
            this.wsConnection.close();
        }
        // Close Redis connection
        await this.redis.quit();
        // Clear caches
        this.inMemoryCache.clear();
        this.subscriptions.clear();
        this.queryMetrics.length = 0;
        this.emit('closed');
    }
}
export { GraphQLClientLib as default };
//# sourceMappingURL=index.js.map