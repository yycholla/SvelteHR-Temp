// Server-side data loading for employee directory page
// T035: Fix employee management pages implementation with standardized error handling

import type { PageServerLoad } from './$types';
import { PermissionChecks, getUserPermissions } from '$lib/server/rbac-utils';
import { createEmployeeOperations } from '$lib/graphql/employee-operations';

export const load: PageServerLoad = async (event) => {
	const { locals, cookies, url } = event;

	// RBAC: Check employee directory access permissions
	PermissionChecks.employeeRead(event);

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
	const departmentFilter = url.searchParams.get('department') || '';
	const statusFilter = url.searchParams.get('status') || '';
	const page = parseInt(url.searchParams.get('page') || '1', 10);
	const limit = parseInt(url.searchParams.get('limit') || '20', 10);

	// Create data request for employee directory
	const dataRequest = createDataRequest({
		operationName: 'GetEmployeeDirectory',
		variables: {
			searchTerm,
			departmentFilter,
			statusFilter,
			page,
			limit,
			includeInactive: userSession.role === 'hr_manager' || userSession.role === 'hr_admin'
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
		// Create employee operations instance
		const employeeOps = createEmployeeOperations(null); // We'll pass the GraphQL client reference

		// Load employee directory data using standardized operations
		const employeesData = await employeeOps.getEmployees({
			filter: {
				searchTerm,
				departmentFilter,
				statusFilter,
				includeInactive: userSession.role === 'hr_manager' || userSession.role === 'hr_admin'
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

		// Also load department list for filters
		const departmentsData = await employeeOps.getDepartments({
			userCredentials: {
				userId: userSession.userId,
				userEmail: userSession.userEmail,
				role: userSession.role,
				accessToken: userSession.accessToken
			}
		});

		// Return server-side loaded data
		// Get standardized user permissions
		const userPermissions = getUserPermissions(locals);

		return {
			user: userPermissions.user,
			userSession,
			employees: employeesData.employees || [],
			totalEmployees: employeesData.totalCount || 0,
			departments: departmentsData.departments || [],
			filters: {
				searchTerm,
				departmentFilter,
				statusFilter,
				page,
				limit
			},
			// RBAC: Standardized permission checks
			...userPermissions,
			loadedAt: new Date().toISOString()
		};
	} catch (err) {
		console.error('[Employee Directory Load Error]', err);

		// Create standardized error response
		const errorResponse = createErrorResponse(err instanceof Error ? err : new Error('Employee directory load failed'), {
			type: 'DATA_LOAD_ERROR',
			userMessage: 'Unable to load employee directory. Please refresh the page or try again later.'
		});

		// Log error details for debugging
		console.error('[Employee Directory Error Details]', {
			userId: locals.user?.id,
			userRole: locals.user?.role,
			searchTerm,
			departmentFilter,
			statusFilter,
			error: errorResponse
		});

		// Throw SvelteKit error with user-friendly message
		throw error(500, {
			message: 'Employee directory temporarily unavailable',
			details: errorResponse.userMessage
		});
	}
};