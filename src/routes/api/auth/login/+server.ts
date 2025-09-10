import type { RequestHandler } from './$types';
import { redirect } from '@sveltejs/kit';

/**
 * GET /api/auth/login - Redirect to GelDB authentication
 * 
 * This endpoint initiates the GelDB authentication flow by redirecting
 * the user to the GelDB auth UI with appropriate parameters.
 */
export const GET: RequestHandler = async ({ url, cookies }) => {
	try {
		// Get redirect parameter
		const redirectTo = url.searchParams.get('redirectTo') || '/home';
		
		// For now, since we're using mock auth, redirect to a mock login flow
		// In production, this would redirect to the actual GelDB auth URL
		
		// Check if we're in development and use mock auth
		if (process.env.NODE_ENV === 'development') {
			// For development, we'll simulate a successful login with admin user
			// This would normally be handled by GelDB's authentication flow
			
			// Generate mock token for development
			const mockAccessToken = `dev_token_${Date.now()}_${Math.random().toString(36)}`;
			
			// Set mock authentication cookie
			cookies.set('hr_token', mockAccessToken, {
				httpOnly: true,
				secure: false, // false for development
				sameSite: 'lax',
				maxAge: 24 * 60 * 60, // 1 day
				path: '/'
			});
			
			// Store mock token data (in production this would be handled by GelDB)
			// This is a simple in-memory store for development
			global.mockTokens = global.mockTokens || new Map();
			global.mockTokens.set(mockAccessToken, {
				userId: 'admin-user-id',
				expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
				user: {
					id: 'admin-user-id',
					email: 'admin@example.com',
					firstName: 'Admin',
					lastName: 'User',
					roles: ['Admin', 'HR_Manager', 'Manager', 'Employee'],
					permissions: ['*'],
					isActive: true
				}
			});
			
			// Redirect to the intended destination
			throw redirect(303, redirectTo);
		}
		
		// Production: Redirect to actual GelDB authentication URL
		const geldbAuthUrl = process.env.GELDB_AUTH_URL || 'https://your-geldb-instance.com/auth';
		const clientId = process.env.GELDB_CLIENT_ID;
		const redirectUri = `${url.origin}/api/auth/callback`;
		
		if (!clientId) {
			throw new Error('GELDB_CLIENT_ID not configured');
		}
		
		// Build GelDB OAuth URL
		const authUrl = new URL(geldbAuthUrl);
		authUrl.searchParams.set('client_id', clientId);
		authUrl.searchParams.set('redirect_uri', redirectUri);
		authUrl.searchParams.set('response_type', 'code');
		authUrl.searchParams.set('scope', 'openid profile email');
		authUrl.searchParams.set('state', encodeURIComponent(redirectTo));
		
		// Redirect to GelDB authentication
		throw redirect(303, authUrl.toString());
		
	} catch (error) {
		console.error('Login redirect error:', error);
		
		// If redirect error, try to redirect to login page with error
		throw redirect(303, `/login?error=auth_redirect_failed`);
	}
};

/**
 * POST /api/auth/login - Handle direct login (for API clients)
 * 
 * This endpoint handles direct authentication for API clients
 * that can't follow browser redirects.
 */
export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const { email, password } = await request.json();
		
		// Use the existing auth API for login
		const authResponse = await fetch(new URL('/api/auth', request.url), {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				action: 'login',
				email,
				password
			})
		});
		
		if (!authResponse.ok) {
			const error = await authResponse.json();
			return new Response(JSON.stringify(error), {
				status: authResponse.status,
				headers: { 'Content-Type': 'application/json' }
			});
		}
		
		const result = await authResponse.json();
		
		// Set cookies (these should be set by the auth API, but let's ensure they are)
		if (result.accessToken) {
			cookies.set('hr_token', result.accessToken, {
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'lax',
				maxAge: result.expiresIn || 24 * 60 * 60,
				path: '/'
			});
		}
		
		return new Response(JSON.stringify(result), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
		
	} catch (error) {
		console.error('Direct login error:', error);
		return new Response(JSON.stringify({ 
			success: false, 
			error: 'Authentication failed' 
		}), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};