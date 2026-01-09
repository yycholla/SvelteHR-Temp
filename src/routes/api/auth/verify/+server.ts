import { logger } from '$lib/utils/logger';
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
			logger.error('[Verify] === SESSION VERIFICATION FAILED ===');
			logger.error('[Verify] API response status', new Error('Verification failed'), {
				status: verifyResponse.status
			});
			logger.error('[Verify] Verify URL', new Error('Verification failed'), { verifyUrl });
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
		logger.error('[Verify] === SESSION VERIFICATION FAILED ===');
		logger.error('[Verify] FATAL ERROR', error as Error);
		logger.error('[Verify] Verify URL', new Error('Verification failed'), {
			verifyUrl: `${getApiBaseUrl()}/auth/me`
		});
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
