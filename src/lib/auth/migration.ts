import { logger } from '$lib/utils/logger';

/**
 * DEPRECATED: JWT to Session Migration Utilities
 *
 * This file is no longer needed as the application has fully migrated to session-based authentication.
 * All JWT token handling has been removed from the application.
 *
 * Session-based authentication flow:
 * 1. User logs in via /api/auth/login
 * 2. Backend creates session with axum-login and sets HTTP-only cookie
 * 3. Browser automatically sends session cookie with each request
 * 4. hooks.server.ts validates session and populates event.locals.user
 *
 * No migration is needed - users simply need to log in again with session-based auth.
 */

// All migration functions have been deprecated
// If you need to clear old JWT tokens, simply remove them from localStorage:
// localStorage.removeItem('hr-jwt-token');
// localStorage.removeItem('jwt-refresh-token');
// localStorage.removeItem('jwt-expiry');

export function cleanupLegacyJWTTokens(): void {
	if (typeof window === 'undefined') return;

	try {
		// Remove any legacy JWT tokens
		localStorage.removeItem('hr-jwt-token');
		localStorage.removeItem('postgraphile-jwt-token'); // Legacy cleanup
		localStorage.removeItem('jwt-refresh-token');
		localStorage.removeItem('jwt-expiry');
		sessionStorage.removeItem('jwt-temp-token');

		logger.info('✅ Cleaned up legacy JWT tokens');
	} catch (error) {
		logger.warn('Failed to cleanup legacy JWT tokens:', { error: error as Error });
	}
}
