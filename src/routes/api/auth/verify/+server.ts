import { json, type Cookies } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyAccessTokenWithBackend, refreshWithBackend } from '$lib/server/auth/jwt-backend.js';

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

function setAuthCookies(
	cookies: Cookies,
	url: URL,
	refreshToken: string,
	refreshTokenPlaintext: string,
	_expiresIn: number
): void {
	const cookieSecurity = getCookieSecurity(url);
	const refreshMaxAge = 7 * 24 * 60 * 60;

	cookies.set('refresh_token', refreshToken, {
		path: '/',
		maxAge: refreshMaxAge,
		httpOnly: true,
		secure: cookieSecurity.secure,
		sameSite: cookieSecurity.sameSite
	});

	cookies.set('refresh_token_plaintext', refreshTokenPlaintext, {
		path: '/',
		maxAge: refreshMaxAge,
		httpOnly: true,
		secure: cookieSecurity.secure,
		sameSite: cookieSecurity.sameSite
	});
}

export const GET: RequestHandler = async ({ cookies, url, request, getClientAddress }) => {
	try {
		const accessToken = cookies.get('access_token');

		if (accessToken) {
			const verifyResult = await verifyAccessTokenWithBackend(accessToken);
			if (verifyResult.valid && verifyResult.user) {
				return json({
					success: true,
					user: verifyResult.user
				});
			}
		}

		const refreshToken = cookies.get('refresh_token');
		const refreshTokenPlaintext = cookies.get('refresh_token_plaintext');
		if (!refreshToken || !refreshTokenPlaintext) {
			clearAuthCookies(cookies, url);
			return json(
				{
					success: false,
					error: 'Session verification failed'
				},
				{ status: 401 }
			);
		}

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
					error: 'Session verification failed'
				},
				{ status: 401 }
			);
		}

		setAuthCookies(
			cookies,
			url,
			refreshResult.tokens.refreshToken,
			refreshResult.tokens.refreshTokenPlaintext,
			refreshResult.tokens.expiresIn
		);

		return json({
			success: true,
			user: {
				id: refreshResult.user.id,
				email: refreshResult.user.email,
				displayName: refreshResult.user.displayName
			}
		});
	} catch {
		clearAuthCookies(cookies, url);
		return json(
			{
				success: false,
				error: 'Session verification failed'
			},
			{ status: 401 }
		);
	}
};
