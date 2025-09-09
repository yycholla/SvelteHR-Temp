import type { Handle, HandleFetch, HandleServerError } from '@sveltejs/kit';
import { redirect, error } from '@sveltejs/kit';
import { backendIntegrationService } from '$lib/services/backend-integration.service.js';
import type { User } from '$lib/auth';

/**
 * Enhanced SvelteKit Authentication Middleware (hooks.server.ts)
 * 
 * Handles authentication for all server-side requests using both GelDB integration
 * and comprehensive RBAC enforcement. Includes security headers, rate limiting,
 * and error handling to meet production security standards.
 */

// Environment configuration
const API_URL = process.env.PUBLIC_API_URL || 'http://localhost:8080';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Routes that don't require authentication
const publicRoutes = [
	'/',
	'/login', 
	'/login-simple', 
	'/login-working', 
	'/privacy', 
	'/terms', 
	'/auth/reset-password',
	'/auth/sso/callback',
	'/auth/callback',
	'/offline',
	'/api/auth/login',
	'/api/auth/logout', 
	'/api/auth/refresh',
	'/api/auth/reset-password',
	'/api/health'
];

// API routes that should be proxied to backend
const PROXY_API_ROUTES = ['/api/v2', '/api/graphql'];

// Rate limiting storage (in production, use Redis or similar)
const rateLimits = new Map<string, { count: number; resetTime: number }>();

// Check if a route is public
function isPublicRoute(pathname: string): boolean {
	return publicRoutes.some((route) => pathname === route || pathname.startsWith(route + '/')) || 
		   pathname.startsWith('/_app/') || 
		   pathname.startsWith('/favicon') ||
		   pathname.startsWith('/.well-known/');
}

export const handle: Handle = async ({ event, resolve }) => {
	const { url, cookies } = event;
	const pathname = url.pathname;

	// Apply rate limiting for authentication routes
	if (pathname.startsWith('/api/auth/')) {
		const clientIP = event.getClientAddress();
		const rateLimitKey = `auth_${clientIP}`;
		const rateLimit = checkRateLimit(rateLimitKey, 10, 60000); // 10 requests per minute
		
		if (!rateLimit.allowed) {
			throw error(429, {
				message: 'Too many authentication attempts',
				retryAfter: rateLimit.retryAfter
			});
		}
	}

	// Initialize locals with enhanced RBAC properties
	event.locals.user = null;
	event.locals.isAuthenticated = false;
	event.locals.permissions = [];
	event.locals.roles = [];
	event.locals.token = null;

	// Skip authentication for public routes and static assets
	if (isPublicRoute(pathname)) {
		return await resolveWithSecurityHeaders(event, resolve);
	}

	// Get auth tokens from cookies with fallback priority
	const gelToken = cookies.get('gel-auth-token');
	const hrToken = cookies.get('hr_token');
	const authToken = cookies.get('auth-token');
	const fallbackToken = hrToken || authToken;

	let authSuccess = false;

	// Primary auth flow: GelDB token
	if (gelToken) {
		try {
			const authResponse = await backendIntegrationService.verifyAuthToken(gelToken);
			
			if (authResponse.user && authResponse.authenticated) {
				event.locals.user = authResponse.user;
				event.locals.isAuthenticated = true;
				event.locals.permissions = authResponse.permissions || [];
				event.locals.roles = authResponse.user.roles || [];
				event.locals.token = gelToken;
				authSuccess = true;
			}

		} catch (error: any) {
			console.error('GelDB token verification failed:', error);
			
			// Clear invalid token
			cookies.delete('gel-auth-token', {
				path: '/',
				httpOnly: true,
				secure: true,
				sameSite: 'strict'
			});
		}
	} 
	
	// Fallback auth flow: Legacy JWT tokens (for backward compatibility)
	if (!authSuccess && fallbackToken) {
		try {
			// First try backend integration service
			const authResponse = await backendIntegrationService.verifyAuthToken(fallbackToken);
			
			if (authResponse.user && authResponse.authenticated) {
				event.locals.user = authResponse.user;
				event.locals.isAuthenticated = true;
				event.locals.permissions = authResponse.permissions || [];
				event.locals.roles = authResponse.user.roles || [];
				event.locals.token = fallbackToken;
				authSuccess = true;
			}

		} catch (backendError: any) {
			// Fallback to direct API verification
			try {
				const verifyResponse = await fetch(`${API_URL}/api/v2/auth/verify`, {
					method: 'GET',
					headers: {
						'Authorization': `Bearer ${fallbackToken}`,
						'Content-Type': 'application/json',
						'User-Agent': 'SvelteHR-Server/1.0',
						'X-Forwarded-For': event.getClientAddress(),
						'X-Original-Host': event.request.headers.get('host') || 'localhost:5173'
					}
				});
				
				if (verifyResponse.ok) {
					const authData = await verifyResponse.json();
					
					if (authData.user && authData.authenticated) {
						event.locals.user = authData.user;
						event.locals.isAuthenticated = true;
						event.locals.permissions = authData.permissions || [];
						event.locals.roles = authData.user.roles || [];
						event.locals.token = fallbackToken;
						authSuccess = true;
					}
				}
			} catch (apiError) {
				console.error('Direct API token verification failed:', apiError);
			}
			
			// Clear invalid tokens if all verification methods failed
			if (!authSuccess) {
				console.error('All token verification methods failed:', backendError);
				
				cookies.delete('hr_token', {
					path: '/',
					httpOnly: true,
					secure: true,
					sameSite: 'strict'
				});
				cookies.delete('auth-token', {
					path: '/',
					httpOnly: true,
					secure: true,
					sameSite: 'strict'
				});
			}
		}
	}

	// Route protection: Check if route requires authentication
	if (!authSuccess) {
		const redirectTo = encodeURIComponent(pathname + url.search);
		const loginUrl = `/login?redirectTo=${redirectTo}`;
		
		console.log(`Unauthenticated access to protected route: ${pathname}, redirecting to: ${loginUrl}`);
		throw redirect(302, loginUrl);
	}

	// Enhanced RBAC: Check route-specific permissions
	const hasRouteAccess = await checkRoutePermissions(pathname, event.locals.user!);
	
	if (!hasRouteAccess) {
		throw error(403, {
			message: 'Insufficient permissions to access this page',
			code: 'ROUTE_ACCESS_DENIED'
		});
	}

	// Resolve request with security headers
	return await resolveWithSecurityHeaders(event, resolve);
};

/**
 * Handle fetch requests - Enhanced with proxy support
 */
export const handleFetch: HandleFetch = async ({ request, fetch }) => {
	const url = new URL(request.url);
	
	// Proxy API requests to backend
	if (PROXY_API_ROUTES.some(route => url.pathname.startsWith(route))) {
		const backendUrl = `${API_URL}${url.pathname}${url.search}`;
		
		const backendRequest = new Request(backendUrl, {
			method: request.method,
			headers: request.headers,
			body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined
		});
		
		return fetch(backendRequest);
	}
	
	return fetch(request);
};

/**
 * Enhanced server error handling
 */
export const handleError: HandleServerError = ({ error: err, event }) => {
	const errorId = crypto.randomUUID();
	
	// Log error with context
	console.error(`Server Error [${errorId}]:`, {
		url: event.url.pathname,
		method: event.request.method,
		userAgent: event.request.headers.get('user-agent'),
		userId: event.locals.user?.id || 'anonymous',
		timestamp: new Date().toISOString(),
		error: err
	});
	
	return {
		message: NODE_ENV === 'development' ? 
			`Server error: ${err.message}` : 
			'An unexpected error occurred',
		errorId
	};
};

/**
 * Resolve request with comprehensive security headers
 */
async function resolveWithSecurityHeaders(event: any, resolve: any) {
	const response = await resolve(event, {
		transformPageChunk: ({ html }) => {
			// Inject security meta tags
			return html.replace(
				'<head>',
				`<head>
					<meta http-equiv="X-Content-Type-Options" content="nosniff">
					<meta http-equiv="X-Frame-Options" content="DENY">
					<meta http-equiv="X-XSS-Protection" content="1; mode=block">
					<meta name="referrer" content="strict-origin-when-cross-origin">`
			);
		}
	});
	
	// Set comprehensive security headers
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-XSS-Protection', '1; mode=block');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	
	if (NODE_ENV === 'production') {
		response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
		response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
	}
	
	// Add CORS headers for API routes
	if (event.url.pathname.startsWith('/api/')) {
		const origin = event.request.headers.get('origin');
		const allowedOrigins = [
			'http://localhost:5173',
			'https://app.company.com',
			'https://staging.company.com'
		];
		
		if (origin && allowedOrigins.includes(origin)) {
			response.headers.set('Access-Control-Allow-Origin', origin);
			response.headers.set('Access-Control-Allow-Credentials', 'true');
		}
		
		response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
		response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
	}
	
	// Development debugging headers
	if (NODE_ENV === 'development') {
		response.headers.set('X-Auth-Status', event.locals.isAuthenticated ? 'authenticated' : 'anonymous');
		if (event.locals.user) {
			response.headers.set('X-User-ID', event.locals.user.id);
			response.headers.set('X-User-Role', event.locals.user.role || 'unknown');
			response.headers.set('X-User-Permissions', (event.locals.permissions || []).slice(0, 5).join(','));
		}
	}

	return response;
}

/**
 * Enhanced route permission checking with RBAC
 */
async function checkRoutePermissions(pathname: string, user: User): Promise<boolean> {
	if (!user) return false;
	
	// Admin wildcard access
	if (user.permissions?.includes('*')) {
		return true;
	}
	
	// Route-based permission mapping
	const routePermissions: Record<string, string[]> = {
		// Employee self-service routes
		'/profile': ['profile:read'],
		'/timesheet': ['timesheet:read', 'timesheet:write'],
		'/leave': ['leave:create', 'leave:read'],
		'/documents': ['documents:own'],
		
		// Manager routes
		'/team': ['team:manage', 'employees:read'],
		'/approvals': ['approvals:manage'],
		'/reports/team': ['reports:team'],
		
		// HR Manager routes
		'/employees': ['employees:read', 'employees:*'],
		'/hr': ['employees:*', 'payroll:read'],
		'/payroll': ['payroll:read', 'payroll:*'],
		'/compliance': ['compliance:*'],
		'/recruitment': ['recruitment:*'],
		'/reports/hr': ['reports:hr'],
		
		// Admin routes
		'/admin': ['*'],
		'/users': ['*'],
		'/system': ['*'],
		'/audit': ['audit:read', '*'],
		'/settings': ['*']
	};
	
	// Check exact match first
	const requiredPermissions = routePermissions[pathname];
	if (requiredPermissions) {
		return hasAnyPermission(user, requiredPermissions);
	}
	
	// Check prefix matches
	for (const [routePath, permissions] of Object.entries(routePermissions)) {
		if (pathname.startsWith(routePath + '/')) {
			return hasAnyPermission(user, permissions);
		}
	}
	
	// Department-scoped routes
	if (pathname.includes('/department/')) {
		return checkDepartmentAccess(pathname, user);
	}
	
	// Default allow for basic authenticated routes
	return pathname === '/dashboard' || pathname.startsWith('/dashboard/');
}

/**
 * Check if user has any of the specified permissions
 */
function hasAnyPermission(user: User, permissions: string[]): boolean {
	return permissions.some(permission => hasPermission(user, permission));
}

/**
 * Check if user has specific permission
 */
function hasPermission(user: User, permission: string): boolean {
	if (!user?.permissions) return false;
	
	// Admin wildcard
	if (user.permissions.includes('*')) return true;
	
	// Direct match
	if (user.permissions.includes(permission)) return true;
	
	// Wildcard match (e.g., employees:* matches employees:read)
	const [resource] = permission.split(':');
	return user.permissions.includes(`${resource}:*`);
}

/**
 * Check department access for managers
 */
function checkDepartmentAccess(pathname: string, user: User): boolean {
	const departmentMatch = pathname.match(/\/department\/([^\/]+)/);
	if (!departmentMatch) return false;
	
	const departmentId = departmentMatch[1];
	
	// Admin and HR Manager can access all departments
	if (hasPermission(user, '*') || hasPermission(user, 'employees:*')) {
		return true;
	}
	
	// Manager can only access their own department
	return user.role === 'manager' && user.department_id === departmentId;
}

/**
 * Rate limiting implementation
 */
function checkRateLimit(
	key: string, 
	maxRequests: number, 
	windowMs: number
): { allowed: boolean; retryAfter?: number } {
	const now = Date.now();
	const record = rateLimits.get(key);
	
	if (!record || now > record.resetTime) {
		rateLimits.set(key, { count: 1, resetTime: now + windowMs });
		return { allowed: true };
	}
	
	if (record.count >= maxRequests) {
		const retryAfter = Math.ceil((record.resetTime - now) / 1000);
		return { allowed: false, retryAfter };
	}
	
	record.count++;
	return { allowed: true };
}

// Clean up expired rate limit records
setInterval(() => {
	const now = Date.now();
	for (const [key, record] of rateLimits.entries()) {
		if (now > record.resetTime) {
			rateLimits.delete(key);
		}
	}
}, 5 * 60 * 1000); // Every 5 minutes

// Type definitions for enhanced locals
declare global {
	namespace App {
		interface Locals {
			user: User | null;
			isAuthenticated: boolean;
			permissions: string[];
			roles: any[];
			token: string | null;
		}
	}
}
