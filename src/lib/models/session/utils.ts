import { UserSession } from './model';
import type { SessionActivity } from './types';

/**
 * Factory function to create UserSession from authentication result
 */
export function createUserSession(authResult: {
	userId: string;
	jwtToken?: string; // Optional for session-based auth
	refreshToken?: string;
	roles: string[];
	permissions: string[];
	expiresAt: string;
	deviceInfo?: SessionActivity['deviceInfo'];
	metadata?: Record<string, unknown>;
}): UserSession {
	return new UserSession({
		userId: authResult.userId,
		jwtToken: authResult.jwtToken,
		refreshToken: authResult.refreshToken,
		roles: authResult.roles,
		permissions: authResult.permissions,
		expiresAt: authResult.expiresAt,
		activity: {
			lastLoginAt: new Date().toISOString(),
			lastActiveAt: new Date().toISOString(),
			loginCount: 1,
			deviceInfo: authResult.deviceInfo
		},
		metadata: authResult.metadata
	});
}

/**
 * Type guard to check if an object is a valid UserSession
 */
export function isUserSession(obj: unknown): obj is UserSession {
	return obj instanceof UserSession;
}

/**
 * Create anonymous/unauthenticated session
 */
export function createAnonymousSession(): UserSession {
	return new UserSession({
		userId: 'anonymous',
		jwtToken: undefined, // No token for anonymous session
		permissions: [],
		roles: [],
		expiresAt: new Date(Date.now() + 1000).toISOString() // Expire immediately
	});
}
