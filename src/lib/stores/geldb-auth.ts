import { writable, derived, type Readable } from 'svelte/store';
import { browser } from '$app/environment';
import { authService } from '$lib/services/auth/auth.service.js';
import type { SessionUser } from '$lib/services/auth/session.service.js';

/**
 * GelDB Authentication Stores
 * 
 * Modern reactive Svelte stores for GelDB authentication state management.
 * This is the new auth system that replaces the legacy auth stores.
 * Provides centralized auth state that components can subscribe to.
 */

// Re-export session stores from authService for convenience
export const session = authService.session;
export const isAuthenticated = authService.isAuthenticatedStore;
export const user = authService.userStore;
export const permissions = authService.permissionsStore;
export const isLoading = authService.isLoadingStore;

// Additional derived stores for common auth checks
export const isAdmin = derived(
	[user, permissions],
	([$user, $permissions]) => {
		if (!$user) return false;
		return $permissions.includes('*') || authService.hasRole('Admin');
	}
);

export const isHRManager = derived(
	[user],
	([$user]) => {
		if (!$user) return false;
		return authService.hasRole('HR_Manager', 'Admin');
	}
);

export const isManager = derived(
	[user],
	([$user]) => {
		if (!$user) return false;
		return authService.hasRoleLevel(50); // Manager level or higher
	}
);

export const userDisplayName = derived(
	[user],
	([$user]) => {
		if (!$user) return '';
		return $user.full_name || $user.email || 'User';
	}
);

export const userInitials = derived(
	[user],
	([$user]) => {
		if (!$user) return '';
		
		const name = $user.full_name || $user.email || '';
		const parts = name.split(' ');
		
		if (parts.length >= 2) {
			return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
		} else {
			return name.slice(0, 2).toUpperCase();
		}
	}
);

export const primaryRole = derived(
	[user],
	([$user]) => {
		if (!$user || !$user.roles || $user.roles.length === 0) {
			return null;
		}
		
		// Return role with highest level
		return $user.roles.reduce((highest, current) => {
			return current.level > highest.level ? current : highest;
		});
	}
);

// Auth actions wrapped in stores for reactive UI updates
export const authActions = {
	/**
	 * Login action - redirects to GelDB auth UI
	 */
	async login(redirectTo?: string): Promise<void> {
		return authService.login(redirectTo);
	},

	/**
	 * Logout action - clears session and redirects
	 */
	async logout(): Promise<void> {
		return authService.logout();
	},

	/**
	 * Refresh session data
	 */
	async refresh(): Promise<boolean> {
		return authService.refreshSession();
	},

	/**
	 * Check if user has specific permission
	 */
	hasPermission(permission: string): boolean {
		return authService.hasPermission(permission);
	},

	/**
	 * Check if user has any of the specified roles
	 */
	hasRole(...roleNames: string[]): boolean {
		return authService.hasRole(...roleNames);
	},

	/**
	 * Check if user has minimum role level
	 */
	hasRoleLevel(minLevel: number): boolean {
		return authService.hasRoleLevel(minLevel);
	},

	/**
	 * Require authentication for current route
	 */
	async requireAuth(currentPath?: string): Promise<void> {
		return authService.requireAuth(currentPath);
	},

	/**
	 * Require specific permission
	 */
	async requirePermission(permission: string, currentPath?: string): Promise<void> {
		return authService.requirePermission(permission, currentPath);
	},

	/**
	 * Require specific role
	 */
	async requireRole(roleName: string, currentPath?: string): Promise<void> {
		return authService.requireRole(roleName, currentPath);
	},

	/**
	 * Require minimum role level
	 */
	async requireRoleLevel(minLevel: number, currentPath?: string): Promise<void> {
		return authService.requireRoleLevel(minLevel, currentPath);
	}
};

// Navigation guards for use in components
export const navigationGuards = {
	/**
	 * Check if user can access admin routes
	 */
	canAccessAdmin: derived([permissions], ([$permissions]) => {
		return $permissions.includes('*') || authService.hasRole('Admin');
	}),

	/**
	 * Check if user can access HR routes
	 */
	canAccessHR: derived([permissions], ([$permissions]) => {
		return $permissions.some(p => p.startsWith('employees:') || p === '*') ||
			   authService.hasRole('HR_Manager', 'Admin');
	}),

	/**
	 * Check if user can access manager routes
	 */
	canAccessManager: derived([user], ([$user]) => {
		return $user ? authService.hasRoleLevel(50) : false;
	}),

	/**
	 * Check if user can view employee data
	 */
	canViewEmployees: derived([permissions], ([$permissions]) => {
		return $permissions.includes('employees:read') || 
			   $permissions.includes('employees:*') || 
			   $permissions.includes('*');
	}),

	/**
	 * Check if user can edit employee data
	 */
	canEditEmployees: derived([permissions], ([$permissions]) => {
		return $permissions.includes('employees:update') || 
			   $permissions.includes('employees:*') || 
			   $permissions.includes('*');
	}),

	/**
	 * Check if user can create employees
	 */
	canCreateEmployees: derived([permissions], ([$permissions]) => {
		return $permissions.includes('employees:create') || 
			   $permissions.includes('employees:*') || 
			   $permissions.includes('*');
	}),

	/**
	 * Check if user can delete employees
	 */
	canDeleteEmployees: derived([permissions], ([$permissions]) => {
		return $permissions.includes('employees:delete') || 
			   $permissions.includes('employees:*') || 
			   $permissions.includes('*');
	})
};

// Error handling stores
export const authError = writable<string | null>(null);
export const authLoading = writable<boolean>(false);

// Clear error after timeout
export function clearAuthError(timeout = 5000): void {
	setTimeout(() => {
		authError.set(null);
	}, timeout);
}

// Set auth error with auto-clear
export function setAuthError(error: string): void {
	authError.set(error);
	clearAuthError();
}

// Auth status monitoring for debugging
export const authDebug = derived(
	[session, isAuthenticated, user, permissions],
	([$session, $isAuthenticated, $user, $permissions]) => {
		if (!browser || process.env.NODE_ENV !== 'development') {
			return null;
		}

		return {
			session: $session,
			isAuthenticated: $isAuthenticated,
			user: $user ? {
				id: $user.id,
				email: $user.email,
				roles: $user.roles.map(r => r.name),
				department: $user.department
			} : null,
			permissions: $permissions,
			serviceDebug: authService.getDebugInfo(),
			timestamp: new Date().toISOString()
		};
	}
);

// Auto-refresh session periodically (if enabled)
let refreshInterval: NodeJS.Timeout | null = null;

export function enableAutoRefresh(intervalMs = 300000): void { // 5 minutes default
	if (!browser) return;
	
	if (refreshInterval) {
		clearInterval(refreshInterval);
	}

	refreshInterval = setInterval(async () => {
		if (authService.isAuthenticated) {
			try {
				await authService.refreshSession();
			} catch (error) {
				console.warn('Auto-refresh failed:', error);
				// Don't clear session on refresh failure - might be temporary network issue
			}
		}
	}, intervalMs);
}

export function disableAutoRefresh(): void {
	if (refreshInterval) {
		clearInterval(refreshInterval);
		refreshInterval = null;
	}
}

// Initialize auth state on app startup (browser only)
if (browser) {
	// Enable auto-refresh by default
	enableAutoRefresh();

	// Listen for storage events to sync auth state across tabs
	window.addEventListener('storage', (event) => {
		if (event.key === 'gel-auth-token' && event.newValue !== event.oldValue) {
			// Token changed in another tab - refresh session
			authService.refreshSession();
		}
	});

	// Listen for focus events to check auth state
	window.addEventListener('focus', () => {
		if (authService.isAuthenticated) {
			authService.refreshSession();
		}
	});
}

// Cleanup on app destroy
if (browser) {
	window.addEventListener('beforeunload', () => {
		disableAutoRefresh();
	});
}

/**
 * Main auth export with all reactive utilities
 * 
 * This is the primary interface that components should import and use
 */
export const auth = {
	// Stores
	session,
	isAuthenticated,
	user,
	permissions,
	isLoading,
	isAdmin,
	isHRManager,
	isManager,
	userDisplayName,
	userInitials,
	primaryRole,
	authError,
	authLoading,
	authDebug,
	
	// Actions
	...authActions,
	
	// Navigation guards
	guards: navigationGuards,
	
	// Error handling
	setError: setAuthError,
	clearError: clearAuthError,
	
	// Session management
	enableAutoRefresh,
	disableAutoRefresh
} as const;

// Legacy compatibility exports (for gradual migration)
export { isAuthenticated as isLoggedIn };
export { user as currentUser };
export { permissions as userPermissions };
export { primaryRole as userRole };

// Backward compatible auth actions for existing components
export const legacyAuthActions = {
	async initialize() {
		// Session service handles initialization automatically
		return true;
	},
	
	async signIn() {
		return authActions.login();
	},
	
	async loginWithCredentials(email: string, password: string) {
		// GelDB handles authentication via magic link, not credentials
		// Redirect to login page
		return authActions.login();
	},
	
	async logout() {
		return authActions.logout();
	},
	
	hasPermission: authActions.hasPermission,
	hasRole: authActions.hasRole,
	
	// Legacy permission format compatibility
	hasSpecificPermission(resource: string, action: string): boolean {
		const permission = `${resource}:${action}`;
		return authActions.hasPermission(permission);
	},
	
	canAccessResource(resource: string): boolean {
		return authActions.hasPermission(`${resource}:read`) ||
			   authActions.hasPermission(`${resource}:*`);
	}
};

// Export combined store for backward compatibility
export const authStore = {
	subscribe: session.subscribe,
	...legacyAuthActions
};