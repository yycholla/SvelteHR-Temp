/**
 * GraphQL Client Types
 * 
 * Comprehensive type definitions for the GraphQL client system
 * following strict TypeScript standards for type safety.
 */

/**
 * GraphQL request structure
 */
export interface GraphQLRequest {
	query: string;
	variables?: Record<string, any>;
	operationName?: string;
}

/**
 * GraphQL error structure following GraphQL specification
 */
export interface GraphQLError {
	message: string;
	locations?: Array<{
		line: number;
		column: number;
	}>;
	path?: Array<string | number>;
	extensions?: Record<string, any>;
}

/**
 * GraphQL response structure
 */
export interface GraphQLResponse<T = any> {
	data?: T;
	errors?: GraphQLError[];
	extensions?: Record<string, any>;
	fromCache?: boolean;
}

/**
 * Client configuration options
 */
export interface ClientConfig {
	endpoint?: string;
	headers?: Record<string, string>;
	timeout?: number;
	retryAttempts?: number;
	enableCache?: boolean;
	cacheTtl?: number;
}

/**
 * Query execution options
 */
export interface QueryOptions {
	operationName?: string;
	skipCache?: boolean;
	timeout?: number;
}

/**
 * Mutation execution options
 */
export interface MutationOptions {
	operationName?: string;
	timeout?: number;
}

/**
 * Subscription options
 */
export interface SubscriptionOptions {
	operationName?: string;
	onData?: (data: any) => void;
	onError?: (error: GraphQLError) => void;
	onComplete?: () => void;
}

/**
 * Subscription client configuration
 */
export interface SubscriptionClientConfig {
	url: string;
	protocols?: string[];
	connectionParams?: Record<string, any>;
	reconnect?: boolean;
	reconnectAttempts?: number;
	reconnectInterval?: number;
	enableDeduplication?: boolean;
	batchUpdates?: boolean;
	batchInterval?: number;
}

/**
 * Subscription event types
 */
export type SubscriptionEvent = 
	| 'connecting'
	| 'connected'
	| 'disconnected'
	| 'reconnecting'
	| 'error'
	| 'data'
	| 'complete';

/**
 * Subscription interface
 */
export interface Subscription {
	id: string;
	query: string;
	variables?: Record<string, any>;
	unsubscribe(): void;
	on(event: SubscriptionEvent, handler: (data?: any) => void): void;
	off(event: SubscriptionEvent, handler: (data?: any) => void): void;
}

/**
 * Subscription client interface
 */
export interface SubscriptionClient {
	subscribe(query: string, variables?: Record<string, any>, options?: SubscriptionOptions): Subscription;
	unsubscribe(id: string): void;
	close(): void;
	on(event: SubscriptionEvent, handler: (data?: any) => void): void;
	off(event: SubscriptionEvent, handler: (data?: any) => void): void;
	getDeduplicationStats?(): { totalSubscriptions: number; uniqueSubscriptions: number };
}

/**
 * Cache entry structure
 */
export interface CacheEntry<T = any> {
	data: T;
	timestamp: number;
	ttl: number;
}

/**
 * GraphQL operation types
 */
export type GraphQLOperationType = 'query' | 'mutation' | 'subscription';

/**
 * Request context for server-side operations
 */
export interface RequestContext {
	user?: {
		id: string;
		email: string;
		roles: string[];
	};
	permissions?: string[];
	token?: string;
}

/**
 * Error codes used throughout the GraphQL system
 */
export enum GraphQLErrorCode {
	UNAUTHENTICATED = 'UNAUTHENTICATED',
	FORBIDDEN = 'FORBIDDEN',
	VALIDATION_ERROR = 'VALIDATION_ERROR',
	QUERY_TOO_COMPLEX = 'QUERY_TOO_COMPLEX',
	RATE_LIMITED = 'RATE_LIMITED',
	INTERNAL_ERROR = 'INTERNAL_ERROR',
	NETWORK_ERROR = 'NETWORK_ERROR',
	TIMEOUT = 'TIMEOUT'
}

/**
 * Query complexity analysis result
 */
export interface QueryComplexityResult {
	complexity: number;
	maxAllowed: number;
	isValid: boolean;
	errors?: string[];
}

/**
 * Rate limiting information
 */
export interface RateLimitInfo {
	limit: number;
	remaining: number;
	resetTime: number;
	retryAfter?: number;
}