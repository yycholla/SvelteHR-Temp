import { logger } from '$lib/utils/logger';

/**
 * Session Cookie Utilities
 * Helper functions for managing session cookies in the browser
 */

export interface SessionCookieOptions {
	name?: string;
	value?: string;
	expires?: Date;
	maxAge?: number;
	path?: string;
	domain?: string;
	secure?: boolean;
	httpOnly?: boolean;
	sameSite?: 'strict' | 'lax' | 'none';
}

/**
 * Get a cookie value by name
 */
export function getCookie(name: string): string | undefined {
	if (typeof document === 'undefined') return undefined;

	const value = `; ${document.cookie}`;
	const parts = value.split(`; ${name}=`);

	if (parts.length === 2) {
		return parts.pop()?.split(';').shift();
	}

	return undefined;
}

/**
 * Set a cookie with options
 */
export function setCookie(options: SessionCookieOptions): void {
	if (typeof document === 'undefined') return;

	const {
		name = 'session',
		value = '',
		expires,
		maxAge,
		path = '/',
		domain,
		secure,
		httpOnly,
		sameSite
	} = options;

	let cookieString = `${name}=${value}`;

	if (expires) {
		cookieString += `; expires=${expires.toUTCString()}`;
	}

	if (maxAge) {
		cookieString += `; max-age=${maxAge}`;
	}

	if (path) {
		cookieString += `; path=${path}`;
	}

	if (domain) {
		cookieString += `; domain=${domain}`;
	}

	if (secure) {
		cookieString += '; secure';
	}

	if (httpOnly) {
		cookieString += '; httpOnly';
	}

	if (sameSite) {
		cookieString += `; samesite=${sameSite}`;
	}

	document.cookie = cookieString;
}

/**
 * Delete a cookie by setting it to expire
 */
export function deleteCookie(name: string, path = '/', domain?: string): void {
	setCookie({
		name,
		value: '',
		expires: new Date(0),
		path,
		domain
	});
}

/**
 * Check if session cookie exists
 */
export function hasSessionCookie(cookieName = 'session'): boolean {
	return getCookie(cookieName) !== undefined;
}

/**
 * Get session cookie expiry time (if available)
 */
export function getSessionExpiry(): Date | null {
	// Note: Since session cookies are httpOnly, we can't read their expiry
	// This would need to be tracked separately or retrieved from server
	return null;
}

/**
 * Clear all session-related cookies
 */
export function clearSessionCookies(): void {
	// Delete main session cookie
	deleteCookie('session');

	// Delete any other auth-related cookies that might exist
	deleteCookie('auth-token');
	deleteCookie('refresh-token');
}

/**
 * Session expiration handling
 */
export interface SessionExpirationOptions {
	warningThreshold?: number; // Minutes before expiry to show warning (default: 5)
	checkInterval?: number; // How often to check expiration in minutes (default: 1)
	onExpirationWarning?: (minutesLeft: number) => void;
	onExpired?: () => void;
}

class SessionExpirationManager {
	private checkInterval: NodeJS.Timeout | null = null;
	private options: Required<SessionExpirationOptions>;
	private lastExpiryCheck = 0;

	constructor(options: SessionExpirationOptions = {}) {
		this.options = {
			warningThreshold: options.warningThreshold ?? 5,
			checkInterval: options.checkInterval ?? 1,
			onExpirationWarning: options.onExpirationWarning ?? (() => {}),
			onExpired: options.onExpired ?? (() => {})
		};
	}

	/**
	 * Start monitoring session expiration
	 */
	start(): void {
		if (this.checkInterval) {
			this.stop(); // Stop any existing interval
		}

		// Check immediately
		this.checkExpiration();

		// Set up periodic checking
		this.checkInterval = setInterval(
			() => {
				this.checkExpiration();
			},
			this.options.checkInterval * 60 * 1000
		); // Convert minutes to milliseconds

		logger.info(
			`⏰ Session expiration monitoring started (check every ${this.options.checkInterval} minutes)`
		);
	}

	/**
	 * Stop monitoring session expiration
	 */
	stop(): void {
		if (this.checkInterval) {
			clearInterval(this.checkInterval);
			this.checkInterval = null;
			logger.info('⏰ Session expiration monitoring stopped');
		}
	}

	/**
	 * Check if session is close to expiring and trigger callbacks
	 */
	private checkExpiration(): void {
		try {
			const minutesLeft = this.getMinutesUntilExpiry();

			if (minutesLeft === null) {
				// No session or can't determine expiry
				return;
			}

			if (minutesLeft <= 0) {
				logger.info('⏰ Session has expired');
				this.options.onExpired();
				this.stop();
			} else if (minutesLeft <= this.options.warningThreshold) {
				logger.info(`⏰ Session expires in ${minutesLeft} minutes`);
				this.options.onExpirationWarning(minutesLeft);
			}
		} catch (error) {
			logger.error('Failed to check session expiration', error as Error);
		}
	}

	/**
	 * Get minutes until session expires
	 * Returns null if no session or expiry cannot be determined
	 */
	getMinutesUntilExpiry(): number | null {
		try {
			// Since session cookies are httpOnly, we can't read their expiry directly
			// We need to check with the server or use a client-side expiry estimate

			// For now, we'll use a simple approach: check if we have a recent activity
			// In a real implementation, this would query the server for session status
			const lastActivity = this.getLastActivityTime();
			const now = Date.now();

			// Assume session expires after 24 hours of inactivity
			const sessionTimeoutMs = 24 * 60 * 60 * 1000; // 24 hours
			const timeSinceActivity = now - lastActivity;

			if (timeSinceActivity > sessionTimeoutMs) {
				return 0; // Expired
			}

			const minutesLeft = Math.floor((sessionTimeoutMs - timeSinceActivity) / (1000 * 60));
			return Math.max(0, minutesLeft);
		} catch (error) {
			logger.error('Failed to get session expiry time', error as Error);
			return null;
		}
	}

	/**
	 * Update last activity time (call this on user interactions)
	 */
	updateActivity(): void {
		if (typeof window !== 'undefined') {
			localStorage.setItem('session_last_activity', Date.now().toString());
		}
	}

	/**
	 * Get last activity timestamp
	 */
	private getLastActivityTime(): number {
		if (typeof window === 'undefined') return Date.now();

		try {
			const stored = localStorage.getItem('session_last_activity');
			return stored ? parseInt(stored) : Date.now();
		} catch {
			return Date.now();
		}
	}

	/**
	 * Force session refresh (extend expiry)
	 */
	async refreshSession(): Promise<boolean> {
		try {
			// Call session refresh endpoint
			const response = await fetch('/api/auth/refresh', {
				method: 'POST',
				credentials: 'include'
			});

			if (response.ok) {
				this.updateActivity();
				logger.info('✅ Session refreshed successfully');
				return true;
			} else {
				logger.info('❌ Session refresh failed');
				return false;
			}
		} catch (error) {
			logger.error('Failed to refresh session', error as Error);
			return false;
		}
	}
}

// Export singleton instance
export const sessionExpirationManager = new SessionExpirationManager();

/**
 * Initialize session expiration monitoring
 */
export function initSessionExpirationMonitoring(options?: SessionExpirationOptions): void {
	if (options) {
		// Create new manager with custom options
		const customManager = new SessionExpirationManager(options);
		Object.assign(sessionExpirationManager, customManager);
	}

	sessionExpirationManager.start();
}

/**
 * Stop session expiration monitoring
 */
export function stopSessionExpirationMonitoring(): void {
	sessionExpirationManager.stop();
}

/**
 * Update session activity (call on user interactions)
 */
export function updateSessionActivity(): void {
	sessionExpirationManager.updateActivity();
}

/**
 * Get minutes until session expires
 */
export function getSessionMinutesLeft(): number | null {
	return sessionExpirationManager.getMinutesUntilExpiry();
}

/**
 * Manually refresh the session
 */
export function refreshSession(): Promise<boolean> {
	return sessionExpirationManager.refreshSession();
}

/**
 * Session cookie configuration for the application
 */
export const SESSION_COOKIE_CONFIG = {
	name: 'session',
	path: '/',
	secure: true, // Set to true in production
	httpOnly: true, // Always true for session cookies
	sameSite: 'lax' as const,
	maxAge: 24 * 60 * 60 // 24 hours
};
