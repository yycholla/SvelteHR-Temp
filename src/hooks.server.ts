import { sequence } from '@sveltejs/kit/hooks';
import * as Sentry from '@sentry/sveltekit';
import type { Handle, RequestEvent } from '@sveltejs/kit';
import { serverPerformanceMonitor } from '$lib/performance/server-monitor.js';
import { createStandardError } from '$lib/utils/error-handling.js';
import { redirect } from '@sveltejs/kit';
import { authConfig } from '$lib/auth/config.js';
import { logger } from '$lib/utils/logger.js';
import {
	PUBLIC_ROUTES,
	STATIC_EXTENSIONS,
	SESSION_CACHE_TTL
} from '$lib/server/hooks/constants.js';
import { authenticateUser } from '$lib/server/hooks/authentication.js';
import { detectSuspiciousParams, applySecurityHeaders } from '$lib/server/hooks/security.js';
import {
	MAX_LOGIN_ATTEMPTS,
	RATE_LIMIT_WINDOW,
	BLOCK_DURATION
} from '$lib/server/hooks/rate-limiter.js';

// Initialize event reminder scheduler with backend health check
import { ReminderScheduler } from '$lib/server/reminder-scheduler';
import { waitForBackend } from '$lib/server/backend-health';

/**
 * Server-side hooks for session-based authentication, performance optimization and monitoring
 */

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

		// SECURITY: Detect potential credential leakage in URLs
		detectSuspiciousParams(event, requestId);

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
			// JWT Authentication Check: Look for refresh_token cookie
			// If present, user has JWT auth; backend will validate the token
			const cookieHeader = event.request.headers.get('cookie') || '';
			const hasRefreshToken = cookieHeader.includes('refresh_token=');

			// For JWT users, skip session validation - backend handles JWT validation
			// For session users, use existing session validation
			if (hasRefreshToken) {
				// JWT user - backend will validate token, just check cookie exists
				// Backend JWT middleware will handle full validation and authorization
				logger.debug(`JWT auth detected for ${pathname}`, { requestId });
			} else {
				// Session-based auth - use existing validation logic
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
			// For JWT users, user context will be populated by backend on each request
			// No need to populate locals here - GraphQL requests will be authenticated by backend
			// Clear Sentry user context if no session auth
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
		applySecurityHeaders(response, pathname);

		// Performance metrics header
		response.headers.set('X-Response-Time', `${duration}ms`);

		return response;
	} catch (error) {
		// Handle SvelteKit redirects and errors - these are special error objects, not Response instances
		// Check for redirect by status property (3xx status codes)
		if (error && typeof error === 'object' && 'status' in error) {
			const statusCode = (error as { status?: number }).status;
			// Re-throw all redirects (3xx) and SvelteKit errors (4xx, 5xx with body property)
			if (
				typeof statusCode === 'number' &&
				((statusCode >= 300 && statusCode < 400) || 'body' in error)
			) {
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
	({ error, event }: { error: unknown; event: RequestEvent }) => {
		// Create standardized error response
		const standardError = createStandardError(error, {
			requestId: crypto.randomUUID(),
			userId: event?.locals?.user?.id,
			path: event?.url?.pathname,
			operation: `${event?.request?.method || 'GET'} ${event?.url?.pathname || 'unknown'}`
		});

		// Log structured error for monitoring
		logger.error(
			`Server Error: ${standardError.message}`,
			error instanceof Error ? error : new Error(String(error)),
			{
				requestId: standardError.requestId,
				type: standardError.type,
				userMessage: standardError.userMessage,
				statusCode: standardError.statusCode,
				url: event?.url?.pathname,
				method: event?.request?.method,
				userId: event?.locals?.user?.id,
				userAgent: event?.request?.headers?.get('user-agent')?.slice(0, 100),
				timestamp: standardError.timestamp
			}
		);

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
