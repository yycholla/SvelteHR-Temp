import { dev } from '$app/environment';
import { getGraphQLEndpoint } from './api-url';

interface BackendStatus {
	isReady: boolean;
	lastCheck: Date;
	retryCount: number;
	errors: string[];
}

const MAX_RETRIES = 5; // 5 attempts with shorter intervals
const RETRY_INTERVAL = 500; // 0.5 seconds
const HEALTH_CHECK_URL = '/api/health';

class BackendInitializer {
	private status: BackendStatus = {
		isReady: false,
		lastCheck: new Date(),
		retryCount: 0,
		errors: []
	};

	private initPromise: Promise<boolean> | null = null;

	/**
	 * Wait for backend services to be ready
	 * Returns true if all services are healthy, false otherwise
	 */
	async waitForBackend(): Promise<boolean> {
		// If already initializing, return the existing promise
		if (this.initPromise) {
			return this.initPromise;
		}

		// If already ready, return immediately
		if (this.status.isReady) {
			return true;
		}

		// Start initialization
		this.initPromise = this.initialize();
		const result = await this.initPromise;
		this.initPromise = null;
		return result;
	}

	private async initialize(): Promise<boolean> {
		if (dev) {
			console.log('🔄 Waiting for backend services to initialize...');
		}

		while (this.status.retryCount < MAX_RETRIES) {
			try {
				const healthy = await this.checkHealth();

				if (healthy) {
					this.status.isReady = true;
					this.status.lastCheck = new Date();
					if (dev) {
						console.log('✅ Backend services are ready');
					}
					return true;
				}

				// Not ready yet, wait and retry
				this.status.retryCount++;
				if (dev && this.status.retryCount % 5 === 0) {
					console.log(
						`⏳ Backend initializing... (attempt ${this.status.retryCount}/${MAX_RETRIES})`
					);
				}

				await this.sleep(RETRY_INTERVAL);
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Unknown error';
				this.status.errors.push(errorMessage);

				if (dev) {
					console.error('❌ Health check error:', errorMessage);
				}

				this.status.retryCount++;
				await this.sleep(RETRY_INTERVAL);
			}
		}

		// Max retries reached
		if (dev) {
			console.error('❌ Backend initialization timeout after', MAX_RETRIES, 'attempts');
			console.error('Errors:', this.status.errors);
		}

		return false;
	}

	private async checkHealth(): Promise<boolean> {
		try {
			// Use the same endpoint logic as GraphQL client
			const graphqlEndpoint = getGraphQLEndpoint();
			const response = await fetch(graphqlEndpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					query: `query { __schema { queryType { name } } }`
				}),
				signal: AbortSignal.timeout(3000) // 3 second timeout
			});

			return response.ok;
		} catch (error) {
			// During initialization, network errors are expected
			return false;
		}
	}

	private sleep(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	/**
	 * Get current backend status
	 */
	getStatus(): BackendStatus {
		return { ...this.status };
	}

	/**
	 * Reset initialization state (useful for testing)
	 */
	reset(): void {
		this.status = {
			isReady: false,
			lastCheck: new Date(),
			retryCount: 0,
			errors: []
		};
		this.initPromise = null;
	}

	/**
	 * Check if backend is currently ready without waiting
	 */
	isReady(): boolean {
		return this.status.isReady;
	}
}

// Export singleton instance
export const backendInit = new BackendInitializer();

// Helper function for use in server load functions
export async function ensureBackendReady(): Promise<boolean> {
	try {
		// Use the same endpoint logic as GraphQL client
		const graphqlEndpoint = getGraphQLEndpoint();
		const response = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: `query { __schema { queryType { name } } }`
			}),
			signal: AbortSignal.timeout(5000) // 5 second timeout
		});

		const isReady = response.ok;
		console.log(`🔍 Backend check: ${isReady ? 'READY' : 'NOT READY'} (endpoint: ${graphqlEndpoint}, status: ${response.status})`);
		return isReady;
	} catch (error) {
		const graphqlEndpoint = getGraphQLEndpoint();
		const errorMessage = error instanceof Error ? error.message : String(error);
		console.error('Backend connection failed:', error);
		throw new Error(`GraphQL backend unavailable at ${graphqlEndpoint}: ${errorMessage}`);
	}
}

// More lenient version that doesn't throw - returns status
export async function checkBackendReady(): Promise<{ ready: boolean; status: BackendStatus }> {
	try {
		const ready = await backendInit.waitForBackend();
		return {
			ready,
			status: backendInit.getStatus()
		};
	} catch (error) {
		return {
			ready: false,
			status: {
				isReady: false,
				lastCheck: new Date(),
				retryCount: MAX_RETRIES,
				errors: [error instanceof Error ? error.message : 'Unknown error']
			}
		};
	}
}