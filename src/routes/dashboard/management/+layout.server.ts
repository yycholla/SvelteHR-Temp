// Management Routes - Centralized RBAC Authorization
// Requires manager role or above (manager, hr_manager, system_admin, admin) for all management pages

import type { LayoutServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { logger } from '$lib/utils/logger';

export const load: LayoutServerLoad = async ({ locals }) => {
	// Check if user is authenticated
	if (!locals.user?.id) {
		error(401, 'Authentication required');
	}

	// Check if user has management access permissions
	const userPermissions = locals.permissions || [];
	const userRoles = locals.roles || [];

	// Management access granted to:
	// 1. Admin role
	// 2. Manager role
	// 3. HR Manager role
	// 4. Users with wildcard (*) or (*:*) permission
	// 5. Users with management:read permission
	const hasManagerAccess =
		userPermissions.includes('*') ||
		userPermissions.includes('*:*') ||
		userPermissions.includes('management:read') ||
		userRoles.includes('Admin') ||
		userRoles.includes('Manager') ||
		userRoles.includes('HR Manager');

	if (!hasManagerAccess) {
		// Log access denial for audit purposes
		logger.warn('[MANAGEMENT ACCESS DENIED]', {
			userId: locals.user.id,
			userEmail: locals.user.email,
			roles: userRoles,
			permissions: userPermissions,
			timestamp: new Date().toISOString()
		});

		error(403, 'Management access required - Manager role or above required');
	}

	// Log successful management access
	logger.info('[MANAGEMENT ACCESS GRANTED]', {
		userId: locals.user.id,
		userEmail: locals.user.email,
		roles: locals.roles,
		timestamp: new Date().toISOString()
	});

	// Return common data for all management child pages
	return {
		hasManagerAccess: true,
		isAdmin: userRoles.includes('Admin'),
		isManager:
			userRoles.includes('Manager') ||
			userRoles.includes('HR Manager') ||
			userRoles.includes('Admin'),
		user: locals.user,
		roles: userRoles,
		permissions: userPermissions
	};
};
