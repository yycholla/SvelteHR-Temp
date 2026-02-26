// Management Routes - Centralized RBAC Authorization
// Requires manager role or above for all management pages

import type { LayoutServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getAccessTier, AccessTier } from '$lib/server/rbac-utils';
import { logger } from '$lib/utils/logger';

export const load: LayoutServerLoad = async ({ locals }) => {
	// Check if user is authenticated
	if (!locals.user?.id) {
		error(401, 'Authentication required');
	}

	const userRoles = locals.roles || [];
	const tier = getAccessTier(userRoles);

	// Management pages require at least TEAM tier (manager+)
	if (tier < AccessTier.TEAM) {
		logger.warn('[MANAGEMENT ACCESS DENIED]', {
			userId: locals.user.id,
			userEmail: locals.user.email,
			roles: userRoles,
			tier,
			timestamp: new Date().toISOString()
		});

		error(403, 'Management access required - Manager role or above required');
	}

	logger.info('[MANAGEMENT ACCESS GRANTED]', {
		userId: locals.user.id,
		userEmail: locals.user.email,
		roles: userRoles,
		tier,
		timestamp: new Date().toISOString()
	});

	// Return common data for all management child pages
	return {
		hasManagerAccess: true,
		isAdmin: tier >= AccessTier.ALL,
		isManager: tier >= AccessTier.TEAM,
		user: locals.user,
		roles: userRoles,
		permissions: locals.permissions || []
	};
};
