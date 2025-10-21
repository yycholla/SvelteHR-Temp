// Logout endpoint - Clear session with Rust GraphQL API
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { getApiBaseUrl } from '$lib/server/api-url.js';

export const POST: RequestHandler = async ({ cookies, request }) => {
	try {
		console.log('[Logout] === LOGOUT REQUEST START ===');

		// Call Rust GraphQL API logout endpoint to clear session server-side
		const apiBaseUrl = getApiBaseUrl();
		const logoutUrl = `${apiBaseUrl}/auth/logout`;
		console.log('[Logout] Calling Rust API logout:', logoutUrl);

		// Forward cookies to backend for session clearing
		const cookieHeader = request.headers.get('cookie') || '';

		const logoutResponse = await fetch(logoutUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Cookie': cookieHeader
			}
		});

		console.log('[Logout] API response status:', logoutResponse.status);

		// Clear all session cookies on the frontend
		const cookieNames = ['hr_token', 'auth-token', 'session', 'id.session'];
		for (const name of cookieNames) {
			cookies.delete(name, { path: '/' });
			console.log(`[Logout] Cleared cookie: ${name}`);
		}

		// Return success even if backend logout fails (frontend cleanup is sufficient)
		console.log('[Logout] === LOGOUT SUCCESSFUL ===');
		return json({
			success: true,
			message: 'Logged out successfully'
		});
	} catch (error) {
		console.error('[Logout] Error during logout:', error);

		// Still clear frontend cookies even if backend fails
		const cookieNames = ['hr_token', 'auth-token', 'session', 'id.session'];
		for (const name of cookieNames) {
			cookies.delete(name, { path: '/' });
		}

		return json(
			{
				success: true, // Return success to allow frontend to clear state
				message: 'Logged out (with warnings)',
				warning: 'Server-side logout may have failed, but local session cleared'
			},
			{ status: 200 }
		);
	}
};
