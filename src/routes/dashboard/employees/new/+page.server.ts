// Server-side data loading and form handling for new employee creation
// Follows RBAC patterns with server-side API calls only

import type { PageServerLoad, Actions } from './$types';
import { error, redirect, fail } from '@sveltejs/kit';
import { getUserPermissions } from '$lib/server/rbac-utils';

export const load: PageServerLoad = async (event) => {
	const { locals, cookies } = event;

	// Ensure user is authenticated
	if (!locals.user) {
		throw error(401, 'Authentication required');
	}

	// RBAC: Use proper permission checking
	const userPermissions = getUserPermissions(locals);

	// Check if user has employee management permissions
	// This checks for both 'employees:write' permission AND admin/system_admin role
	if (!userPermissions.canManageEmployees) {
		console.log('[Employee New] Access denied. User role:', locals.user.role, 'Permissions:', locals.permissions, 'Roles:', locals.roles);
		throw error(403, 'Access denied. Admin privileges required to create employees.');
	}

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
			'[Employee New] Using Rust GraphQL with session-based auth, user role:',
			locals.user?.role
		);

		// Load departments for dropdown
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

		if (!departmentsResponse.ok) {
			throw error(500, `Failed to load departments: ${departmentsResponse.statusText}`);
		}

		const departmentsData = await departmentsResponse.json();

		if (departmentsData.errors && departmentsData.errors.length > 0) {
			console.error('[Employee New] GraphQL errors:', departmentsData.errors);
			throw error(500, 'Failed to load departments');
		}

		const userPermissions = getUserPermissions(locals);

		return {
			departments: departmentsData.data?.departments || [],
			user: {
				id: locals.user.id,
				email: locals.user.email || '',
				displayName: locals.user.display_name || '',
				role: locals.user.role || 'employee'
			},
			permissions: {
				canViewEmployees: userPermissions.canViewEmployees,
				canManageEmployees: userPermissions.canManageEmployees,
				canViewDepartments: userPermissions.canViewDepartments,
				canManageDepartments: userPermissions.canManageDepartments,
				isAdmin: userPermissions.isAdmin,
				isManager: userPermissions.isManager
			}
		};
	} catch (err: any) {
		console.error('[Employee New] Error loading data:', err);

		// If it's already a SvelteKit error, rethrow it
		if (err.status) {
			throw err;
		}

		throw error(500, {
			message: 'Failed to load form data. Please try again later.'
		});
	}
};

export const actions: Actions = {
	default: async (event) => {
		const { request, cookies, locals } = event;

		// RBAC: Use proper permission checking
		const userPermissions = getUserPermissions(locals);

		if (!userPermissions.canManageEmployees) {
			console.log('[Employee New] Create denied. User role:', locals.user?.role, 'Permissions:', locals.permissions);
			return fail(403, {
				error: 'Access denied. Admin privileges required to create employees.'
			});
		}

		try {
			const formData = await request.formData();
			const firstName = formData.get('firstName')?.toString();
			const lastName = formData.get('lastName')?.toString();
			const email = formData.get('email')?.toString();
			const phone = formData.get('phone')?.toString();
			const jobTitle = formData.get('jobTitle')?.toString();
			const departmentId = formData.get('departmentId')?.toString();
			const hireDate = formData.get('hireDate')?.toString();
			const role = formData.get('role')?.toString() || 'employee';
			const password = formData.get('password')?.toString();

			// Validate required fields
			if (!firstName || !lastName || !email) {
				return fail(400, {
					error: 'First name, last name, and email are required'
				});
			}

			// Make GraphQL mutation to create employee with session-based authentication
			const { getGraphQLEndpoint } = await import('$lib/server/api-url');
			const graphqlEndpoint = getGraphQLEndpoint();

			// Headers for session-based authentication
			const cookieHeader = request.headers.get('cookie') || '';
			const headers: Record<string, string> = {
				'Content-Type': 'application/json',
				'Cookie': cookieHeader
			};

			// Create user via GraphQL mutation
			// Build input object, only including fields that have values
			const input: any = {
				email,
				firstName,
				lastName,
				status: 'active'
			};

			// Only add optional fields if they have values
			if (role) input.role = role;
			if (phone) input.phone = phone;
			if (jobTitle) input.jobTitle = jobTitle;
			if (departmentId) input.departmentId = departmentId;
			if (password) input.password = password;
			if (hireDate) {
				// Ensure hire date is in ISO 8601 format
				input.hireDate = new Date(hireDate).toISOString();
			}

			const createResponse = await fetch(graphqlEndpoint, {
				method: 'POST',
				headers,
				body: JSON.stringify({
					query: `
						mutation CreateEmployee($input: CreateUserInput!) {
							users {
								createUser(input: $input) {
									id
									firstName
									lastName
									email
									role
									hireDate
									departmentId
								}
							}
						}
					`,
					variables: { input }
				})
			});

			console.log('[Employee New] User creation request sent');

			if (!createResponse.ok) {
				console.error('[Employee New] Create failed:', createResponse.statusText);
				return fail(500, {
					error: 'Failed to create employee'
				});
			}

			const createData = await createResponse.json();

			if (createData.errors && createData.errors.length > 0) {
				console.error('[Employee New] GraphQL errors:', createData.errors);
				return fail(500, {
					error: createData.errors[0].message || 'Failed to create employee'
				});
			}

			const newEmployeeId = createData.data?.users?.createUser?.id;

			if (!newEmployeeId) {
				return fail(500, {
					error: 'Employee created but ID not returned'
				});
			}

			console.log(`[Employee New] Successfully created employee with ID: ${newEmployeeId}`);

			// Redirect to the employees list page with success message
			throw redirect(303, `/dashboard/employees?success=created`);
		} catch (err: any) {
			console.error('[Employee New] Error creating employee:', err);

			// If it's a redirect, rethrow it
			if (err.status === 303) {
				throw err;
			}

			return fail(500, {
				error: 'Failed to create employee. Please try again.'
			});
		}
	}
};
