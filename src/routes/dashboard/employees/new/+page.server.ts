// Server-side data loading and form handling for new employee creation
// Follows RBAC patterns with server-side API calls only

import type { PageServerLoad, Actions } from './$types';
import { error, redirect, fail } from '@sveltejs/kit';
import { getUserPermissions, PermissionChecks } from '$lib/server/rbac-utils';

export const load: PageServerLoad = async (event) => {
	const { locals, cookies } = event;

	// Check authentication and permissions
	PermissionChecks.employeeWrite(event);

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
			'[Employee New] Using Rust GraphQL with session-based auth, user roles:',
			locals.roles
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
			error(500, `Failed to load departments: ${departmentsResponse.statusText}`);
		}

		const departmentsData = await departmentsResponse.json();

		if (departmentsData.errors && departmentsData.errors.length > 0) {
			console.error('[Employee New] GraphQL errors:', departmentsData.errors);
			error(500, 'Failed to load departments');
		}

		const userPermissions = getUserPermissions(locals);

		return {
			departments: departmentsData.data?.departments || [],
			user: {
				id: locals.user.id,
				email: locals.user.email || '',
				displayName: locals.user.display_name || '',
				roles: locals.roles || []
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

		error(500, {
        			message: 'Failed to load form data. Please try again later.'
        		});
	}
};

export const actions: Actions = {
	default: async (event) => {
		const { request, cookies, locals } = event;

		// Check authentication and permissions
		PermissionChecks.employeeWrite(event);

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
			// NOTE: GraphQL schema uses camelCase
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
									roles
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

			// Always parse JSON response to check for GraphQL errors
			// GraphQL can return errors even with HTTP 200, or have detailed errors with HTTP 400/500
			const createData = await createResponse.json();
			console.log('[Employee New] Full response:', JSON.stringify(createData, null, 2));

			if (createData.errors && createData.errors.length > 0) {
				console.error('[Employee New] GraphQL errors:', createData.errors);
				console.error('[Employee New] Full error object:', JSON.stringify(createData.errors, null, 2));

				// Parse GraphQL error to provide user-friendly message
				const errorMessage = createData.errors[0].message || 'Failed to create employee';
				console.error('[Employee New] Error message to parse:', errorMessage);
				let userFriendlyError = errorMessage;

				// Handle common validation errors
				if (errorMessage.toLowerCase().includes('string length') && errorMessage.includes('greater than or equal to')) {
					// Password length validation error - extract the minimum length if possible
					const match = errorMessage.match(/greater than or equal to (\d+)/);
					const minLength = match ? match[1] : '8';
					userFriendlyError = `Password must be at least ${minLength} characters long when provided. Please use a stronger password or leave the field blank.`;
				} else if (errorMessage.toLowerCase().includes('failed to parse')) {
					// Generic parsing error - try to extract useful info
					if (errorMessage.includes('String') && errorMessage.includes('length')) {
						userFriendlyError = 'Password must be at least 8 characters long when provided. Please use a stronger password or leave the field blank.';
					} else {
						userFriendlyError = `Invalid input format: ${errorMessage}`;
					}
				} else if (errorMessage.toLowerCase().includes('duplicate') || errorMessage.toLowerCase().includes('unique') || errorMessage.toLowerCase().includes('already exists')) {
					// Duplicate email or other unique constraint violation
					userFriendlyError = 'An employee with this email address already exists. Please use a different email address.';
				} else if (errorMessage.toLowerCase().includes('invalid') && errorMessage.toLowerCase().includes('email')) {
					// Email validation error
					userFriendlyError = 'The email address format is invalid. Please enter a valid email address.';
				} else if (errorMessage.toLowerCase().includes('required') || errorMessage.toLowerCase().includes('cannot be null')) {
					// Missing required fields
					userFriendlyError = 'Please fill in all required fields (first name, last name, and email address).';
				} else if (errorMessage.toLowerCase().includes('unauthorized') || errorMessage.toLowerCase().includes('permission')) {
					// Permission errors
					userFriendlyError = 'You do not have permission to create employees. Please contact your administrator.';
				} else {
					// If we don't recognize the error, show the backend message directly
					// This is better than showing a generic "Failed to create employee" message
					console.error('[Employee New] Unhandled error pattern, showing raw message');
				}

				return fail(400, {
					error: userFriendlyError
				});
			}

			// Check if we got valid data back
			const newEmployeeId = createData.data?.users?.createUser?.id;

			if (!newEmployeeId) {
				// No errors array but also no data - check HTTP response status
				if (!createResponse.ok) {
					return fail(400, {
						error: `Failed to create employee: ${createResponse.statusText || 'Unknown server error'}`
					});
				}
				return fail(500, {
					error: 'Employee created but ID not returned from server'
				});
			}

			console.log(`[Employee New] Successfully created employee with ID: ${newEmployeeId}`);

			// SvelteKit automatically serializes redirects to JSON for fetch requests
			// and performs actual redirects for traditional form submissions
			throw redirect(303, `/dashboard/employees?success=created`);
		} catch (err: any) {
			console.error('[Employee New] Error creating employee:', err);

			// If it's a redirect, rethrow it (this is the successful case)
			if (err.status === 303 || err.status === 302 || err.status === 301) {
				throw err;
			}

			return fail(500, {
				error: 'Failed to create employee. Please try again.'
			});
		}
	}
};
