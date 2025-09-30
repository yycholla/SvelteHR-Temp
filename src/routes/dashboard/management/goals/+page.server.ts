// Simplified server-side data loading for management page
// TODO: Replace with full implementation after fixing GraphQL operations

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async (event) => {
	const { locals } = event;

	// Verify user is authenticated
	if (!locals.user?.id) {
		throw error(401, 'Authentication required');
	}

	// Check if user has manager or admin role
	const hasManagerAccess = locals.roles?.includes('admin') || locals.roles?.includes('manager');
	if (!hasManagerAccess) {
		throw error(403, 'Manager or Admin role required');
	}

	// Return empty data structure for now
	return {
		user: {
			id: locals.user.id,
			email: locals.user.email || '',
			displayName: locals.user.display_name || 'User',
			role: locals.user.role || 'employee'
		},
		permissions: locals.permissions || []
	};
};
