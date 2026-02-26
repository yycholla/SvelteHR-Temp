import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { logger } from '$lib/utils/logger';
import {
	clearRateLimit,
	isRateLimited,
	recordFailedLogin
} from '$lib/server/hooks/rate-limiter.js';
import { loginWithBackend } from '$lib/server/auth/jwt-backend.js';

interface LoginPayload {
	email?: string;
	password?: string;
}

function getCookieSecurity(url: URL): { secure: boolean; sameSite: 'lax' } {
	return {
		secure: url.protocol === 'https:',
		sameSite: 'lax'
	};
}

function getRefreshCookieMaxAgeSeconds(): number {
	return 7 * 24 * 60 * 60;
}

export const POST: RequestHandler = async ({ request, cookies, getClientAddress, url }) => {
	const clientIp = getClientAddress();

	if (isRateLimited(clientIp)) {
		return json(
			{
				success: false,
				error: 'Too many login attempts',
				message: 'Please try again later.'
			},
			{ status: 429 }
		);
	}

	let payload: LoginPayload;
	try {
		payload = (await request.json()) as LoginPayload;
	} catch {
		recordFailedLogin(clientIp);
		return json(
			{
				success: false,
				error: 'Invalid request payload'
			},
			{ status: 400 }
		);
	}

	const email = payload.email?.trim();
	const password = payload.password;
	if (!email || !password) {
		recordFailedLogin(clientIp);
		return json(
			{
				success: false,
				error: 'Email and password are required'
			},
			{ status: 400 }
		);
	}

	try {
		const loginResult = await loginWithBackend({
			email,
			password,
			deviceInfo: request.headers.get('user-agent') || undefined,
			ipAddress: clientIp
		});

		if (!loginResult.success) {
			recordFailedLogin(clientIp);
			return json(
				{
					success: false,
					error: loginResult.message
				},
				{ status: 401 }
			);
		}

		clearRateLimit(clientIp);

		const cookieSecurity = getCookieSecurity(url);
		const refreshMaxAge = getRefreshCookieMaxAgeSeconds();

		cookies.set('refresh_token', loginResult.tokens.refreshToken, {
			path: '/',
			maxAge: refreshMaxAge,
			httpOnly: true,
			secure: cookieSecurity.secure,
			sameSite: cookieSecurity.sameSite
		});

		cookies.set('refresh_token_plaintext', loginResult.tokens.refreshTokenPlaintext, {
			path: '/',
			maxAge: refreshMaxAge,
			httpOnly: true,
			secure: cookieSecurity.secure,
			sameSite: cookieSecurity.sameSite
		});

		return json({
			success: true,
			user: loginResult.user,
			accessToken: loginResult.tokens.accessToken,
			expiresIn: loginResult.tokens.expiresIn
		});
	} catch (error) {
		recordFailedLogin(clientIp);
		logger.error('[Auth Login] Failed to authenticate', error as Error, { clientIp });
		return json(
			{
				success: false,
				error: 'Authentication failed'
			},
			{ status: 500 }
		);
	}
};
