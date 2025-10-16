import type { Handle } from '@sveltejs/kit';
import { serverPerformanceMonitor } from '$lib/performance/server-monitor.js';
import { createStandardError } from '$lib/utils/error-handling.js';
import { redirect } from '@sveltejs/kit';

/**
 * Server-side hooks for session-based authentication, performance optimization and monitoring
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

// Helper function to authenticate user via session validation
async function authenticateUser(): Promise<{
	user: any;
	roles: string[];
	permissions: string[];
} | null> {
	try {
		console.log(`🔐 Validating session with backend`);

		// Call the Rust backend's session verification endpoint
		const response = await fetch('http://localhost:4000/auth/me', {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json'
			}
			// Cookies will be sent automatically
		});

		if (!response.ok) {
			if (response.status === 401) {
				console.log(`❌ Session invalid or expired`);
				return null;
			}
			console.error(`❌ Session validation failed with status: ${response.status}`);
			return null;
		}

		const userData = await response.json();
		console.log(`✅ User authenticated via session:`, userData);

		// Transform to expected format
		return {
			user: userData,
			roles: [userData.role],
			permissions: [] // TODO: Add permissions from backend
		};
	} catch (error) {
		console.error(`❌ Session validation error:`, error);
		return null;
	}
}

export const handle: Handle = async ({ event, resolve }) => {
	// Start performance monitoring
	const startTime = Date.now();

	try {
		// Check if this is a public route
		const isPublicRoute = PUBLIC_ROUTES.some((route) => {
			if (route === '/') return event.url.pathname === '/';
			return event.url.pathname.startsWith(route);
		});

		console.log(`🌐 ${event.request.method} ${event.url.pathname} (public: ${isPublicRoute})`);

		let authResult = null;

		// Try to authenticate user if not a public route
		if (!isPublicRoute) {
			authResult = await authenticateUser();

			if (!authResult) {
				console.log(`🚫 Access denied to ${event.url.pathname} - redirecting to login`);
				const redirectTo = encodeURIComponent(event.url.pathname + event.url.search);
				throw redirect(303, `/login?redirectTo=${redirectTo}`);
			}
		}

		// Add user context to locals if authenticated
		if (authResult) {
			event.locals.user = authResult.user;
			event.locals.roles = authResult.roles;
			event.locals.permissions = authResult.permissions;
			console.log(
				`👤 User ${authResult.user.email} authenticated with roles: ${authResult.roles.join(', ')}`
			);
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

		// Add performance metrics to response headers
		response.headers.set('X-Response-Time', `${duration}ms`);

		return response;
	} catch (error) {
		// Handle authentication errors
		if (error instanceof Response && error.status === 303) {
			throw error; // Re-throw redirects
		}

		console.error('Handle error:', error);

		// Return error response
		return new Response(JSON.stringify({ error: 'Internal server error', code: 'SERVER_ERROR' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
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
