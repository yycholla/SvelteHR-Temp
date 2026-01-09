import type { ErrorResponse } from '../error-response';

/**
 * Page loading state enumeration
 */
export enum PageLoadingState {
	IDLE = 'idle',
	LOADING = 'loading',
	RELOADING = 'reloading',
	SUCCESS = 'success',
	ERROR = 'error',
	TIMEOUT = 'timeout'
}

/**
 * Page error state details
 */
export interface PageErrorState {
	hasError: boolean;
	errorResponse?: ErrorResponse;
	canRetry: boolean;
	retryAttempts: number;
	lastErrorAt?: string;
	isRecoverable: boolean;
}

/**
 * Cache policy configuration for page data
 */
export interface PageCachePolicy {
	policy: 'cache-first' | 'cache-only' | 'network-only' | 'cache-and-network';
	ttlMinutes: number; // ≤30 minutes as per requirements
	allowStaleData: boolean;
	invalidateOnUserChange: boolean;
	invalidateOnPermissionChange: boolean;
	warmOnLoad: boolean;
}

/**
 * Retry configuration for page operations
 */
export interface PageRetryConfiguration {
	maxAttempts: number; // ≤3 as per requirements
	baseDelayMs: number;
	backoffStrategy: 'exponential' | 'linear' | 'fixed';
	retryableErrorTypes: string[];
	shouldRetry: (error: unknown, attempt: number) => boolean;
}

/**
 * Required GraphQL operations for the page
 */
export interface RequiredOperation {
	operationName: string;
	isRequired: boolean;
	dependsOn: string[]; // Other operations this depends on
	timeout: number; // ≤5000ms per requirements
	priority: 'high' | 'medium' | 'low';
	canBeDeferred: boolean;
	fallbackData?: unknown;
}

/**
 * Page performance metrics
 */
export interface PagePerformance {
	loadStartTime?: number;
	loadEndTime?: number;
	totalLoadTime?: number;
	operationTimes: Record<string, number>;
	cacheHitRate: number;
	retryCount: number;
	errorCount: number;
	lastMeasurementAt: string;
}

/**
 * Page metadata for tracking and analytics
 */
export interface PageMetadata {
	route: string;
	title: string;
	description?: string;
	requiredPermissions: string[];
	requiredRoles: string[];
	isProtected: boolean;
	category: 'dashboard' | 'management' | 'admin' | 'profile' | 'auth' | 'other';
	tags: string[];
	version: string;
	lastUpdated: string;
}
