import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * Server-side load function for root page
 * Handles authentication and role-based redirection
 *
 * This runs BEFORE the page component renders, eliminating client-side timing issues
 * and store access during SSR/hydration.
 */
export const load: PageServerLoad = async ({ locals }) => {
	// Server has already validated auth via hooks.server.ts
	// If user exists in locals, they are authenticated
	if (locals.user) {
		// Redirect authenticated users based on role
		const userRole = locals.user.role;
		const isAdmin = userRole === 'Admin' || userRole === 'admin' || userRole === 'super_admin';

		redirect(303, isAdmin ? '/dashboard/admin' : '/dashboard');
	} else {
		// Redirect unauthenticated users to login
		redirect(303, '/login');
	}
};
