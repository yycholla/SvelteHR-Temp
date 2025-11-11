// Server-side data loading for department detail page
// Follows RBAC patterns with server-side API calls only

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { PermissionChecks, getUserPermissions } from '$lib/server/rbac-utils';

export const load: PageServerLoad = async (event) => {
	const { params, locals, cookies } = event;
	const departmentId = params.id;

	// Handle "new" department creation route
	if (departmentId === 'new') {
		// RBAC: Check department write permissions for creating new department
		PermissionChecks.departmentWrite(event);

		if (!locals.user) {
			error(401, 'Authentication required');
		}

		// Get standardized user permissions
		const { getUserPermissions } = await import('$lib/server/rbac-utils');
		const userPermissions = getUserPermissions(locals);

		// Return empty department data for new department form
		return {
			userSession: {
				userId: locals.user.id,
				roles: [locals.user.role || 'employee'],
				permissions: locals.permissions || [],
				isAuthenticated: true,
				expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
				metadata: {
					userEmail: locals.user.email,
					displayName: locals.user.display_name || locals.user.email
				}
			},
			department: null,
			isNewDepartment: true,
			...userPermissions,
			loadedAt: new Date().toISOString()
		};
	}

	// RBAC: Check department read permissions
	PermissionChecks.departmentRead(event);

	// Import required models for standardized error handling
	const { createErrorResponse } = await import('$lib/models/error-response');

	// Ensure user is authenticated
	if (!locals.user) {
		error(401, 'Authentication required');
	}

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
			'[Department Detail] Using Rust GraphQL with session-based auth, user role:',
			locals.user?.role
		);

		// Load department data with Rust GraphQL schema
		// NOTE: Using Rust GraphQL schema - use singular department query with ID
		const departmentResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
					query GetDepartmentById($id: UUID!) {
						department(id: $id) {
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
					id: departmentId
				}
			})
		});

		const departmentData = await departmentResponse.json();
		console.log('[Department Detail] Department data:', departmentData);

		// Check if department exists
		const department = departmentData?.data?.department;
		if (!department) {
			error(404, 'Department not found');
		}

		// Get manager data separately if managerId exists
		// NOTE: Using Rust GraphQL schema - use singular user query with ID
		let manager = null;
		if (department.managerId) {
			const managerResponse = await fetch(graphqlEndpoint, {
				method: 'POST',
				headers,
				body: JSON.stringify({
					query: `
						query GetUserById($id: UUID!) {
							user(id: $id) {
								id
								email
								displayName
								roles {
									id
									name
								}
								hireDate
								isActive
							}
						}
					`,
					variables: {
						id: department.managerId
					}
				})
			});

			const managerData = await managerResponse.json();
			manager = managerData?.data?.user || null;
		}

		// Get employees for this department
		// NOTE: Rust GraphQL doesn't support departmentId filter, so fetch all and filter server-side
		const employeesResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
					query GetAllUsers {
						users(limit: 1000) {
							id
							email
							firstName
							lastName
							displayName
							roles {
								id
								name
							}
							hireDate
							isActive
							departmentId
						}
					}
				`
			})
		});

		const employeesData = await employeesResponse.json();
		const allUsers = employeesData?.data?.users || [];
		// Filter users by department ID server-side
		const employees = allUsers.filter((user: any) => user.departmentId === departmentId);

		// Get standardized user permissions
		const userPermissions = getUserPermissions(locals);

		// Return server-side loaded data
		return {
			userSession: userSession.toJSON(),
			department: {
				id: department.id,
				name: department.name,
				description: department.description,
				managerId: department.managerId,
				parentDepartmentId: department.parentDepartmentId,
				createdAt: department.createdAt,
				updatedAt: department.updatedAt,
				manager: manager,
				employees: employees,
				employeeCount: employees.length
			},
			// RBAC: Standardized permission checks
			...userPermissions,
			loadedAt: new Date().toISOString()
		};
	} catch (err) {
		console.error('[Department Detail Load Error]', err);

		// If it's already a SvelteKit error, rethrow it
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Create standardized error response
		const errorResponse = createErrorResponse(
			err instanceof Error ? err : new Error('Department detail load failed'),
			{
				type: 'DATA_LOAD_ERROR',
				userMessage: 'Unable to load department details. Please refresh the page or try again later.'
			}
		);

		// Throw SvelteKit error with user-friendly message
		error(500, {
        			message: 'Department details temporarily unavailable',
        			details: errorResponse.userMessage
        		});
	}
};
