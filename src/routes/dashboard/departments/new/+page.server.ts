// Server-side data loading and form handling for new department creation
// Refactored to use DepartmentService (Hexagonal Architecture)

import type { Actions, PageServerLoad } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { logger } from '$lib/utils/logger';
import { RBACDataLoader } from '$lib/server/route-loaders';
import { createDepartmentService } from '$lib/server/services';

export const load: PageServerLoad = async (event) => {
	// Use RBACDataLoader - handles auth, session, permissions automatically
	const loader = new RBACDataLoader(event, [
		'departments:write',
		'departments:write:self',
		'departments:write:team',
		'departments:write:all'
	]);

	return loader.loadWithClient(async (client) => {
		try {
			// Use DepartmentService to fetch departments for parent dropdown
			const service = createDepartmentService(event);
			const departmentsResult = await service.getDepartments({ limit: 100 });

			if (departmentsResult.isError) {
				logger.error('[Department New] Failed to load departments', departmentsResult.error);
				throw error(500, 'Failed to load departments');
			}

			const departments = departmentsResult.value.departments;

			// Get active users for manager dropdown
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
					email: user.email
				}));

			logger.info('[Department New] Form data loaded successfully', {
				departmentsCount: departments.length,
				usersCount: users.length
			});

			return {
				departments,
				users
			};
		} catch (err) {
			logger.error('[Department New Load Error]', err as Error);

			// If it's already a SvelteKit error, rethrow it
			if (err && typeof err === 'object' && 'status' in err) {
				throw err;
			}

			throw error(500, 'Unable to load form data');
		}
	});
};

export const actions: Actions = {
	default: async (event) => {
		const { request, locals } = event;

		// Check authentication
		if (!locals.user?.id) {
			logger.warn('[Department Create] Unauthorized create attempt');
			return fail(401, { error: 'Unauthorized' });
		}

		try {
			const formData = await request.formData();
			const name = formData.get('name')?.toString();
			const description = formData.get('description')?.toString();
			const managerId = formData.get('managerId')?.toString();
			const parentDepartmentId = formData.get('parentDepartmentId')?.toString();

			// Validate required fields
			if (!name) {
				return fail(400, { error: 'Department name is required' });
			}

			// Use DepartmentService to create department
			const service = createDepartmentService(event);
			const result = await service.createDepartment({
				id: crypto.randomUUID(),
				name,
				description: description || undefined,
				managerId: managerId || undefined,
				parentId: parentDepartmentId || undefined
			});

			// Handle domain errors
			if (result.isError) {
				logger.error('[Department Create] Service error', result.error);

				// Map domain errors to user-friendly messages
				const errorCode = result.error.code;
				if (errorCode === 'DEPARTMENT_ALREADY_EXISTS') {
					return fail(400, {
						error: 'A department with this name already exists in the selected parent'
					});
				}
				if (errorCode === 'DEPARTMENT_NOT_FOUND') {
					return fail(404, { error: 'Parent department not found' });
				}
				if (errorCode === 'CIRCULAR_DEPARTMENT_REFERENCE') {
					return fail(400, {
						error: 'Cannot set parent department: would create circular reference'
					});
				}

				// Generic error
				return fail(400, { error: result.error.message });
			}

			const newDepartment = result.value;

			logger.info('[Department Create] Department created successfully', {
				departmentId: newDepartment.id,
				createdBy: locals.user.id
			});

			// Redirect to the new department detail page with success message
			throw redirect(303, `/dashboard/departments/${newDepartment.id}?success=created`);
		} catch (err) {
			// If it's a redirect, rethrow it
			if (err && typeof err === 'object' && 'status' in err && (err as any).status === 303) {
				throw err;
			}

			logger.error('[Department Create Action Error]', err as Error);
			return fail(500, { error: 'Failed to create department' });
		}
	}
};
