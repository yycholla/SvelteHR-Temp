// Permissions Management - Server-side data loading
// Admin-only page for managing roles, permissions, and user-role assignments

import type { Actions, PageServerLoad } from './$types';
import {
	createUrqlClient,
	executeMutation,
	executeQuery,
	serializeCookies
} from '$lib/graphql/client';
import { PermissionChecks } from '$lib/server/rbac-utils';
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
import { error, fail } from '@sveltejs/kit';

/**
 * Check if user has admin access permissions
 */
function checkAdminAccess(locals: App.Locals): boolean {
	const userPermissions = locals.permissions || [];
	const userRoles = locals.roles || [];
	return (
		userPermissions.includes('*') ||
		userPermissions.includes('*:*') ||
		userPermissions.includes('admin:read') ||
		userRoles.includes('system_admin') ||
		userRoles.includes('admin')
	);
}

export const load: PageServerLoad = async (event) => {
	const { locals, fetch: fetchFn, cookies } = event;

	// Check authentication and permissions
	PermissionChecks.adminRead(event);

	try {
		// Create GraphQL client with server-side fetch (session-based auth)
		const cookieHeader = serializeCookies(cookies);
		const client = createUrqlClient(fetchFn, undefined, undefined, cookieHeader);

		// Execute queries in parallel for optimal performance
		const [rolesData, permissionsData, usersData] = await Promise.all([
			executeQuery(client, GET_ROLES_WITH_PERMISSIONS, { limit: 100, offset: 0 }),
			executeQuery(client, GET_ALL_PERMISSIONS, { limit: 200, offset: 0 }),
			executeQuery(client, GET_USERS_WITH_ROLES, { limit: 500, offset: 0 })
		]);

		return {
			roles: rolesData?.roles || [],
			permissions: permissionsData?.permissions || [],
			users: usersData?.users || []
		};
	} catch (err) {
		logger.error('[ADMIN PERMISSIONS] Load error:', err as Error);
		return {
			roles: [],
			permissions: [],
			users: [],
			error: 'Failed to load permissions data'
		};
	}
};

export const actions: Actions = {
	/**
	 * Create new role
	 */
	createRole: async ({ request, fetch: fetchFn, locals, cookies }) => {
		if (!checkAdminAccess(locals)) {
			return fail(403, { error: 'Admin access required' });
		}

		const formData = await request.formData();
		const name = formData.get('name') as string;
		const description = formData.get('description') as string;

		if (!name) {
			return fail(400, { error: 'Role name is required' });
		}

		try {
			const cookieHeader = serializeCookies(cookies);
			const client = createUrqlClient(fetchFn, undefined, undefined, cookieHeader);
			await executeMutation(client, CREATE_ROLE, {
				input: { name, description: description || null }
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
	updateRole: async ({ request, fetch: fetchFn, locals, cookies }) => {
		if (!checkAdminAccess(locals)) {
			return fail(403, { error: 'Admin access required' });
		}

		const formData = await request.formData();
		const id = formData.get('id') as string;
		const name = formData.get('name') as string;
		const description = formData.get('description') as string;

		if (!id || !name) {
			return fail(400, { error: 'Role ID and name are required' });
		}

		try {
			const cookieHeader = serializeCookies(cookies);
			const client = createUrqlClient(fetchFn, undefined, undefined, cookieHeader);
			await executeMutation(client, UPDATE_ROLE, {
				input: { id, name, description: description || null }
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
	deleteRole: async ({ request, fetch: fetchFn, locals, cookies }) => {
		if (!checkAdminAccess(locals)) {
			return fail(403, { error: 'Admin access required' });
		}

		const formData = await request.formData();
		const id = formData.get('id') as string;

		if (!id) {
			return fail(400, { error: 'Role ID is required' });
		}

		try {
			const cookieHeader = serializeCookies(cookies);
			const client = createUrqlClient(fetchFn, undefined, undefined, cookieHeader);
			await executeMutation(client, DELETE_ROLE, { input: { id } });

			return { success: true, message: 'Role deleted successfully' };
		} catch (err) {
			logger.error('[DELETE ROLE] Error:', err as Error);
			return fail(500, { error: 'Failed to delete role' });
		}
	},

	/**
	 * Assign permission to role
	 */
	assignPermission: async ({ request, fetch: fetchFn, locals, cookies }) => {
		if (!checkAdminAccess(locals)) {
			return fail(403, { error: 'Admin access required' });
		}

		const formData = await request.formData();
		const roleId = formData.get('roleId') as string;
		const permissionId = formData.get('permissionId') as string;

		if (!roleId || !permissionId) {
			return fail(400, { error: 'Role ID and Permission ID are required' });
		}

		try {
			const cookieHeader = serializeCookies(cookies);
			const client = createUrqlClient(fetchFn, undefined, undefined, cookieHeader);
			await executeMutation(client, ASSIGN_PERMISSION_TO_ROLE, {
				input: { roleId, permissionId }
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
	removePermission: async ({ request, fetch: fetchFn, locals, cookies }) => {
		if (!checkAdminAccess(locals)) {
			return fail(403, { error: 'Admin access required' });
		}

		const formData = await request.formData();
		const roleId = formData.get('roleId') as string;
		const permissionId = formData.get('permissionId') as string;

		if (!roleId || !permissionId) {
			return fail(400, { error: 'Role ID and Permission ID are required' });
		}

		try {
			const cookieHeader = serializeCookies(cookies);
			const client = createUrqlClient(fetchFn, undefined, undefined, cookieHeader);
			await executeMutation(client, REMOVE_PERMISSION_FROM_ROLE, {
				input: { roleId, permissionId }
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
	bulkAssignPermissions: async ({ request, fetch: fetchFn, locals, cookies }) => {
		if (!checkAdminAccess(locals)) {
			return fail(403, { error: 'Admin access required' });
		}

		const formData = await request.formData();
		const roleId = formData.get('roleId') as string;
		const permissionIds = formData.get('permissionIds') as string;

		if (!roleId || !permissionIds) {
			return fail(400, { error: 'Role ID and Permission IDs are required' });
		}

		try {
			const cookieHeader = serializeCookies(cookies);
			const client = createUrqlClient(fetchFn, undefined, undefined, cookieHeader);
			const desiredPermissionIds = JSON.parse(permissionIds) as string[];

			// Get current permissions for the role
			const rolesData = await executeQuery(client, GET_ROLES_WITH_PERMISSIONS, {
				limit: 100,
				offset: 0
			});
			const role = rolesData.roles.find((r: any) => r.id === roleId);

			if (!role) {
				return fail(404, { error: 'Role not found' });
			}

			// Calculate current permission IDs
			const currentPermissionIds = role.permissions?.map((p: any) => p.id) || [];

			// Calculate permissions to add (in desired but not in current)
			const permissionsToAdd = desiredPermissionIds.filter(
				(id) => !currentPermissionIds.includes(id)
			);

			// Calculate permissions to remove (in current but not in desired)
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

			// Create a summary message
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
	bulkRemovePermissions: async ({ request, fetch: fetchFn, locals, cookies }) => {
		if (!checkAdminAccess(locals)) {
			return fail(403, { error: 'Admin access required' });
		}

		const formData = await request.formData();
		const roleId = formData.get('roleId') as string;
		const permissionIds = formData.get('permissionIds') as string;

		if (!roleId || !permissionIds) {
			return fail(400, { error: 'Role ID and Permission IDs are required' });
		}

		try {
			const cookieHeader = serializeCookies(cookies);
			const client = createUrqlClient(fetchFn, undefined, undefined, cookieHeader);
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
	assignRoleToUser: async ({ request, fetch: fetchFn, locals, cookies }) => {
		if (!checkAdminAccess(locals)) {
			return fail(403, { error: 'Admin access required' });
		}

		const formData = await request.formData();
		const userId = formData.get('userId') as string;
		const roleId = formData.get('roleId') as string;

		if (!userId || !roleId) {
			return fail(400, { error: 'User ID and Role ID are required' });
		}

		try {
			const cookieHeader = serializeCookies(cookies);
			const client = createUrqlClient(fetchFn, undefined, undefined, cookieHeader);
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
	removeRoleFromUser: async ({ request, fetch: fetchFn, locals, cookies }) => {
		if (!checkAdminAccess(locals)) {
			return fail(403, { error: 'Admin access required' });
		}

		const formData = await request.formData();
		const userId = formData.get('userId') as string;
		const roleId = formData.get('roleId') as string;

		if (!userId || !roleId) {
			return fail(400, { error: 'User ID and Role ID are required' });
		}

		try {
			const cookieHeader = serializeCookies(cookies);
			const client = createUrqlClient(fetchFn, undefined, undefined, cookieHeader);
			await executeMutation(client, REMOVE_ROLE_FROM_USER, {
				input: { userId, roleId }
			});

			return { success: true, message: 'Role removed from user successfully' };
		} catch (err) {
			logger.error('[REMOVE ROLE FROM USER] Error:', err as Error);
			return fail(500, { error: 'Failed to remove role from user' });
		}
	}
};
