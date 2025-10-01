// Management Routes - Centralized RBAC Authorization
// Requires manager, admin, or super_admin role for all management pages

import type { LayoutServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: LayoutServerLoad = async ({ locals }) => {
	// Check if user is authenticated
	if (!locals.user?.id) {
		throw error(401, 'Authentication required');
	}

	// Check if user has manager or admin role for management pages
	const hasManagerAccess =
		locals.roles?.includes('super_admin') ||
		locals.roles?.includes('admin') ||
		locals.roles?.includes('manager');

	if (!hasManagerAccess) {
		// Log access denial for audit purposes
		console.warn('[MANAGEMENT ACCESS DENIED]', {
			userId: locals.user.id,
			userEmail: locals.user.email,
			userRole: locals.user.role,
			roles: locals.roles,
			timestamp: new Date().toISOString()
		});

		throw error(403, 'Manager or Admin role required');
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
		isAdmin: locals.roles?.includes('super_admin') || locals.roles?.includes('admin') || false,
		user: locals.user,
		roles: locals.roles || [],
		permissions: locals.permissions || []
	};
};
