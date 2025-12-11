/**
 * T024: ApplicationPage Entity Model
 *
 * Implements the ApplicationPage entity for tracking page state, data requirements, and error handling.
 * Integrates with GraphQL operations, caching, and retry mechanisms.
 */

import type { ErrorResponse } from './error-response';
import { type DataRequest, DataRequestStatus } from './data-request';
import type { CachePolicy as CacheConfig } from '$lib/types/graphql-contracts';

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

/**
 * ApplicationPage entity model implementing comprehensive page state management
 */
export class ApplicationPage {
	readonly id: string;
	readonly title: string;
	readonly requiredOperations: RequiredOperation[];
	readonly cachePolicy: PageCachePolicy;
	readonly retryConfiguration: PageRetryConfiguration;
	readonly metadata: PageMetadata;
	readonly createdAt: string;

	private _loadingState: PageLoadingState;
	private _errorState: PageErrorState;
	private _lastDataRefresh: string | null;
	private _performance: PagePerformance;
	private _activeRequests: Map<string, DataRequest>;
	private _cachedData: Map<string, { data: unknown; timestamp: string; ttl: number }>;

	/**
	 * Creates a new ApplicationPage instance
	 *
	 * @param config - Configuration object for the application page
	 * @throws {Error} When validation rules are violated
	 */
	constructor(config: {
		id?: string;
		title: string;
		requiredOperations: RequiredOperation[];
		cachePolicy?: Partial<PageCachePolicy>;
		retryConfiguration?: Partial<PageRetryConfiguration>;
		metadata: PageMetadata;
	}) {
		// Validation Rules (as specified in T024)
		this.validateConfig(config);

		this.id = config.id || this.generatePageId(config.metadata.route);
		this.title = config.title;
		this.requiredOperations = this.validateAndProcessOperations(config.requiredOperations);
		this.metadata = config.metadata;
		this.createdAt = new Date().toISOString();

		// Build cache policy with defaults
		this.cachePolicy = this.buildCachePolicy(config.cachePolicy);

		// Build retry configuration with defaults
		this.retryConfiguration = this.buildRetryConfiguration(config.retryConfiguration);

		// Initialize mutable state
		this._loadingState = PageLoadingState.IDLE;
		this._errorState = {
			hasError: false,
			canRetry: true,
			retryAttempts: 0,
			isRecoverable: true
		};
		this._lastDataRefresh = null;
		this._performance = {
			operationTimes: {},
			cacheHitRate: 0,
			retryCount: 0,
			errorCount: 0,
			lastMeasurementAt: new Date().toISOString()
		};
		this._activeRequests = new Map();
		this._cachedData = new Map();
	}

	/**
	 * Current loading state
	 */
	get loadingState(): PageLoadingState {
		return this._loadingState;
	}

	/**
	 * Current error state
	 */
	get errorState(): PageErrorState {
		return { ...this._errorState }; // Defensive copy
	}

	/**
	 * Last data refresh timestamp
	 */
	get lastDataRefresh(): string | null {
		return this._lastDataRefresh;
	}

	/**
	 * Current performance metrics
	 */
	get performance(): PagePerformance {
		return { ...this._performance }; // Defensive copy
	}

	/**
	 * Active data requests
	 */
	get activeRequests(): ReadonlyMap<string, DataRequest> {
		return this._activeRequests;
	}

	/**
	 * Whether the page is currently loading
	 */
	get isLoading(): boolean {
		return (
			this._loadingState === PageLoadingState.LOADING ||
			this._loadingState === PageLoadingState.RELOADING
		);
	}

	/**
	 * Whether the page has errors
	 */
	get hasError(): boolean {
		return this._errorState.hasError;
	}

	/**
	 * Whether the page data is stale
	 */
	get isStale(): boolean {
		if (!this._lastDataRefresh) return true;

		const lastRefreshTime = new Date(this._lastDataRefresh).getTime();
		const stalenessThresholdMs = this.cachePolicy.ttlMinutes * 60 * 1000;
		const now = Date.now();

		return now - lastRefreshTime > stalenessThresholdMs;
	}

	/**
	 * Whether all required operations are complete
	 */
	get isDataComplete(): boolean {
		const requiredOps = this.requiredOperations.filter((op) => op.isRequired);
		return requiredOps.every((op) => {
			const request = this._activeRequests.get(op.operationName);
			return request?.status === DataRequestStatus.SUCCESS || this.hasCachedData(op.operationName);
		});
	}

	/**
	 * Whether the page can be retried
	 */
	get canRetry(): boolean {
		return (
			this._errorState.canRetry &&
			this._errorState.retryAttempts < this.retryConfiguration.maxAttempts
		);
	}

	/**
	 * Start loading the page
	 */
	startLoading(): void {
		if (this._loadingState === PageLoadingState.LOADING) {
			return; // Already loading
		}

		this._loadingState = this._lastDataRefresh
			? PageLoadingState.RELOADING
			: PageLoadingState.LOADING;

		this._performance.loadStartTime = Date.now();
		this.clearError();
	}

	/**
	 * Complete page loading successfully
	 */
	completeLoading(operationResults?: Record<string, unknown>): void {
		if (!this.isLoading) return;

		this._loadingState = PageLoadingState.SUCCESS;
		this._lastDataRefresh = new Date().toISOString();

		// Update performance metrics
		if (this._performance.loadStartTime) {
			this._performance.loadEndTime = Date.now();
			this._performance.totalLoadTime =
				this._performance.loadEndTime - this._performance.loadStartTime;
		}

		// Cache operation results
		if (operationResults) {
			Object.entries(operationResults).forEach(([operationName, data]) => {
				this.cacheData(operationName, data);
			});
		}

		this.clearError();
		this.updatePerformanceMetrics();
	}

	/**
	 * Handle page loading error
	 */
	handleError(error: ErrorResponse): void {
		this._loadingState = PageLoadingState.ERROR;
		this._errorState = {
			hasError: true,
			errorResponse: error,
			canRetry: this.shouldRetryError(error),
			retryAttempts: this._errorState.retryAttempts,
			lastErrorAt: new Date().toISOString(),
			isRecoverable: this.isRecoverableError(error)
		};

		this._performance.errorCount += 1;
		this.updatePerformanceMetrics();
	}

	/**
	 * Handle operation timeout
	 */
	handleTimeout(operationName?: string): void {
		this._loadingState = PageLoadingState.TIMEOUT;
		this._errorState = {
			hasError: true,
			canRetry: true,
			retryAttempts: this._errorState.retryAttempts,
			lastErrorAt: new Date().toISOString(),
			isRecoverable: true
		};

		if (operationName) {
			this._performance.operationTimes[operationName] = this.retryConfiguration.maxAttempts * 5000; // Max timeout
		}

		this.updatePerformanceMetrics();
	}

	/**
	 * Retry page loading
	 */
	retry(): void {
		if (!this.canRetry) {
			throw new Error(
				`Cannot retry: attempts=${this._errorState.retryAttempts}, canRetry=${this._errorState.canRetry}`
			);
		}

		this._errorState.retryAttempts += 1;
		this._performance.retryCount += 1;

		// Clear error state and start loading
		this.clearError();
		this.startLoading();
	}

	/**
	 * Add active request
	 */
	addActiveRequest(operationName: string, request: DataRequest): void {
		this._activeRequests.set(operationName, request);
	}

	/**
	 * Remove active request
	 */
	removeActiveRequest(operationName: string): void {
		this._activeRequests.delete(operationName);
	}

	/**
	 * Cache data for operation
	 */
	cacheData(operationName: string, data: unknown): void {
		this._cachedData.set(operationName, {
			data,
			timestamp: new Date().toISOString(),
			ttl: this.cachePolicy.ttlMinutes * 60 * 1000
		});
	}

	/**
	 * Get cached data for operation
	 */
	getCachedData(operationName: string): unknown | null {
		const cached = this._cachedData.get(operationName);
		if (!cached) return null;

		const now = Date.now();
		const cacheTime = new Date(cached.timestamp).getTime();

		if (now - cacheTime > cached.ttl) {
			this._cachedData.delete(operationName);
			return null;
		}

		return cached.data;
	}

	/**
	 * Check if operation has cached data
	 */
	hasCachedData(operationName: string): boolean {
		return this.getCachedData(operationName) !== null;
	}

	/**
	 * Invalidate all cached data
	 */
	invalidateCache(): void {
		this._cachedData.clear();
	}

	/**
	 * Invalidate specific operation cache
	 */
	invalidateCacheForOperation(operationName: string): void {
		this._cachedData.delete(operationName);
	}

	/**
	 * Convert to JSON representation
	 */
	toJSON(): Record<string, unknown> {
		return {
			id: this.id,
			title: this.title,
			loadingState: this._loadingState,
			errorState: this._errorState,
			lastDataRefresh: this._lastDataRefresh,
			performance: this._performance,
			requiredOperations: this.requiredOperations,
			cachePolicy: this.cachePolicy,
			retryConfiguration: this.retryConfiguration,
			metadata: this.metadata,
			isLoading: this.isLoading,
			hasError: this.hasError,
			isStale: this.isStale,
			isDataComplete: this.isDataComplete,
			canRetry: this.canRetry,
			activeRequestCount: this._activeRequests.size,
			cachedDataCount: this._cachedData.size,
			createdAt: this.createdAt
		};
	}

	/**
	 * Validate configuration according to T024 requirements
	 */
	private validateConfig(config: {
		title: string;
		requiredOperations: RequiredOperation[];
		metadata: PageMetadata;
	}): void {
		// Validation Rule: title (non-empty)
		if (!config.title || config.title.trim().length === 0) {
			throw new Error('title must be non-empty');
		}

		// Validation Rule: requiredOperations (non-empty for data pages)
		if (config.metadata.category !== 'auth' && config.requiredOperations.length === 0) {
			throw new Error('requiredOperations must be non-empty for data pages');
		}

		// Validation Rule: metadata (valid structure)
		if (!config.metadata.route || config.metadata.route.trim().length === 0) {
			throw new Error('metadata.route must be non-empty');
		}
	}

	/**
	 * Validate and process required operations
	 */
	private validateAndProcessOperations(operations: RequiredOperation[]): RequiredOperation[] {
		return operations.map((op) => {
			// Validation Rule: timeout ≤5000ms
			if (op.timeout > 5000) {
				throw new Error(`Operation ${op.operationName} timeout must be ≤ 5000ms`);
			}

			return {
				...op,
				timeout: Math.min(op.timeout, 5000) // Enforce limit
			};
		});
	}

	/**
	 * Build cache policy with validation
	 */
	private buildCachePolicy(config?: Partial<PageCachePolicy>): PageCachePolicy {
		const defaultPolicy: PageCachePolicy = {
			policy: 'cache-first',
			ttlMinutes: 15,
			allowStaleData: true,
			invalidateOnUserChange: true,
			invalidateOnPermissionChange: true,
			warmOnLoad: false
		};

		const policy = { ...defaultPolicy, ...config };

		// Validation Rule: cachePolicy.ttlMinutes ≤30
		if (policy.ttlMinutes > 30) {
			policy.ttlMinutes = 30;
		}

		return policy;
	}

	/**
	 * Build retry configuration with validation
	 */
	private buildRetryConfiguration(
		config?: Partial<PageRetryConfiguration>
	): PageRetryConfiguration {
		const defaultConfig: PageRetryConfiguration = {
			maxAttempts: 3,
			baseDelayMs: 1000,
			backoffStrategy: 'exponential',
			retryableErrorTypes: ['NETWORK_ERROR', 'TIMEOUT_ERROR', 'GRAPHQL_ERROR'],
			shouldRetry: (error: unknown, attempt: number) => {
				return attempt < 3 && this.shouldRetryError(error);
			}
		};

		const retryConfig = { ...defaultConfig, ...config };

		// Validation Rule: maxAttempts ≤3
		retryConfig.maxAttempts = Math.min(retryConfig.maxAttempts, 3);

		return retryConfig;
	}

	/**
	 * Clear error state
	 */
	private clearError(): void {
		this._errorState = {
			hasError: false,
			canRetry: true,
			retryAttempts: this._errorState.retryAttempts, // Preserve retry count
			isRecoverable: true
		};
	}

	/**
	 * Determine if error should be retried
	 */
	private shouldRetryError(error: unknown): boolean {
		if (error instanceof Error && 'type' in error) {
			const errorType = (error as any).type;
			return this.retryConfiguration.retryableErrorTypes.includes(errorType);
		}
		return false;
	}

	/**
	 * Determine if error is recoverable
	 */
	private isRecoverableError(error: ErrorResponse): boolean {
		return error.isRetryable || error.type === 'NETWORK_ERROR' || error.type === 'TIMEOUT_ERROR';
	}

	/**
	 * Update performance metrics
	 */
	private updatePerformanceMetrics(): void {
		this._performance.lastMeasurementAt = new Date().toISOString();

		// Calculate cache hit rate
		const totalRequests =
			this._performance.retryCount + Object.keys(this._performance.operationTimes).length;
		const cacheHits = this._cachedData.size;
		this._performance.cacheHitRate = totalRequests > 0 ? cacheHits / totalRequests : 0;
	}

	/**
	 * Generate page identifier
	 */
	private generatePageId(route: string): string {
		const sanitizedRoute = route.replace(/[^a-zA-Z0-9]/g, '_');
		const timestamp = Date.now().toString(36);
		const random = Math.random().toString(36).substr(2, 6);
		return `page_${sanitizedRoute}_${timestamp}_${random}`;
	}
}

/**
 * Factory function to create ApplicationPage from route metadata
 */
export function createApplicationPage(config: {
	route: string;
	title: string;
	requiredOperations: RequiredOperation[];
	requiredPermissions?: string[];
	requiredRoles?: string[];
	category?: PageMetadata['category'];
	cachePolicy?: Partial<PageCachePolicy>;
}): ApplicationPage {
	const metadata: PageMetadata = {
		route: config.route,
		title: config.title,
		requiredPermissions: config.requiredPermissions || [],
		requiredRoles: config.requiredRoles || [],
		isProtected:
			(config.requiredPermissions?.length || 0) > 0 || (config.requiredRoles?.length || 0) > 0,
		category: config.category || 'other',
		tags: [],
		version: '1.0.0',
		lastUpdated: new Date().toISOString()
	};

	return new ApplicationPage({
		title: config.title,
		requiredOperations: config.requiredOperations,
		cachePolicy: config.cachePolicy,
		metadata
	});
}

/**
 * Type guard to check if an object is an ApplicationPage
 */
export function isApplicationPage(obj: unknown): obj is ApplicationPage {
	return obj instanceof ApplicationPage;
}
