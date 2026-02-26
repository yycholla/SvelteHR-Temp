// Session Cache Implementation
import type { User } from '$lib/types/index.js';

export interface CachedSession {
	user: User;
	roles: string[];
	permissions: string[];
	accessToken?: string;
	expiresAt: number;
}

// Export for direct access if needed, but prefer helper methods
export const SESSION_CACHE = new Map<string, CachedSession>();

/**
 * Generate cache key based on session ID and pathname
 * For dashboard routes, include pathname to prevent cross-page cache leakage
 */
export function getCacheKey(sessionId: string, pathname: string): string {
	// For dashboard routes, include pathname in cache key to prevent cross-page leakage
	if (pathname.startsWith('/dashboard')) {
		return `${sessionId}:${pathname}`;
	}
	return sessionId;
}

export function getCachedSession(sessionId: string, pathname: string): CachedSession | undefined {
	const cacheKey = getCacheKey(sessionId, pathname);
	const cached = SESSION_CACHE.get(cacheKey);

	if (cached && cached.expiresAt > Date.now()) {
		return cached;
	}

	if (cached) {
		// Clean up expired
		SESSION_CACHE.delete(cacheKey);
	}

	return undefined;
}

export function cacheSession(sessionId: string, pathname: string, session: CachedSession): void {
	const cacheKey = getCacheKey(sessionId, pathname);
	SESSION_CACHE.set(cacheKey, session);
}

export function invalidateSession(sessionId: string, pathname: string): void {
	const cacheKey = getCacheKey(sessionId, pathname);
	SESSION_CACHE.delete(cacheKey);
}

/**
 * Clean expired sessions from cache periodically
 */
setInterval(
	() => {
		const now = Date.now();
		for (const [key, value] of SESSION_CACHE.entries()) {
			if (value.expiresAt < now) {
				SESSION_CACHE.delete(key);
			}
		}
	},
	5 * 60 * 1000
); // Cleanup every 5 minutes
