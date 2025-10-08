import type { Handle } from '@sveltejs/kit';
import { serverPerformanceMonitor } from '$lib/performance/server-monitor.js';
import { redirect } from '@sveltejs/kit';
import {
	authConfig,
	getAccessTokenName,
	getCookieOptions,
	isDevelopment
} from '$lib/auth/config.js';
import {
	verifyJWTToken,
	extractUserFromPayload,
	decodeJWTTokenUnsafe
} from '$lib/auth/jwt-utils.js';
import { createStandardError, type StandardErrorResponse } from '$lib/utils/error-handling.js';

/**
 * Server-side hooks for RBAC authentication, performance optimization and monitoring
 */

// Define public routes that don't require authentication
const PUBLIC_ROUTES = [
	'/',
	'/login',
	'/login-simple',
	'/login-working',
	'/privacy',
	'/terms',
	'/api/auth/login',
	'/api/health'
];

// Helper function to authenticate user with proper JWT verification
async function authenticateUser(
	token: string
): Promise<{ user: any; roles: string[]; permissions: string[] } | null> {
	try {
		console.log(`🔐 Authenticating token: ${token.substring(0, 100)}...`);

		// Use proper JWT verification in production, fallback to basic parsing in development
		let validationResult;

		if (isDevelopment()) {
			console.log(`🧪 Development mode: using basic JWT parsing`);
			// Development: Use basic parsing for ease of testing
			const decodedPayload = await decodeJWTTokenUnsafe(token);
			console.log(`🔍 Decoded payload:`, decodedPayload);
			if (!decodedPayload) {
				console.log(`❌ Failed to decode JWT payload`);
				return null;
			}

			// Check expiration
			const currentTime = Math.floor(Date.now() / 1000);
			console.log(`⏰ Token expiration check:`, {
				currentTime,
				tokenExp: decodedPayload.exp,
				isExpired: decodedPayload.exp && decodedPayload.exp < currentTime
			});
			if (decodedPayload.exp && decodedPayload.exp < currentTime) {
				console.log(`❌ Token expired at ${new Date(decodedPayload.exp * 1000).toISOString()}`);
				return null;
			}

			validationResult = { isValid: true, payload: decodedPayload };
		} else {
			// Production: Use proper JWT signature verification
			validationResult = await verifyJWTToken(token);
			if (!validationResult.isValid || !validationResult.payload) {
				console.warn('JWT verification failed:', validationResult.error);
				return null;
			}
		}

		const payload = validationResult.payload;
		const user = extractUserFromPayload(payload);

		// ALL permissions MUST come from JWT token (database-driven)
		// No fallback to hardcoded role permissions
		const permissions = payload.permissions || [];

		console.log(`🔑 Permissions for ${user.email}:`, permissions);

		const authResult = {
			user: {
				id: user.id,
				email: user.email,
				display_name: payload.display_name || user.email.split('@')[0],
				role: user.role
			},
			roles: [user.role],
			permissions: permissions
		};

		console.log(`✅ authenticateUser returning:`, {
			userId: authResult.user.id,
			userEmail: authResult.user.email,
			userRole: authResult.user.role,
			roles: authResult.roles,
			permissionsCount: authResult.permissions.length
		});

		return authResult;
	} catch (error) {
		console.error('Authentication error:', error);
		return null;
	}
}

// NOTE: Role permissions are now 100% database-driven via JWT tokens
// The login endpoint sets permissions in the JWT based on user role from database
// No hardcoded role-to-permission mappings exist in this file

// Initialize server performance monitoring
const performanceHandle = serverPerformanceMonitor.createHandle();

// Combine RBAC, authentication, and performance monitoring
export const handle: Handle = async ({ event, resolve }) => {
	// First, run performance monitoring
	const performanceResponse = await performanceHandle({
		event,
		resolve: async (evt) => {
			// Then run our RBAC and existing logic
			const start = Date.now();
			const url = event.url.pathname;
			const method = event.request.method;

			// RBAC Authentication Logic
			// Check if route is public
			const isPublicRoute = PUBLIC_ROUTES.some(
				(route) => url === route || url.startsWith(`${route}/`)
			);

			// Extract JWT token from cookies using centralized config
			const primaryTokenName = getAccessTokenName();
			const token =
				event.cookies.get(primaryTokenName) || event.cookies.get('postgraphile-jwt-token');

			if (!isPublicRoute) {
				// Check if this is an API route
				const isApiRoute = url.startsWith('/api/');

				// Protected route - verify authentication
				if (!token) {
					console.log(`🔒 No token found for protected route: ${url}`);

					// API routes return JSON errors, non-API routes redirect to login
					if (isApiRoute) {
						return new Response(JSON.stringify({ message: 'Authentication required' }), {
							status: 401,
							headers: { 'Content-Type': 'application/json' }
						});
					}

					// Redirect to login with return URL
					const redirectTo = url === '/' ? '' : `?redirectTo=${encodeURIComponent(url)}`;
					throw redirect(303, `/login${redirectTo}`);
				}

				console.log(`🔍 Authenticating token for route: ${url}, token: ${token.substring(0, 50)}...`);

				// Verify and decode JWT token
				const authResult = await authenticateUser(token);
				if (!authResult) {
					console.log(`❌ Authentication failed for route: ${url}`);

					// Clean up invalid tokens
					event.cookies.delete(primaryTokenName, { path: '/' });
					event.cookies.delete('postgraphile-jwt-token', { path: '/' });

					// API routes return JSON errors, non-API routes redirect to login
					if (isApiRoute) {
						return new Response(JSON.stringify({ message: 'Invalid or expired token' }), {
							status: 401,
							headers: { 'Content-Type': 'application/json' }
						});
					}

					const redirectTo = url === '/' ? '' : `?redirectTo=${encodeURIComponent(url)}`;
					throw redirect(303, `/login${redirectTo}`);
				}

				console.log(`✅ Authentication successful for route: ${url}, user: ${authResult.user.email}`);


				// Set user information in locals for use in load functions
				event.locals.user = authResult.user;
				event.locals.roles = authResult.roles;
				event.locals.permissions = authResult.permissions;
			}

			// Add security headers
			const response = await resolve(event, {
				transformPageChunk: ({ html, done }) => {
					// Inject performance monitoring script early
					if (done && html.includes('</head>')) {
						html = html.replace(
							'</head>',
							`
          <script>
            // Early performance markers
            performance.mark('html_received');
            window.__PERFORMANCE_START__ = performance.now();
            
            // Critical resource hints
            const link = document.createElement('link');
            link.rel = 'preconnect';
            link.href = 'http://localhost:4000'; // PostGraphile endpoint
            document.head.appendChild(link);
          </script>
          </head>`
						);
					}
					return html;
				}
			});

			// Calculate request duration
			const duration = Date.now() - start;
			const status = response.status;

			// Log slow requests (>1s)
			if (duration > 1000) {
				console.warn(`🐌 Slow request: ${method} ${url} - ${duration}ms (${status})`);
			}

			// Add performance and security headers
			response.headers.set('X-Response-Time', `${duration}ms`);
			response.headers.set('X-Frame-Options', 'DENY');
			response.headers.set('X-Content-Type-Options', 'nosniff');
			response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
			response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

			// Add CSP for security and performance
			response.headers.set(
				'Content-Security-Policy',
				[
					"default-src 'self'",
					"script-src 'self' 'unsafe-inline' 'unsafe-eval'", // SvelteKit needs unsafe-inline/eval
					"style-src 'self' 'unsafe-inline'",
					"img-src 'self' data: https:",
					"font-src 'self' data: https://1.www.s81c.com", // Allow IBM Plex fonts from Carbon CDN
					"connect-src 'self' http://localhost:4000 ws://localhost:4000 http://localhost:4001 ws://localhost:4001", // PostGraphile endpoints
					"frame-src 'self'", // Allow same-origin iframe embedding for document preview
					"frame-ancestors 'self'", // Allow being embedded in same-origin iframes
					"base-uri 'self'",
					"form-action 'self'"
				].join('; ')
			);

			// Add cache control for static assets
			if (url.includes('/static/') || url.includes('/_app/')) {
				response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
			} else if (url.includes('/api/')) {
				// API responses should not be cached by default
				response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
			} else {
				// HTML pages can be cached briefly
				response.headers.set('Cache-Control', 'public, max-age=60');
			}

			// Compress responses for better performance
			const contentType = response.headers.get('content-type') || '';
			if (contentType.includes('text/') || contentType.includes('application/json')) {
				response.headers.set('Content-Encoding', 'gzip');
			}

			// Track metrics for monitoring (in production, send to monitoring service)
			if (duration > 100) {
				// Only track significant requests
				// In production, you'd send this to your monitoring service
				// For now, we'll just log it
				const userAgent = event.request.headers.get('user-agent') || 'unknown';
				const isBot = /bot|crawler|spider/i.test(userAgent);

				if (!isBot) {
					// Exclude bots from performance metrics
					// This would typically go to your metrics service
					console.log(
						JSON.stringify({
							timestamp: new Date().toISOString(),
							type: 'server_request',
							method,
							url,
							status,
							duration,
							userAgent: userAgent.slice(0, 100) // Truncate for privacy
						})
					);
				}
			}

			return response;
		}
	});

	return performanceResponse;
};

// Error handling hook with standardized error responses
export const handleError = ({ error, event }: { error: any; event: any }) => {
	// Create standardized error response
	const standardError = createStandardError(error, {
		requestId: crypto.randomUUID(),
		userId: event?.locals?.user?.id,
		path: event?.url?.pathname,
		operation: `${event?.request?.method || 'GET'} ${event?.url?.pathname || 'unknown'}`
	});

	// Log structured error for monitoring
	console.error(`❌ Server Error [${standardError.requestId}]:`, {
		type: standardError.type,
		message: standardError.message,
		userMessage: standardError.userMessage,
		statusCode: standardError.statusCode,
		url: event?.url?.pathname,
		method: event?.request?.method,
		userId: event?.locals?.user?.id,
		userAgent: event?.request?.headers?.get('user-agent')?.slice(0, 100),
		timestamp: standardError.timestamp,
		stack: error?.stack
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
};

console.log('🛡️  Server performance optimization and monitoring initialized');

// Initialize event reminder scheduler
import { ReminderScheduler } from '$lib/server/reminder-scheduler';

// Start the reminder scheduler on server startup
if (process.env.ENABLE_REMINDER_SCHEDULER !== 'false') {
	ReminderScheduler.start();
	console.log('⏰ Event reminder scheduler started');
} else {
	console.log('⏰ Event reminder scheduler disabled (ENABLE_REMINDER_SCHEDULER=false)');
}
