import type { PageServerLoad } from './$types';
import { authService } from '$lib/services/auth.service';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ cookies }) => {
	try {
		// Check authentication with timeout
		const currentUser = await Promise.race([
			authService.getCurrentUser(),
			new Promise((_, reject) => 
				setTimeout(() => reject(new Error('Auth timeout')), 3000)
			)
		]) as any;
		
		if (!currentUser.success || !currentUser.data) {
			// User not authenticated - redirect to login
			throw redirect(303, '/login');
		}

		// Return user data and permissions for the dashboard
		return {
			user: currentUser.data,
			permissions: currentUser.data.permissions || []
		};
	} catch (error) {
		console.warn('Authentication check failed, redirecting to login:', error);
		// Backend unavailable or timeout - redirect to login
		throw redirect(303, '/login');
	}
};