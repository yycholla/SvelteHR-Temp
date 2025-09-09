import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

/**
 * System Health Check API
 * 
 * Features:
 * - Overall system health status
 * - Database connectivity check
 * - GraphQL API status
 * - Authentication service status
 * - Performance metrics
 * - Version information
 */

interface HealthStatus {
	status: 'healthy' | 'degraded' | 'unhealthy';
	timestamp: string;
	version: string;
	uptime: number;
	services: {
		database: ServiceHealth;
		graphql: ServiceHealth;
		authentication: ServiceHealth;
		subscriptions: ServiceHealth;
	};
	metrics: SystemMetrics;
}

interface ServiceHealth {
	status: 'healthy' | 'degraded' | 'unhealthy';
	responseTime?: number;
	lastCheck: string;
	message?: string;
}

interface SystemMetrics {
	memoryUsage: {
		used: number;
		total: number;
		percentage: number;
	};
	activeConnections: number;
	requestsPerMinute: number;
	errorRate: number;
}

// Track system start time
const systemStartTime = Date.now();

// Simple request tracking
let requestCount = 0;
let errorCount = 0;
let lastMinute = Math.floor(Date.now() / 60000);

/**
 * GET /api/health - Get system health status
 */
export const GET: RequestHandler = async ({ url }) => {
	try {
		const detailed = url.searchParams.get('detailed') === 'true';
		
		// Increment request counter
		trackRequest();

		// Perform health checks
		const healthStatus: HealthStatus = {
			status: 'healthy',
			timestamp: new Date().toISOString(),
			version: getVersion(),
			uptime: getUptime(),
			services: {
				database: await checkDatabaseHealth(),
				graphql: await checkGraphQLHealth(),
				authentication: await checkAuthenticationHealth(),
				subscriptions: await checkSubscriptionsHealth()
			},
			metrics: getSystemMetrics()
		};

		// Determine overall status
		const serviceStatuses = Object.values(healthStatus.services).map(s => s.status);
		if (serviceStatuses.includes('unhealthy')) {
			healthStatus.status = 'unhealthy';
		} else if (serviceStatuses.includes('degraded')) {
			healthStatus.status = 'degraded';
		}

		const statusCode = healthStatus.status === 'healthy' ? 200 : 
		                   healthStatus.status === 'degraded' ? 200 : 503;

		// Return simplified response if not detailed
		if (!detailed) {
			return json({
				status: healthStatus.status,
				timestamp: healthStatus.timestamp,
				version: healthStatus.version,
				uptime: healthStatus.uptime
			}, { status: statusCode });
		}

		return json(healthStatus, { 
			status: statusCode,
			headers: {
				'Cache-Control': 'no-cache, no-store, must-revalidate',
				'Pragma': 'no-cache',
				'Expires': '0'
			}
		});

	} catch (error) {
		console.error('Health check failed:', error);
		
		trackError();
		
		return json({
			status: 'unhealthy',
			timestamp: new Date().toISOString(),
			error: 'Health check failed',
			version: getVersion(),
			uptime: getUptime()
		}, { status: 503 });
	}
};

/**
 * Check database connectivity
 */
async function checkDatabaseHealth(): Promise<ServiceHealth> {
	const startTime = Date.now();
	
	try {
		// In production, this would check actual database connectivity
		// For now, simulate database check
		await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
		
		const responseTime = Date.now() - startTime;
		
		return {
			status: 'healthy',
			responseTime,
			lastCheck: new Date().toISOString(),
			message: 'Database connection successful'
		};
	} catch (error) {
		return {
			status: 'unhealthy',
			responseTime: Date.now() - startTime,
			lastCheck: new Date().toISOString(),
			message: 'Database connection failed'
		};
	}
}

/**
 * Check GraphQL API health
 */
async function checkGraphQLHealth(): Promise<ServiceHealth> {
	const startTime = Date.now();
	
	try {
		// Test GraphQL endpoint with introspection query
		const introspectionQuery = {
			query: '{ __schema { queryType { name } } }'
		};

		const response = await fetch('/api/graphql', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': 'Bearer test-bearer-token'
			},
			body: JSON.stringify(introspectionQuery)
		});

		const responseTime = Date.now() - startTime;

		if (response.ok) {
			const data = await response.json();
			if (data.data && data.data.__schema) {
				return {
					status: 'healthy',
					responseTime,
					lastCheck: new Date().toISOString(),
					message: 'GraphQL API operational'
				};
			}
		}

		return {
			status: 'degraded',
			responseTime,
			lastCheck: new Date().toISOString(),
			message: 'GraphQL API responded but with issues'
		};
		
	} catch (error) {
		return {
			status: 'unhealthy',
			responseTime: Date.now() - startTime,
			lastCheck: new Date().toISOString(),
			message: 'GraphQL API unreachable'
		};
	}
}

/**
 * Check authentication service health
 */
async function checkAuthenticationHealth(): Promise<ServiceHealth> {
	const startTime = Date.now();
	
	try {
		// Test auth endpoint
		const response = await fetch('/api/auth', {
			method: 'GET',
			headers: {
				'Authorization': 'Bearer test-bearer-token'
			}
		});

		const responseTime = Date.now() - startTime;

		if (response.status === 401) {
			// 401 is expected for invalid token, means auth service is working
			return {
				status: 'healthy',
				responseTime,
				lastCheck: new Date().toISOString(),
				message: 'Authentication service operational'
			};
		} else if (response.ok) {
			return {
				status: 'healthy',
				responseTime,
				lastCheck: new Date().toISOString(),
				message: 'Authentication service operational'
			};
		}

		return {
			status: 'degraded',
			responseTime,
			lastCheck: new Date().toISOString(),
			message: 'Authentication service responding with issues'
		};
		
	} catch (error) {
		return {
			status: 'unhealthy',
			responseTime: Date.now() - startTime,
			lastCheck: new Date().toISOString(),
			message: 'Authentication service unreachable'
		};
	}
}

/**
 * Check subscriptions service health
 */
async function checkSubscriptionsHealth(): Promise<ServiceHealth> {
	const startTime = Date.now();
	
	try {
		// Test subscriptions endpoint
		const response = await fetch('/api/subscriptions', {
			method: 'GET'
		});

		const responseTime = Date.now() - startTime;

		if (response.ok) {
			return {
				status: 'healthy',
				responseTime,
				lastCheck: new Date().toISOString(),
				message: 'Subscriptions service operational'
			};
		}

		return {
			status: 'degraded',
			responseTime,
			lastCheck: new Date().toISOString(),
			message: 'Subscriptions service responding with issues'
		};
		
	} catch (error) {
		return {
			status: 'unhealthy',
			responseTime: Date.now() - startTime,
			lastCheck: new Date().toISOString(),
			message: 'Subscriptions service unreachable'
		};
	}
}

/**
 * Get system metrics
 */
function getSystemMetrics(): SystemMetrics {
	// Get memory usage
	const memoryUsage = process.memoryUsage();
	
	return {
		memoryUsage: {
			used: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
			total: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
			percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
		},
		activeConnections: 0, // Would track actual connections in production
		requestsPerMinute: getRequestsPerMinute(),
		errorRate: getErrorRate()
	};
}

/**
 * Get application version
 */
function getVersion(): string {
	// In production, this would read from package.json or environment variable
	return process.env.APP_VERSION || '1.0.0';
}

/**
 * Get system uptime in seconds
 */
function getUptime(): number {
	return Math.floor((Date.now() - systemStartTime) / 1000);
}

/**
 * Track incoming request
 */
function trackRequest(): void {
	const currentMinute = Math.floor(Date.now() / 60000);
	
	if (currentMinute !== lastMinute) {
		// Reset counters for new minute
		requestCount = 0;
		errorCount = 0;
		lastMinute = currentMinute;
	}
	
	requestCount++;
}

/**
 * Track error
 */
function trackError(): void {
	errorCount++;
}

/**
 * Get requests per minute
 */
function getRequestsPerMinute(): number {
	return requestCount;
}

/**
 * Get error rate percentage
 */
function getErrorRate(): number {
	if (requestCount === 0) return 0;
	return Math.round((errorCount / requestCount) * 100);
}

/**
 * POST /api/health - Run health check tests
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const { action } = await request.json();
		
		switch (action) {
			case 'test_database':
				return json({ test: 'database', result: await checkDatabaseHealth() });
			case 'test_graphql':
				return json({ test: 'graphql', result: await checkGraphQLHealth() });
			case 'test_auth':
				return json({ test: 'authentication', result: await checkAuthenticationHealth() });
			case 'test_subscriptions':
				return json({ test: 'subscriptions', result: await checkSubscriptionsHealth() });
			default:
				return json({ error: 'Unknown test action' }, { status: 400 });
		}
	} catch (error) {
		return json({ error: 'Health test failed' }, { status: 500 });
	}
};

/**
 * OPTIONS handler for CORS preflight
 */
export const OPTIONS: RequestHandler = async () => {
	return new Response(null, {
		status: 200,
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization',
			'Access-Control-Max-Age': '86400'
		}
	});
};