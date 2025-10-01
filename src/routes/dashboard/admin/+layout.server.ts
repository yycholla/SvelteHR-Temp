// Admin RBAC route guard
// T023: Restrict admin routes to users with admin role only

import type { LayoutServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: LayoutServerLoad = async ({ locals }) => {
	// Check if user is authenticated
	if (!locals.user) {
		throw error(401, 'Authentication required');
	}

	// Check if user has admin role
	const isAdmin = locals.roles?.includes('admin') || locals.user.role === 'admin';

	if (!isAdmin) {
		// Log admin access attempt for audit purposes
		console.warn('[ADMIN ACCESS DENIED]', {
			userId: locals.user.id,
			userEmail: locals.user.email,
			userRole: locals.user.role,
			roles: locals.roles,
			timestamp: new Date().toISOString()
		});

		throw error(403, 'Insufficient permissions - Admin access required');
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
