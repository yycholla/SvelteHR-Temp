// T025: User Management admin page - server-side data loading
// Admin-only page for managing all system users
// Migrated to use EmployeeService (Task 19)

import type { Actions, PageServerLoad } from './$types';
import { error, fail } from '@sveltejs/kit';
import { logger } from '$lib/utils/logger';
import { RBACDataLoader } from '$lib/server/route-loaders';
import { QueryParamExtractor } from '$lib/server/route-helpers';
import { createEmployeeService } from '$lib/server/services';
import type { EmployeeListFilters, EmployeeSortField, SortOrder } from '$domain';

export const load: PageServerLoad = async (event) => {
	// Initialize RBAC loader with required permissions
	const loader = new RBACDataLoader(event, ['admin:read', 'admin:read:all']);

	return loader.loadWithClient(async (client) => {
		const params = new QueryParamExtractor(event.url);
		// Get filter parameters
		const filters = params.getFilters(['role', 'department', 'status']);

		try {
			// Create EmployeeService with authentication context
			const employeeService = createEmployeeService(event);

			// Build EmployeeListFilters from query params
			const serviceFilters: EmployeeListFilters = {
				departmentId: filters.department || undefined,
				isActive:
					filters.status === 'active' ? true : filters.status === 'inactive' ? false : undefined,
				sortBy: 'name' as EmployeeSortField,
				sortOrder: 'asc' as SortOrder,
				limit: 1000, // Fetch large dataset for client-side filtering
				offset: 0
			};

			// Execute service calls in parallel
			const [employeesResult, statsResult, departmentsData] = await Promise.all([
				employeeService.getEmployees(serviceFilters),
				employeeService.getStatistics(),
				// Departments query via GraphQL (not employee data)
				client.query(
					`
					query GetAllDepartments($limit: Int!, $offset: Int!) {
						departments(limit: $limit, offset: $offset) {
							items {
								id
								name
							}
						}
					}
				`,
					{ limit: 100, offset: 0 }
				)
			]);

			if (employeesResult.isError) {
				logger.error('[ADMIN USERS] Employee service error:', employeesResult.error);
				throw error(500, employeesResult.error.message);
			}

			const employeeEntities = employeesResult.value.employees;
			const departments = departmentsData?.departments?.items || [];

			// Build roles list from employee data (collect unique role objects with proper UUIDs)
			const roleMap = new Map<string, { id: string; name: string }>();
			employeeEntities.forEach((emp) => {
				emp.roles.forEach((r) => {
					if (r.id && r.name && !roleMap.has(r.id)) {
						roleMap.set(r.id, { id: r.id, name: r.name });
					}
				});
			});
			const roles = Array.from(roleMap.values());

			// Client-side filtering for role (service doesn't support role filter)
			let filteredEmployees = employeeEntities;
			if (filters.role) {
				filteredEmployees = employeeEntities.filter((emp) =>
					emp.roles.some((r) => r.name === filters.role)
				);
			}

			// Map domain Employee entities to response format
			const users = filteredEmployees.map((emp) => ({
				id: emp.id,
				email: emp.email.value,
				displayName: emp.fullName,
				firstName: emp.name.first,
				lastName: emp.name.last,
				roles: emp.roles.map((r) => ({
					id: r.id,
					name: r.name
				})),
				isActive: emp.isActive,
				createdAt: null, // Not available in domain entity
				updatedAt: null, // Not available in domain entity
				department: emp.departmentId
					? {
							id: emp.departmentId,
							name:
								departments.find((d: { id: string; name: string }) => d.id === emp.departmentId)
									?.name || null
						}
					: null,
				manager: null, // Not available in domain entity
				jobTitle: emp.jobTitle,
				phone: emp.phone,
				mobilePhone: null, // Not available in domain entity
				birthDate: null, // Not available in domain entity
				hireDate: emp.hireDate.value.toISOString()
			}));

			const totalCount = users.length;

			// Get stats from service
			const stats = statsResult.isOk ? statsResult.value : { total: 0, active: 0, inactive: 0 };

			logger.debug('[ADMIN USERS] Loaded users via EmployeeService', {
				totalCount,
				stats,
				rolesCount: roles.length
			});

			return {
				users,
				totalCount,
				departments,
				roles,
				stats,
				pagination: {
					page: 1,
					limit: totalCount, // Effectively no limit
					totalPages: 1
				},
				filters
			};
		} catch (err) {
			// Re-throw SvelteKit errors
			if (err && typeof err === 'object' && 'status' in err) {
				throw err;
			}

			logger.error('[ADMIN USERS] Load error:', err as Error);
			return {
				users: [],
				totalCount: 0,
				departments: [],
				roles: [],
				stats: { total: 0, active: 0, inactive: 0 },
				pagination: { page: 1, limit: 20, totalPages: 0 },
				filters: { role: '', department: '', status: '' },
				error: 'Failed to load users'
			};
		}
	});
};

export const actions: Actions = {
	bulkActivate: async (event) => {
		const { request, locals } = event;

		// Permission check - require Admin or HR Manager role
		if (!locals.user) {
			error(401, 'Unauthorized');
		}

		const userRoles = locals.roles || [];
		const isAdmin = userRoles.includes('Admin') || userRoles.includes('HR Manager');

		if (!isAdmin) {
			error(403, 'Forbidden - Admin or HR Manager role required');
		}

		try {
			const formData = await request.formData();
			const employeeIdsJson = formData.get('employeeIds')?.toString();

			if (!employeeIdsJson) {
				return fail(400, { error: 'No employees selected' });
			}

			const employeeIds: string[] = JSON.parse(employeeIdsJson);

			if (employeeIds.length === 0) {
				return fail(400, { error: 'No employees selected' });
			}

			// Use EmployeeService for bulk activation
			const employeeService = createEmployeeService(event);
			const result = await employeeService.bulkActivate(employeeIds);

			if (result.isError) {
				logger.error('[ADMIN USERS] Bulk activate error:', result.error);
				return fail(500, { error: result.error.message });
			}

			const operationResult = result.value;

			logger.info('[ADMIN USERS] Bulk activation completed', {
				successCount: operationResult.successCount,
				failureCount: operationResult.failureCount,
				totalCount: employeeIds.length
			});

			return {
				success: true,
				successCount: operationResult.successCount,
				failureCount: operationResult.failureCount,
				errors: operationResult.errors
			};
		} catch (err) {
			logger.error('[ADMIN USERS] Bulk activate action error:', err as Error);
			return fail(500, { error: 'Failed to activate employees' });
		}
	},

	bulkDeactivate: async (event) => {
		const { request, locals } = event;

		// Permission check - require Admin or HR Manager role
		if (!locals.user) {
			error(401, 'Unauthorized');
		}

		const userRoles = locals.roles || [];
		const isAdmin = userRoles.includes('Admin') || userRoles.includes('HR Manager');

		if (!isAdmin) {
			error(403, 'Forbidden - Admin or HR Manager role required');
		}

		try {
			const formData = await request.formData();
			const employeeIdsJson = formData.get('employeeIds')?.toString();

			if (!employeeIdsJson) {
				return fail(400, { error: 'No employees selected' });
			}

			const employeeIds: string[] = JSON.parse(employeeIdsJson);

			if (employeeIds.length === 0) {
				return fail(400, { error: 'No employees selected' });
			}

			// Use EmployeeService for bulk deactivation
			const employeeService = createEmployeeService(event);
			const result = await employeeService.bulkDeactivate(employeeIds);

			if (result.isError) {
				logger.error('[ADMIN USERS] Bulk deactivate error:', result.error);
				return fail(500, { error: result.error.message });
			}

			const operationResult = result.value;

			logger.info('[ADMIN USERS] Bulk deactivation completed', {
				successCount: operationResult.successCount,
				failureCount: operationResult.failureCount,
				totalCount: employeeIds.length
			});

			return {
				success: true,
				successCount: operationResult.successCount,
				failureCount: operationResult.failureCount,
				errors: operationResult.errors
			};
		} catch (err) {
			logger.error('[ADMIN USERS] Bulk deactivate action error:', err as Error);
			return fail(500, { error: 'Failed to deactivate employees' });
		}
	}
};
