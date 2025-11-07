// Management Routes - Centralized RBAC Authorization
// Requires manager role or above (manager, hr_manager, system_admin, admin) for all management pages

import type { LayoutServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: LayoutServerLoad = async ({ locals }) => {
	// Check if user is authenticated
	if (!locals.user?.id) {
		error(401, 'Authentication required');
	}

	// Check if user has management access permissions
	const userPermissions = locals.permissions || [];
	const userRoles = locals.roles || [];

	// Management access granted to:
	// 1. system_admin role
	// 2. manager role
	// 3. hr_manager role
	// 4. Users with wildcard (*) or (*:*) permission
	// 5. Users with management:read permission
	const hasManagerAccess =
		userPermissions.includes('*') ||
		userPermissions.includes('*:*') ||
		userPermissions.includes('management:read') ||
		userRoles.includes('system_admin') ||
		userRoles.includes('manager') ||
		userRoles.includes('hr_manager') ||
		userRoles.includes('admin') ||
		locals.user.role === 'system_admin' ||
		locals.user.role === 'manager' ||
		locals.user.role === 'hr_manager';

	if (!hasManagerAccess) {
		// Log access denial for audit purposes
		console.warn('[MANAGEMENT ACCESS DENIED]', {
			userId: locals.user.id,
			userEmail: locals.user.email,
			userRole: locals.user.role,
			roles: userRoles,
			permissions: userPermissions,
			timestamp: new Date().toISOString()
		});

		error(403, 'Management access required - Manager role or above required');
	}

	// Log successful management access
	console.info('[MANAGEMENT ACCESS GRANTED]', {
		userId: locals.user.id,
		userEmail: locals.user.email,
		roles: locals.roles,
		timestamp: new Date().toISOString()
	});

	// Return common data for all management child pages
	return {
		hasManagerAccess: true,
		isAdmin:
			userRoles.includes('system_admin') ||
			userRoles.includes('admin') ||
			userRoles.includes('super_admin'),
		isManager:
			userRoles.includes('manager') ||
			userRoles.includes('hr_manager') ||
			userRoles.includes('system_admin') ||
			userRoles.includes('admin'),
		user: locals.user,
		roles: userRoles,
		permissions: userPermissions
	};
};
