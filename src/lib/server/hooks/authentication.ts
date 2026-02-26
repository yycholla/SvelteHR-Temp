import type { RequestEvent } from '@sveltejs/kit';
import type { User } from '$lib/types/index.js';
import jwt from 'jsonwebtoken';
import { getCachedSession, cacheSession } from './session-cache.js';
import { SESSION_CACHE_TTL, DASHBOARD_CACHE_TTL } from './constants.js';
import { refreshWithBackend } from '$lib/server/auth/jwt-backend.js';

type RefreshBackendResult = Awaited<ReturnType<typeof refreshWithBackend>>;
const refreshInFlight = new Map<string, Promise<RefreshBackendResult>>();

function getCookieValue(cookieHeader: string, cookieName: string): string | null {
	const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${cookieName}=([^;]+)`));
	return match ? decodeURIComponent(match[1]) : null;
}

interface JwtClaims {
	sub?: string;
	user_id?: string;
	email?: string;
	roles?: string[];
	permissions?: string[];
	display_name?: string;
	displayName?: string;
	department_id?: string;
	exp?: number;
}

function getCookieSecurity(url: URL): { secure: boolean; sameSite: 'lax' } {
	return {
		secure: url.protocol === 'https:',
		sameSite: 'lax'
	};
}

function setRefreshCookies(
	event: RequestEvent,
	refreshToken: string,
	refreshTokenPlaintext: string
): void {
	const cookieSecurity = getCookieSecurity(event.url);
	const refreshMaxAge = 7 * 24 * 60 * 60;

	event.cookies.set('refresh_token', refreshToken, {
		path: '/',
		maxAge: refreshMaxAge,
		httpOnly: true,
		secure: cookieSecurity.secure,
		sameSite: cookieSecurity.sameSite
	});

	event.cookies.set('refresh_token_plaintext', refreshTokenPlaintext, {
		path: '/',
		maxAge: refreshMaxAge,
		httpOnly: true,
		secure: cookieSecurity.secure,
		sameSite: cookieSecurity.sameSite
	});
}

function decodeAccessToken(accessToken: string): JwtClaims | null {
	const publicKey = process.env.JWT_PUBLIC_KEY;
	const legacySecret = process.env.JWT_SECRET;

	try {
		if (publicKey) {
			const verified = jwt.verify(accessToken, publicKey, { algorithms: ['RS256'] });
			if (typeof verified === 'object' && verified !== null) {
				return verified as JwtClaims;
			}
		}

		if (legacySecret) {
			const verified = jwt.verify(accessToken, legacySecret);
			if (typeof verified === 'object' && verified !== null) {
				return verified as JwtClaims;
			}
		}
	} catch {
		return null;
	}

	const decoded = jwt.decode(accessToken);
	if (!decoded || typeof decoded === 'string') return null;
	return decoded as JwtClaims;
}

async function refreshWithSingleFlight(input: {
	refreshToken: string;
	refreshTokenPlaintext: string;
	deviceInfo?: string;
	ipAddress?: string;
}): Promise<RefreshBackendResult> {
	const inFlight = refreshInFlight.get(input.refreshToken);
	if (inFlight) {
		return inFlight;
	}

	const refreshPromise = refreshWithBackend(input).finally(() => {
		refreshInFlight.delete(input.refreshToken);
	});

	refreshInFlight.set(input.refreshToken, refreshPromise);
	return refreshPromise;
}

export function extractSessionId(cookieHeader: string): string | null {
	return (
		getCookieValue(cookieHeader, 'access_token') || getCookieValue(cookieHeader, 'refresh_token')
	);
}

export async function authenticateUser(
	event: RequestEvent,
	pathname: string
): Promise<{
	user: User;
	roles: string[];
	permissions: string[];
	accessToken?: string;
} | null> {
	const cookieHeader = event.request.headers.get('cookie') || '';
	const sessionId = extractSessionId(cookieHeader);
	const accessToken = getCookieValue(cookieHeader, 'access_token');
	const refreshToken = getCookieValue(cookieHeader, 'refresh_token');
	const refreshTokenPlaintext = getCookieValue(cookieHeader, 'refresh_token_plaintext');
	let cacheSessionId = sessionId;

	if (sessionId) {
		const cached = getCachedSession(sessionId, pathname);
		if (cached) {
			return {
				user: cached.user,
				roles: cached.roles,
				permissions: cached.permissions,
				accessToken: cached.accessToken
			};
		}
	}

	let authResult: {
		user: User;
		roles: string[];
		permissions: string[];
		accessToken?: string;
	} | null = null;

	if (accessToken) {
		const claims = decodeAccessToken(accessToken);
		if (claims?.exp && claims.exp > Math.floor(Date.now() / 1000)) {
			const userId = claims.sub || claims.user_id;
			const userEmail = claims.email;
			if (userId && userEmail) {
				const roles = Array.isArray(claims.roles) ? claims.roles : [];
				const permissions = Array.isArray(claims.permissions) ? claims.permissions : [];
				const displayName =
					claims.displayName || claims.display_name || userEmail.split('@')[0] || 'User';

				authResult = {
					user: {
						id: userId,
						email: userEmail,
						role: roles[0] || 'employee',
						display_name: displayName,
						displayName
					} as User,
					roles,
					permissions,
					accessToken
				};
			}
		}
	}

	if (!authResult && refreshToken && refreshTokenPlaintext) {
		try {
			const refreshResult = await refreshWithSingleFlight({
				refreshToken,
				refreshTokenPlaintext,
				deviceInfo: event.request.headers.get('user-agent') || undefined,
				ipAddress: event.getClientAddress()
			});

			if (refreshResult.success) {
				const user = refreshResult.user;
				authResult = {
					user: {
						id: user.id,
						email: user.email,
						role: user.roles[0] || 'employee',
						display_name: user.displayName,
						displayName: user.displayName
					} as User,
					roles: user.roles,
					permissions: user.permissions,
					accessToken: refreshResult.tokens.accessToken
				};
				cacheSessionId = refreshResult.tokens.refreshToken;

				setRefreshCookies(
					event,
					refreshResult.tokens.refreshToken,
					refreshResult.tokens.refreshTokenPlaintext
				);
			}
		} catch {
			return null;
		}
	}

	if (!authResult) {
		return null;
	}

	if (cacheSessionId) {
		const ttl = pathname.startsWith('/dashboard') ? DASHBOARD_CACHE_TTL : SESSION_CACHE_TTL;
		cacheSession(cacheSessionId, pathname, {
			user: authResult.user,
			roles: authResult.roles,
			permissions: authResult.permissions,
			accessToken: authResult.accessToken,
			expiresAt: Date.now() + ttl
		});
	}

	return authResult;
}
