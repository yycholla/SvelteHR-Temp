import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendIntegrationService } from '$lib/services/backend-integration.service.js';

/**
 * GET /api/auth/permissions
 * 
 * Get current user's roles and permissions from RBAC system
 * This endpoint returns detailed permission information for the authenticated user.
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

		// Get user permissions from backend RBAC system
		const permissionsResponse = await backendIntegrationService.getUserPermissions(accessToken);

		// Return permissions data
		return json(permissionsResponse);

	} catch (err: any) {
		console.error('Permissions fetch error:', err);

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
				error: 'Failed to fetch permissions',
				code: 'PERMISSIONS_FETCH_ERROR'
			},
			{ status: 500 }
		);
	}
};