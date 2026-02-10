// Server-side data loading for departments page
// Refactored to use DepartmentService (Hexagonal Architecture)

import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { logger } from '$lib/utils/logger';
import { PermissionChecks } from '$lib/server/rbac-utils';
import { RBACDataLoader } from '$lib/server/route-loaders';
import { QueryParamExtractor } from '$lib/server/route-helpers/query-params';
import { createDepartmentService } from '$lib/server/services';

interface UserDTO {
	id: string;
	displayName: string;
	email: string;
	departmentId: string | null;
	roles?: { id: string; name: string }[];
	isActive: boolean;
}

const DEFAULT_MANAGER_TITLE = 'Manager';

export const load: PageServerLoad = async (event) => {
	const { url } = event;

	// Use RBACDataLoader - handles auth, session, permissions automatically
	const loader = new RBACDataLoader(event, [
		'departments:read',
		'departments:read:self',
		'departments:read:team',
		'departments:read:all'
	]);

	return loader.loadWithClient(async (client) => {
		// Use QueryParamExtractor for type-safe URL parameter extraction
		const params = new QueryParamExtractor(url);
		const { page, limit } = params.getPagination(20);

		// Extract all filter parameters
		const filters = {
			searchTerm: params.getString('search'),
			parentFilter: params.getString('parent'),
			hasHeadFilter: params.getString('hasHead')
		};

		logger.info('[Departments] Filters', filters);

		try {
			// Use DepartmentService instead of direct GraphQL
			const service = createDepartmentService(event);

			// Fetch departments using service layer with pagination
			const departmentsResult = await service.getDepartments({ page, limit });

			if (departmentsResult.isError) {
				logger.error('[Departments] Failed to load departments', departmentsResult.error);
				return {
					departments: [],
					users: [],
					totalDepartments: 0,
					hierarchy: [],
					filters: { ...filters, page, limit },
					error: departmentsResult.error.message
				};
			}

			const { departments: departmentDTOs, total } = departmentsResult.value;

			// Still need users for enrichment (manager info, employee counts)
			// This will be replaced when we have UserService
			const GET_USERS_QUERY = `
				query GetUsers {
					users(limit: 1000) {
						id
						displayName
						email
						departmentId
						roles {
							id
							name
						}
						isActive
					}
				}
			`;

			const users = await client.query(
				GET_USERS_QUERY,
				{},
				{
					operationName: 'GetUsers',
					errorMessage: 'Failed to load users',
					dataPath: 'users'
				}
			);

			// Enrich departments with related data
			const enrichedDepartments = departmentDTOs.map((dept) => {
				// Find manager/department head from users list
				const departmentHead = dept.managerId
					? users.find((u: UserDTO) => u.id === dept.managerId)
					: null;

				// Count employees in this department
				const employeesInDept = users.filter((u: UserDTO) => u.departmentId === dept.id);
				const employeeCount = employeesInDept.length;

				// Find parent department
				const parentDepartment = dept.parentId
					? departmentDTOs.find((d) => d.id === dept.parentId)
					: null;

				// Count sub-departments
				const subDepartments = departmentDTOs.filter((d) => d.parentId === dept.id);

				return {
					id: dept.id,
					name: dept.name,
					description: dept.description || '',
					managerId: dept.managerId,
					parentDepartmentId: dept.parentId,
					employees: {
						nodes: employeesInDept,
						totalCount: employeeCount
					},
					departmentHead: departmentHead
						? {
								id: departmentHead.id,
								displayName: departmentHead.displayName,
								email: departmentHead.email,
								jobTitle: departmentHead.roles?.[0]?.name ?? DEFAULT_MANAGER_TITLE
							}
						: null,
					parentDepartment: parentDepartment
						? {
								id: parentDepartment.id,
								name: parentDepartment.name
							}
						: null,
					subDepartments: {
						nodes: subDepartments,
						totalCount: subDepartments.length
					}
				};
			});

			// Return standardized data structure
			return {
				departments: enrichedDepartments,
				users: users.filter((u: UserDTO) => u.isActive),
				totalDepartments: total,
				hierarchy: [],
				filters: {
					...filters,
					page,
					limit
				}
			};
		} catch (error) {
			logger.error(
				'[Departments] Error loading departments',
				error instanceof Error ? error : new Error(String(error))
			);

			return {
				departments: [],
				users: [],
				totalDepartments: 0,
				hierarchy: [],
				filters: { ...filters, page, limit },
				error: 'Failed to load departments. Please try again.'
			};
		}
	});
};

export const actions: Actions = {
	create: async (event) => {
		const { request } = event;

		// RBAC: Check department write permissions
		PermissionChecks.departmentWrite(event);

		try {
			const formData = await request.formData();
			const name = formData.get('name')?.toString();
			const description = formData.get('description')?.toString();
			const managerId = formData.get('managerId')?.toString();

			// Validate required fields
			if (!name) {
				return fail(400, {
					error: 'Department name is required'
				});
			}

			// Use DepartmentService to create department
			const service = createDepartmentService(event);

			// Generate a temporary ID (backend will replace this)
			const tempId = crypto.randomUUID();

			const result = await service.createDepartment({
				id: tempId,
				name,
				description: description || null,
				managerId: managerId || null,
				parentId: null,
				ancestorIds: []
			});

			if (result.isError) {
				logger.error('[Departments] Failed to create department', result.error);
				return fail(500, {
					error: result.error.message
				});
			}

			const newDepartment = result.value;

			logger.info('[Departments] Successfully created department', {
				departmentId: newDepartment.id
			});

			return { success: true, departmentId: newDepartment.id };
		} catch (err: unknown) {
			logger.error(
				'[Departments] Error creating department',
				err instanceof Error ? err : new Error(String(err))
			);

			return fail(500, {
				error: 'Failed to create department. Please try again.'
			});
		}
	}
};
