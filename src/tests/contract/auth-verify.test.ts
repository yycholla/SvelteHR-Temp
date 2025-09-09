import { describe, it, expect, beforeEach } from 'vitest';
import { dev } from '$app/environment';

/**
 * Contract Test: GET /auth/verify
 * 
 * Tests the token verification endpoint that should:
 * 1. Validate gel-auth-token cookie
 * 2. Verify token with MountainHR-Backend
 * 3. Return user information with roles and permissions
 * 
 * Expected Response:
 * - Status: 200 (Valid token) or 401 (Invalid/missing token)
 * - Content-Type: application/json
 * - Body: AuthUser object with id, email, full_name, roles, etc.
 * 
 * Contract Reference: auth-api.yaml - /verify GET operation
 */

describe('Contract Test: GET /auth/verify', () => {
	const baseUrl = dev ? 'http://localhost:4000' : 'https://app.sveltehr.com';

	beforeEach(() => {
		// Reset any existing auth state
		// This will be implemented when auth services are created
	});

	it('should return user data for valid authentication token', async () => {
		// This test MUST fail until implementation is complete
		const validAuthToken = 'valid_jwt_token_here';
		
		const response = await fetch(`${baseUrl}/auth/verify`, {
			method: 'GET',
			headers: {
				'Cookie': `gel-auth-token=${validAuthToken}`,
			}
		});

		// Contract requirement: 200 OK for valid token
		expect(response.status).toBe(200);
		
		// Contract requirement: JSON response
		const contentType = response.headers.get('Content-Type');
		expect(contentType).toMatch(/application\/json/);

		// Contract requirement: AuthUser schema
		const userData = await response.json();
		expect(userData).toHaveProperty('id');
		expect(userData).toHaveProperty('email');
		expect(userData).toHaveProperty('full_name');
		expect(userData).toHaveProperty('roles');
		expect(userData).toHaveProperty('is_active');
		
		// Validate data types
		expect(typeof userData.id).toBe('string');
		expect(typeof userData.email).toBe('string');
		expect(typeof userData.full_name).toBe('string');
		expect(Array.isArray(userData.roles)).toBe(true);
		expect(typeof userData.is_active).toBe('boolean');
		
		// Email should be valid format
		expect(userData.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
		
		// Roles should be non-empty for active users
		expect(userData.roles.length).toBeGreaterThan(0);
	});

	it('should return 401 for missing authentication token', async () => {
		const response = await fetch(`${baseUrl}/auth/verify`, {
			method: 'GET'
			// No authentication cookie
		});

		// Contract requirement: 401 Unauthorized for missing token
		expect(response.status).toBe(401);
		
		// Should return JSON error response
		const contentType = response.headers.get('Content-Type');
		expect(contentType).toMatch(/application\/json/);
		
		const errorData = await response.json();
		expect(errorData).toHaveProperty('error');
		expect(errorData.error).toMatch(/invalid.*expired.*token/i);
	});

	it('should return 401 for invalid authentication token', async () => {
		const invalidAuthToken = 'invalid_jwt_token';
		
		const response = await fetch(`${baseUrl}/auth/verify`, {
			method: 'GET',
			headers: {
				'Cookie': `gel-auth-token=${invalidAuthToken}`,
			}
		});

		// Contract requirement: 401 Unauthorized for invalid token
		expect(response.status).toBe(401);
		
		const contentType = response.headers.get('Content-Type');
		expect(contentType).toMatch(/application\/json/);
		
		const errorData = await response.json();
		expect(errorData).toHaveProperty('error');
		expect(errorData.error).toMatch(/invalid.*expired.*token/i);
	});

	it('should return 401 for expired authentication token', async () => {
		const expiredAuthToken = 'expired_jwt_token_here';
		
		const response = await fetch(`${baseUrl}/auth/verify`, {
			method: 'GET',
			headers: {
				'Cookie': `gel-auth-token=${expiredAuthToken}`,
			}
		});

		// Contract requirement: 401 Unauthorized for expired token
		expect(response.status).toBe(401);
		
		const errorData = await response.json();
		expect(errorData).toHaveProperty('error');
		expect(errorData.error).toMatch(/invalid.*expired.*token/i);
	});

	it('should include optional fields when available', async () => {
		const validAuthToken = 'valid_jwt_token_with_optional_fields';
		
		const response = await fetch(`${baseUrl}/auth/verify`, {
			method: 'GET',
			headers: {
				'Cookie': `gel-auth-token=${validAuthToken}`,
			}
		});

		if (response.status === 200) {
			const userData = await response.json();
			
			// Optional fields from contract
			if (userData.identity_id) {
				expect(typeof userData.identity_id).toBe('string');
				// Should be valid UUID format
				expect(userData.identity_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
			}
			
			if (userData.department) {
				expect(typeof userData.department).toBe('string');
			}
			
			if (userData.last_login) {
				expect(typeof userData.last_login).toBe('string');
				// Should be ISO 8601 datetime format
				expect(new Date(userData.last_login).toISOString()).toBe(userData.last_login);
			}
		}
	});

	it('should validate user is active', async () => {
		const validAuthToken = 'valid_jwt_token_here';
		
		const response = await fetch(`${baseUrl}/auth/verify`, {
			method: 'GET',
			headers: {
				'Cookie': `gel-auth-token=${validAuthToken}`,
			}
		});

		if (response.status === 200) {
			const userData = await response.json();
			
			// Contract requirement: Only active users should have valid tokens
			expect(userData.is_active).toBe(true);
		}
	});

	it('should handle only GET method', async () => {
		// Test that POST method is not allowed for verify
		const response = await fetch(`${baseUrl}/auth/verify`, {
			method: 'POST'
		});

		// Should return 405 Method Not Allowed for POST
		expect(response.status).toBe(405);
		
		// Should specify allowed methods
		const allow = response.headers.get('Allow');
		expect(allow).toMatch(/GET/);
	});

	it('should return consistent error format', async () => {
		// Test error response format consistency
		const response = await fetch(`${baseUrl}/auth/verify`, {
			method: 'GET'
			// No auth token
		});

		expect(response.status).toBe(401);
		
		const errorData = await response.json();
		
		// Should follow ErrorResponse schema from contract
		expect(errorData).toHaveProperty('error');
		expect(typeof errorData.error).toBe('string');
		
		// Optional fields
		if (errorData.message) {
			expect(typeof errorData.message).toBe('string');
		}
		if (errorData.code) {
			expect(typeof errorData.code).toBe('string');
		}
	});
});