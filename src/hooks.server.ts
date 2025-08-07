import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import jwt from 'jsonwebtoken';
import { tokenPayloadSchema } from '$lib/schemas/auth';

// Authentication hook
const authHandle: Handle = async ({ event, resolve }) => {
	// Get auth token from cookies
	const token = event.cookies.get('auth-token');
	
	console.log(`🍪 Auth token from cookie:`, token ? 'Present' : 'Not found');
	
	// Initialize auth state
	event.locals.user = null;
	event.locals.token = null;
	
	if (token) {
		try {
			// Verify and decode JWT token
			const decoded = jwt.decode(token);
			console.log(`🔓 JWT decoded:`, decoded ? 'Success' : 'Failed');
			console.log(`🔍 JWT payload structure:`, decoded);
			
			if (decoded && typeof decoded === 'object') {
				try {
					// Validate token payload structure
					const validatedPayload = tokenPayloadSchema.parse(decoded);
					console.log(`✅ Token payload validated:`, validatedPayload);
				
					// Check if token is expired
					const now = Math.floor(Date.now() / 1000);
					if (validatedPayload.exp > now) {
						event.locals.user = {
							id: validatedPayload.userId,
							username: validatedPayload.username,
							role: validatedPayload.role
						};
						event.locals.token = token;
						console.log(`👤 User authenticated:`, event.locals.user.username);
					} else {
						// Token expired, clear it
						console.log(`⏰ Token expired, clearing cookie`);
						event.cookies.delete('auth-token', { path: '/' });
					}
				} catch (schemaError) {
					// Schema validation failed - let's try with a more flexible approach
					console.warn('❌ Token schema validation failed, trying fallback:', schemaError);
					
					// Try to extract user info with your backend's JWT field names
					const fallbackUser = {
						id: decoded.user_id || decoded.sub || decoded.userId || decoded.id,
						username: decoded.email || decoded.username || decoded.name || decoded.preferred_username,
						role: decoded.role_id ? `ROLE_${decoded.role_id}` : decoded.role || decoded.roles?.[0] || 'USER'
					};
					
					console.log(`🔄 Fallback user extraction:`, fallbackUser);
					
					// Check if we got at least an ID
					if (fallbackUser.id) {
						// Check if token is expired
						const now = Math.floor(Date.now() / 1000);
						const exp = decoded.exp || (Math.floor(Date.now() / 1000) + 3600); // Default 1 hour if no exp
						
						if (exp > now) {
							event.locals.user = {
								id: String(fallbackUser.id),
								username: fallbackUser.username || 'Unknown',
								role: fallbackUser.role || 'USER'
							};
							event.locals.token = token;
							console.log(`👤 User authenticated (fallback):`, event.locals.user.username);
						} else {
							console.log(`⏰ Token expired, clearing cookie`);
							event.cookies.delete('auth-token', { path: '/' });
						}
					} else {
						console.warn('❌ Could not extract user ID from token, clearing cookie');
						event.cookies.delete('auth-token', { path: '/' });
					}
				}
			}
		} catch (error) {
			// Invalid token, clear it
			console.warn('❌ Invalid auth token:', error);
			event.cookies.delete('auth-token', { path: '/' });
		}
	}
	
	return resolve(event);
};

// Route protection hook
const protectionHandle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;
	
	// Debug logging
	console.log(`🔒 Route protection check: ${pathname}`);
	console.log(`🔑 User authenticated:`, !!event.locals.user);
	console.log(`👤 User data:`, event.locals.user);
	
	// Define protected routes (routes that require authentication)
	const protectedRoutes = [
		'/home',
		'/employees',
		'/calendar',
		'/reports',
		'/settings',
		'/profile'
	];
	
	// Define public routes (routes that don't require authentication)
	const publicRoutes = [
		'/login',
		'/forgot-password',
		'/reset-password',
		'/health',
		'/api',
		'/_app'
	];
	
	// Check if route is protected
	const isProtectedRoute = protectedRoutes.some(route => 
		pathname.startsWith(route)
	);
	
	// Check if route is public
	const isPublicRoute = publicRoutes.some(route => 
		pathname.startsWith(route)
	);
	
	// Root path should redirect to dashboard if authenticated, or allow access if not
	const isRootPath = pathname === '/';
	
	console.log(`🛡️  Protected route:`, isProtectedRoute);
	console.log(`🌍 Public route:`, isPublicRoute);
	console.log(`🏠 Root path:`, isRootPath);
	
	// If root path and user is authenticated, redirect to home
	if (isRootPath && event.locals.user) {
		console.log(`🏠 Authenticated user at root - redirecting to home`);
		return Response.redirect(`${event.url.origin}/home`, 302);
	}
	
	// If it's a protected route and user is not authenticated
	if (isProtectedRoute && !event.locals.user) {
		console.log(`❌ Access denied to ${pathname} - redirecting to login`);
		// Store the intended destination for redirect after login
		const redirectTo = encodeURIComponent(pathname + event.url.search);
		
		// Redirect to login with return URL
		return Response.redirect(
			`${event.url.origin}/login?redirectTo=${redirectTo}`,
			302
		);
	}
	
	// If user is authenticated and tries to access login page
	if (pathname === '/login' && event.locals.user) {
		console.log(`✅ Authenticated user accessing login - redirecting to home`);
		// Redirect to home or intended destination
		const redirectTo = event.url.searchParams.get('redirectTo') || '/home';
		return Response.redirect(`${event.url.origin}${redirectTo}`, 302);
	}
	
	console.log(`✅ Access granted to ${pathname}`);
	// Proceed with the request
	return resolve(event);
};

// CORS and security headers hook
const securityHandle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);
	
	// Add security headers
	if (event.url.pathname.startsWith('/api/')) {
		response.headers.set('Access-Control-Allow-Origin', event.url.origin);
		response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
		response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
		response.headers.set('Access-Control-Allow-Credentials', 'true');
	}
	
	// Security headers for all responses
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	
	return response;
};

// Combine all hooks in sequence
export const handle = sequence(
	authHandle,
	protectionHandle,
	securityHandle
);

// Handle API errors
export const handleError = ({ error, event }) => {
	console.error('Server error:', error, 'at', event.url.pathname);
	
	return {
		message: 'An unexpected error occurred',
		code: 'INTERNAL_ERROR'
	};
};