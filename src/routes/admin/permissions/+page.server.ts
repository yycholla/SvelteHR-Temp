// Permissions Management - Server-side data loading
// Admin-only page for managing roles, permissions, and user-role assignments

import type { Actions, PageServerLoad } from './$types';
import { logger } from '$lib/utils/logger';
import { createUrqlClient, executeMutation, executeQuery } from '$lib/graphql/client';
import { RBACDataLoader } from '$lib/server/route-loaders';
import { requireAuth } from '$lib/server/rbac-utils';
import {
	ASSIGN_PERMISSION_TO_ROLE,
	ASSIGN_ROLE_TO_USER,
	BULK_ASSIGN_PERMISSIONS,
	BULK_REMOVE_PERMISSIONS,
	CREATE_ROLE,
	DELETE_ROLE,
	GET_ALL_PERMISSIONS,
	GET_ROLES_WITH_PERMISSIONS,
	GET_USERS_WITH_ROLES,
	REMOVE_PERMISSION_FROM_ROLE,
	REMOVE_ROLE_FROM_USER,
	UPDATE_ROLE
} from '$lib/graphql/permissions-operations';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async (event) => {
	const loader = new RBACDataLoader(event, [
		'admin:read',
		'admin:*',
		'*',
		'*:*',
		'roles:read',
		'permissions:read'
	]);

	return loader.loadWithClient(async (client) => {
		// Execute queries in parallel for optimal performance
		const [rolesData, permissionsData, usersData] = await Promise.all([
			executeQuery(client.getClient(), GET_ROLES_WITH_PERMISSIONS, { limit: 100, offset: 0 }),
			executeQuery(client.getClient(), GET_ALL_PERMISSIONS, { limit: 200, offset: 0 }),
			executeQuery(client.getClient(), GET_USERS_WITH_ROLES, { limit: 500, offset: 0 })
		]);

		return {
			roles: rolesData?.roles || [],
			permissions: permissionsData?.permissions || [],
			users: usersData?.users || []
		};
	});
};

/**
 * Helper: Create GraphQL client for actions with admin auth check
 */
type PermissionActionEvent = Parameters<Actions['createRole']>[0];

function createAdminClient(event: PermissionActionEvent) {
	requireAuth(event, {
		requiredPermissions: ['admin:write', 'admin:*', '*', '*:*', 'roles:write', 'permissions:write']
	});
	const cookieHeader = event.request.headers.get('cookie') || '';
	return createUrqlClient(event.fetch, undefined, undefined, cookieHeader);
}

export const actions: Actions = {
	/**
	 * Create new role
	 */
	createRole: async (event) => {
		const client = createAdminClient(event);
		const formData = await event.request.formData();
		const name = formData.get('name') as string;
		const description = formData.get('description') as string;

		if (!name) {
			return fail(400, { error: 'Role name is required' });
		}

		try {
			const level = Number(formData.get('level') || 25);
			await executeMutation(client, CREATE_ROLE, {
				input: { name, description: description || null, level }
			});
			return { success: true, message: 'Role created successfully' };
		} catch (err) {
			logger.error('[CREATE ROLE] Error:', err as Error);
			return fail(500, { error: 'Failed to create role' });
		}
	},

	/**
	 * Update existing role
	 */
	updateRole: async (event) => {
		const client = createAdminClient(event);
		const formData = await event.request.formData();
		const id = formData.get('id') as string;
		const name = formData.get('name') as string;
		const description = formData.get('description') as string;

		if (!id || !name) {
			return fail(400, { error: 'Role ID and name are required' });
		}

		try {
			await executeMutation(client, UPDATE_ROLE, {
				id,
				input: { name, description: description || null }
			});
			return { success: true, message: 'Role updated successfully' };
		} catch (err) {
			logger.error('[UPDATE ROLE] Error:', err as Error);
			return fail(500, { error: 'Failed to update role' });
		}
	},

	/**
	 * Delete role
	 */
	deleteRole: async (event) => {
		const client = createAdminClient(event);
		const formData = await event.request.formData();
		const id = formData.get('id') as string;

		if (!id) {
			return fail(400, { error: 'Role ID is required' });
		}

		try {
			await executeMutation(client, DELETE_ROLE, { id });
			return { success: true, message: 'Role deleted successfully' };
		} catch (err) {
			logger.error('[DELETE ROLE] Error:', err as Error);
			return fail(500, { error: 'Failed to delete role' });
		}
	},

	/**
	 * Assign permission to role
	 */
	assignPermission: async (event) => {
		const client = createAdminClient(event);
		const formData = await event.request.formData();
		const roleId = formData.get('roleId') as string;
		const permissionId = formData.get('permissionId') as string;

		if (!roleId || !permissionId) {
			return fail(400, { error: 'Role ID and Permission ID are required' });
		}

		try {
			await executeMutation(client, ASSIGN_PERMISSION_TO_ROLE, {
				roleId,
				permissionId
			});
			return { success: true, message: 'Permission assigned successfully' };
		} catch (err) {
			logger.error('[ASSIGN PERMISSION] Error:', err as Error);
			return fail(500, { error: 'Failed to assign permission' });
		}
	},

	/**
	 * Remove permission from role
	 */
	removePermission: async (event) => {
		const client = createAdminClient(event);
		const formData = await event.request.formData();
		const roleId = formData.get('roleId') as string;
		const permissionId = formData.get('permissionId') as string;

		if (!roleId || !permissionId) {
			return fail(400, { error: 'Role ID and Permission ID are required' });
		}

		try {
			await executeMutation(client, REMOVE_PERMISSION_FROM_ROLE, {
				roleId,
				permissionId
			});
			return { success: true, message: 'Permission removed successfully' };
		} catch (err) {
			logger.error('[REMOVE PERMISSION] Error:', err as Error);
			return fail(500, { error: 'Failed to remove permission' });
		}
	},

	/**
	 * Bulk assign permissions to role
	 * This action handles both adding AND removing permissions by comparing current vs desired state
	 */
	bulkAssignPermissions: async (event) => {
		const client = createAdminClient(event);
		const formData = await event.request.formData();
		const roleId = formData.get('roleId') as string;
		const permissionIds = formData.get('permissionIds') as string;

		if (!roleId || !permissionIds) {
			return fail(400, { error: 'Role ID and Permission IDs are required' });
		}

		try {
			const desiredPermissionIds = JSON.parse(permissionIds) as string[];

			// Get current permissions for the role
			const rolesData = await executeQuery(client, GET_ROLES_WITH_PERMISSIONS, {
				limit: 100,
				offset: 0
			});
			const role = rolesData.roles.find((r: { id: string }) => r.id === roleId);

			if (!role) {
				return fail(404, { error: 'Role not found' });
			}

			// Calculate current permission IDs
			const currentPermissionIds = role.permissions?.map((p: { id: string }) => p.id) || [];

			// Calculate permissions to add/remove
			const permissionsToAdd = desiredPermissionIds.filter(
				(id) => !currentPermissionIds.includes(id)
			);
			const permissionsToRemove = currentPermissionIds.filter(
				(id: string) => !desiredPermissionIds.includes(id)
			);

			// Execute mutations in parallel if needed
			const mutations = [];
			if (permissionsToAdd.length > 0) {
				mutations.push(
					executeMutation(client, BULK_ASSIGN_PERMISSIONS, {
						input: { roleId, permissionIds: permissionsToAdd }
					})
				);
			}
			if (permissionsToRemove.length > 0) {
				mutations.push(
					executeMutation(client, BULK_REMOVE_PERMISSIONS, {
						input: { roleId, permissionIds: permissionsToRemove }
					})
				);
			}
			if (mutations.length > 0) {
				await Promise.all(mutations);
			}

			// Create summary message
			const messages = [];
			if (permissionsToAdd.length > 0) {
				messages.push(`${permissionsToAdd.length} permission(s) added`);
			}
			if (permissionsToRemove.length > 0) {
				messages.push(`${permissionsToRemove.length} permission(s) removed`);
			}
			const message = messages.length > 0 ? messages.join(', ') : 'No permissions changed';

			return { success: true, message };
		} catch (err) {
			logger.error('[BULK ASSIGN PERMISSIONS] Error:', err as Error);
			return fail(500, { error: 'Failed to update permissions' });
		}
	},

	/**
	 * Bulk remove permissions from role
	 */
	bulkRemovePermissions: async (event) => {
		const client = createAdminClient(event);
		const formData = await event.request.formData();
		const roleId = formData.get('roleId') as string;
		const permissionIds = formData.get('permissionIds') as string;

		if (!roleId || !permissionIds) {
			return fail(400, { error: 'Role ID and Permission IDs are required' });
		}

		try {
			const permissionIdArray = JSON.parse(permissionIds);
			await executeMutation(client, BULK_REMOVE_PERMISSIONS, {
				input: { roleId, permissionIds: permissionIdArray }
			});
			return { success: true, message: 'Permissions removed successfully' };
		} catch (err) {
			logger.error('[BULK REMOVE PERMISSIONS] Error:', err as Error);
			return fail(500, { error: 'Failed to remove permissions' });
		}
	},

	/**
	 * Assign role to user
	 */
	assignRoleToUser: async (event) => {
		const client = createAdminClient(event);
		const formData = await event.request.formData();
		const userId = formData.get('userId') as string;
		const roleId = formData.get('roleId') as string;

		if (!userId || !roleId) {
			return fail(400, { error: 'User ID and Role ID are required' });
		}

		try {
			await executeMutation(client, ASSIGN_ROLE_TO_USER, {
				input: { userId, roleId }
			});
			return { success: true, message: 'Role assigned to user successfully' };
		} catch (err) {
			logger.error('[ASSIGN ROLE TO USER] Error:', err as Error);
			return fail(500, { error: 'Failed to assign role to user' });
		}
	},

	/**
	 * Remove role from user
	 */
	removeRoleFromUser: async (event) => {
		const client = createAdminClient(event);
		const formData = await event.request.formData();
		const userId = formData.get('userId') as string;
		const roleId = formData.get('roleId') as string;

		if (!userId || !roleId) {
			return fail(400, { error: 'User ID and Role ID are required' });
		}

		try {
			await executeMutation(client, REMOVE_ROLE_FROM_USER, {
				userId,
				roleId
			});
			return { success: true, message: 'Role removed from user successfully' };
		} catch (err) {
			logger.error('[REMOVE ROLE FROM USER] Error:', err as Error);
			return fail(500, { error: 'Failed to remove role from user' });
		}
	}
};
