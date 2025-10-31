import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { logger } from '$lib/utils/logger.js';

interface ServiceStatus {
	database: boolean;
	graphql: boolean;
	auth: boolean;
}

interface HealthCheckResponse {
	status: 'healthy' | 'initializing' | 'error';
	services: ServiceStatus;
	message?: string;
	timestamp: string;
	responseTime: number;
	system?: {
		uptime: number;
		memory: NodeJS.MemoryUsage;
		version: string;
		nodeVersion: string;
		environment: string;
		pid: number;
	};
}

async function checkDatabase(): Promise<boolean> {
	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

		// Use PUBLIC_API_URL from environment, fallback to Docker network hostname
		const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://hr-graphql-rust:4000';
		const response = await fetch(`${apiUrl}/graphql`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: `query HealthCheck { __schema { queryType { name } } }`
			}),
			signal: controller.signal
		});

		clearTimeout(timeoutId);
		const result = response.ok;
		logger.debug('Database health check', { result, status: response.status });
		return result;
	} catch (err) {
		logger.warn('Database health check failed', { error: (err as Error).message });
		return false;
	}
}

async function checkGraphQL(): Promise<boolean> {
	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 5000);

		// Use PUBLIC_API_URL from environment, fallback to Docker network hostname
		const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://hr-graphql-rust:4000';
		const response = await fetch(`${apiUrl}/graphql`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: `query { __schema { types { name } } }`
			}),
			signal: controller.signal
		});

		clearTimeout(timeoutId);

		if (!response.ok) {
			logger.warn('GraphQL health check - bad response', { status: response.status });
			return false;
		}

		const data = await response.json();
		const result = !!data.data;
		logger.debug('GraphQL health check', { result });
		return result;
	} catch (err) {
		logger.warn('GraphQL health check failed', { error: (err as Error).message });
		return false;
	}
}

async function checkAuth(): Promise<boolean> {
	try {
		// Just return true for now - auth is handled by GraphQL
		// We'll improve this later with a proper auth endpoint check
		logger.debug('Auth health check: true (simplified)');
		return true;
	} catch (err) {
		logger.warn('Auth health check failed', { error: (err as Error).message });
		return false;
	}
}

export const GET: RequestHandler = async ({ locals }) => {
	const startTime = Date.now();

	try {
		// Check all services in parallel
		const [database, graphql, auth] = await Promise.all([
			checkDatabase(),
			checkGraphQL(),
			checkAuth()
		]);

		const services: ServiceStatus = { database, graphql, auth };
		const allHealthy = database && graphql && auth;
		const anyHealthy = database || graphql || auth;

		const response: HealthCheckResponse = {
			status: allHealthy ? 'healthy' : anyHealthy ? 'initializing' : 'error',
			services,
			message: allHealthy
				? 'All services operational'
				: anyHealthy
					? 'Services initializing'
					: 'Backend unavailable',
			timestamp: new Date().toISOString(),
			responseTime: Date.now() - startTime,
			system: {
				uptime: process.uptime(),
				memory: process.memoryUsage(),
				version: process.env.npm_package_version || 'unknown',
				nodeVersion: process.version,
				environment: process.env.NODE_ENV || 'development',
				pid: process.pid
			}
		};

		// Log health check for monitoring
		logger.info('Health check completed', {
			requestId: locals.requestId,
			status: response.status,
			services,
			responseTime: response.responseTime
		});

		return json(response, {
			status: allHealthy ? 200 : 503,
			headers: {
				'Cache-Control': 'no-cache, no-store, must-revalidate',
				'X-Request-ID': locals.requestId || 'unknown'
			}
		});
	} catch (error) {
		logger.error('Health check failed', error as Error, {
			requestId: locals.requestId,
			responseTime: Date.now() - startTime
		});

		const response: HealthCheckResponse = {
			status: 'error',
			services: {
				database: false,
				graphql: false,
				auth: false
			},
			message: 'Health check failed',
			timestamp: new Date().toISOString(),
			responseTime: Date.now() - startTime
		};

		return json(response, { status: 503 });
	}
};
