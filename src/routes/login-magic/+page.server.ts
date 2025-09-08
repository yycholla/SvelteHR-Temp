import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { backendIntegrationService } from '$lib/services/backend-integration.service.js';

export const load: PageServerLoad = async ({ url }) => {
	const redirectTo = url.searchParams.get('redirectTo');
	const message = url.searchParams.get('message');
	const error = url.searchParams.get('error');
	const email = url.searchParams.get('email');
	const devLink = url.searchParams.get('dev_link');

	return {
		redirectTo,
		message,
		error,
		email,
		devLink
	};
};

export const actions = {
	sendMagicLink: async ({ request }) => {
		const formData = await request.formData();
		const email = formData.get('email')?.toString();

		if (!email) {
			return fail(400, {
				error: 'Email is required',
				email: ''
			});
		}

		// Basic email validation
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return fail(400, {
				error: 'Please enter a valid email address',
				email
			});
		}

		try {
			// Call the magic link API endpoint
			const response = await fetch('/api/auth/magic-link/send', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					email,
					redirectTo: formData.get('redirectTo')?.toString()
				})
			});

			const result = await response.json();

			if (!response.ok) {
				return fail(response.status, {
					error: result.message || 'Failed to send magic link',
					email
				});
			}

			// Success - redirect with success message and dev link
			const successParams = new URLSearchParams({
				message: 'Magic link sent! Check your email (or use the dev link below).',
				email
			});

			// Add dev magic link in development
			if (result.dev_magic_link) {
				successParams.set('dev_link', result.dev_magic_link);
			}

			throw redirect(303, `/login-magic?${successParams.toString()}`);
			
		} catch (error) {
			if (error instanceof Response) {
				throw error; // Re-throw redirects
			}
			
			console.error('Magic link send failed:', error);
			return fail(500, {
				error: 'Failed to send magic link. Please try again.',
				email
			});
		}
	}
} satisfies Actions;