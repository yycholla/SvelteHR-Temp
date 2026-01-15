import type { ErrorResponse } from './core';

// =============================================================================
// Error Handling and Retry Operation Contracts
// =============================================================================

export interface RetryFailedOperationVariables {
	operationId: string;
	operationName: string;
	originalVariables: any;
	retryAttempt: number;
	userId: string;
}

export interface RetryFailedOperationResponse {
	retryResult: {
		success: boolean;
		data?: any;
		error?: ErrorResponse;
		finalError?: ErrorResponse; // For test compatibility
		attemptCount?: number;
		totalDuration?: number;
		retryHistory?: Array<{
			attempt: number;
			delay: number;
			error: string;
			timestamp: string;
		}>;
		retryInfo: {
			attemptsRemaining: number;
			nextRetryDelay: number;
			maxRetries: number;
		};
	};
}

export interface RetryExecutionVariables {
	operation: Function;
	maxAttempts: number;
	baseDelayMs: number;
	enableJitter: boolean;
	operationName: string;
}

export type RetryOperationResponse = RetryFailedOperationResponse;
export type RetryOperationVariables = RetryFailedOperationVariables | RetryExecutionVariables;

export interface RetryConfig {
	maxAttempts: number; // Maximum 3
	backoffStrategy: 'exponential' | 'linear' | 'fixed';
	retryConditions: string[];
}

// =============================================================================
// Cache Management Operation Contracts
// =============================================================================

export interface InvalidateCacheVariables {
	cacheKeys: string[];
	scope: 'user' | 'department' | 'global';
	userId: string;
	reason: string;
}

export interface InvalidateCacheResponse {
	cacheInvalidation: {
		success: boolean;
		invalidatedKeys: string[];
		affectedOperations: string[];
		timestamp: string;
		nextRefreshAt: string;
	};
}

export interface CacheLookupResponse {
	cacheResult: {
		operationName: string;
		cacheKey: string;
		hitStatus: 'hit' | 'miss' | 'stale' | 'error';
		data: any;
		metadata: {
			timestamp: string;
			ttl: number;
			accessCount: number;
			lastAccessed: string;
			dataFreshness: 'current' | 'stale' | 'expired';
			cacheSource: 'urql' | 'browser' | 'memory';
			compressionUsed: boolean;
			sizeBytes: number;
		};
		performance: {
			retrievalTime: number;
			compressionTime: number;
			validationTime: number;
			totalTime: number;
		};
	};
}

export type CacheOperationResponse = InvalidateCacheResponse | CacheLookupResponse;

export interface CacheLookupVariables {
	operationName: string;
	cacheKey: string | null;
	policy?: CachePolicy | null;
	forceRefresh: boolean;
}

export type CacheOperationVariables = InvalidateCacheVariables | CacheLookupVariables;

export interface CachePolicy {
	ttlMinutes: number; // Maximum 30 minutes
	invalidateOnChange: boolean;
	staleWhileRevalidate: boolean;
}
