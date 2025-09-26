// Server-side data loading for dashboard page
// T055: Error Handling Standardization - CRITICAL

import type { PageServerLoad } from './$types';
import { PermissionChecks, getUserPermissions } from '$lib/server/rbac-utils';
import { getCompleteDashboardData } from '$lib/graphql/dashboard-operations';
import { createServerLoad, checkPermissions } from '$lib/server/load-helpers.js';
import { createStandardError } from '$lib/utils/error-handling.js';

// Standardized dashboard load function with comprehensive error handling
export const load: PageServerLoad = createServerLoad(
	async (event) => {
		const { locals } = event;

		// Check dashboard access permissions
		if (!checkPermissions(locals.permissions, ['dashboard:read'])) {
			throw new Error('Insufficient permissions to access dashboard');
		}

		// Load dashboard data using standardized operations
		const userRole = locals.user.role || 'employee';
		const dashboardData = await getCompleteDashboardData(locals.user.id, userRole);

		// Get standardized user permissions
		const userPermissions = getUserPermissions(locals);

		return {
			user: userPermissions.user,
			dashboardData,
			// RBAC: Standardized permission checks
			...userPermissions,
			loadedAt: new Date().toISOString()
		};
	},
	{
		requireAuth: true,
		requiredPermissions: ['dashboard:read'],
		operation: 'Load Dashboard Data'
	}
);