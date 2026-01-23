/**
 * EXAMPLE: Using EmployeeService in SvelteKit Routes
 *
 * This file demonstrates different patterns for using EmployeeService
 * in SvelteKit +page.server.ts files.
 */

import type { PageServerLoad, Actions } from './$types';
import { error, fail } from '@sveltejs/kit';
import { createEmployeeService, createServices } from '$lib/server/services';

// ====================================================================
// PATTERN 1: Direct service creation (simplest)
// ====================================================================

export const load: PageServerLoad = async (event) => {
	const employeeService = createEmployeeService(event);

	const result = await employeeService.getEmployees({
		isActive: true,
		departmentId: event.url.searchParams.get('department') || undefined
	});

	if (result.isError) {
		throw error(500, result.error.message);
	}

	return {
		employees: result.value
	};
};

// ====================================================================
// PATTERN 2: Using ServiceContainer (when you need multiple services)
// ====================================================================

export const loadWithContainer: PageServerLoad = async (event) => {
	const services = createServices(event);

	// Access multiple services from the same container
	const employeesResult = await services.employeeService.getEmployees();
	// Future: const departmentsResult = await services.departmentService.getDepartments();

	if (employeesResult.isError) {
		throw error(500, employeesResult.error.message);
	}

	return {
		employees: employeesResult.value
	};
};

// ====================================================================
// PATTERN 3: With RBAC (combining with RBACDataLoader)
// ====================================================================

import { RBACDataLoader } from '$lib/server/route-loaders';

export const loadWithRBAC: PageServerLoad = async (event) => {
	// First, ensure user has permissions
	const loader = new RBACDataLoader(event, ['employees:read']);

	return loader.loadWithClient(async (client) => {
		// Now create service (authenticated via event cookies)
		const employeeService = createEmployeeService(event);

		const result = await employeeService.getEmployees({ isActive: true });

		if (result.isError) {
			throw error(500, result.error.message);
		}

		return {
			employees: result.value
		};
	});
};

// ====================================================================
// PATTERN 4: Form actions (create/update/delete)
// ====================================================================

export const actions: Actions = {
	create: async (event) => {
		const employeeService = createEmployeeService(event);
		const formData = await event.request.formData();

		const result = await employeeService.createEmployee({
			email: formData.get('email') as string,
			firstName: formData.get('firstName') as string,
			lastName: formData.get('lastName') as string,
			hireDate: formData.get('hireDate') as string,
			departmentId: formData.get('departmentId') as string,
			jobTitle: formData.get('jobTitle') as string,
			phone: formData.get('phone') as string
		});

		if (result.isError) {
			// Handle specific domain errors
			if (result.error.code === 'EMPLOYEE_ALREADY_EXISTS') {
				return fail(409, {
					error: 'An employee with this email already exists'
				});
			}

			if (result.error.code === 'INVALID_EMAIL') {
				return fail(400, {
					error: 'Invalid email address',
					field: 'email'
				});
			}

			return fail(500, {
				error: result.error.message
			});
		}

		return {
			success: true,
			employee: result.value
		};
	},

	update: async (event) => {
		const employeeService = createEmployeeService(event);
		const formData = await event.request.formData();
		const id = event.params.id;

		if (!id) {
			return fail(400, { error: 'Employee ID is required' });
		}

		const result = await employeeService.updateEmployee(id, {
			jobTitle: formData.get('jobTitle') as string,
			phone: formData.get('phone') as string,
			departmentId: formData.get('departmentId') as string
		});

		if (result.isError) {
			if (result.error.code === 'EMPLOYEE_NOT_FOUND') {
				return fail(404, { error: 'Employee not found' });
			}

			return fail(500, { error: result.error.message });
		}

		return {
			success: true,
			employee: result.value
		};
	},

	delete: async (event) => {
		const employeeService = createEmployeeService(event);
		const formData = await event.request.formData();
		const id = formData.get('id') as string;

		if (!id) {
			return fail(400, { error: 'Employee ID is required' });
		}

		const result = await employeeService.deleteEmployee(id);

		if (result.isError) {
			if (result.error.code === 'EMPLOYEE_NOT_FOUND') {
				return fail(404, { error: 'Employee not found' });
			}

			return fail(500, { error: result.error.message });
		}

		return { success: true };
	}
};

// ====================================================================
// PATTERN 5: API endpoint (src/routes/api/employees/+server.ts)
// ====================================================================

import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

export const GET: RequestHandler = async (event) => {
	const employeeService = createEmployeeService(event);

	const result = await employeeService.getEmployees();

	if (result.isError) {
		return json({ error: result.error.message }, { status: 500 });
	}

	return json({ employees: result.value });
};

export const POST: RequestHandler = async (event) => {
	const employeeService = createEmployeeService(event);
	const data = await event.request.json();

	const result = await employeeService.createEmployee(data);

	if (result.isError) {
		const status = result.error.code === 'EMPLOYEE_ALREADY_EXISTS' ? 409 : 400;
		return json({ error: result.error.message }, { status });
	}

	return json({ employee: result.value }, { status: 201 });
};

// ====================================================================
// PATTERN 6: Detail page with error handling
// ====================================================================

export const loadEmployeeDetail: PageServerLoad = async (event) => {
	const employeeService = createEmployeeService(event);
	const { id } = event.params;

	if (!id) {
		throw error(400, 'Employee ID is required');
	}

	const result = await employeeService.getEmployeeById(id);

	if (result.isError) {
		// Handle specific domain errors
		if (result.error.code === 'EMPLOYEE_NOT_FOUND') {
			throw error(404, 'Employee not found');
		}

		throw error(500, 'Failed to load employee details');
	}

	return {
		employee: result.value
	};
};
