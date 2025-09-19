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
export interface GraphQLClientConfig {
  endpoint: string;
  subscriptionEndpoint?: string;
  redis: {
    connectionString: string;
    keyPrefix?: string;
  };
  cache: {
    defaultTTL?: number;
    maxSize?: number;
    enableInMemory?: boolean;
  };
  auth: {
    getToken?: () => Promise<string | null>;
    tokenRefreshCallback?: () => Promise<string | null>;
  };
  performance: {
    enableMetrics?: boolean;
    slowQueryThreshold?: number;
    enableBatching?: boolean;
    batchInterval?: number;
  };
  subscriptions: {
    reconnectInterval?: number;
    maxReconnectAttempts?: number;
    heartbeatInterval?: number;
  };
}
export interface GraphQLQuery {
  query: string;
  variables?: Record<string, any>;
  operationName?: string;
}
export interface GraphQLResponse<T = any> {
  data?: T;
  errors?: GraphQLError[];
  extensions?: {
    responseTime?: number;
    cacheHit?: boolean;
    queryComplexity?: number;
  };
}
export interface GraphQLError {
  message: string;
  locations?: Array<{
    line: number;
    column: number;
  }>;
  path?: Array<string | number>;
  extensions?: {
    code?: string;
    exception?: any;
  };
}
export interface SubscriptionOptions {
  onData?: (data: any) => void;
  onError?: (error: any) => void;
  onComplete?: () => void;
  onReconnect?: () => void;
}
export interface QueryOptions {
  ttl?: number;
  skipCache?: boolean;
  priority?: 'low' | 'normal' | 'high';
  timeout?: number;
  retries?: number;
}
export interface QueryMetrics {
  executionTime: number;
  cacheHit: boolean;
  queryHash: string;
  variables: Record<string, any>;
  errors?: GraphQLError[];
  timestamp: Date;
}
export interface BatchedQuery {
  id: string;
  query: GraphQLQuery;
  options: QueryOptions;
  resolve: (result: GraphQLResponse) => void;
  reject: (error: Error) => void;
}
export interface SubscriptionInfo {
  id: string;
  query: GraphQLQuery;
  options: SubscriptionOptions;
  reconnectCount: number;
  lastActivity: Date;
}
export declare class GraphQLClientLib extends EventEmitter {
  private config;
  private redis;
  private inMemoryCache;
  private wsConnection?;
  private subscriptions;
  private batchQueue;
  private batchTimer?;
  private nextSubscriptionId;
  private queryMetrics;
  private reconnectAttempts;
  private reconnectTimer?;
  private heartbeatTimer?;
  constructor(config: GraphQLClientConfig);
  /**
   * Execute GraphQL query with caching and optimization
   */
  query<T = any>(
    query: string,
    variables?: Record<string, any>,
    options?: QueryOptions
  ): Promise<GraphQLResponse<T>>;
  /**
   * Execute GraphQL mutation (never cached)
   */
  mutate<T = any>(
    mutation: string,
    variables?: Record<string, any>,
    options?: QueryOptions
  ): Promise<GraphQLResponse<T>>;
  /**
   * Subscribe to GraphQL subscription with auto-reconnect
   */
  subscribe(
    subscription: string,
    variables?: Record<string, any>,
    options?: SubscriptionOptions
  ): {
    id: string;
    unsubscribe: () => void;
  };
  /**
   * Unsubscribe from a subscription
   */
  private unsubscribe;
  /**
   * Execute single GraphQL query
   */
  private executeQuery;
  /**
   * Execute batched GraphQL queries (for performance optimization)
   */
  private executeBatchedQuery;
  /**
   * Process batched queries
   */
  private processBatch;
  /**
   * Generate cache key for query
   */
  private generateQueryHash;
  /**
   * Get cached result
   */
  private getCachedResult;
  /**
   * Cache query result
   */
  private cacheResult;
  /**
   * Invalidate cache entries related to mutation
   */
  private invalidateCache;
  /**
   * Ensure WebSocket connection for subscriptions
   */
  private ensureWebSocketConnection;
  /**
   * Handle WebSocket messages
   */
  private handleWebSocketMessage;
  /**
   * Send subscription to server
   */
  private sendSubscription;
  /**
   * Handle subscription data
   */
  private handleSubscriptionData;
  /**
   * Handle subscription error
   */
  private handleSubscriptionError;
  /**
   * Handle subscription completion
   */
  private handleSubscriptionComplete;
  /**
   * Re-establish all active subscriptions after reconnect
   */
  private reestablishSubscriptions;
  /**
   * Attempt to reconnect WebSocket
   */
  private attemptReconnect;
  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat;
  /**
   * Stop heartbeat timer
   */
  private stopHeartbeat;
  /**
   * Record query metrics
   */
  private recordMetrics;
  /**
   * Get performance metrics
   */
  getMetrics(): {
    totalQueries: number;
    averageResponseTime: number;
    cacheHitRate: number;
    slowQueries: number;
    errorRate: number;
  };
  /**
   * Check if error is retryable
   */
  private isRetryableError;
  /**
   * Setup cleanup intervals
   */
  private setupCleanupIntervals;
  /**
   * Close all connections and clean up
   */
  close(): Promise<void>;
}
export { GraphQLClientLib as default };
