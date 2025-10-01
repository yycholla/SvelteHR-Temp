// Server-side data loading and form handling for employee edit page
// Follows RBAC patterns with server-side API calls only

import type { PageServerLoad, Actions } from './$types';
import { error, redirect, fail } from '@sveltejs/kit';
import { PermissionChecks, getUserPermissions } from '$lib/server/rbac-utils';

export const load: PageServerLoad = async (event) => {
	const { params, locals, cookies } = event;
	const employeeId = params.id;

	// RBAC: Check employee write permissions
	PermissionChecks.employeeWrite(event);

	// Import required models
	const { createUserSession } = await import('$lib/models/user-session');

	// Ensure user is authenticated
	if (!locals.user) {
		throw error(401, 'Authentication required');
	}

	// Create user session from server locals
	const userSession = createUserSession({
		userId: locals.user.id,
		jwtToken: cookies.get('hr_token') || '',
		roles: [locals.user.role || 'employee'],
		permissions: locals.permissions || [],
		expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
		metadata: {
			userEmail: locals.user.email,
			displayName: locals.user.display_name || locals.user.email
		}
	});

	try {
		// Make direct GraphQL calls to PostGraphile backend
		const { getGraphQLEndpoint } = await import('$lib/server/api-url');
		const graphqlEndpoint = getGraphQLEndpoint();

		// Get JWT token for PostGraphile authentication
		const jwtToken = cookies.get('hr_token') || cookies.get('postgraphile-jwt-token') || '';

		// Decode JWT token to get user context
		let jwtClaims = null;
		if (jwtToken) {
			try {
				const { decodeJWTTokenUnsafe } = await import('$lib/auth/jwt-utils');
				jwtClaims = await decodeJWTTokenUnsafe(jwtToken);
			} catch (error) {
				console.warn('[Employee Edit] Failed to decode JWT:', error);
			}
		}

		// Set up proper headers for PostGraphile with JWT context
		const headers: Record<string, string> = {
			'Content-Type': 'application/json'
		};

		if (jwtClaims) {
			headers['Authorization'] = `Bearer ${jwtToken}`;
			headers['X-JWT-Claims-Role'] = jwtClaims.role || 'employee';
			headers['X-JWT-Claims-User-Id'] = jwtClaims.user_id;
		}

		// Load employee data and departments in parallel
		const [employeeResponse, departmentsResponse] = await Promise.all([
			fetch(graphqlEndpoint, {
				method: 'POST',
				headers,
				body: JSON.stringify({
					query: `
						query GetEmployeeById($id: UUID!) {
							employee: userById(id: $id) {
								id
								displayName
								firstName
								lastName
								email
								role
								hireDate
								isActive
								departmentId
								departmentByDepartmentId {
									id
									name
								}
							}
						}
					`,
					variables: { id: employeeId }
				})
			}),
			fetch(graphqlEndpoint, {
				method: 'POST',
				headers,
				body: JSON.stringify({
					query: `
						query GetDepartments {
							allDepartments(first: 100) {
								nodes {
									id
									name
								}
							}
						}
					`
				})
			})
		]);

		const [employeeData, departmentsData] = await Promise.all([
			employeeResponse.json(),
			departmentsResponse.json()
		]);

		// Check if employee exists
		if (!employeeData?.data?.employee) {
			throw error(404, 'Employee not found');
		}

		const employee = employeeData.data.employee;

		// Get standardized user permissions
		const userPermissions = getUserPermissions(locals);

		// Return server-side loaded data
		return {
			userSession: userSession.toJSON(),
			employee: {
				id: employee.id,
				displayName: employee.displayName,
				firstName: employee.firstName,
				lastName: employee.lastName,
				email: employee.email,
				role: employee.role,
				hireDate: employee.hireDate,
				isActive: employee.isActive,
				departmentId: employee.departmentId,
				department: employee.departmentByDepartmentId
			},
			departments: departmentsData?.data?.allDepartments?.nodes || [],
			// RBAC: Standardized permission checks
			...userPermissions,
			loadedAt: new Date().toISOString()
		};
	} catch (err) {
		console.error('[Employee Edit Load Error]', err);

		// If it's already a SvelteKit error, rethrow it
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Throw SvelteKit error with user-friendly message
		throw error(500, 'Unable to load employee data');
	}
};

export const actions: Actions = {
	default: async (event) => {
		const { request, params, cookies } = event;
		const employeeId = params.id;

		// RBAC: Check employee write permissions
		PermissionChecks.employeeWrite(event);

		try {
			const formData = await request.formData();
			const firstName = formData.get('firstName')?.toString();
			const lastName = formData.get('lastName')?.toString();
			const email = formData.get('email')?.toString();
			const role = formData.get('role')?.toString();
			const hireDate = formData.get('hireDate')?.toString();
			const departmentId = formData.get('departmentId')?.toString();
			const isActive = formData.get('isActive') === 'true';

			// Basic validation
			if (!firstName || !lastName || !email) {
				return fail(400, {
					error: 'First name, last name, and email are required'
				});
			}

			// Make GraphQL update mutation
			const { getGraphQLEndpoint } = await import('$lib/server/api-url');
			const graphqlEndpoint = getGraphQLEndpoint();

			const jwtToken = cookies.get('hr_token') || '';
			let jwtClaims = null;
			if (jwtToken) {
				try {
					const { decodeJWTTokenUnsafe } = await import('$lib/auth/jwt-utils');
					jwtClaims = await decodeJWTTokenUnsafe(jwtToken);
				} catch (error) {
					console.warn('[Employee Update] Failed to decode JWT:', error);
				}
			}

			const headers: Record<string, string> = {
				'Content-Type': 'application/json'
			};

			if (jwtClaims) {
				headers['Authorization'] = `Bearer ${jwtToken}`;
				headers['X-JWT-Claims-Role'] = jwtClaims.role || 'employee';
				headers['X-JWT-Claims-User-Id'] = jwtClaims.user_id;
			}

			const updateResponse = await fetch(graphqlEndpoint, {
				method: 'POST',
				headers,
				body: JSON.stringify({
					query: `
						mutation UpdateEmployee($id: UUID!, $userPatch: UserPatch!) {
							updateUserById(input: { id: $id, userPatch: $userPatch }) {
								user {
									id
									displayName
									firstName
									lastName
									email
									role
									hireDate
									isActive
									departmentId
								}
							}
						}
					`,
					variables: {
						id: employeeId,
						userPatch: {
							firstName,
							lastName,
							email,
							role,
							hireDate: hireDate || null,
							departmentId: departmentId || null,
							isActive
						}
					}
				})
			});

			const updateData = await updateResponse.json();

			if (updateData.errors) {
				console.error('[Employee Update Error]', updateData.errors);
				return fail(500, {
					error: 'Failed to update employee'
				});
			}

			// Redirect to employee detail page on success
			throw redirect(303, `/dashboard/employees/${employeeId}`);
		} catch (err) {
			// If it's a redirect, rethrow it
			if (err && typeof err === 'object' && 'status' in err && (err as any).status === 303) {
				throw err;
			}

			console.error('[Employee Update Action Error]', err);
			return fail(500, {
				error: 'Failed to update employee'
			});
		}
	}
};
