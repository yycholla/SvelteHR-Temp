/**
 * Health Check Endpoint
 *
 * Returns the health status of the frontend service for Docker health checks
 * and production monitoring.
 *
 * Used by:
 * - Docker Compose health checks
 * - Kubernetes liveness/readiness probes
 * - Load balancers (Caddy passive health monitoring)
 * - Monitoring systems (Prometheus, Datadog, etc.)
 */

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ fetch }) => {
	try {
		// Basic health check: verify server is responding
		const healthData = {
			status: 'healthy',
			timestamp: new Date().toISOString(),
			service: 'sveltehr-frontend',
			version: '1.0.0'
		};

		// Optional: verify backend connectivity (uncomment if needed)
		// This adds latency to health checks, so only enable if required
		// try {
		// 	const backendUrl = process.env.PUBLIC_API_URL || 'http://hr-graphql-rust:4000';
		// 	const response = await fetch(`${backendUrl}/health`, {
		// 		method: 'GET',
		// 		headers: { 'Content-Type': 'application/json' }
		// 	});
		//
		// 	if (!response.ok) {
		// 		return new Response(
		// 			JSON.stringify({
		// 				status: 'unhealthy',
		// 				reason: 'backend_unreachable',
		// 				timestamp: new Date().toISOString()
		// 			}),
		// 			{
		// 				status: 503,
		// 				headers: { 'Content-Type': 'application/json' }
		// 			}
		// 		);
		// 	}
		//
		// 	healthData.backend = 'connected';
		// } catch (error) {
		// 	healthData.backend = 'disconnected';
		// 	healthData.backend_error = error instanceof Error ? error.message : 'Unknown error';
		// }

		return new Response(JSON.stringify(healthData), {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'no-cache, no-store, must-revalidate'
			}
		});
	} catch (error) {
		// Return 503 Service Unavailable if health check fails
		return new Response(
			JSON.stringify({
				status: 'unhealthy',
				error: error instanceof Error ? error.message : 'Unknown error',
				timestamp: new Date().toISOString()
			}),
			{
				status: 503,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}
};
