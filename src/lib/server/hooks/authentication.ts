// Authentication Logic
import type { RequestEvent } from '@sveltejs/kit';
import type { User } from '$lib/types/index.js';
import { logger } from '$lib/utils/logger.js';
import { getCachedSession, cacheSession, invalidateSession } from './session-cache.js';
import { SESSION_CACHE_TTL, DASHBOARD_CACHE_TTL } from './constants.js';

/**
 * Extract session ID from cookie header for cache key
 */
export function extractSessionId(cookieHeader: string): string | null {
	const match = cookieHeader.match(/hr_token=([^;]+)/);
	return match ? match[1] : null;
}

// Helper function to authenticate user via session validation with caching
export async function authenticateUser(
	event: RequestEvent,
	pathname: string
): Promise<{
	user: User;
	roles: string[];
	permissions: string[];
} | null> {
	// Extract session cookie from the incoming request
	const cookieHeader = event.request.headers.get('cookie') || '';
	const sessionId = extractSessionId(cookieHeader);

	try {
		// Check cache first (if we have a session ID)
		if (sessionId) {
			const cached = getCachedSession(sessionId, pathname);

			if (cached) {
				// Concise: only log for non-verify endpoints to avoid spam
				if (!pathname.includes('/api/auth/verify') && !pathname.includes('/api/notifications')) {
					logger.debug(`✓ Session cache hit for ${pathname}`, { userId: sessionId });
				}
				return {
					user: cached.user,
					roles: cached.roles,
					permissions: cached.permissions
				};
			}
		}

		// Get backend URL from environment variable (handles both local and Docker networking)
		const backendUrl = process.env.PUBLIC_API_URL || 'http://localhost:4000';
		const authUrl = `${backendUrl}/auth/me`;

		// Call the Rust backend's session verification endpoint with forwarded cookies
		const response = await fetch(authUrl, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				Cookie: cookieHeader, // Forward session cookies from browser
				Connection: 'keep-alive' // Enable connection reuse
			},
			credentials: 'include'
		});

		if (!response.ok) {
			if (response.status === 401) {
				logger.warn(`Session invalid for ${pathname}`, { sessionId, statusCode: response.status });
				// Clear cache for this session if it exists
				if (sessionId) {
					invalidateSession(sessionId, pathname);
				}
				return null;
			}
			logger.error(`Authentication validation failed for ${pathname}`, undefined, {
				sessionId,
				statusCode: response.status
			});
			return null;
		}

		const userData = await response.json();

		// Transform to expected format
		// Normalize user data structure to ensure 'id' property exists
		// Backend may use 'id', 'user_id', or 'userId' depending on the endpoint
		const authResult = {
			user: {
				...userData,
				id: userData.id || userData.user_id || userData.userId
			},
			roles: userData.roles || [], // RBAC roles array from backend session
			permissions: userData.permissions || [] // Permissions from backend session
		};

		// Cache the validated session with pathname-specific key and TTL
		if (sessionId) {
			const ttl = pathname.startsWith('/dashboard') ? DASHBOARD_CACHE_TTL : SESSION_CACHE_TTL;

			cacheSession(sessionId, pathname, {
				...authResult,
				expiresAt: Date.now() + ttl
			});

			// Concise: only log for non-verify endpoints to avoid spam
			if (!pathname.includes('/api/auth/verify') && !pathname.includes('/api/notifications')) {
				logger.debug(`✓ Session cached for ${pathname} (TTL: ${ttl}ms)`, {
					userId: sessionId,
					pathname
				});
			}
		}

		return authResult;
	} catch (error) {
		logger.error(
			`Authentication error for ${pathname}`,
			error instanceof Error ? error : new Error(String(error)),
			{ sessionId }
		);
		return null;
	}
}
