// Security Logic
import type { RequestEvent } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { logger } from '$lib/utils/logger.js';

export function detectSuspiciousParams(event: RequestEvent, requestId: string): void {
	const pathname = event.url.pathname;
	const userAgent = event.request.headers.get('user-agent');

	// SECURITY: Detect potential credential leakage in URLs
	const suspiciousParams = ['password', 'pass', 'pwd', 'token', 'secret', 'key'];
	for (const param of suspiciousParams) {
		if (event.url.searchParams.has(param)) {
			// Log security alert
			logger.error('[SECURITY ALERT] Sensitive parameter detected in URL', undefined, {
				pathname,
				parameter: param,
				timestamp: new Date().toISOString(),
				ip: event.getClientAddress(),
				requestId,
				userAgent: userAgent?.slice(0, 100)
			});

			logger.warn(`[SECURITY] Credential parameter '${param}' detected in URL: ${pathname}`, {
				requestId,
				ip: event.getClientAddress()
			});

			// Redirect to clean URL to prevent exposure in logs and history
			const cleanUrl = new URL(event.url);
			cleanUrl.searchParams.delete(param);
			throw redirect(302, cleanUrl.toString());
		}
	}
}

export function applySecurityHeaders(response: Response, pathname: string): void {
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

	// Referrer policy - prevent credential disclosure in referrer headers
	// Using 'no-referrer' for maximum security (was 'strict-origin-when-cross-origin')
	response.headers.set('Referrer-Policy', 'no-referrer');

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
		"connect-src 'self' http://localhost:4000 https://cloudflareinsights.com https://*.ingest.us.sentry.io", // Allow backend GraphQL, Cloudflare and Sentry
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
}
