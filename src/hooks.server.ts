import { sequence } from '@sveltejs/kit/hooks';
import * as Sentry from '@sentry/sveltekit';
import type { Handle } from '@sveltejs/kit';
import { serverPerformanceMonitor } from '$lib/performance/server-monitor.js';
import { createStandardError } from '$lib/utils/error-handling.js';
import { redirect } from '@sveltejs/kit';
import { authConfig } from '$lib/auth/config.js';
import { logger } from '$lib/utils/logger.js';

/**
 * Server-side hooks for session-based authentication, performance optimization and monitoring
 */

// Define public routes that don't require authentication (using Set for O(1) lookups)
const PUBLIC_ROUTES = new Set([
	'/',
	'/login',
	'/login-simple',
	'/login-working',
	'/privacy',
	'/terms',
	'/health',
	'/metrics', // Prometheus metrics endpoint (unauthenticated for cluster scraping)
	'/api/auth/login',
	'/api/health',
	'/api/metrics',
	'/api/auth/verify'
]);

// Static file extensions to skip authentication for
const STATIC_EXTENSIONS = new Set([
	'.js',
	'.css',
	'.woff',
	'.woff2',
	'.ttf',
	'.eot',
	'.png',
	'.jpg',
	'.jpeg',
	'.gif',
	'.svg',
	'.webp',
	'.ico',
	'.json',
	'.map'
]);

/**
 * Session Cache Implementation
 * Caches validated sessions to reduce backend API calls
 */
interface CachedSession {
	user: any;
	roles: string[];
	permissions: string[];
	expiresAt: number;
}

const SESSION_CACHE = new Map<string, CachedSession>();
const SESSION_CACHE_TTL = 60 * 1000; // 60 seconds for most routes
const DASHBOARD_CACHE_TTL = 5 * 1000; // 5 seconds for dashboard routes

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

/**
 * Rate Limiting for Login Attempts
 * Prevents brute force attacks by limiting login attempts per IP
 */
interface RateLimitEntry {
	attempts: number;
	firstAttempt: number;
	blockedUntil?: number;
}

const RATE_LIMIT_MAP = new Map<string, RateLimitEntry>();
const MAX_LOGIN_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const BLOCK_DURATION = 60 * 60 * 1000; // 1 hour block after max attempts

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

/**
 * Extract session ID from cookie header for cache key
 */
function extractSessionId(cookieHeader: string): string | null {
	const match = cookieHeader.match(/hr_token=([^;]+)/);
	return match ? match[1] : null;
}

/**
 * Generate cache key based on session ID and pathname
 * For dashboard routes, include pathname to prevent cross-page cache leakage
 */
function getCacheKey(sessionId: string, pathname: string): string {
	// For dashboard routes, include pathname in cache key to prevent cross-page leakage
	if (pathname.startsWith('/dashboard')) {
		return `${sessionId}:${pathname}`;
	}
	return sessionId;
}

// Helper function to authenticate user via session validation with caching
async function authenticateUser(
	event: any,
	pathname: string
): Promise<{
	user: any;
	roles: string[];
	permissions: string[];
} | null> {
	// Extract session cookie from the incoming request
	const cookieHeader = event.request.headers.get('cookie') || '';
	const sessionId = extractSessionId(cookieHeader);

	try {
		// Check cache first (if we have a session ID)
		if (sessionId) {
			const cacheKey = getCacheKey(sessionId, pathname);
			const cached = SESSION_CACHE.get(cacheKey);

			if (cached && cached.expiresAt > Date.now()) {
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
					const cacheKey = getCacheKey(sessionId, pathname);
					SESSION_CACHE.delete(cacheKey);
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
			const cacheKey = getCacheKey(sessionId, pathname);
			const ttl = pathname.startsWith('/dashboard')
				? DASHBOARD_CACHE_TTL
				: SESSION_CACHE_TTL;

			SESSION_CACHE.set(cacheKey, {
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

export const handle: Handle = sequence(Sentry.sentryHandle(), async ({ event, resolve }) => {
	// Generate request correlation ID
	const requestId = crypto.randomUUID();
	event.locals.requestId = requestId;

	// Start performance monitoring
	const startTime = Date.now();

	try {
		const pathname = event.url.pathname;
		const userAgent = event.request.headers.get('user-agent');

		// Skip logging for Kubernetes health probes to reduce noise
		const isHealthProbe = userAgent?.includes('kube-probe');

		// Log request start (skip kube-probe requests)
		if (!isHealthProbe) {
			logger.debug(`Request started: ${event.request.method} ${pathname}`, {
				requestId,
				method: event.request.method,
				url: pathname,
				userAgent: userAgent?.slice(0, 100)
			});
		}

		// Performance optimization: Skip authentication for static files
		const isStaticFile = STATIC_EXTENSIONS.has(pathname.substring(pathname.lastIndexOf('.')));
		if (isStaticFile) {
			return resolve(event);
		}

		// Check if this is a public route (O(1) lookup with Set)
		const isPublicRoute =
			PUBLIC_ROUTES.has(pathname) ||
			(pathname !== '/' &&
				Array.from(PUBLIC_ROUTES).some((route) => route !== '/' && pathname.startsWith(route)));

		let authResult = null;

		// Try to authenticate user if not a public route
		if (!isPublicRoute) {
			authResult = await authenticateUser(event, pathname);

			if (!authResult) {
				// Special handling for SSE endpoints - return 401 instead of redirecting
				// EventSource connections can't handle redirects properly
				if (
					pathname.includes('/stream') ||
					event.request.headers.get('accept') === 'text/event-stream'
				) {
					logger.warn(`SSE authentication failed for ${pathname}`, {
						userAgent: event.request.headers.get('user-agent')
					});
					return new Response(
						JSON.stringify({ error: 'Authentication required', code: 'AUTH_REQUIRED' }),
						{
							status: 401,
							headers: { 'Content-Type': 'application/json' }
						}
					);
				}

				logger.warn(`Unauthorized access to ${pathname}, redirecting to login`, {
					userAgent: event.request.headers.get('user-agent')
				});
				const redirectTo = encodeURIComponent(pathname + event.url.search);
				redirect(303, `/login?redirectTo=${redirectTo}`);
			}
		}

		// Add user context to locals if authenticated
		if (authResult) {
			event.locals.user = authResult.user;
			event.locals.roles = authResult.roles;
			event.locals.permissions = authResult.permissions;

			// Add Sentry user context for better error debugging
			Sentry.setUser({
				id: authResult.user.id,
				email: authResult.user.email,
				username: authResult.user.full_name
			});

			// Add custom tags for filtering in Sentry
			Sentry.setTag('user_role', authResult.roles[0] || 'unknown');
			if (authResult.user.department_id) {
				Sentry.setTag('department_id', authResult.user.department_id);
			}
		} else {
			// Clear Sentry user context if not authenticated
			Sentry.setUser(null);
		}

		// Resolve the request
		const response = await resolve(event);

		// Record performance metrics
		const duration = Date.now() - startTime;
		serverPerformanceMonitor.recordAPIEndpoint(
			event.url.pathname,
			event.request.method,
			duration,
			response.status,
			event
		);

		// Add request correlation ID to response headers
		response.headers.set('X-Request-ID', requestId);

		// Log request completion (skip kube-probe requests)
		if (!isHealthProbe) {
			logger.request(event.request.method, pathname, response.status, duration, {
				requestId,
				userId: event.locals.user?.id
			});
		}

		// Security headers
		const isProduction = process.env.NODE_ENV === 'production';

		// Check if this is the document preview endpoint (needs iframe embedding)
		const isPreviewEndpoint =
			pathname.includes('/api/documents/') && pathname.endsWith('/preview/view');

		// Prevent clickjacking attacks (but allow preview endpoint to be embedded)
		if (!isPreviewEndpoint) {
			response.headers.set('X-Frame-Options', 'DENY');
		}

		// Prevent MIME type sniffing
		response.headers.set('X-Content-Type-Options', 'nosniff');

		// XSS protection (legacy browsers)
		response.headers.set('X-XSS-Protection', '1; mode=block');

		// Referrer policy - only send origin for cross-origin requests
		response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

		// Permissions policy - restrict dangerous features
		response.headers.set(
			'Permissions-Policy',
			'camera=(), microphone=(), geolocation=(), payment=()'
		);

		// Content Security Policy (CSP) - strict policy
		// Allow iframe embedding for preview endpoint
		// Note: connect-src allows 'self' which includes the current origin and all SvelteKit API routes
		const cspDirectives = [
			"default-src 'self'",
			"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com", // Allow Cloudflare analytics
			"style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net", // Allow FullCalendar CSS from CDN
			"img-src 'self' data: https:",
			"font-src 'self' data:",
			"connect-src 'self' https://cloudflareinsights.com https://*.ingest.us.sentry.io", // Allow Cloudflare and Sentry
			"worker-src 'self' blob:", // Allow Sentry session replay workers
			"frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com", // Allow YouTube embeds
			isPreviewEndpoint ? "frame-ancestors 'self'" : "frame-ancestors 'none'",
			"base-uri 'self'",
			"form-action 'self'"
		];
		response.headers.set('Content-Security-Policy', cspDirectives.join('; '));

		// Strict Transport Security (HSTS) - enforce HTTPS in production
		if (isProduction) {
			response.headers.set(
				'Strict-Transport-Security',
				'max-age=31536000; includeSubDomains; preload'
			);
		}

		// Performance metrics header
		response.headers.set('X-Response-Time', `${duration}ms`);

		return response;
	} catch (error) {
		// Handle SvelteKit redirects and errors - these are special error objects, not Response instances
		// Check for redirect by status property (3xx status codes)
		if (error && typeof error === 'object' && 'status' in error) {
			const statusCode = (error as any).status;
			// Re-throw all redirects (3xx) and SvelteKit errors (4xx, 5xx with body property)
			if ((statusCode >= 300 && statusCode < 400) || ('body' in error)) {
				throw error;
			}
		}

		// Also check for Response instances (belt and suspenders approach)
		if (error instanceof Response && error.status >= 300 && error.status < 400) {
			throw error;
		}

		logger.error('Handle error', error instanceof Error ? error : new Error(String(error)), {
			requestId
		});

		// Return error response
		return new Response(JSON.stringify({ error: 'Internal server error', code: 'SERVER_ERROR' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
});

// Error handling hook with standardized error responses
export const handleError = Sentry.handleErrorWithSentry(
	({ error, event }: { error: any; event: any }) => {
		// Create standardized error response
		const standardError = createStandardError(error, {
			requestId: crypto.randomUUID(),
			userId: event?.locals?.user?.id,
			path: event?.url?.pathname,
			operation: `${event?.request?.method || 'GET'} ${event?.url?.pathname || 'unknown'}`
		});

		// Log structured error for monitoring
		logger.error(`Server Error: ${standardError.message}`, error, {
			requestId: standardError.requestId,
			type: standardError.type,
			userMessage: standardError.userMessage,
			statusCode: standardError.statusCode,
			url: event?.url?.pathname,
			method: event?.request?.method,
			userId: event?.locals?.user?.id,
			userAgent: event?.request?.headers?.get('user-agent')?.slice(0, 100),
			timestamp: standardError.timestamp
		});

		// In production, send to error tracking service
		// Example: Sentry, Rollbar, DataDog, etc.
		if (process.env.NODE_ENV === 'production') {
			// TODO: Integrate with error tracking service
			// Sentry.captureException(error, {
			//   contexts: {
			//     request: {
			//       url: event?.url?.pathname,
			//       method: event?.request?.method,
			//       user_id: event?.locals?.user?.id
			//     }
			//   }
			// });
		}

		// Return user-friendly error message
		return {
			message: standardError.userMessage,
			type: standardError.type,
			requestId: standardError.requestId,
			timestamp: standardError.timestamp
		};
	}
);

logger.info('Server performance optimization and monitoring initialized');
logger.info('Session caching enabled', { ttl: SESSION_CACHE_TTL, cleanupInterval: '5min' });
logger.info('Static file optimization enabled', { extensionCount: STATIC_EXTENSIONS.size });
logger.info('Security hardening enabled', {
	rateLimitMaxAttempts: MAX_LOGIN_ATTEMPTS,
	rateLimitWindow: `${RATE_LIMIT_WINDOW / 1000 / 60}min`,
	blockDuration: `${BLOCK_DURATION / 1000 / 60}min`,
	securityHeaders: 'CSP, HSTS, X-Frame-Options, etc.',
	csrfProtection: authConfig.security.enableCSRF ? 'enabled' : 'disabled'
});

// Initialize event reminder scheduler with backend health check
import { ReminderScheduler } from '$lib/server/reminder-scheduler';
import { waitForBackend } from '$lib/server/backend-health';

// Start the reminder scheduler after ensuring backend is healthy
if (process.env.ENABLE_REMINDER_SCHEDULER !== 'false') {
	// Wait for backend in background, don't block server startup
	waitForBackend(undefined, {
		maxRetries: 15,
		initialDelay: 2000,
		maxDelay: 30000
	})
		.then((result) => {
			if (result.healthy) {
				ReminderScheduler.start();
				logger.info('Event reminder scheduler started');
			} else {
				logger.error('Event reminder scheduler disabled - backend not healthy', undefined, {
					message: result.message
				});
			}
		})
		.catch((error) => {
			logger.error(
				'Event reminder scheduler startup error',
				error instanceof Error ? error : new Error(String(error))
			);
		});
} else {
	logger.info('Event reminder scheduler disabled', { reason: 'ENABLE_REMINDER_SCHEDULER=false' });
}
