// Server-side data loading for department detail page
// Refactored to use DepartmentService (Hexagonal Architecture)

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { logger } from '$lib/utils/logger';
import { getUserPermissions, requireAuth } from '$lib/server/rbac-utils';
import { RBACDataLoader } from '$lib/server/route-loaders';
import { createDepartmentService } from '$lib/server/services';

export const load: PageServerLoad = async (event) => {
	const { params, cookies } = event;
	const departmentId = params.id;

	// Handle "new" department creation route
	if (departmentId === 'new') {
		// RBAC: Check department write permissions for creating new department
		requireAuth(event, {
			requiredPermissions: [
				'departments:write',
				'departments:write:self',
				'departments:write:team',
				'departments:write:all'
			]
		});

		// After permission check, re-destructure locals with guaranteed user
		const { locals } = event;

		// Get standardized user permissions
		const userPermissions = getUserPermissions(locals);

		// Return empty department data for new department form
		return {
			userSession: {
				userId: locals.user.id,
				roles: [locals.user.role || 'employee'],
				permissions: locals.permissions || [],
				isAuthenticated: true,
				expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
				metadata: {
					userEmail: locals.user.email,
					displayName: locals.user.display_name || locals.user.email
				}
			},
			department: null,
			isNewDepartment: true,
			...userPermissions,
			loadedAt: new Date().toISOString()
		};
	}

	// Use RBACDataLoader - handles auth, session, permissions automatically
	const loader = new RBACDataLoader(event, [
		'departments:read',
		'departments:read:self',
		'departments:read:team',
		'departments:read:all'
	]);

	return loader.loadWithClient(async (client) => {
		try {
			// Use DepartmentService to fetch department entity
			const service = createDepartmentService(event);
			const departmentResult = await service.getDepartmentById(departmentId);

			// Handle department not found
			if (departmentResult.isError) {
				logger.error('[Department Detail] Department not found', departmentResult.error);
				throw error(404, 'Department not found');
			}

			const dept = departmentResult.value;

			// Convert to DTO for serialization
			const departmentDTO = dept.toDTO();

			// Fetch raw GraphQL data for timestamps (not in domain entity)
			const GET_DEPARTMENT_TIMESTAMPS_QUERY = `
				query GetDepartmentTimestamps($id: UUID!) {
					department(id: $id) {
						createdAt
						updatedAt
					}
				}
			`;

			const timestampsData = await client.query<{
				department?: { createdAt: string; updatedAt: string } | null;
			}>(GET_DEPARTMENT_TIMESTAMPS_QUERY, { id: departmentId });

			const timestamps = timestampsData?.department || {
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			};

			// Get manager data if managerId exists
			// TODO: Replace with UserService when available
			let manager = null;
			if (departmentDTO.managerId) {
				const GET_USER_QUERY = `
					query GetUserById($id: UUID!) {
						user(id: $id) {
							id
							email
							displayName
							firstName
							lastName
							roles {
								id
								name
							}
							hireDate
							isActive
						}
					}
				`;

				const managerData = await client.query<{ user?: unknown | null }>(GET_USER_QUERY, {
					id: departmentDTO.managerId
				});

				if (managerData?.user) {
					manager = managerData.user;
				}
			}

			// Get employees for this department
			// TODO: Replace with UserService when available
			// NOTE: Backend doesn't support departmentId filter, so fetch all and filter server-side
			const GET_USERS_QUERY = `
				query GetAllUsers {
					users(limit: 1000) {
						id
						email
						firstName
						lastName
						displayName
						roles {
							id
							name
						}
						hireDate
						isActive
						departmentId
					}
				}
			`;

			const usersData = await client.query<{ users?: any[] }>(GET_USERS_QUERY, {});
			const allUsers = usersData?.users || [];
			const employees = allUsers.filter((user: any) => user.departmentId === departmentId);

			logger.info('[Department Detail] Department loaded successfully', {
				departmentId,
				hasManager: !!manager,
				employeeCount: employees.length
			});

			// Return server-side loaded data
			return {
				department: {
					id: departmentDTO.id,
					name: departmentDTO.name,
					description: departmentDTO.description,
					managerId: departmentDTO.managerId,
					parentDepartmentId: departmentDTO.parentId,
					createdAt: timestamps.createdAt,
					updatedAt: timestamps.updatedAt,
					manager,
					employees,
					employeeCount: employees.length
				}
			};
		} catch (err) {
			logger.error('[Department Detail Load Error]', err as Error);

			// If it's already a SvelteKit error, rethrow it
			if (err && typeof err === 'object' && 'status' in err) {
				throw err;
			}

			// Throw generic error
			throw error(500, 'Department details temporarily unavailable');
		}
	});
};
