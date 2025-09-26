// Server-side data loading for departments page
// T036: Fix department management pages with standardized error handling

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { PermissionChecks, getUserPermissions } from '$lib/server/rbac-utils';
import { createDepartmentOperations } from '$lib/graphql/department-operations';

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
		userEmail: locals.user.email,
		displayName: locals.user.display_name || locals.user.email,
		role: locals.user.role || 'employee',
		permissions: locals.permissions || [],
		accessToken: cookies.get('hr_token') || '',
		tokenExpiry: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
		isValid: true
	});

	// Extract search parameters from URL
	const searchTerm = url.searchParams.get('search') || '';
	const parentFilter = url.searchParams.get('parent') || '';
	const hasHeadFilter = url.searchParams.get('hasHead') || '';
	const page = parseInt(url.searchParams.get('page') || '1', 10);
	const limit = parseInt(url.searchParams.get('limit') || '20', 10);

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
			userEmail: userSession.userEmail,
			role: userSession.role,
			accessToken: userSession.accessToken
		},
		timeoutMs: 5000,
		retryAttempts: 0,
		maxRetries: 3
	});

	try {
		// Create department operations instance
		const departmentOps = createDepartmentOperations(null); // We'll pass the GraphQL client reference

		// Load departments data using standardized operations
		const departmentsData = await departmentOps.getDepartments({
			filter: {
				searchTerm,
				parentFilter,
				hasHeadFilter: hasHeadFilter === 'true' ? true : hasHeadFilter === 'false' ? false : undefined
			},
			pagination: {
				page,
				limit
			},
			userCredentials: {
				userId: userSession.userId,
				userEmail: userSession.userEmail,
				role: userSession.role,
				accessToken: userSession.accessToken
			}
		});

		// Load department hierarchy for visualization
		const hierarchyData = await departmentOps.getDepartmentHierarchy({
			userCredentials: {
				userId: userSession.userId,
				userEmail: userSession.userEmail,
				role: userSession.role,
				accessToken: userSession.accessToken
			}
		});

		// Return server-side loaded data
		return {
			user: locals.user,
			userSession,
			departments: departmentsData.departments || [],
			totalDepartments: departmentsData.totalCount || 0,
			hierarchy: hierarchyData.hierarchy || [],
			filters: {
				searchTerm,
				parentFilter,
				hasHeadFilter,
				page,
				limit
			},
			// RBAC: Standardized permission checks
			...getUserPermissions(locals),
			loadedAt: new Date().toISOString()
		};
	} catch (err) {
		console.error('[Departments Load Error]', err);

		// Create standardized error response
		const errorResponse = createErrorResponse(err instanceof Error ? err : new Error('Departments load failed'), {
			type: 'DATA_LOAD_ERROR',
			userMessage: 'Unable to load departments. Please refresh the page or try again later.'
		});

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