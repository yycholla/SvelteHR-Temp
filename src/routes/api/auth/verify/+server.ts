// Authentication endpoint - Verify session with Rust GraphQL API
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { getApiBaseUrl } from '$lib/server/api-url.js';

export const GET: RequestHandler = async ({ request }) => {
	try {
		// Call Rust GraphQL API me endpoint to verify session
		const apiBaseUrl = getApiBaseUrl();
		const verifyUrl = `${apiBaseUrl}/auth/me`;

		const verifyResponse = await fetch(verifyUrl, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				cookie: request.headers.get('cookie') || ''
			}
		});

		if (!verifyResponse.ok) {
			// Only log on failure
			console.error('[Verify] === SESSION VERIFICATION FAILED ===');
			console.error('[Verify] API response status:', verifyResponse.status);
			console.error('[Verify] Verify URL:', verifyUrl);
			return json(
				{
					success: false,
					error: 'Session verification failed'
				},
				{ status: verifyResponse.status }
			);
		}

		const userData = await verifyResponse.json();

		// Return user data (no logging on success)
		return json({
			success: true,
			user: userData
		});
	} catch (error) {
		// Only log on error
		console.error('[Verify] === SESSION VERIFICATION FAILED ===');
		console.error('[Verify] FATAL ERROR:', error);
		console.error('[Verify] Verify URL:', `${getApiBaseUrl()}/auth/me`);
		return json(
			{
				success: false,
				error: 'Session verification failed',
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
