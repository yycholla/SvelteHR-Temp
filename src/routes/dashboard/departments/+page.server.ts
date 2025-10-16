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
	const { createErrorResponse } = await import('$lib/models/error-response');

	// Create simple user session object (session-based auth doesn't use JWT)
	const userSession = {
		userId: locals.user.id,
		roles: [locals.user.role || 'employee'],
		permissions: locals.permissions || [],
		isAuthenticated: true,
		expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
		metadata: {
			userEmail: locals.user.email,
			displayName: locals.user.display_name || locals.user.email
		},
		toJSON: () => ({
			userId: locals.user.id,
			roles: [locals.user.role || 'employee'],
			permissions: locals.permissions || [],
			isAuthenticated: true,
			expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
			metadata: {
				userEmail: locals.user.email,
				displayName: locals.user.display_name || locals.user.email
			}
		})
	};

	// Extract search parameters from URL
	const searchTerm = url.searchParams.get('search') || '';
	const parentFilter = url.searchParams.get('parent') || '';
	const hasHeadFilter = url.searchParams.get('hasHead') || '';
	const page = parseInt(url.searchParams.get('page') || '1', 10);
	const limit = parseInt(url.searchParams.get('limit') || '20', 10);
	const offset = (page - 1) * limit;

	// Note: dataRequest is not needed for session-based auth
	// We fetch data directly with session cookies

	try {
		// Make direct GraphQL calls to Rust GraphQL backend with session-based authentication
		const { getGraphQLEndpoint } = await import('$lib/server/api-url');
		const graphqlEndpoint = getGraphQLEndpoint();

		// Headers for session-based authentication
		// Forward session cookies to Rust GraphQL backend
		const cookieHeader = event.request.headers.get('cookie') || '';
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
			'Cookie': cookieHeader // Forward all cookies for session authentication
		};

		console.log(
			'[Departments] Using Rust GraphQL with session-based auth, user role:',
			locals.user?.role
		);
		console.log('[Departments] Filters:', { searchTerm, parentFilter, hasHeadFilter });

		// Load departments data with linked employee relationships
		const departmentsResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
					query GetDepartments($limit: Int, $offset: Int) {
						departments(limit: $limit, offset: $offset) {
							id
							name
							description
							managerId
							parentDepartmentId
							createdAt
							updatedAt
						}
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

		// Extract departments from Rust GraphQL response (direct array, no nodes wrapper)
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
			totalDepartments: departments.length, // Use actual count from results
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
