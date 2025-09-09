import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';

/**
 * Comprehensive Authentication API
 * 
 * Features:
 * - JWT token validation and refresh
 * - User profile management
 * - Session management
 * - RBAC permission checking
 * - Logout functionality
 */

interface LoginRequest {
	email: string;
	password: string;
	rememberMe?: boolean;
}

interface TokenRefreshRequest {
	refreshToken: string;
}

interface UserProfile {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
	roles: string[];
	permissions: string[];
	departmentId?: string;
	lastLoginAt?: string;
}

// Mock user database
const mockUsers = {
	'admin@example.com': {
		id: 'admin-user-id',
		email: 'admin@example.com',
		firstName: 'Admin',
		lastName: 'User',
		password: 'admin', // In production, this would be hashed
		roles: ['Admin', 'HR_Manager', 'Manager', 'Employee'],
		permissions: ['*'],
		departmentId: 'admin-department-id',
		isActive: true
	},
	'hr@example.com': {
		id: 'hr-user-id',
		email: 'hr@example.com',
		firstName: 'Sarah',
		lastName: 'Johnson',
		password: 'hr123',
		roles: ['HR_Manager', 'Employee'],
		permissions: [
			'employees:read', 'employees:write', 'employees:delete',
			'departments:read', 'departments:write',
			'roles:read', 'permissions:read'
		],
		departmentId: 'hr-department-id',
		isActive: true
	},
	'manager@example.com': {
		id: 'manager-user-id',
		email: 'manager@example.com',
		firstName: 'Mike',
		lastName: 'Wilson',
		password: 'manager123',
		roles: ['Manager', 'Employee'],
		permissions: [
			'employees:read', 'departments:read',
			'team:manage', 'leave:approve'
		],
		departmentId: 'manager-department-id',
		isActive: true
	},
	'employee@example.com': {
		id: 'employee-user-id',
		email: 'employee@example.com',
		firstName: 'John',
		lastName: 'Doe',
		password: 'employee123',
		roles: ['Employee'],
		permissions: [
			'profile:read', 'profile:update',
			'leave:create', 'timesheet:write'
		],
		departmentId: 'employee-department-id',
		isActive: true
	}
};

// Mock token storage (in production, use Redis or database)
const activeTokens = new Map<string, {
	userId: string;
	expiresAt: Date;
	refreshToken: string;
}>();

/**
 * POST /api/auth - Handle authentication operations
 */
export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const { action, ...data } = await request.json();

		switch (action) {
			case 'login':
				return handleLogin(data as LoginRequest, cookies);
			case 'refresh':
				return handleTokenRefresh(data as TokenRefreshRequest, cookies);
			case 'logout':
				return handleLogout(request, cookies);
			case 'verify':
				return handleTokenVerify(request);
			default:
				throw error(400, { message: 'Invalid action' });
		}
	} catch (err) {
		console.error('Auth API error:', err);
		return json({ 
			success: false, 
			error: 'Authentication failed' 
		}, { status: 401 });
	}
};

/**
 * Handle user login
 */
async function handleLogin(
	loginData: LoginRequest, 
	cookies: any
): Promise<Response> {
	const { email, password, rememberMe = false } = loginData;

	// Find user
	const user = mockUsers[email as keyof typeof mockUsers];
	if (!user || user.password !== password || !user.isActive) {
		return json({ 
			success: false, 
			error: 'Invalid credentials' 
		}, { status: 401 });
	}

	// Generate tokens
	const accessToken = generateAccessToken(user.id);
	const refreshToken = generateRefreshToken(user.id);

	// Store token
	activeTokens.set(accessToken, {
		userId: user.id,
		expiresAt: new Date(Date.now() + (rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000)), // 30 days or 1 day
		refreshToken
	});

	// Set HTTP-only cookies
	const cookieOptions = {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax' as const,
		maxAge: rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60, // 30 days or 1 day
		path: '/'
	};

	cookies.set('hr_token', accessToken, cookieOptions);
	cookies.set('refresh_token', refreshToken, cookieOptions);

	// Return user profile
	const userProfile: UserProfile = {
		id: user.id,
		email: user.email,
		firstName: user.firstName,
		lastName: user.lastName,
		roles: user.roles,
		permissions: user.permissions,
		departmentId: user.departmentId,
		lastLoginAt: new Date().toISOString()
	};

	return json({
		success: true,
		user: userProfile,
		accessToken,
		expiresIn: rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60
	});
}

/**
 * Handle token refresh
 */
async function handleTokenRefresh(
	refreshData: TokenRefreshRequest,
	cookies: any
): Promise<Response> {
	const { refreshToken } = refreshData;

	// Find token in active tokens
	let foundToken = null;
	for (const [token, data] of activeTokens.entries()) {
		if (data.refreshToken === refreshToken) {
			foundToken = { token, ...data };
			break;
		}
	}

	if (!foundToken || foundToken.expiresAt < new Date()) {
		return json({ 
			success: false, 
			error: 'Invalid refresh token' 
		}, { status: 401 });
	}

	// Find user
	const user = Object.values(mockUsers).find(u => u.id === foundToken.userId);
	if (!user || !user.isActive) {
		return json({ 
			success: false, 
			error: 'User not found or inactive' 
		}, { status: 401 });
	}

	// Generate new tokens
	const newAccessToken = generateAccessToken(user.id);
	const newRefreshToken = generateRefreshToken(user.id);

	// Remove old token
	activeTokens.delete(foundToken.token);

	// Store new token
	activeTokens.set(newAccessToken, {
		userId: user.id,
		expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day
		refreshToken: newRefreshToken
	});

	// Update cookies
	const cookieOptions = {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax' as const,
		maxAge: 24 * 60 * 60, // 1 day
		path: '/'
	};

	cookies.set('hr_token', newAccessToken, cookieOptions);
	cookies.set('refresh_token', newRefreshToken, cookieOptions);

	return json({
		success: true,
		accessToken: newAccessToken,
		refreshToken: newRefreshToken,
		expiresIn: 24 * 60 * 60
	});
}

/**
 * Handle logout
 */
async function handleLogout(
	request: Request,
	cookies: any
): Promise<Response> {
	// Get token from header or cookies
	const authHeader = request.headers.get('Authorization');
	let token = null;

	if (authHeader && authHeader.startsWith('Bearer ')) {
		token = authHeader.slice(7);
	} else {
		token = cookies.get('hr_token');
	}

	// Remove token from active tokens
	if (token) {
		activeTokens.delete(token);
	}

	// Clear cookies
	cookies.delete('hr_token', { path: '/' });
	cookies.delete('refresh_token', { path: '/' });

	return json({ success: true, message: 'Logged out successfully' });
}

/**
 * Handle token verification
 */
async function handleTokenVerify(request: Request): Promise<Response> {
	// Get token from header
	const authHeader = request.headers.get('Authorization');
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return json({ 
			success: false, 
			error: 'No authorization header' 
		}, { status: 401 });
	}

	const token = authHeader.slice(7);
	const tokenData = activeTokens.get(token);

	if (!tokenData || tokenData.expiresAt < new Date()) {
		return json({ 
			success: false, 
			error: 'Invalid or expired token' 
		}, { status: 401 });
	}

	// Find user
	const user = Object.values(mockUsers).find(u => u.id === tokenData.userId);
	if (!user || !user.isActive) {
		return json({ 
			success: false, 
			error: 'User not found or inactive' 
		}, { status: 401 });
	}

	const userProfile: UserProfile = {
		id: user.id,
		email: user.email,
		firstName: user.firstName,
		lastName: user.lastName,
		roles: user.roles,
		permissions: user.permissions,
		departmentId: user.departmentId,
		lastLoginAt: new Date().toISOString()
	};

	return json({
		success: true,
		user: userProfile,
		expiresAt: tokenData.expiresAt.toISOString()
	});
}

/**
 * GET /api/auth - Get current user profile
 */
export const GET: RequestHandler = async ({ request }) => {
	return handleTokenVerify(request);
};

/**
 * Generate access token (in production, use JWT)
 */
function generateAccessToken(userId: string): string {
	// In production, this would be a proper JWT
	// For now, use a simple token format
	return `access_${userId}_${Date.now()}_${Math.random().toString(36)}`;
}

/**
 * Generate refresh token
 */
function generateRefreshToken(userId: string): string {
	return `refresh_${userId}_${Date.now()}_${Math.random().toString(36)}`;
}

/**
 * OPTIONS handler for CORS preflight
 */
export const OPTIONS: RequestHandler = async () => {
	return new Response(null, {
		status: 200,
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization',
			'Access-Control-Max-Age': '86400'
		}
	});
};