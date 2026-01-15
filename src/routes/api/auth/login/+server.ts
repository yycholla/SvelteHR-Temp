import { logger } from '$lib/utils/logger';
// Authentication endpoint - Login with Rust GraphQL API
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { getAccessTokenName, getCookieOptions } from '$lib/auth/config.js';
import { getApiBaseUrl } from '$lib/server/api-url.js';
import {
	clearRateLimit,
	isRateLimited,
	recordFailedLogin
} from '$lib/server/hooks/rate-limiter.js';

export const POST: RequestHandler = async ({ request, cookies, getClientAddress }) => {
	try {
		logger.info('[Login] === LOGIN ATTEMPT START ===');

		// Get client IP for rate limiting
		const clientIp = getClientAddress();

		// Check rate limiting
		if (isRateLimited(clientIp)) {
			logger.warn('[Login] Rate limit exceeded', { clientIp });
			return json(
				{
					success: false,
					error: 'Too many login attempts',
					message:
						'Your account has been temporarily locked due to too many failed login attempts. Please try again in 1 hour.'
				},
				{ status: 429 } // Too Many Requests
			);
		}

		// Support both JSON and form-encoded requests for graceful degradation
		const contentType = request.headers.get('content-type') || '';
		let email: string;
		let password: string;
		let rememberMe = false;

		if (contentType.includes('application/json')) {
			// Current JSON-based submission (JavaScript enabled)
			const body = await request.json();
			email = body.email;
			password = body.password;
			rememberMe = body.rememberMe || false;
			logger.info('[Login] JSON credentials received:', { email, hasPassword: !!password });
		} else if (
			contentType.includes('application/x-www-form-urlencoded') ||
			contentType.includes('multipart/form-data')
		) {
			// Fallback form submission (JavaScript disabled or failed to load)
			const formData = await request.formData();
			email = formData.get('email') as string;
			password = formData.get('password') as string;
			rememberMe = formData.get('rememberMe') === 'on' || formData.get('rememberMe') === 'true';
			logger.info('[Login] Form-data credentials received (JS fallback):', {
				email,
				hasPassword: !!password
			});
		} else {
			logger.warn('[Login] Invalid content type', { contentType });
			recordFailedLogin(clientIp);
			return json(
				{
					success: false,
					error: 'Invalid content type',
					message: 'Request must be JSON or form-encoded'
				},
				{ status: 400 }
			);
		}

		if (!email || !password) {
			logger.info('[Login] Missing credentials');
			recordFailedLogin(clientIp); // Record failed attempt
			return json(
				{
					success: false,
					error: 'Email and password are required'
				},
				{ status: 400 }
			);
		}

		// Call Rust GraphQL API login endpoint
		logger.info('[Login] Calling Rust API /auth/login...');
		const apiBaseUrl = getApiBaseUrl();
		const loginUrl = `${apiBaseUrl}/auth/login`;
		logger.info('[Login] Login URL', { loginUrl });

		const loginResponse = await fetch(loginUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ email, password })
		});

		logger.info('[Login] API response status', { status: loginResponse.status });

		if (!loginResponse.ok) {
			const errorData = await loginResponse.json();
			logger.info('[Login] API error response', { errorData });

			// Record failed login attempt
			recordFailedLogin(clientIp);

			return json(
				{
					success: false,
					error: errorData.error || 'Authentication failed',
					message: errorData.message
				},
				{ status: loginResponse.status }
			);
		}

		const loginData = await loginResponse.json();
		logger.info('[Login] Login successful', { userEmail: loginData.user.email });
		logger.info('[Login] Force password change', {
			forcePasswordChange: loginData.user.force_password_change
		});

		// Clear rate limit on successful login
		clearRateLimit(clientIp);

		// Extract Set-Cookie headers from Rust backend response and forward to browser
		const setCookieHeaders = loginResponse.headers.getSetCookie?.() || [];
		logger.info('[Login] Forwarding session cookies from Rust backend', {
			cookieCount: setCookieHeaders.length
		});

		// Parse and set each cookie in SvelteKit
		for (const cookieHeader of setCookieHeaders) {
			// Parse cookie string: "name=value; Path=/; HttpOnly; Secure; SameSite=Lax"
			const match = cookieHeader.match(/^([^=]+)=([^;]+)/);
			if (match) {
				const [, name, value] = match;

				// Extract cookie attributes
				const options: any = {
					path: '/',
					httpOnly: cookieHeader.includes('HttpOnly'),
					secure: cookieHeader.includes('Secure'),
					sameSite: cookieHeader.includes('SameSite=Strict')
						? 'strict'
						: cookieHeader.includes('SameSite=Lax')
							? 'lax'
							: cookieHeader.includes('SameSite=None')
								? 'none'
								: 'lax'
				};

				// Extract Max-Age or Expires
				const maxAgeMatch = cookieHeader.match(/Max-Age=(\d+)/);
				if (maxAgeMatch) {
					options.maxAge = parseInt(maxAgeMatch[1]);
				}

				logger.info('[Login] Setting cookie', {
					name,
					httpOnly: options.httpOnly,
					secure: options.secure
				});
				cookies.set(name, value, options);
			}
		}

		// Return response with user data
		logger.info('[Login] === LOGIN ATTEMPT SUCCESSFUL ===');
		return json({
			success: true,
			user: loginData.user,
			sessionExpires: loginData.session_expires,
			message: 'Login successful'
		});
	} catch (error) {
		logger.info('[Login] === LOGIN ATTEMPT FAILED ===');
		logger.error('[Login] FATAL ERROR', error as Error);
		logger.error('[Login] Error stack', undefined, {
			stack: error instanceof Error ? error.stack : 'No stack trace'
		});

		// Security: Don't expose internal errors in production
		const isProduction = process.env.NODE_ENV === 'production';

		return json(
			{
				success: false,
				error: 'Authentication failed',
				message: isProduction
					? 'An unexpected error occurred. Please try again later.'
					: error instanceof Error
						? error.message
						: 'Unknown error',
				debug: !isProduction
					? {
							error: String(error),
							stack: error instanceof Error ? error.stack : undefined
						}
					: undefined
			},
			{ status: 500 }
		);
	}
};
