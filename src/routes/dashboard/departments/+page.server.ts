// Server-side data loading for departments page
// T036: Fix department management pages with standardized error handling

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { PermissionChecks, getUserPermissions } from '$lib/server/rbac-utils';

export const load: PageServerLoad = async (event) => {
	const { locals, cookies, url } = event;

	// RBAC: Check department access permissions
	PermissionChecks.departmentRead(event);

	// Import required models for standardized error handling
	const { createDataRequest } = await import('$lib/models/data-request');
	const { createErrorResponse } = await import('$lib/models/error-response');
	const { createUserSession } = await import('$lib/models/user-session');

	// Create user session from server locals
	const userSession = createUserSession({
		userId: locals.user.id,
		jwtToken: cookies.get('hr_token') || '',
		roles: [locals.user.role || 'employee'],
		permissions: locals.permissions || [],
		expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes from now
		metadata: {
			userEmail: locals.user.email,
			displayName: locals.user.display_name || locals.user.email
		}
	});

	// Extract search parameters from URL
	const searchTerm = url.searchParams.get('search') || '';
	const parentFilter = url.searchParams.get('parent') || '';
	const hasHeadFilter = url.searchParams.get('hasHead') || '';
	const page = parseInt(url.searchParams.get('page') || '1', 10);
	const limit = parseInt(url.searchParams.get('limit') || '20', 10);
	const offset = (page - 1) * limit;

	// Create data request for departments
	const dataRequest = createDataRequest({
		operationName: 'GetDepartments',
		variables: {
			searchTerm,
			parentFilter,
			hasHeadFilter,
			page,
			limit,
			includeStats: true
		},
		userCredentials: {
			userId: userSession.userId,
			userEmail: userSession.metadata.userEmail as string,
			roles: userSession.roles,
			permissions: userSession.permissions,
			jwtToken: userSession.jwtToken,
			isAuthenticated: Boolean(userSession.isAuthenticated)
		},
		timeoutMs: 5000,
		retryAttempts: 0,
		maxRetries: 3
	});

	try {
		// Make direct GraphQL calls to PostGraphile backend
		const { getGraphQLEndpoint } = await import('$lib/server/api-url');
		const graphqlEndpoint = getGraphQLEndpoint();

		// Get JWT token for PostGraphile authentication
		const jwtToken = cookies.get('hr_token') || cookies.get('postgraphile-jwt-token') || '';
		console.log(
			'[Departments] Using JWT token for PostGraphile:',
			jwtToken ? `${jwtToken.substring(0, 50)}...` : 'No token'
		);

		// Decode JWT token to get user context for PostGraphile
		let jwtClaims = null;
		if (jwtToken) {
			try {
				const { decodeJWTTokenUnsafe } = await import('$lib/auth/jwt-utils');
				jwtClaims = await decodeJWTTokenUnsafe(jwtToken);
				console.log('[Departments] JWT claims:', jwtClaims);
			} catch (error) {
				console.warn('[Departments] Failed to decode JWT:', error);
			}
		}

		// Set up proper headers for PostGraphile with JWT context
		const headers: Record<string, string> = {
			'Content-Type': 'application/json'
		};

		// If we have JWT claims, set up PostGraphile context
		if (jwtClaims) {
			headers['Authorization'] = `Bearer ${jwtToken}`;
			// PostGraphile expects role and user_id in specific format
			headers['X-JWT-Claims-Role'] = jwtClaims.role || 'employee';
			headers['X-JWT-Claims-User-Id'] = jwtClaims.user_id;
		}

		// Load departments data with linked employee relationships
		const departmentsResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
					query GetDepartments($limit: Int!, $offset: Int!) {
						departments(limit: $limit, offset: $offset) {
							id
							name
							description
							managerId
							createdAt
							updatedAt
						}
						departmentsCount
					}
				`,
				variables: {
					limit: limit,
					offset: offset
				}
			})
		});

		const departmentsData = await departmentsResponse.json();
		console.log('[Departments] Departments data:', departmentsData);

		// Get standardized user permissions
		const userPermissions = getUserPermissions(locals);

		// Transform department data to match expected structure
		const departments = (departmentsData?.data?.departments || []).map((dept: any) => {
			return {
				...dept,
				// Employee data not available in current Rust GraphQL schema
				employees: {
					nodes: [], // TODO: Implement separate query for employees
					totalCount: 0
				},
				// Department head not available in current Rust GraphQL schema
				departmentHead: null
			};
		});

		// Return server-side loaded data
		return {
			user: userPermissions.user,
			userSession: userSession.toJSON(), // Convert UserSession to serializable object
			departments,
			totalDepartments: departmentsData?.data?.departmentsCount || 0,
			hierarchy: [], // For now, return empty hierarchy
			filters: {
				searchTerm,
				parentFilter,
				hasHeadFilter,
				page,
				limit
			},
			// RBAC: Standardized permission checks
			...userPermissions,
			loadedAt: new Date().toISOString()
		};
	} catch (err) {
		console.error('[Departments Load Error]', err);

		// Create standardized error response
		const errorResponse = createErrorResponse(
			err instanceof Error ? err : new Error('Departments load failed'),
			{
				type: 'DATA_LOAD_ERROR',
				userMessage: 'Unable to load departments. Please refresh the page or try again later.'
			}
		);

		// Log error details for debugging
		console.error('[Departments Error Details]', {
			userId: locals.user?.id,
			userRole: locals.user?.role,
			searchTerm,
			parentFilter,
			hasHeadFilter,
			error: errorResponse
		});

		// Throw SvelteKit error with user-friendly message
		throw error(500, {
			message: 'Departments temporarily unavailable',
			details: errorResponse.userMessage
		});
	}
};
