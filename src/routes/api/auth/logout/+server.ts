import type { RequestHandler } from './$types';
import { json, type Cookies } from '@sveltejs/kit';
import { logger } from '$lib/utils/logger';
import { logoutWithBackend } from '$lib/server/auth/jwt-backend.js';

function getCookieSecurity(url: URL): { secure: boolean; sameSite: 'lax' } {
	return {
		secure: url.protocol === 'https:',
		sameSite: 'lax'
	};
}

function clearAuthCookies(cookies: Cookies, url: URL): void {
	const cookieSecurity = getCookieSecurity(url);
	for (const name of ['access_token', 'refresh_token', 'refresh_token_plaintext']) {
		cookies.set(name, '', {
			path: '/',
			maxAge: 0,
			httpOnly: true,
			secure: cookieSecurity.secure,
			sameSite: cookieSecurity.sameSite
		});
	}
}

export const POST: RequestHandler = async ({ cookies, url }) => {
	const accessToken = cookies.get('access_token');

	try {
		if (accessToken) {
			await logoutWithBackend(accessToken);
		}
	} catch (error) {
		logger.warn('[Auth Logout] Backend logout failed', {
			message: error instanceof Error ? error.message : String(error)
		});
	} finally {
		clearAuthCookies(cookies, url);
	}

	return json({
		success: true,
		message: 'Logged out successfully'
	});
};
