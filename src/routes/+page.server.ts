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
		const userRoles = (locals.roles || []).map((r: string) => r.toLowerCase().replace(/[\s-]+/g, '_'));
		const isAdmin = userRoles.includes('admin') || userRoles.includes('super_admin');

		redirect(303, isAdmin ? '/admin' : '/dashboard');
	} else {
		// Redirect unauthenticated users to login
		redirect(303, '/login');
	}
};
