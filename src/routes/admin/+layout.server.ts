// Admin RBAC route guard
// T023: Restrict admin routes to users with admin role only

import type { LayoutServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getAccessTier, AccessTier } from '$lib/server/rbac-utils';
import { logger } from '$lib/utils/logger';

export const load: LayoutServerLoad = async ({ locals }) => {
	// Check if user is authenticated
	if (!locals.user) {
		error(401, 'Authentication required');
	}

	const userRoles = locals.roles || [];
	const tier = getAccessTier(userRoles);

	// Admin pages require ALL tier (admin / hr_manager)
	if (tier < AccessTier.ALL) {
		logger.warn('[ADMIN ACCESS DENIED]', {
			userId: locals.user.id,
			userEmail: locals.user.email,
			roles: userRoles,
			tier,
			timestamp: new Date().toISOString()
		});

		error(403, 'Insufficient permissions - Admin access required');
	}

	logger.info('[ADMIN ACCESS GRANTED]', {
		userId: locals.user.id,
		userEmail: locals.user.email,
		tier,
		timestamp: new Date().toISOString()
	});

	// Return admin flag to all child routes
	return {
		isAdmin: true,
		user: locals.user,
		roles: userRoles,
		permissions: locals.permissions || []
	};
};
