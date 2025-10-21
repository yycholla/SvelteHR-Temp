/**
 * DEPRECATED: JWT Debugging Utilities
 *
 * This file is deprecated as the application has migrated to session-based authentication.
 * JWT tokens are no longer used - authentication is handled via HTTP-only session cookies
 * managed by the axum-login backend.
 *
 * Session cookies are managed server-side by the Rust backend and cannot be inspected
 * from JavaScript for security reasons (HTTP-only flag).
 *
 * For debugging authentication issues, check:
 * 1. Browser DevTools → Application → Cookies → hr_token cookie
 * 2. Server logs in hooks.server.ts for session validation
 * 3. Backend /auth/me endpoint for session verification
 */

import { dev } from '$app/environment';
import type { Cookies } from '@sveltejs/kit';

/** @deprecated Use session-based authentication debugging instead */
export interface JWTDebugInfo {
	hasToken: boolean;
	tokenSource: string;
	tokenLength: number;
	tokenPrefix: string;
	isValidFormat: boolean;
	payload?: any;
}

/** @deprecated JWT debugging no longer needed with session-based auth */
export function debugJWTToken(cookies: Cookies): JWTDebugInfo {
	const hrToken = cookies.get('hr_token');
	const postgraphileToken = cookies.get('postgraphile-jwt-token');
	const authToken = cookies.get('auth-token');

	let token = hrToken || postgraphileToken || authToken;
	let tokenSource = hrToken ? 'hr_token' :
					  postgraphileToken ? 'postgraphile-jwt-token' :
					  authToken ? 'auth-token' : 'none';

	const debugInfo: JWTDebugInfo = {
		hasToken: !!token,
		tokenSource,
		tokenLength: token?.length || 0,
		tokenPrefix: token ? token.substring(0, 20) + '...' : 'none',
		isValidFormat: false
	};

	// Check if token has valid JWT format (header.payload.signature)
	if (token) {
		const parts = token.split('.');
		debugInfo.isValidFormat = parts.length === 3;

		// Try to decode payload for debugging (only in dev)
		if (dev && debugInfo.isValidFormat) {
			try {
				const payload = JSON.parse(atob(parts[1]));
				debugInfo.payload = {
					exp: payload.exp ? new Date(payload.exp * 1000).toISOString() : 'none',
					iat: payload.iat ? new Date(payload.iat * 1000).toISOString() : 'none',
					role: payload.role || 'none',
					user_id: payload.user_id || payload.sub || 'none',
					aud: payload.aud || 'none',
					iss: payload.iss || 'none'
				};
			} catch (e) {
				debugInfo.payload = { error: 'Failed to decode payload' };
			}
		}
	}

	if (dev) {
		console.log('🔐 JWT Debug Info:', debugInfo);
	}

	return debugInfo;
}

/** @deprecated Session-based auth doesn't use JWT tokens */
export function createTestJWT(): string {
	console.warn('createTestJWT is deprecated - use session-based authentication');
	return '';
}