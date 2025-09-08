import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { geldbTokenService } from '$lib/services/auth/geldb-token.service.js';

/**
 * Magic Link Page Server Load
 * 
 * Handles magic link authentication page and form submission
 */
export const load: PageServerLoad = async ({ url }) => {
	// Get redirect target from query params
	const redirectTo = url.searchParams.get('redirectTo');
	
	return {
		redirectTo
	};
};

export const actions = {
	/**
	 * Send magic link email
	 */
	send: async ({ request, url }) => {
		const data = await request.formData();
		const email = data.get('email') as string;
		const redirectTo = data.get('redirectTo') as string;

		if (!email) {
			return fail(400, {
				error: 'Email is required',
				email
			});
		}

		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return fail(400, {
				error: 'Please enter a valid email address',
				email
			});
		}

		try {
			// Send magic link via GelDB
			const result = await geldbTokenService.sendMagicLink(
				email,
				`${url.origin}/auth/magic-link/verify`
			);

			if (!result.success) {
				return fail(500, {
					error: result.error || 'Failed to send magic link',
					email
				});
			}

			return {
				success: true,
				email,
				redirectTo,
				sentAt: result.verification_email_sent_at
			};

		} catch (error) {
			console.error('Magic link send error:', error);
			return fail(500, {
				error: 'An unexpected error occurred. Please try again.',
				email
			});
		}
	}
};