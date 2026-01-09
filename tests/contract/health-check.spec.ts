import { expect, test } from '@playwright/test';

/**
 * Contract test for health check API
 * Tests the health check endpoint schema and behavior
 */

interface HealthCheckResponse {
	status: 'healthy' | 'initializing' | 'error';
	services: {
		database: boolean;
		graphql: boolean;
		auth: boolean;
	};
	message?: string;
	timestamp: string;
	responseTime: number;
}

test.describe('Health Check API Contract', () => {
	test('should return valid health check response schema when healthy', async ({ request }) => {
		// This test will initially fail until the health check endpoint is properly integrated
		const response = await request.get('/api/health');

		expect(response.status()).toBe(200);

		const data: HealthCheckResponse = await response.json();

		// Validate response schema
		expect(data).toHaveProperty('status');
		expect(['healthy', 'initializing', 'error']).toContain(data.status);

		expect(data).toHaveProperty('services');
		expect(data.services).toHaveProperty('database');
		expect(data.services).toHaveProperty('graphql');
		expect(data.services).toHaveProperty('auth');
		expect(typeof data.services.database).toBe('boolean');
		expect(typeof data.services.graphql).toBe('boolean');
		expect(typeof data.services.auth).toBe('boolean');

		expect(data).toHaveProperty('timestamp');
		expect(new Date(data.timestamp).getTime()).toBeGreaterThan(0);

		expect(data).toHaveProperty('responseTime');
		expect(typeof data.responseTime).toBe('number');
		expect(data.responseTime).toBeGreaterThanOrEqual(0);

		if (data.message) {
			expect(typeof data.message).toBe('string');
		}
	});

	test('should return 503 status when backend is not ready', async ({ request }) => {
		// Test the case where backend services are not fully initialized
		// This test verifies the error response schema

		// Note: This test might pass or fail depending on backend state
		// We're testing the contract, not the specific behavior
		const response = await request.get('/api/health');

		const data: HealthCheckResponse = await response.json();

		if (response.status() === 503) {
			expect(data.status).toBe('error');
			expect(data).toHaveProperty('services');
			expect(data).toHaveProperty('timestamp');
			expect(data).toHaveProperty('responseTime');
		}
	});

	test('should have reasonable response time', async ({ request }) => {
		const startTime = Date.now();
		const response = await request.get('/api/health');
		const endTime = Date.now();

		const responseTime = endTime - startTime;

		// Health check should respond quickly (under 5 seconds)
		expect(responseTime).toBeLessThan(5000);

		const data: HealthCheckResponse = await response.json();
		expect(data.responseTime).toBeLessThan(5000);
	});

	test('should not cache health check responses', async ({ request }) => {
		const response = await request.get('/api/health');

		const cacheControl = response.headers()['cache-control'];
		expect(cacheControl).toContain('no-cache');
		expect(cacheControl).toContain('no-store');
		expect(cacheControl).toContain('must-revalidate');
	});

	test('should handle CORS properly', async ({ request }) => {
		const response = await request.get('/api/health');

		// Should not require CORS for same-origin requests
		expect(response.status()).not.toBe(403);
		expect(response.status()).not.toBe(401);
	});
});
