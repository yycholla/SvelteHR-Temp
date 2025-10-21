// Server-side data loading and form handling for new department creation
// Follows RBAC patterns with server-side API calls only

import type { PageServerLoad, Actions } from './$types';
import { error, redirect, fail } from '@sveltejs/kit';
import { PermissionChecks, getUserPermissions } from '$lib/server/rbac-utils';

export const load: PageServerLoad = async (event) => {
	const { locals, cookies } = event;

	// Ensure user is authenticated
	if (!locals.user) {
		throw error(401, 'Authentication required');
	}

	// RBAC: Check department write permissions
	PermissionChecks.departmentWrite(event);

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
			'[Department New] Using Rust GraphQL with session-based auth, user role:',
			locals.user?.role
		);

		// Load existing departments for parent department dropdown
		const departmentsResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
					query GetDepartments {
						departments(limit: 100) {
							id
							name
							description
						}
					}
				`
			})
		});

		const departmentsData = await departmentsResponse.json();

		if (departmentsData.errors) {
			console.error('[Department New] GraphQL errors:', departmentsData.errors);
		}

		// Load users for department manager dropdown
		const usersResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
					query GetUsers {
						users(limit: 1000) {
							id
							displayName
							email
							role
							isActive
						}
					}
				`
			})
		});

		const usersData = await usersResponse.json();

		if (usersData.errors) {
			console.error('[Department New] Users GraphQL errors:', usersData.errors);
		}

		// Filter to active users only
		const users = (usersData?.data?.users || []).filter((user: any) => user.isActive);

		// Get standardized user permissions
		const userPermissions = getUserPermissions(locals);

		return {
			departments: departmentsData.data?.departments || [],
			users,
			// RBAC: Standardized permission checks (includes user property)
			...userPermissions,
			loadedAt: new Date().toISOString()
		};
	} catch (err) {
		console.error('[Department New] Error loading data:', err);

		// If it's already a SvelteKit error, rethrow it
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, {
			message: 'Failed to load form data. Please try again later.'
		});
	}
};

export const actions: Actions = {
	create: async (event) => {
		const { request, cookies, locals } = event;

		// RBAC: Check department write permissions
		PermissionChecks.departmentWrite(event);

		try {
			const formData = await request.formData();
			const name = formData.get('name')?.toString();
			const description = formData.get('description')?.toString();
			const managerId = formData.get('managerId')?.toString();
			// Note: parentDepartmentId is not yet supported by backend

			// Validate required fields
			if (!name) {
				return fail(400, {
					error: 'Department name is required'
				});
			}

			// Make GraphQL mutation to create department with session-based authentication
			const { getGraphQLEndpoint } = await import('$lib/server/api-url');
			const graphqlEndpoint = getGraphQLEndpoint();

			// Headers for session-based authentication
			const cookieHeader = request.headers.get('cookie') || '';
			const headers: Record<string, string> = {
				'Content-Type': 'application/json',
				'Cookie': cookieHeader
			};

			// Build input object, only including fields supported by backend
			// Note: parentDepartmentId is not supported by CreateDepartmentInput in Rust backend
			const input: any = {
				name,
				description: description || null,
				managerId: managerId || null
			};

			const createResponse = await fetch(graphqlEndpoint, {
				method: 'POST',
				headers,
				body: JSON.stringify({
					query: `
						mutation CreateDepartment($input: CreateDepartmentInput!) {
							createDepartment(input: $input) {
								id
								name
								description
								managerId
							}
						}
					`,
					variables: { input }
				})
			});

			console.log('[Department New] Department creation request sent');

			const createData = await createResponse.json();

			if (createData.errors) {
				console.error('[Department New] GraphQL errors:', createData.errors);
				return fail(500, {
					error: createData.errors[0]?.message || 'Failed to create department'
				});
			}

			const newDepartmentId = createData.data?.createDepartment?.id;

			if (!newDepartmentId) {
				return fail(500, {
					error: 'Department created but ID not returned'
				});
			}

			console.log(`[Department New] Successfully created department with ID: ${newDepartmentId}`);

			// Redirect to the new department detail page with success message
			throw redirect(303, `/dashboard/departments/${newDepartmentId}?success=created`);
		} catch (err: any) {
			console.error('[Department New] Error creating department:', err);

			// If it's a redirect, rethrow it
			if (err.status === 303) {
				throw err;
			}

			return fail(500, {
				error: 'Failed to create department. Please try again.'
			});
		}
	}
};
