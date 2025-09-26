// Server-side data loading for dashboard page
// T055: Error Handling Standardization - CRITICAL

import type { PageServerLoad } from './$types';
import { redirect, error } from '@sveltejs/kit';
import { PermissionChecks, getUserPermissions } from '$lib/server/rbac-utils';
import { getCompleteDashboardData } from '$lib/graphql/dashboard-operations';
import { checkPermissions } from '$lib/server/load-helpers.js';
import { createStandardError } from '$lib/utils/error-handling.js';

// Standardized dashboard load function with comprehensive error handling
export const load: PageServerLoad = async (event) => {
	const { locals } = event;

	// Check authentication
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	// Check dashboard access permissions
	if (!checkPermissions(locals.permissions, ['dashboard:read'])) {
		throw error(403, 'Insufficient permissions to access dashboard');
	}

	try {
		// Debug user object
		console.log('🔍 Dashboard load - user object:', JSON.stringify(locals.user, null, 2));
		console.log('🔍 Dashboard load - user.id:', locals.user.id);
		console.log('🔍 Dashboard load - user.role:', locals.user.role);

		// Load dashboard data using standardized operations
		const userRole = locals.user.role || 'employee';
		const userId = locals.user.id || '1'; // Fallback to '1' if undefined
		const dashboardData = await getCompleteDashboardData(userId, userRole);

		// Get standardized user permissions
		const userPermissions = getUserPermissions(locals);

		return {
			user: userPermissions.user,
			dashboardData,
			// RBAC: Standardized permission checks
			...userPermissions,
			loadedAt: new Date().toISOString()
		};
	} catch (err) {
		console.error('Dashboard load error:', err);
		throw error(500, 'Failed to load dashboard data');
	}
};
