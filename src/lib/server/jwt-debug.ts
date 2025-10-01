import { dev } from '$app/environment';
import type { Cookies } from '@sveltejs/kit';

export interface JWTDebugInfo {
	hasToken: boolean;
	tokenSource: string;
	tokenLength: number;
	tokenPrefix: string;
	isValidFormat: boolean;
	payload?: any;
}

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

export function createTestJWT(): string {
	// Create a simple test JWT for debugging (only in dev)
	if (!dev) return '';

	const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'HS256' }));
	const payload = btoa(JSON.stringify({
		role: 'hr_admin',
		user_id: 1,
		employee_id: 1,
		exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour
		iat: Math.floor(Date.now() / 1000),
		aud: 'postgraphile',
		iss: 'postgraphile'
	}));
	const signature = 'fake_signature_for_testing';

	return `${header}.${payload}.${signature}`;
}