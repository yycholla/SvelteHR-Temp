/**
 * Authentication Store - Svelte 5.0 Runes
 * Manages client-side authentication state and user session
 */

import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import type { User, AuthSession, LoginCredentials, LoginResponse } from './index.js';
import { 
	hasPermission, 
	hasAnyPermission, 
	isTokenExpired, 
	decodeTokenPayload,
	AUTH_ERRORS,
	type UserRole 
} from './index.js';

// Reactive authentication state using Svelte 5.0 runes
let user = $state<User | null>(null);
let token = $state<string | null>(null);
let isAuthenticated = $state(false);
let isLoading = $state(false);
let error = $state<string | null>(null);
let sessionId = $state<string | null>(null);

// Derived states
const userRole = $derived(user?.role || null);
const userPermissions = $derived(user?.permissions || []);
const departmentId = $derived(user?.department_id || null);

/**
 * Initialize auth store - called on app startup
 */
export async function initAuth(): Promise<void> {
	if (!browser) return;
	
	isLoading = true;
	error = null;
	
	try {
		// Try to restore session from server-side verification
		const response = await fetch('/api/auth/verify', {
			method: 'GET',
			credentials: 'include', // Include cookies
			headers: {
				'Content-Type': 'application/json'
			}
		});
		
		if (response.ok) {
			const data = await response.json();
			
			if (data.user && data.authenticated) {
				user = data.user;
				token = data.token; // May not be returned for security
				isAuthenticated = true;
				sessionId = data.session_id;
				
				// Start token refresh timer
				scheduleTokenRefresh();
			} else {
				clearAuth();
			}
		} else {
			clearAuth();
		}
	} catch (err) {
		console.warn('Auth initialization failed:', err);
		clearAuth();
	} finally {
		isLoading = false;
	}
}

/**
 * Login with email and password
 */
export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
	if (!browser) {
		return { success: false, error: 'Client-side only operation' };
	}
	
	isLoading = true;
	error = null;
	
	try {
		const response = await fetch('/api/auth/login', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			credentials: 'include',
			body: JSON.stringify(credentials)
		});
		
		const data: LoginResponse = await response.json();
		
		if (data.success && data.user) {
			// Standard login success
			user = data.user;
			token = data.token || null;
			isAuthenticated = true;
			sessionId = data.session_id || null;
			
			// Start token refresh timer
			scheduleTokenRefresh();
			
			return data;
		} else if (data.requires_2fa && data.partial_token) {
			// Two-factor authentication required
			return data;
		} else {
			// Login failed
			error = data.error || 'Login failed';
			clearAuth();
			return data;
		}
	} catch (err) {
		error = 'Network error during login';
		console.error('Login error:', err);
		clearAuth();
		return { success: false, error: error };
	} finally {
		isLoading = false;
	}
}

/**
 * Verify 2FA code and complete authentication
 */
export async function verify2FA(code: string, partialToken: string): Promise<LoginResponse> {
	if (!browser) {
		return { success: false, error: 'Client-side only operation' };
	}
	
	isLoading = true;
	error = null;
	
	try {
		const response = await fetch('/api/auth/2fa/verify', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			credentials: 'include',
			body: JSON.stringify({
				code,
				partial_token: partialToken
			})
		});
		
		const data: LoginResponse = await response.json();
		
		if (data.success && data.user) {
			user = data.user;
			token = data.token || null;
			isAuthenticated = true;
			sessionId = data.session_id || null;
			
			scheduleTokenRefresh();
			
			return data;
		} else {
			error = data.error || '2FA verification failed';
			return data;
		}
	} catch (err) {
		error = 'Network error during 2FA verification';
		console.error('2FA verification error:', err);
		return { success: false, error: error };
	} finally {
		isLoading = false;
	}
}

/**
 * Logout user and clear session
 */
export async function logout(allDevices = false): Promise<void> {
	if (!browser) return;
	
	isLoading = true;
	
	try {
		// Notify server to invalidate session
		await fetch('/api/auth/logout', {
			method: 'POST',
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ all_devices: allDevices })
		});
	} catch (err) {
		console.warn('Logout request failed:', err);
	} finally {
		clearAuth();
		isLoading = false;
		
		// Redirect to login page
		goto('/login?message=logged_out', { replaceState: true });
	}
}

/**
 * Refresh authentication token
 */
export async function refreshToken(): Promise<boolean> {
	if (!browser) return false;
	
	try {
		const response = await fetch('/api/auth/refresh', {
			method: 'POST',
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json'
			}
		});
		
		if (response.ok) {
			const data = await response.json();
			
			if (data.success) {
				// Token refreshed successfully (new token set as httpOnly cookie)
				scheduleTokenRefresh();
				return true;
			}
		}
		
		// Refresh failed - logout user
		console.warn('Token refresh failed');
		await logout();
		return false;
	} catch (err) {
		console.error('Token refresh error:', err);
		await logout();
		return false;
	}
}

/**
 * Schedule automatic token refresh
 */
function scheduleTokenRefresh(): void {
	if (!browser) return;
	
	// Clear existing timer
	if (refreshTimer) {
		clearTimeout(refreshTimer);
	}
	
	// Schedule refresh 5 minutes before expiration
	const REFRESH_MARGIN = 5 * 60 * 1000; // 5 minutes in milliseconds
	const DEFAULT_REFRESH_INTERVAL = 55 * 60 * 1000; // 55 minutes
	
	let refreshInterval = DEFAULT_REFRESH_INTERVAL;
	
	// Try to calculate exact refresh time from token
	if (token) {
		const payload = decodeTokenPayload(token);
		if (payload && payload.exp) {
			const expiresAt = payload.exp * 1000; // Convert to milliseconds
			const now = Date.now();
			refreshInterval = Math.max(expiresAt - now - REFRESH_MARGIN, 60000); // Minimum 1 minute
		}
	}
	
	refreshTimer = setTimeout(() => {
		refreshToken();
	}, refreshInterval);
}

// Timer reference for cleanup
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Clear authentication state
 */
function clearAuth(): void {
	user = null;
	token = null;
	isAuthenticated = false;
	error = null;
	sessionId = null;
	
	if (refreshTimer) {
		clearTimeout(refreshTimer);
		refreshTimer = null;
	}
}

/**
 * Check if user has specific permission
 */
export function checkPermission(permission: string): boolean {
	return user ? hasPermission(user, permission) : false;
}

/**
 * Check if user has any of the specified permissions
 */
export function checkAnyPermission(permissions: string[]): boolean {
	return user ? hasAnyPermission(user, permissions) : false;
}

/**
 * Check if user has minimum role level
 */
export function checkRoleLevel(minRole: UserRole): boolean {
	if (!user || !user.role) return false;
	
	const roleLevels = {
		employee: 1,
		manager: 2,
		hr_manager: 3,
		admin: 4
	};
	
	const userLevel = roleLevels[user.role] || 0;
	const minLevel = roleLevels[minRole] || 0;
	
	return userLevel >= minLevel;
}

/**
 * Get user's display name
 */
export function getDisplayName(): string {
	if (!user) return '';
	return user.name || user.email || 'User';
}

/**
 * Get user's avatar initials
 */
export function getAvatarInitials(): string {
	if (!user || !user.name) return '';
	
	const names = user.name.trim().split(/\s+/);
	if (names.length === 1) {
		return names[0].charAt(0).toUpperCase();
	}
	
	return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
}

/**
 * Force re-authentication (clear local state and redirect)
 */
export function requireReauth(reason = 'Session expired'): void {
	clearAuth();
	error = reason;
	goto(`/login?error=session_expired&reason=${encodeURIComponent(reason)}`, { 
		replaceState: true 
	});
}

// Export reactive state for components to use
export const authStore = {
	// State getters (reactive)
	get user() { return user; },
	get token() { return token; },
	get isAuthenticated() { return isAuthenticated; },
	get isLoading() { return isLoading; },
	get error() { return error; },
	get sessionId() { return sessionId; },
	
	// Derived getters
	get userRole() { return userRole; },
	get userPermissions() { return userPermissions; },
	get departmentId() { return departmentId; },
	
	// Actions
	initAuth,
	login,
	verify2FA,
	logout,
	refreshToken,
	checkPermission,
	checkAnyPermission,
	checkRoleLevel,
	getDisplayName,
	getAvatarInitials,
	requireReauth,
	
	// Clear error state
	clearError: () => { error = null; }
};

// Initialize auth on module load (client-side only)
if (browser) {
	initAuth();
}

export default authStore;