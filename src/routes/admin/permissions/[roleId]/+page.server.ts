// Role Permissions Management - Server-side data loading
// Admin-only page for managing permissions for a specific role

import type { Actions, PageServerLoad } from './$types';
import { logger } from '$lib/utils/logger';
import {
	createUrqlClient,
	executeMutation,
	executeQuery,
	serializeCookies
} from '$lib/graphql/client';
import { PermissionChecks } from '$lib/server/rbac-utils';
import {
	BULK_ASSIGN_PERMISSIONS,
	BULK_REMOVE_PERMISSIONS,
	GET_ALL_PERMISSIONS,
	GET_ROLES_WITH_PERMISSIONS
} from '$lib/graphql/permissions-operations';
import { error, fail } from '@sveltejs/kit';

interface PermissionItem {
	id: string;
	name: string;
}

interface RoleWithPermissions {
	id: string;
	name: string;
	permissions?: PermissionItem[];
}

/**
 * Check if user has admin access permissions (deprecated - use PermissionChecks)
 */
function checkAdminAccess(locals: App.Locals): boolean {
	const userPermissions = locals.permissions || [];
	const userRoles = locals.roles || [];
	return (
		userPermissions.includes('*') ||
		userPermissions.includes('admin:read') ||
		userRoles.includes('system_admin') ||
		userRoles.includes('admin')
	);
}

export const load: PageServerLoad = async (event) => {
	const { params, fetch: fetchFn, cookies } = event;

	// Check authentication and permissions
	PermissionChecks.adminRead(event);

	const roleId = params.roleId;

	if (!roleId) {
		error(400, 'Role ID is required');
	}

	try {
		// Create GraphQL client with server-side fetch (session-based auth)
		const cookieHeader = serializeCookies(cookies);
		const client = createUrqlClient(fetchFn, undefined, undefined, cookieHeader);

		// Execute queries in parallel for optimal performance
		const [rolesData, permissionsData] = await Promise.all([
			executeQuery(client, GET_ROLES_WITH_PERMISSIONS, { limit: 100, offset: 0 }),
			executeQuery(client, GET_ALL_PERMISSIONS, { limit: 200, offset: 0 })
		]);

		// Find the specific role
		const roles = (rolesData?.roles || []) as RoleWithPermissions[];
		const role = roles.find((r) => r.id === roleId);

		logger.info('[ROLE PERMISSIONS] Loading role', { roleId });
		logger.info('[ROLE PERMISSIONS] Found roles', {
			roles: roles.map((r) => ({ id: r.id, name: r.name }))
		});
		logger.info('[ROLE PERMISSIONS] Found role', { role });

		if (!role) {
			logger.error('[ROLE PERMISSIONS] Role not found:', undefined, { roleId });
			error(404, 'Role not found');
		}

		return {
			role,
			permissions: permissionsData?.permissions || []
		};
	} catch (err) {
		logger.error('[ROLE PERMISSIONS] Load error:', err as Error);
		return {
			role: null,
			permissions: [],
			error: 'Failed to load role permissions data'
		};
	}
};

export const actions: Actions = {
	/**
	 * Update permissions for role
	 * This action handles both adding AND removing permissions by comparing current vs desired state
	 */
	updatePermissions: async ({ params, request, fetch: fetchFn, locals, cookies }) => {
		if (!checkAdminAccess(locals)) {
			return fail(403, { error: 'Admin access required' });
		}

		const roleId = params.roleId;
		const formData = await request.formData();
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
			const roles = (rolesData.roles || []) as RoleWithPermissions[];
			const role = roles.find((r) => r.id === roleId);

			if (!role) {
				return fail(404, { error: 'Role not found' });
			}

			// Calculate current permission IDs
			const currentPermissionIds = role.permissions?.map((permission) => permission.id) || [];

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
			logger.error('[UPDATE PERMISSIONS] Error:', err as Error);
			return fail(500, { error: 'Failed to update permissions' });
		}
	}
};
