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
			includeInactive: userSession.roles.includes('hr_manager') || userSession.roles.includes('hr_admin')
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
		// Make direct GraphQL calls to PostGraphile backend - simplified without JWT
		const { getGraphQLEndpoint } = await import('$lib/server/api-url');
		const graphqlEndpoint = getGraphQLEndpoint();

		// Simple headers without JWT authentication
		const headers: Record<string, string> = {
			'Content-Type': 'application/json'
		};

		console.log('[Employee Directory] Using simplified table-based RBAC, user role:', locals.user?.role);
		console.log('[Employee Directory] Filters:', { searchTerm, departmentFilter, statusFilter });

		// Build filter condition based on query parameters
		const condition: any = {};

		if (departmentFilter) {
			condition.departmentId = departmentFilter;
		}

		if (statusFilter === 'active') {
			condition.isActive = true;
		} else if (statusFilter === 'inactive') {
			condition.isActive = false;
		}

		// Note: searchTerm filtering will be done client-side for now
		// PostGraphile doesn't support LIKE queries easily in conditions

		// Load employee directory data with department relationships
		const employeesResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
					query GetEmployeesWithDepartments($first: Int, $after: Cursor, $condition: UserCondition) {
						allUsers(first: $first, after: $after, condition: $condition) {
							nodes {
								id
								email
								displayName
								role
								departmentId
								isActive
								hireDate
								createdAt
								updatedAt
								departmentByDepartmentId {
									id
									name
									description
									managerId
									userByManagerId {
										id
										displayName
										email
										role
									}
								}
							}
							pageInfo {
								hasNextPage
								hasPreviousPage
								startCursor
								endCursor
							}
							totalCount
						}
					}
				`,
				variables: {
					first: limit,
					after: null,
					condition: Object.keys(condition).length > 0 ? condition : null
				}
			})
		});

		const employeesData = await employeesResponse.json();
		console.log('[Employee Directory] Employees data:', employeesData);

		// Employees data is already properly formatted
		let employees = employeesData?.data?.allUsers?.nodes || [];

		// Client-side filtering for search term (since PostGraphile doesn't support LIKE easily)
		if (searchTerm) {
			const searchLower = searchTerm.toLowerCase();
			employees = employees.filter((emp: any) => {
				const displayName = emp.displayName?.toLowerCase() || '';
				const email = emp.email?.toLowerCase() || '';
				const role = emp.role?.toLowerCase() || '';
				return (
					displayName.includes(searchLower) ||
					email.includes(searchLower) ||
					role.includes(searchLower)
				);
			});
		}

		// Load departments data
		const departmentsResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				query: `
					query GetDepartments($first: Int) {
						allDepartments(first: $first) {
							nodes {
								id
								name
								description
							}
						}
					}
				`,
				variables: {
					first: 100
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
			departments: departmentsData?.data?.allDepartments?.nodes || [],
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
