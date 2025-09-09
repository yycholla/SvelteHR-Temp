import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import crypto from 'crypto';

/**
 * Magic Link Verification Handler
 * 
 * Verifies magic link tokens and establishes user sessions.
 * This is the endpoint users click from their email to complete authentication.
 */
export const load: PageServerLoad = async ({ url, cookies }) => {
	const token = url.searchParams.get('token');
	const redirectTo = url.searchParams.get('redirectTo') || '/dashboard';

	if (!token) {
		console.error('Magic link verification: Missing token');
		throw redirect(303, '/login?error=invalid_magic_link');
	}

	try {
		// TODO: Verify token with backend database
		// For now, we'll simulate token verification
		
		// In production, this would:
		// 1. Query the backend to find the token
		// 2. Check if token is expired
		// 3. Check if token is already used
		// 4. Get user information associated with the token
		
		console.log('Verifying magic link token:', token.substring(0, 8) + '...');
		
		// Simulate token verification success
		const mockUser = {
			id: '550e8400-e29b-41d4-a716-446655440000',
			email: 'user@company.com', // In production, get from token lookup
			full_name: 'Test User',
			roles: [{ name: 'Employee', level: 25 }],
			permissions: ['profile:read', 'profile:update']
		};

		// Generate JWT token for the session
		const jwtPayload = {
			userId: mockUser.id,
			email: mockUser.email,
			roles: mockUser.roles,
			permissions: mockUser.permissions,
			iat: Math.floor(Date.now() / 1000),
			exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
		};

		// In production, this would be signed with a secret key
		const mockJwtToken = Buffer.from(JSON.stringify(jwtPayload)).toString('base64');
		
		// Set secure authentication cookie
		cookies.set('gel-auth-token', mockJwtToken, {
			path: '/',
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict',
			maxAge: 24 * 60 * 60 // 24 hours
		});

		// Clear any old cookies
		cookies.delete('hr_token', { path: '/' });

		console.log('Magic link verification successful for user:', mockUser.email);
		console.log('Redirecting to:', redirectTo);

		// TODO: Mark token as used in backend
		
		// Redirect to target page
		throw redirect(303, redirectTo);

	} catch (err: any) {
		console.error('Magic link verification failed:', err);
		
		// If this is already a redirect, re-throw it
		if (err.status === 303) {
			throw err;
		}
		
		// Handle different error types
		if (err.message?.includes('expired')) {
			throw redirect(303, '/login?error=magic_link_expired');
		}
		
		if (err.message?.includes('used')) {
			throw redirect(303, '/login?error=magic_link_used');
		}
		
		// Generic error
		throw redirect(303, '/login?error=magic_link_invalid');
	}
};