// Permissions Management - Server-side data loading
// Admin-only page for managing roles, permissions, and user-role assignments

import type { PageServerLoad, Actions } from './$types';
import { createUrqlClient, executeQuery, executeMutation } from '$lib/graphql/client';
import {
	GET_ROLES_WITH_PERMISSIONS,
	GET_ALL_PERMISSIONS,
	GET_USERS_WITH_ROLES,
	CREATE_ROLE,
	UPDATE_ROLE,
	DELETE_ROLE,
	ASSIGN_PERMISSION_TO_ROLE,
	REMOVE_PERMISSION_FROM_ROLE,
	ASSIGN_ROLE_TO_USER,
	REMOVE_ROLE_FROM_USER,
	BULK_ASSIGN_PERMISSIONS,
	BULK_REMOVE_PERMISSIONS
} from '$lib/graphql/permissions-operations';
import { error, fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, parent, fetch: fetchFn }) => {
	// Get isAdmin flag from parent layout
	const { isAdmin } = await parent();

	if (!isAdmin) {
		throw error(403, 'Admin access required');
	}

	try {
		// Create GraphQL client with server-side fetch (session-based auth)
		const client = createUrqlClient(fetchFn);

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
		console.error('[ADMIN PERMISSIONS] Load error:', err);
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
	createRole: async ({ request, fetch: fetchFn, locals }) => {
		const { isAdmin } = locals;
		if (!isAdmin) {
			return fail(403, { error: 'Admin access required' });
		}

		const formData = await request.formData();
		const name = formData.get('name') as string;
		const description = formData.get('description') as string;

		if (!name) {
			return fail(400, { error: 'Role name is required' });
		}

		try {
			const client = createUrqlClient(fetchFn);
			await executeMutation(client, CREATE_ROLE, {
				input: { name, description: description || null }
			});

			return { success: true, message: 'Role created successfully' };
		} catch (err) {
			console.error('[CREATE ROLE] Error:', err);
			return fail(500, { error: 'Failed to create role' });
		}
	},

	/**
	 * Update existing role
	 */
	updateRole: async ({ request, fetch: fetchFn, locals }) => {
		const { isAdmin } = locals;
		if (!isAdmin) {
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
			const client = createUrqlClient(fetchFn);
			await executeMutation(client, UPDATE_ROLE, {
				input: { id, name, description: description || null }
			});

			return { success: true, message: 'Role updated successfully' };
		} catch (err) {
			console.error('[UPDATE ROLE] Error:', err);
			return fail(500, { error: 'Failed to update role' });
		}
	},

	/**
	 * Delete role
	 */
	deleteRole: async ({ request, fetch: fetchFn, locals }) => {
		const { isAdmin } = locals;
		if (!isAdmin) {
			return fail(403, { error: 'Admin access required' });
		}

		const formData = await request.formData();
		const id = formData.get('id') as string;

		if (!id) {
			return fail(400, { error: 'Role ID is required' });
		}

		try {
			const client = createUrqlClient(fetchFn);
			await executeMutation(client, DELETE_ROLE, { input: { id } });

			return { success: true, message: 'Role deleted successfully' };
		} catch (err) {
			console.error('[DELETE ROLE] Error:', err);
			return fail(500, { error: 'Failed to delete role' });
		}
	},

	/**
	 * Assign permission to role
	 */
	assignPermission: async ({ request, fetch: fetchFn, locals }) => {
		const { isAdmin } = locals;
		if (!isAdmin) {
			return fail(403, { error: 'Admin access required' });
		}

		const formData = await request.formData();
		const roleId = formData.get('roleId') as string;
		const permissionId = formData.get('permissionId') as string;

		if (!roleId || !permissionId) {
			return fail(400, { error: 'Role ID and Permission ID are required' });
		}

		try {
			const client = createUrqlClient(fetchFn);
			await executeMutation(client, ASSIGN_PERMISSION_TO_ROLE, {
				input: { roleId, permissionId }
			});

			return { success: true, message: 'Permission assigned successfully' };
		} catch (err) {
			console.error('[ASSIGN PERMISSION] Error:', err);
			return fail(500, { error: 'Failed to assign permission' });
		}
	},

	/**
	 * Remove permission from role
	 */
	removePermission: async ({ request, fetch: fetchFn, locals }) => {
		const { isAdmin } = locals;
		if (!isAdmin) {
			return fail(403, { error: 'Admin access required' });
		}

		const formData = await request.formData();
		const roleId = formData.get('roleId') as string;
		const permissionId = formData.get('permissionId') as string;

		if (!roleId || !permissionId) {
			return fail(400, { error: 'Role ID and Permission ID are required' });
		}

		try {
			const client = createUrqlClient(fetchFn);
			await executeMutation(client, REMOVE_PERMISSION_FROM_ROLE, {
				input: { roleId, permissionId }
			});

			return { success: true, message: 'Permission removed successfully' };
		} catch (err) {
			console.error('[REMOVE PERMISSION] Error:', err);
			return fail(500, { error: 'Failed to remove permission' });
		}
	},

	/**
	 * Bulk assign permissions to role
	 */
	bulkAssignPermissions: async ({ request, fetch: fetchFn, locals }) => {
		const { isAdmin } = locals;
		if (!isAdmin) {
			return fail(403, { error: 'Admin access required' });
		}

		const formData = await request.formData();
		const roleId = formData.get('roleId') as string;
		const permissionIds = formData.get('permissionIds') as string;

		if (!roleId || !permissionIds) {
			return fail(400, { error: 'Role ID and Permission IDs are required' });
		}

		try {
			const client = createUrqlClient(fetchFn);
			const permissionIdArray = JSON.parse(permissionIds);

			await executeMutation(client, BULK_ASSIGN_PERMISSIONS, {
				input: { roleId, permissionIds: permissionIdArray }
			});

			return { success: true, message: 'Permissions assigned successfully' };
		} catch (err) {
			console.error('[BULK ASSIGN PERMISSIONS] Error:', err);
			return fail(500, { error: 'Failed to assign permissions' });
		}
	},

	/**
	 * Bulk remove permissions from role
	 */
	bulkRemovePermissions: async ({ request, fetch: fetchFn, locals }) => {
		const { isAdmin } = locals;
		if (!isAdmin) {
			return fail(403, { error: 'Admin access required' });
		}

		const formData = await request.formData();
		const roleId = formData.get('roleId') as string;
		const permissionIds = formData.get('permissionIds') as string;

		if (!roleId || !permissionIds) {
			return fail(400, { error: 'Role ID and Permission IDs are required' });
		}

		try {
			const client = createUrqlClient(fetchFn);
			const permissionIdArray = JSON.parse(permissionIds);

			await executeMutation(client, BULK_REMOVE_PERMISSIONS, {
				input: { roleId, permissionIds: permissionIdArray }
			});

			return { success: true, message: 'Permissions removed successfully' };
		} catch (err) {
			console.error('[BULK REMOVE PERMISSIONS] Error:', err);
			return fail(500, { error: 'Failed to remove permissions' });
		}
	},

	/**
	 * Assign role to user
	 */
	assignRoleToUser: async ({ request, fetch: fetchFn, locals }) => {
		const { isAdmin } = locals;
		if (!isAdmin) {
			return fail(403, { error: 'Admin access required' });
		}

		const formData = await request.formData();
		const userId = formData.get('userId') as string;
		const roleId = formData.get('roleId') as string;

		if (!userId || !roleId) {
			return fail(400, { error: 'User ID and Role ID are required' });
		}

		try {
			const client = createUrqlClient(fetchFn);
			await executeMutation(client, ASSIGN_ROLE_TO_USER, {
				input: { userId, roleId }
			});

			return { success: true, message: 'Role assigned to user successfully' };
		} catch (err) {
			console.error('[ASSIGN ROLE TO USER] Error:', err);
			return fail(500, { error: 'Failed to assign role to user' });
		}
	},

	/**
	 * Remove role from user
	 */
	removeRoleFromUser: async ({ request, fetch: fetchFn, locals }) => {
		const { isAdmin } = locals;
		if (!isAdmin) {
			return fail(403, { error: 'Admin access required' });
		}

		const formData = await request.formData();
		const userId = formData.get('userId') as string;
		const roleId = formData.get('roleId') as string;

		if (!userId || !roleId) {
			return fail(400, { error: 'User ID and Role ID are required' });
		}

		try {
			const client = createUrqlClient(fetchFn);
			await executeMutation(client, REMOVE_ROLE_FROM_USER, {
				input: { userId, roleId }
			});

			return { success: true, message: 'Role removed from user successfully' };
		} catch (err) {
			console.error('[REMOVE ROLE FROM USER] Error:', err);
			return fail(500, { error: 'Failed to remove role from user' });
		}
	}
};
