// Server-side data loading and form handling for new employee creation
// Follows RBAC patterns with server-side API calls only

import type { Actions, PageServerLoad } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { randomUUID } from 'crypto';
import { logger } from '$lib/utils/logger';
import { getUserPermissions, requireAuth } from '$lib/server/rbac-utils';
import { createEmployeeService } from '$lib/server/services';
import type { CreateEmployeeData } from '$domain';

// Constants for routing and success messages
const EMPLOYEE_LIST_ROUTE = '/dashboard/employees';
const SUCCESS_CREATED = 'created';

export const load: PageServerLoad = async (event) => {
	const { cookies } = event;

	// Check authentication and permissions
	// Only users with full employee write access can create new employees
	requireAuth(event, {
		requiredPermissions: ['employees:write:all']
	});

	// After permission check, re-destructure locals with guaranteed user
	const { locals } = event;

	try {
		// Make direct GraphQL calls to Rust GraphQL backend with session-based authentication
		const { getGraphQLEndpoint } = await import('$lib/server/api-url');
		const graphqlEndpoint = getGraphQLEndpoint();

		// Headers for session-based authentication
		// Forward session cookies to Rust GraphQL backend
		const cookieHeader = event.request.headers.get('cookie') || '';
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
			Cookie: cookieHeader // Forward all cookies for session authentication
		};

		logger.info('[Employee New] Using Rust GraphQL with session-based auth', {
			userRoles: locals.roles
		});

		// Load departments for dropdown
		const departmentsResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
					query GetDepartments {
						departments(limit: 100) {
							items {
								id
								name
								description
							}
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
			const errorMsg = departmentsData.errors[0]?.message || 'Failed to load departments';
			logger.error('[Employee New] GraphQL errors', new Error(errorMsg), {
				errors: departmentsData.errors
			});
			error(500, 'Failed to load departments');
		}

		const userPermissions = getUserPermissions(locals);

		return {
			departments: departmentsData.data?.departments?.items || [],
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
	} catch (err: unknown) {
		logger.error('[Employee New] Error loading data:', err as Error);

		// If it's already a SvelteKit error, rethrow it
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		error(500, {
			message: 'Failed to load form data. Please try again later.'
		});
	}
};

export const actions: Actions = {
	default: async (event) => {
		const { request } = event;

		// Check authentication and permissions
		// Only users with full employee write access can create new employees
		requireAuth(event, {
			requiredPermissions: ['employees:write:all']
		});

		try {
			const formData = await request.formData();
			const firstName = formData.get('firstName')?.toString();
			const lastName = formData.get('lastName')?.toString();
			const email = formData.get('email')?.toString();
			const phone = formData.get('phone')?.toString();
			const jobTitle = formData.get('jobTitle')?.toString();
			const departmentId = formData.get('departmentId')?.toString();
			const hireDate = formData.get('hireDate')?.toString();

			// Validate required fields
			if (!firstName || !lastName || !email) {
				return fail(400, {
					error: 'First name, last name, and email are required'
				});
			}

			if (!hireDate) {
				return fail(400, {
					error: 'Hire date is required'
				});
			}

			// Create EmployeeService with authentication context
			const employeeService = createEmployeeService(event);

			// Map form data to CreateEmployeeData interface
			const createData: CreateEmployeeData = {
				id: randomUUID(),
				email,
				firstName,
				lastName,
				hireDate,
				departmentId: departmentId || null,
				jobTitle: jobTitle || null,
				phone: phone || null
			};

			// Call EmployeeService to create employee
			const result = await employeeService.createEmployee(createData);

			// Handle Result type
			if (result.isError) {
				// Map domain errors to form validation errors
				logger.error('[Employee New] Employee creation failed', result.error, {
					errorCode: result.error.code,
					errorMessage: result.error.message
				});

				// Map specific error codes to user-friendly messages
				switch (result.error.code) {
					case 'EMPLOYEE_ALREADY_EXISTS':
						return fail(400, {
							error:
								'An employee with this email address already exists. Please use a different email address.',
							field: 'email'
						});

					case 'INVALID_EMAIL':
						return fail(400, {
							error: 'The email address format is invalid. Please enter a valid email address.',
							field: 'email'
						});

					case 'INVALID_HIRE_DATE':
						return fail(400, {
							error: 'Invalid hire date. Please select a valid date.',
							field: 'hireDate'
						});

					case 'VALIDATION_ERROR': {
						// Type-safe field extraction
						const context = result.error.context;
						let field: string | undefined = undefined;

						if (context && 'field' in context && typeof context.field === 'string') {
							field = context.field;
						}

						return fail(400, {
							error: result.error.message,
							field
						});
					}

					default:
						return fail(500, {
							error: 'Failed to create employee. Please try again.'
						});
				}
			}

			// Success - redirect to employees list
			const employee = result.value;
			logger.info('[Employee New] Successfully created employee via EmployeeService', {
				employeeId: employee.id,
				email: employee.email.value
			});

			throw redirect(303, `${EMPLOYEE_LIST_ROUTE}?success=${SUCCESS_CREATED}`);
		} catch (err) {
			logger.error('[Employee New] Error creating employee:', err as Error);

			// If it's a redirect, rethrow it (this is the successful case)
			if (err && typeof err === 'object' && 'status' in err) {
				const status = (err as { status: number }).status;
				if (status === 303 || status === 302 || status === 301) {
					throw err;
				}
			}

			return fail(500, {
				error: 'Failed to create employee. Please try again.'
			});
		}
	}
};
