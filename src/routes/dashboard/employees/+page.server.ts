// Server-side data loading for employee directory page
// T035: Fix employee management pages implementation with standardized error handling

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
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
		jwtToken: '', // Session-based auth doesn't use client-side JWT tokens
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
	const departmentFilter = url.searchParams.get('department') || '';
	// Default to 'active' to show only active employees by default
	const statusFilter = url.searchParams.get('status') || 'active';
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
			includeInactive:
				userSession.roles.includes('hr_manager') || userSession.roles.includes('hr_admin')
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
		// Make direct GraphQL calls to Rust GraphQL backend with JWT authentication
		const { getGraphQLEndpoint } = await import('$lib/server/api-url');
		const graphqlEndpoint = getGraphQLEndpoint();

		// Get JWT token from cookies for Rust GraphQL server authentication
		// Headers for session-based authentication (cookies sent automatically)
		const headers: Record<string, string> = {
			'Content-Type': 'application/json'
		};

		console.log(
			'[Employee Directory] Using Rust GraphQL with session-based auth, user role:',
			locals.user?.role
		);
		console.log('[Employee Directory] Filters:', { searchTerm, departmentFilter, statusFilter });

		// Build filter condition based on query parameters
		const condition: any = {};

		if (departmentFilter) {
			condition.departmentId = departmentFilter;
		}

		// Note: We handle isActive filtering differently because PostGraphile doesn't handle
		// boolean filtering well with null values. We'll filter client-side instead.
		// if (statusFilter === 'active') {
		// 	condition.isActive = true;
		// } else if (statusFilter === 'inactive') {
		// 	condition.isActive = false;
		// }

		// Note: searchTerm filtering will be done client-side for now
		// PostGraphile doesn't support LIKE queries easily in conditions

		// Load employee directory data using Rust GraphQL schema
		const employeesResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
					query GetEmployees($limit: Int, $offset: Int) {
						users(limit: $limit, offset: $offset) {
							id
							email
							firstName
							lastName
							displayName
							role
							phone
							departmentId
							managerId
							hireDate
							isActive
							createdAt
							updatedAt
						}
					}
				`,
				variables: {
					limit: limit,
					offset: (page - 1) * limit
				}
			})
		});

		const employeesData = await employeesResponse.json();
		console.log('[Employee Directory] Employees data:', employeesData);
		console.log('[Employee Directory] Status filter:', statusFilter);

		// Extract employees from Rust GraphQL response (direct array, no nodes wrapper)
		let employees = employeesData?.data?.users || [];

		// Debug: Check isActive values
		console.log(
			'[Employee Directory] Employee isActive values:',
			employees.map((e: any) => ({
				email: e.email,
				isActive: e.isActive
			}))
		);

		// Server-side filtering for isActive status
		if (statusFilter === 'active') {
			// Only show employees where isActive is true
			employees = employees.filter((emp: any) => emp.isActive === true);
			console.log('[Employee Directory] After active filter:', employees.length, 'employees');
		} else if (statusFilter === 'inactive') {
			// Only show employees where isActive is false
			employees = employees.filter((emp: any) => emp.isActive === false);
			console.log('[Employee Directory] After inactive filter:', employees.length, 'employees');
		}
		// If statusFilter is empty string, show all employees (no filtering)

		// Client-side filtering for search term
		if (searchTerm) {
			const searchLower = searchTerm.toLowerCase();
			employees = employees.filter((emp: any) => {
				const displayName = emp.displayName?.toLowerCase() || '';
				const firstName = emp.firstName?.toLowerCase() || '';
				const lastName = emp.lastName?.toLowerCase() || '';
				const email = emp.email?.toLowerCase() || '';
				const role = emp.role?.toLowerCase() || '';
				return (
					displayName.includes(searchLower) ||
					firstName.includes(searchLower) ||
					lastName.includes(searchLower) ||
					email.includes(searchLower) ||
					role.includes(searchLower)
				);
			});
		}

		// Load departments data with Rust GraphQL schema
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
							parentDepartmentId
							managerId
							createdAt
							updatedAt
						}
					}
				`,
				variables: {
					limit: 100,
					offset: 0
				}
			})
		});

		const departmentsData = await departmentsResponse.json();
		console.log('[Employee Directory] Departments data:', departmentsData);

		// Return server-side loaded data
		// Get standardized user permissions
		const userPermissions = getUserPermissions(locals);

		// RBAC: Check if user can create reviews
		const userRole = locals.user?.role || 'employee';
		const canCreateReviews = ['admin', 'super_admin', 'hr_manager', 'manager'].includes(userRole);

		return {
			user: userPermissions.user,
			userSession: userSession.toJSON(), // Convert UserSession to serializable object
			employees: employees,
			totalEmployees: employees.length, // Use filtered count for accurate pagination
			departments: departmentsData?.data?.departments || [],
			filters: {
				searchTerm,
				departmentFilter,
				statusFilter,
				page,
				limit
			},
			// RBAC: Standardized permission checks
			...userPermissions,
			canCreateReviews,
			loadedAt: new Date().toISOString()
		};
	} catch (err) {
		console.error('[Employee Directory Load Error]', err);

		// Create standardized error response
		const errorResponse = createErrorResponse(
			err instanceof Error ? err : new Error('Employee directory load failed'),
			{
				type: 'DATA_LOAD_ERROR',
				userMessage:
					'Unable to load employee directory. Please refresh the page or try again later.'
			}
		);

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
