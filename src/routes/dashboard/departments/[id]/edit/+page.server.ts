// Server-side data loading and form handling for department edit page
// Follows RBAC patterns with server-side API calls only

import type { PageServerLoad, Actions } from './$types';
import { error, redirect, fail } from '@sveltejs/kit';
import { PermissionChecks, getUserPermissions } from '$lib/server/rbac-utils';

export const load: PageServerLoad = async (event) => {
	const { params, locals, cookies } = event;
	const departmentId = params.id;

	// RBAC: Check department write permissions
	PermissionChecks.departmentWrite(event);

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
			'[Department Edit] Using Rust GraphQL with session-based auth, user role:',
			locals.user?.role
		);

		// Load department data
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
				variables: { id: departmentId }
			})
		});

		const departmentData = await departmentResponse.json();

		// Check if department exists
		if (!departmentData?.data?.department) {
			error(404, 'Department not found');
		}

		const department = departmentData.data.department;

		// Get manager data if managerId exists
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
								displayName
							}
						}
					`,
					variables: { id: department.managerId }
				})
			});

			const managerData = await managerResponse.json();
			manager = managerData?.data?.user || null;
		}

		// Get active users for department assignment
		// NOTE: Rust GraphQL doesn't support filter parameters, fetch all and filter server-side
		const usersResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
					query GetActiveUsers {
						users(limit: 1000) {
							id
							displayName
							roles {
								id
								name
							}
							isActive
						}
					}
				`
			})
		});

		const usersData = await usersResponse.json();
		const users = (usersData?.data?.users || [])
			.filter((user: any) => user.isActive)
			.map((user: any) => ({
				id: user.id,
				displayName: user.displayName || 'Unknown',
				role: user.roles?.[0]?.name || 'Employee' // Get first role or default to Employee
			}));

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
				manager: manager
			},
			users: users,
			// RBAC: Standardized permission checks
			...userPermissions,
			loadedAt: new Date().toISOString()
		};
	} catch (err) {
		console.error('[Department Edit Load Error]', err);

		// If it's already a SvelteKit error, rethrow it
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Throw SvelteKit error with user-friendly message
		error(500, 'Unable to load department data');
	}
};

export const actions: Actions = {
	default: async (event) => {
		const { request, params, cookies } = event;
		const departmentId = params.id;

		// RBAC: Check department write permissions
		PermissionChecks.departmentWrite(event);

		try {
			const formData = await request.formData();
			const name = formData.get('name')?.toString();
			const description = formData.get('description')?.toString();
			const managerId = formData.get('managerId')?.toString();

			// Basic validation
			if (!name) {
				return fail(400, {
					error: 'Department name is required'
				});
			}

			// Make GraphQL update mutation with session-based authentication
			const { getGraphQLEndpoint } = await import('$lib/server/api-url');
			const graphqlEndpoint = getGraphQLEndpoint();

			// Headers for session-based authentication
			const cookieHeader = request.headers.get('cookie') || '';
			const headers: Record<string, string> = {
				'Content-Type': 'application/json',
				'Cookie': cookieHeader
			};

			// Update department using correct mutation signature with input object
			const updateResponse = await fetch(graphqlEndpoint, {
				method: 'POST',
				headers,
				body: JSON.stringify({
					query: `
						mutation UpdateDepartment($id: UUID!, $input: UpdateDepartmentInput!) {
							updateDepartment(id: $id, input: $input) {
								id
								name
								description
								managerId
								updatedAt
							}
						}
					`,
					variables: {
						id: departmentId,
						input: {
							name,
							description: description || null,
							managerId: managerId || null
						}
					}
				})
			});

			const updateData = await updateResponse.json();

			if (updateData.errors) {
				console.error('[Department Update Error]', updateData.errors);
				return fail(500, {
					error: 'Failed to update department'
				});
			}

			// Redirect to department detail page on success
			redirect(303, `/dashboard/departments/${departmentId}`);
		} catch (err) {
			// If it's a redirect, rethrow it
			if (err && typeof err === 'object' && 'status' in err && (err as any).status === 303) {
				throw err;
			}

			console.error('[Department Update Action Error]', err);
			return fail(500, {
				error: 'Failed to update department'
			});
		}
	}
};
