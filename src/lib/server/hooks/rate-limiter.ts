// Rate Limiting for Login Attempts
import { logger } from '$lib/utils/logger.js';

interface RateLimitEntry {
	attempts: number;
	firstAttempt: number;
	blockedUntil?: number;
}

const RATE_LIMIT_MAP = new Map<string, RateLimitEntry>();
export const MAX_LOGIN_ATTEMPTS = 5;
export const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
export const BLOCK_DURATION = 60 * 60 * 1000; // 1 hour block after max attempts

/**
 * Check if IP is rate limited for login attempts
 */
export function isRateLimited(ip: string): boolean {
	const entry = RATE_LIMIT_MAP.get(ip);
	if (!entry) return false;

	const now = Date.now();

	// Check if currently blocked
	if (entry.blockedUntil && now < entry.blockedUntil) {
		return true;
	}

	// Reset if window expired
	if (now - entry.firstAttempt > RATE_LIMIT_WINDOW) {
		RATE_LIMIT_MAP.delete(ip);
		return false;
	}

	// Check if attempts exceeded
	return entry.attempts >= MAX_LOGIN_ATTEMPTS;
}

/**
 * Record failed login attempt
 */
export function recordFailedLogin(ip: string): void {
	const now = Date.now();
	const entry = RATE_LIMIT_MAP.get(ip);

	if (!entry) {
		// First attempt
		RATE_LIMIT_MAP.set(ip, {
			attempts: 1,
			firstAttempt: now
		});
		return;
	}

	// Reset if window expired
	if (now - entry.firstAttempt > RATE_LIMIT_WINDOW) {
		RATE_LIMIT_MAP.set(ip, {
			attempts: 1,
			firstAttempt: now
		});
		return;
	}

	// Increment attempts
	entry.attempts++;

	// Block if max attempts reached
	if (entry.attempts >= MAX_LOGIN_ATTEMPTS) {
		entry.blockedUntil = now + BLOCK_DURATION;
		logger.warn(`IP blocked due to rate limiting`, {
			ip,
			blockDuration: BLOCK_DURATION / 1000,
			maxAttempts: MAX_LOGIN_ATTEMPTS,
			currentAttempts: entry.attempts
		});
	}
}

/**
 * Clear rate limit for IP (on successful login)
 */
export function clearRateLimit(ip: string): void {
	RATE_LIMIT_MAP.delete(ip);
}

/**
 * Clean expired rate limit entries periodically
 */
setInterval(
	() => {
		const now = Date.now();
		for (const [ip, entry] of RATE_LIMIT_MAP.entries()) {
			// Remove if block expired and window expired
			if (
				(!entry.blockedUntil || now > entry.blockedUntil) &&
				now - entry.firstAttempt > RATE_LIMIT_WINDOW
			) {
				RATE_LIMIT_MAP.delete(ip);
			}
		}
	},
	10 * 60 * 1000
); // Cleanup every 10 minutes
