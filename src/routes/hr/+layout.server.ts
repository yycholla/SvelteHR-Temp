import type { LayoutServerLoad } from './$types';
import { getAuthenticatedUser } from '$lib/api/server-client';

// Require authentication for all HR pages and provide user context
export const load: LayoutServerLoad = async ({ cookies, url }) => {
	console.log('🏢 HR Layout: Loading authenticated user context');

	try {
		const authContext = await getAuthenticatedUser(cookies);

		// Check if user has HR permissions (super_admin, hr_manager, or relevant permissions)
		const hasHRAccess =
			authContext.permissions.includes('*') ||
			authContext.permissions.some((p) => p.startsWith('employees:') || p.startsWith('system:')) ||
			authContext.roles.some((r) => ['super_admin', 'hr_manager', 'manager'].includes(r.name));

		if (!hasHRAccess) {
			console.warn('❌ HR Layout: User lacks HR permissions');
			throw new Error('Insufficient permissions for HR access');
		}

		console.log('✅ HR Layout: User authenticated with HR access');

		return {
			user: authContext.user,
			roles: authContext.roles,
			permissions: authContext.permissions,
			hasHRAccess: true
		};
	} catch (error) {
		console.error('❌ HR Layout: Authentication failed:', error);
		throw error;
	}
};
