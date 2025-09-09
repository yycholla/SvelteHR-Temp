import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendIntegrationService } from '$lib/services/backend-integration.service.js';

/**
 * GET /api/auth/verify
 * 
 * Verify authentication token and return user context
 * This endpoint validates the Bearer token with the backend RBAC system
 * and returns complete user information including roles and permissions.
 */
export const GET: RequestHandler = async ({ request }) => {
	try {
		// Extract Bearer token from Authorization header
		const authHeader = request.headers.get('Authorization');
		
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return json(
				{
					error: 'Missing or invalid Authorization header',
					code: 'MISSING_AUTH_HEADER'
				},
				{ status: 401 }
			);
		}

		const accessToken = authHeader.substring(7); // Remove "Bearer " prefix

		if (!accessToken) {
			return json(
				{
					error: 'Access token is required',
					code: 'MISSING_TOKEN'
				},
				{ status: 401 }
			);
		}

		// Verify token with backend and get user context
		const authResponse = await backendIntegrationService.verifyAuthToken(accessToken);

		// Return user data and permissions
		return json({
			...authResponse.user,
			permissions: authResponse.permissions
		});

	} catch (err: any) {
		console.error('Token verification error:', err);

		// Handle specific error types
		if (backendIntegrationService.isAuthError(err)) {
			return json(
				{
					error: 'Invalid or expired token',
					code: 'TOKEN_INVALID'
				},
				{ status: 401 }
			);
		}

		if (backendIntegrationService.isNetworkError(err)) {
			return json(
				{
					error: 'Authentication service unavailable',
					code: 'SERVICE_UNAVAILABLE'
				},
				{ status: 503 }
			);
		}

		// Generic server error
		return json(
			{
				error: 'Token verification failed',
				code: 'VERIFICATION_ERROR'
			},
			{ status: 500 }
		);
	}
};