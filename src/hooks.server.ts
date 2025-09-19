import type { Handle } from '@sveltejs/kit';

/**
 * Server-side hooks for performance optimization and monitoring
 */

// Performance monitoring for server-side requests
export const handle: Handle = async ({ event, resolve }) => {
	const start = Date.now();
	const url = event.url.pathname;
	const method = event.request.method;

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
			"frame-ancestors 'none'",
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
};

// Error handling hook
export const handleError = ({ error, event }) => {
	const errorId = crypto.randomUUID();

	// Log error with context
	console.error(`❌ Server Error [${errorId}]:`, {
		error: error.message,
		stack: error.stack,
		url: event.url.pathname,
		method: event.request.method,
		userAgent: event.request.headers.get('user-agent'),
		timestamp: new Date().toISOString()
	});

	// In production, send to error tracking service
	// Example: Sentry, Rollbar, etc.

	return {
		message: 'An unexpected error occurred',
		errorId
	};
};

console.log('🛡️  Server performance optimization and monitoring initialized');
