import type { ErrorResponse, DataRequest } from './core';
import type { CachePolicy, RetryConfig } from './cache-retry';

// =============================================================================
// Application Page State Management
// =============================================================================

export interface ApplicationPage {
	id: string;
	title: string;
	requiredOperations: string[];
	loadingState: LoadingState;
	errorState: ErrorResponse | null;
	cachePolicy: CachePolicy;
	lastDataRefresh: Date | null;
	retryConfiguration: RetryConfig;
}

export type LoadingState = 'idle' | 'loading' | 'loaded' | 'error' | 'retrying';

// =============================================================================
// Standardized Operation Result Wrapper
// =============================================================================

export interface OperationResult<TData = any> {
	data?: TData;
	error?: ErrorResponse;
	loading: boolean;
	networkError?: Error;
	operation?: DataRequest;
}

// =============================================================================
// URQL Integration Types
// =============================================================================

export interface UrqlOperationContext {
	requestPolicy?: 'cache-first' | 'cache-only' | 'network-only' | 'cache-and-network';
	additionalTypenames?: string[];
	fetch?: typeof fetch;
	fetchOptions?: RequestInit;
	preferGetMethod?: boolean;
	timeout?: number; // Maximum 5000ms
}

// =============================================================================
// Svelte Component Integration Types
// =============================================================================

export interface GraphQLComponentProps<TVariables = any, TData = any> {
	variables: TVariables;
	onSuccess?: (data: TData) => void;
	onError?: (error: ErrorResponse) => void;
	onRetry?: (attempt: number) => void;
	loadingComponent?: any;
	errorComponent?: any;
	cachePolicy?: CachePolicy;
	retryConfig?: RetryConfig;
}

// =============================================================================
// Error Boundary Types for Svelte Components
// =============================================================================

export interface ErrorBoundaryState {
	hasError: boolean;
	error: ErrorResponse | null;
	errorInfo?: {
		componentStack: string;
		errorBoundary: string;
	};
	retryAttempts: number;
	canRetry: boolean;
}

// =============================================================================
// Performance Monitoring Types
// =============================================================================

export interface PerformanceMetrics {
	operationName: string;
	executionTime: number;
	cacheHit: boolean;
	networkLatency: number;
	payloadSize: number;
	retryCount: number;
	timestamp: Date;
}

export function isOperationResult<T>(value: any): value is OperationResult<T> {
	return typeof value === 'object' && value !== null && typeof value.loading === 'boolean';
}
