// Admin RBAC route guard
// T023: Restrict admin routes to users with admin role only

import type { LayoutServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: LayoutServerLoad = async ({ locals }) => {
	// Check if user is authenticated
	if (!locals.user) {
		error(401, 'Authentication required');
	}

	// Check if user has admin access permissions
	const userPermissions = locals.permissions || [];
	const userRoles = locals.roles || [];

	// Admin access granted if:
	// 1. User has wildcard (*) or (*:*) permission
	// 2. User has admin:read permission
	// 3. User has Admin role
	const isAdmin =
		userPermissions.includes('*') ||
		userPermissions.includes('*:*') ||
		userPermissions.includes('admin:read') ||
		userRoles.includes('Admin');

	if (!isAdmin) {
		// Log admin access attempt for audit purposes
		console.warn('[ADMIN ACCESS DENIED]', {
			userId: locals.user.id,
			userEmail: locals.user.email,
			roles: userRoles,
			permissions: userPermissions,
			timestamp: new Date().toISOString()
		});

		error(403, 'Insufficient permissions - Admin access required');
	}

	// Log successful admin access
	console.info('[ADMIN ACCESS GRANTED]', {
		userId: locals.user.id,
		userEmail: locals.user.email,
		timestamp: new Date().toISOString()
	});

	// Return admin flag to all child routes
	return {
		isAdmin: true,
		user: locals.user,
		roles: locals.roles || [],
		permissions: locals.permissions || []
	};
};
