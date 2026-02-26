import { json, type Cookies } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { refreshWithBackend } from '$lib/server/auth/jwt-backend.js';
import { logger } from '$lib/utils/logger';

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

export const POST: RequestHandler = async ({ cookies, request, getClientAddress, url }) => {
	const refreshToken = cookies.get('refresh_token');
	const refreshTokenPlaintext = cookies.get('refresh_token_plaintext');

	if (!refreshToken || !refreshTokenPlaintext) {
		clearAuthCookies(cookies, url);
		return json(
			{
				success: false,
				error: 'No refresh session found'
			},
			{ status: 401 }
		);
	}

	try {
		const refreshResult = await refreshWithBackend({
			refreshToken,
			refreshTokenPlaintext,
			deviceInfo: request.headers.get('user-agent') || undefined,
			ipAddress: getClientAddress()
		});

		if (!refreshResult.success) {
			clearAuthCookies(cookies, url);
			return json(
				{
					success: false,
					error: refreshResult.message
				},
				{ status: 401 }
			);
		}

		const cookieSecurity = getCookieSecurity(url);
		const refreshMaxAge = 7 * 24 * 60 * 60;

		cookies.set('refresh_token', refreshResult.tokens.refreshToken, {
			path: '/',
			maxAge: refreshMaxAge,
			httpOnly: true,
			secure: cookieSecurity.secure,
			sameSite: cookieSecurity.sameSite
		});

		cookies.set('refresh_token_plaintext', refreshResult.tokens.refreshTokenPlaintext, {
			path: '/',
			maxAge: refreshMaxAge,
			httpOnly: true,
			secure: cookieSecurity.secure,
			sameSite: cookieSecurity.sameSite
		});

		return json({
			success: true,
			user: refreshResult.user,
			accessToken: refreshResult.tokens.accessToken,
			expiresIn: refreshResult.tokens.expiresIn
		});
	} catch (error) {
		logger.error('[Auth Refresh] Failed', error as Error);
		clearAuthCookies(cookies, url);
		return json(
			{
				success: false,
				error: 'Token refresh failed'
			},
			{ status: 500 }
		);
	}
};
