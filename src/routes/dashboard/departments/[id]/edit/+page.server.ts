// Server-side data loading and form handling for department edit page
// Refactored to use DepartmentService (Hexagonal Architecture)

import type { Actions, PageServerLoad } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { logger } from '$lib/utils/logger';
import { RBACDataLoader } from '$lib/server/route-loaders';
import { createDepartmentService } from '$lib/server/services';

export const load: PageServerLoad = async (event) => {
	const { params } = event;

	// Use RBACDataLoader - handles auth, session, permissions automatically
	const loader = new RBACDataLoader(event, [
		'departments:write',
		'departments:write:self',
		'departments:write:team',
		'departments:write:all'
	]);

	return loader.loadWithClient(async (client) => {
		try {
			// Use DepartmentService to fetch department entity
			const service = createDepartmentService(event);
			const departmentResult = await service.getDepartmentById(params.id);

			// Handle department not found
			if (departmentResult.isError) {
				logger.error('[Department Edit] Department not found', departmentResult.error);
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

			const timestampsData = await client.query(
				GET_DEPARTMENT_TIMESTAMPS_QUERY,
				{ id: params.id },
				{
					operationName: 'GetDepartmentTimestamps',
					errorMessage: 'Failed to load department timestamps'
				}
			);

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
							displayName
						}
					}
				`;

				const managerData = await client.query(
					GET_USER_QUERY,
					{ id: departmentDTO.managerId },
					{
						operationName: 'GetUserById',
						errorMessage: 'Failed to load manager data'
					}
				);

				if (managerData?.user) {
					manager = managerData.user;
				}
			}

			// Get active users for department assignment
			// TODO: Replace with UserService when available
			const GET_ACTIVE_USERS_QUERY = `
				query GetActiveUsers {
					users(limit: 1000) {
						id
						displayName
						roles {
							id
							name
						}
						isActive
					}
				}
			`;

			const usersData = await client.query(
				GET_ACTIVE_USERS_QUERY,
				{},
				{
					operationName: 'GetActiveUsers',
					errorMessage: 'Failed to load users'
				}
			);

			const allUsers = usersData?.users || [];
			const users = allUsers
				.filter((user: any) => user.isActive)
				.map((user: any) => ({
					id: user.id,
					displayName: user.displayName || 'Unknown',
					role: user.role || 'Employee'
				}));

			logger.info('[Department Edit] Department loaded successfully', {
				departmentId: params.id,
				hasManager: !!manager,
				availableUsersCount: users.length
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
					manager
				},
				users
			};
		} catch (err) {
			logger.error('[Department Edit Load Error]', err as Error);

			// If it's already a SvelteKit error, rethrow it
			if (err && typeof err === 'object' && 'status' in err) {
				throw err;
			}

			// Throw generic error
			throw error(500, 'Unable to load department data');
		}
	});
};

export const actions: Actions = {
	default: async (event) => {
		const { request, params, locals } = event;

		// Check authentication
		if (!locals.user?.id) {
			logger.warn('[Department Update] Unauthorized update attempt');
			return fail(401, { error: 'Unauthorized' });
		}

		try {
			const formData = await request.formData();
			const name = formData.get('name')?.toString();
			const description = formData.get('description')?.toString();
			const managerId = formData.get('managerId')?.toString();

			// Basic validation
			if (!name) {
				return fail(400, { error: 'Department name is required' });
			}

			// Use DepartmentService to update department
			const service = createDepartmentService(event);
			const result = await service.updateDepartment(params.id, {
				name,
				description: description || null,
				managerId: managerId || null
			});

			// Handle domain errors
			if (result.isError) {
				logger.error('[Department Update] Service error', result.error);

				// Map domain errors to user-friendly messages
				const errorCode = result.error.code;
				if (errorCode === 'DEPARTMENT_NOT_FOUND') {
					return fail(404, { error: 'Department not found' });
				}
				if (errorCode === 'DEPARTMENT_ALREADY_EXISTS') {
					return fail(400, { error: 'A department with this name already exists' });
				}
				if (errorCode === 'CIRCULAR_DEPARTMENT_REFERENCE') {
					return fail(400, {
						error: 'Cannot set parent department: would create circular reference'
					});
				}

				// Generic error
				return fail(400, { error: result.error.message });
			}

			logger.info('[Department Update] Department updated successfully', {
				departmentId: params.id,
				updatedBy: locals.user.id
			});

			// Redirect to department detail page on success
			throw redirect(303, `/dashboard/departments/${params.id}`);
		} catch (err) {
			// If it's a redirect, rethrow it
			if (err && typeof err === 'object' && 'status' in err && (err as any).status === 303) {
				throw err;
			}

			logger.error('[Department Update Action Error]', err as Error);
			return fail(500, { error: 'Failed to update department' });
		}
	}
};
