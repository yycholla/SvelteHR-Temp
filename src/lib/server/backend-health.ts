import { logger } from '$lib/utils/logger';

/**
 * Backend Health Check Utility
 *
 * Provides utilities for checking backend health and implementing
 * exponential backoff for connection retries.
 */

export interface HealthCheckOptions {
	timeout?: number; // Milliseconds (default: 5000)
	maxRetries?: number; // Maximum number of retry attempts (default: 10)
	initialDelay?: number; // Initial retry delay in ms (default: 1000)
	maxDelay?: number; // Maximum retry delay in ms (default: 60000)
	backoffMultiplier?: number; // Multiplier for exponential backoff (default: 2)
}

export interface HealthCheckResult {
	healthy: boolean;
	message: string;
	retries: number;
	totalTime: number; // Milliseconds
}

/**
 * Check if the GraphQL backend is healthy
 * @param endpoint GraphQL endpoint URL
 * @param options Health check options
 * @returns Health check result
 */
export async function checkBackendHealth(
	endpoint?: string,
	options: HealthCheckOptions = {}
): Promise<HealthCheckResult> {
	const {
		timeout = 5000,
		maxRetries = 10,
		initialDelay = 1000,
		maxDelay = 60000,
		backoffMultiplier = 2
	} = options;

	const graphqlEndpoint =
		endpoint || process.env.VITE_API_URL
			? `${process.env.VITE_API_URL}/graphql`
			: 'http://localhost:4000/graphql';

	const startTime = Date.now();
	let retries = 0;
	let lastError: Error | null = null;

	// Simple introspection query to check if GraphQL is responding
	const healthQuery = {
		query: '{ __typename }'
	};

	while (retries < maxRetries) {
		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), timeout);

			const response = await fetch(graphqlEndpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(healthQuery),
				signal: controller.signal
			});

			clearTimeout(timeoutId);

			if (response.ok) {
				const data = await response.json();

				// Check if we got a valid GraphQL response
				if (data && (data.data || data.errors)) {
					return {
						healthy: true,
						message: 'Backend is healthy',
						retries,
						totalTime: Date.now() - startTime
					};
				}
			}

			// Response not OK, will retry
			lastError = new Error(`Backend returned status ${response.status}`);
		} catch (error) {
			lastError = error as Error;
		}

		retries++;

		// Don't wait after the last retry attempt
		if (retries < maxRetries) {
			// Calculate delay with exponential backoff
			const delay = Math.min(initialDelay * Math.pow(backoffMultiplier, retries - 1), maxDelay);

			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}

	return {
		healthy: false,
		message: `Backend health check failed after ${retries} attempts: ${lastError?.message || 'Unknown error'}`,
		retries,
		totalTime: Date.now() - startTime
	};
}

/**
 * Wait for backend to become healthy before proceeding
 * @param endpoint GraphQL endpoint URL
 * @param options Health check options
 * @returns Health check result
 * @throws Error if backend doesn't become healthy within max retries
 */
export async function waitForBackend(
	endpoint?: string,
	options: HealthCheckOptions = {}
): Promise<HealthCheckResult> {
	logger.info('[BackendHealth] Waiting for backend to become healthy...');

	const result = await checkBackendHealth(endpoint, options);

	if (result.healthy) {
		logger.info(
			`[BackendHealth] ✅ Backend is healthy (took ${result.totalTime}ms, ${result.retries} retries)`
		);
	} else {
		logger.error(`[BackendHealth] ❌ ${result.message}`);
	}

	return result;
}

/**
 * Execute a function with exponential backoff retry logic
 * @param fn Function to execute
 * @param options Retry options
 * @returns Result of the function
 */
export async function withExponentialBackoff<T>(
	fn: () => Promise<T>,
	options: HealthCheckOptions = {}
): Promise<T> {
	const { maxRetries = 10, initialDelay = 1000, maxDelay = 60000, backoffMultiplier = 2 } = options;

	let retries = 0;
	let lastError: Error | null = null;

	while (retries < maxRetries) {
		try {
			return await fn();
		} catch (error) {
			lastError = error as Error;
			retries++;

			// Don't wait after the last retry attempt
			if (retries < maxRetries) {
				// Calculate delay with exponential backoff
				const delay = Math.min(initialDelay * Math.pow(backoffMultiplier, retries - 1), maxDelay);

				logger.info(`[BackendHealth] Retry ${retries}/${maxRetries} after ${delay}ms delay...`);

				await new Promise((resolve) => setTimeout(resolve, delay));
			}
		}
	}

	throw new Error(`Failed after ${maxRetries} retries: ${lastError?.message || 'Unknown error'}`);
}
