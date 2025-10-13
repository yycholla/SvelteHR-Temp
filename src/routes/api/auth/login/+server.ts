// Authentication endpoint - Login with Rust GraphQL API
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { getAccessTokenName, getCookieOptions } from '$lib/auth/config.js';
import { getApiBaseUrl } from '$lib/server/api-url.js';

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		console.log('[Login] === LOGIN ATTEMPT START ===');
		const { email, password } = await request.json();
		console.log('[Login] Credentials received:', { email, hasPassword: !!password });

		if (!email || !password) {
			console.log('[Login] Missing credentials');
			return json({
				success: false,
				error: 'Email and password are required'
			}, { status: 400 });
		}

		// Call Rust GraphQL API login endpoint
		console.log('[Login] Calling Rust API /auth/login...');
		const apiBaseUrl = getApiBaseUrl();
		const loginUrl = `${apiBaseUrl}/auth/login`;
		console.log('[Login] Login URL:', loginUrl);

		const loginResponse = await fetch(loginUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ email, password })
		});

		console.log('[Login] API response status:', loginResponse.status);

		if (!loginResponse.ok) {
			const errorData = await loginResponse.json();
			console.log('[Login] API error response:', errorData);
			return json({
				success: false,
				error: errorData.error || 'Authentication failed',
				message: errorData.message
			}, { status: loginResponse.status });
		}

		const loginData = await loginResponse.json();
		console.log('[Login] Login successful, user:', loginData.user.email);

		// Set cookie with the JWT token from Rust API
		console.log('[Login] Setting authentication cookie...');
		const tokenName = getAccessTokenName();
		const cookieOptions = getCookieOptions();

		cookies.set(tokenName, loginData.token, {
			...cookieOptions,
			path: '/',
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			maxAge: 24 * 60 * 60 // 24 hours
		});
		console.log('[Login] Cookie set successfully');

		// Return response
		console.log('[Login] === LOGIN ATTEMPT SUCCESSFUL ===');
		return json({
			success: true,
			token: loginData.token,
			user: loginData.user,
			message: 'Login successful'
		});

	} catch (error) {
		console.log('[Login] === LOGIN ATTEMPT FAILED ===');
		console.error('[Login] FATAL ERROR:', error);
		console.error('[Login] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
		return json({
			success: false,
			error: 'Authentication failed',
			message: error instanceof Error ? error.message : 'Unknown error',
			debug: process.env.NODE_ENV !== 'production' ? {
				error: String(error),
				stack: error instanceof Error ? error.stack : undefined
			} : undefined
		}, { status: 500 });
	}
};
