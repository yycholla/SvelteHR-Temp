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

	// RBAC: Check if user is admin or super_admin
	const userRole = locals.user.role?.toLowerCase().replace('-', '_') || 'employee';
	if (!['super_admin', 'admin', 'hr_manager'].includes(userRole)) {
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

		// RBAC: Check if user is admin or super_admin
		const userRole = locals.user?.role?.toLowerCase().replace('-', '_') || 'employee';
		if (!['super_admin', 'admin', 'hr_manager'].includes(userRole)) {
			return fail(403, {
				error: 'Access denied. Admin privileges required to create employees.'
			});
		}

		try {
			const formData = await request.formData();
			const firstName = formData.get('firstName')?.toString();
			const lastName = formData.get('lastName')?.toString();
			const email = formData.get('email')?.toString();
			const role = formData.get('role')?.toString() || 'employee';
			const departmentId = formData.get('departmentId')?.toString();
			const hireDate = formData.get('hireDate')?.toString();

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

			// Generate a temporary password for the new employee
			// In production, this should trigger a password reset email
			const tempPassword = `Welcome${Math.random().toString(36).slice(2, 10)}!`;

			// Hash the password (using bcrypt would be better, but for now use a simple hash)
			const crypto = await import('crypto');
			const passwordHash = crypto.createHash('sha256').update(tempPassword).digest('hex');

			// Note: Rust GraphQL backend may not have createUser mutation yet
			// TODO: Implement user creation mutation in Rust backend
			const createResponse = await fetch(graphqlEndpoint, {
				method: 'POST',
				headers,
				body: JSON.stringify({
					query: `
						mutation CreateEmployee($firstName: String!, $lastName: String!, $email: String!, $role: String!, $departmentId: UUID, $hireDate: String, $passwordHash: String!) {
							createUser(firstName: $firstName, lastName: $lastName, email: $email, role: $role, departmentId: $departmentId, hireDate: $hireDate, passwordHash: $passwordHash) {
								id
								firstName
								lastName
								email
								role
								hireDate
								departmentId
							}
						}
					`,
					variables: {
						firstName,
						lastName,
						email,
						role,
						departmentId: departmentId || null,
						hireDate: hireDate || new Date().toISOString().split('T')[0],
						passwordHash: passwordHash
					}
				})
			});

			console.log(`[Employee New] Created employee with temporary password: ${tempPassword}`);

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

			const newEmployeeId = createData.data?.createUser?.id;

			if (!newEmployeeId) {
				return fail(500, {
					error: 'Employee created but ID not returned'
				});
			}

			// Redirect to the new employee's profile page
			throw redirect(303, `/dashboard/employees/${newEmployeeId}`);
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
