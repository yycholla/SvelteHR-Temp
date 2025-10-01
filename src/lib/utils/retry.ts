/**
 * Retry utility functions for error handling and recovery
 */

export interface RetryOptions {
	maxAttempts?: number;
	delay?: number;
	backoffMultiplier?: number;
	maxDelay?: number;
	shouldRetry?: (error: any, attempt: number) => boolean;
	onRetry?: (error: any, attempt: number) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
	maxAttempts: 3,
	delay: 1000,
	backoffMultiplier: 2,
	maxDelay: 30000,
	shouldRetry: () => true,
	onRetry: () => {}
};

/**
 * Execute a function with retry logic
 */
export async function retry<T>(
	fn: () => Promise<T>,
	options: RetryOptions = {}
): Promise<T> {
	const opts = { ...DEFAULT_OPTIONS, ...options };
	let lastError: Error | null = null;

	for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));

			// Check if we should retry
			if (attempt === opts.maxAttempts || !opts.shouldRetry(error, attempt)) {
				throw lastError;
			}

			// Call retry callback
			opts.onRetry(error, attempt);

			// Calculate delay with exponential backoff
			const delay = Math.min(
				opts.delay * Math.pow(opts.backoffMultiplier, attempt - 1),
				opts.maxDelay
			);

			await sleep(delay);
		}
	}

	throw lastError || new Error('Retry failed');
}

/**
 * Create a retry wrapper for a function
 */
export function withRetry<T extends (...args: any[]) => Promise<any>>(
	fn: T,
	options: RetryOptions = {}
): T {
	return (async (...args) => {
		return retry(() => fn(...args), options);
	}) as T;
}

/**
 * Retry with timeout
 */
export async function retryWithTimeout<T>(
	fn: () => Promise<T>,
	timeout: number,
	options: RetryOptions = {}
): Promise<T> {
	return Promise.race([
		retry(fn, options),
		sleep(timeout).then(() => {
			throw new Error(`Operation timed out after ${timeout}ms`);
		})
	]);
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: any): boolean {
	// Network errors are typically retryable
	if (error instanceof Error) {
		const message = error.message.toLowerCase();
		if (
			message.includes('network') ||
			message.includes('timeout') ||
			message.includes('fetch') ||
			message.includes('econnrefused') ||
			message.includes('enotfound')
		) {
			return true;
		}
	}

	// HTTP status codes that are retryable
	if (error?.status) {
		const status = Number(error.status);
		return status === 429 || // Too Many Requests
			   status === 502 || // Bad Gateway
			   status === 503 || // Service Unavailable
			   status === 504;   // Gateway Timeout
	}

	// GraphQL errors that might be retryable
	if (error?.extensions?.code) {
		const code = error.extensions.code;
		return code === 'INTERNAL_SERVER_ERROR' ||
			   code === 'SERVICE_UNAVAILABLE';
	}

	return false;
}

/**
 * Create a retry handler for fetch operations
 */
export function createRetryFetch(options: RetryOptions = {}): typeof fetch {
	return withRetry(fetch, {
		...options,
		shouldRetry: (error) => {
			return isRetryableError(error);
		}
	});
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Debounce a function
 */
export function debounce<T extends (...args: any[]) => void>(
	fn: T,
	delay: number
): T & { cancel: () => void } {
	let timeoutId: NodeJS.Timeout | null = null;

	const debounced = ((...args) => {
		if (timeoutId) {
			clearTimeout(timeoutId);
		}
		timeoutId = setTimeout(() => {
			fn(...args);
			timeoutId = null;
		}, delay);
	}) as T;

	(debounced as any).cancel = () => {
		if (timeoutId) {
			clearTimeout(timeoutId);
			timeoutId = null;
		}
	};

	return debounced as T & { cancel: () => void };
}

/**
 * Throttle a function
 */
export function throttle<T extends (...args: any[]) => void>(
	fn: T,
	limit: number
): T {
	let inThrottle = false;
	let lastArgs: any[] | null = null;

	return ((...args) => {
		if (!inThrottle) {
			fn(...args);
			inThrottle = true;
			setTimeout(() => {
				inThrottle = false;
				if (lastArgs) {
					fn(...lastArgs);
					lastArgs = null;
				}
			}, limit);
		} else {
			lastArgs = args;
		}
	}) as T;
}