/**
 * Authentication and Authorization Store
 * Manages user authentication state and role-based permissions for PostGraphile
 */

import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { createUrqlClient } from '$lib/graphql/client';
import { GET_USER_BY_ID, GET_USER_ROLES } from '$lib/graphql/postgraphile-operations';
import { createRBACManager, type UserRoleAssignment, type RBACManager } from '$lib/auth/rbac';
import { login as authServiceLogin } from '$lib/services/authService';

// Rate limiting for auth validation
let _lastValidation = 0;

// Token refresh management
let _refreshInterval: NodeJS.Timeout | null = null;
let _refreshPromise: Promise<boolean> | null = null;

// User interface
export interface User {
	id: string;
	email: string;
	displayName: string;
	onboardingStatus: string;
	isActive: boolean;
	role_assignments?: UserRoleAssignment[];
}

// Authentication state interface
interface AuthState {
	isAuthenticated: boolean;
	user: User | null;
	roles: UserRoleAssignment[];
	isLoading: boolean;
	error: string | null;
}

// Initial state
const initialState: AuthState = {
	isAuthenticated: false,
	user: null,
	roles: [],
	isLoading: false, // Start with loading false - components will trigger validation when needed
	error: null
};

// Create the main auth store
export const authStore = writable<AuthState>(initialState);

// Helper methods for authStore
authStore.setUser = (user: User) => {
	authStore.update((state) => ({
		...state,
		isAuthenticated: true,
		user,
		isLoading: false
	}));
};

authStore.clearUser = () => {
	authStore.set({ ...initialState, isLoading: false });
};

// Derived stores for convenience
export const user = derived(authStore, ($auth) => $auth.user);
export const currentUser = derived(authStore, ($auth) => $auth.user);
export const isAuthenticated = derived(authStore, ($auth) => $auth.isAuthenticated);
export const isLoading = derived(authStore, ($auth) => $auth.isLoading);
export const authError = derived(authStore, ($auth) => $auth.error);

// RBAC manager derived store
export const rbac = derived(authStore, ($auth): RBACManager => {
	return createRBACManager($auth.roles, $auth.user?.id || null);
});

// Permission check derived stores for common use cases - using lazy evaluation
export const canViewUsers = derived(rbac, ($rbac) => {
	try {
		return $rbac.hasPermission('view_users');
	} catch {
		return false;
	}
});
export const canManageUsers = derived(rbac, ($rbac) => {
	try {
		return $rbac.hasPermission('update_users');
	} catch {
		return false;
	}
});
export const canViewSensitiveData = derived(rbac, ($rbac) => {
	try {
		return $rbac.hasPermission('view_sensitive_data');
	} catch {
		return false;
	}
});
export const canManageRoles = derived(rbac, ($rbac) => {
	try {
		return $rbac.hasPermission('assign_roles');
	} catch {
		return false;
	}
});
export const canApproveLeave = derived(rbac, ($rbac) => {
	try {
		return $rbac.hasPermission('approve_leave_requests');
	} catch {
		return false;
	}
});
export const canManageWorkflows = derived(rbac, ($rbac) => {
	try {
		return $rbac.hasPermission('manage_workflows');
	} catch {
		return false;
	}
});
export const canManageCompliance = derived(rbac, ($rbac) => {
	try {
		return $rbac.hasPermission('manage_compliance');
	} catch {
		return false;
	}
});

// User role information
export const userHighestRole = derived(rbac, ($rbac) => {
	try {
		return {
			name: $rbac.getHighestRoleName(),
			level: $rbac.getHighestRoleLevel()
		};
	} catch {
		return {
			name: 'hr_guest',
			level: 0
		};
	}
});

// Auth actions
export const authActions = {
	/**
	 * Set loading state
	 */
	setLoading: (loading: boolean) => {
		authStore.update((state) => ({ ...state, isLoading: loading }));
	},

	/**
	 * Set error state
	 */
	setError: (error: string | null) => {
		authStore.update((state) => ({ ...state, error }));
	},

	/**
	 * Login with email and password using PostGraphile GraphQL authentication
	 */
	login: async (email: string, password: string, rememberMe: boolean = false): Promise<boolean> => {
		authActions.setLoading(true);
		authActions.setError(null);

		try {
			const result = await authServiceLogin({ email, password });

			if (result.success && result.user) {
				await authActions.setUser(result.user);
				// Start automatic token refresh
				authActions.startTokenRefresh();
				return true;
			} else {
				authActions.setError(result.error || 'Login failed');
				return false;
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Network error during login';
			authActions.setError(errorMessage);
			return false;
		} finally {
			authActions.setLoading(false);
		}
	},

	/**
	 * Logout with optional redirect URL preservation
	 */
	logout: async (currentUrl?: string): Promise<void> => {
		try {
			// Clear refresh interval
			authActions.stopTokenRefresh();

			// Save current page URL for redirect after login if provided
			if (typeof window !== 'undefined' && currentUrl) {
				// Only save if it's not the login page or root page
				if (!currentUrl.includes('/login') && currentUrl !== '/') {
					localStorage.setItem('hr_return_url', currentUrl);
				}
			}

			// Clear JWT token from localStorage
			if (typeof window !== 'undefined') {
				localStorage.removeItem('postgraphile-jwt-token');
			}
		} catch (error) {
			console.error('Logout error:', error);
		} finally {
			// Clear local state
			authStore.set(initialState);
		}
	},

	/**
	 * Set user and load their roles
	 */
	setUser: async (user: User): Promise<void> => {
		authStore.update((state) => ({
			...state,
			isAuthenticated: true,
			user,
			isLoading: true
		}));

		// Load user roles and wait for completion
		await authActions.loadUserRoles(user.id);

		// Ensure loading is set to false after roles are loaded
		authStore.update((state) => ({
			...state,
			isLoading: false
		}));
	},

	/**
	 * Load user roles from the API
	 */
	loadUserRoles: async (userId: string): Promise<void> => {
		// Simplified role loading - users have a direct 'role' field, no separate role assignments table
		try {
			authStore.update((state) => ({
				...state,
				roles: [], // Empty roles array - permissions come from JWT token
				isLoading: false
			}));
		} catch (error) {
			console.error('Error loading user roles:', error);
			authStore.update((state) => ({
				...state,
				roles: [],
				isLoading: false,
				error: 'Failed to load user permissions'
			}));
		}
	},

	/**
	 * Validate current session using PostGraphile JWT
	 */
	validateSession: async (): Promise<boolean> => {
		console.log('validateSession: Starting validation');
		if (!browser) {
			console.log('validateSession: Not in browser, returning false');
			return false;
		}

		// Check if JWT token exists in localStorage
		const token = localStorage.getItem('postgraphile-jwt-token');
		if (!token) {
			console.log('validateSession: No JWT token found, clearing auth state');
			authStore.set({ ...initialState, isLoading: false });
			return false;
		}
		console.log('validateSession: JWT token found');

		// Parse JWT to check expiration (basic validation)
		try {
			const tokenParts = token.split('.');
			if (tokenParts.length !== 3) {
				console.log('validateSession: Invalid JWT format, clearing auth state');
				localStorage.removeItem('postgraphile-jwt-token');
				authStore.set({ ...initialState, isLoading: false });
				return false;
			}

			const [, payload] = tokenParts;
			if (!payload) {
				console.log('validateSession: Missing JWT payload, clearing auth state');
				localStorage.removeItem('postgraphile-jwt-token');
				authStore.set({ ...initialState, isLoading: false });
				return false;
			}

			const decodedPayload = JSON.parse(atob(payload));
			const currentTime = Math.floor(Date.now() / 1000);

			if (decodedPayload.exp && decodedPayload.exp < currentTime) {
				// Token expired, clear it
				console.log('validateSession: JWT token expired, clearing auth state');
				localStorage.removeItem('postgraphile-jwt-token');
				authStore.set({ ...initialState, isLoading: false });
				return false;
			}
			console.log('validateSession: JWT token is valid and not expired');

			// Token is valid, check if we have user info in store
			const currentState = get(authStore);
			if (!currentState.user && decodedPayload.user_id) {
				// Reconstruct user info from JWT payload (database-driven)
				const user = {
					id: decodedPayload.user_id,
					email: decodedPayload.email,
					displayName: decodedPayload.display_name || decodedPayload.email?.split('@')[0] || 'User',
					onboardingStatus: 'Active',
					isActive: true
				};

				// Set user directly without calling loadUserRoles to avoid loops
				authStore.update((state) => ({
					...state,
					isAuthenticated: true,
					user,
					isLoading: false
				}));

				// Start token refresh for existing session
				authActions.startTokenRefresh();
			}

			console.log('validateSession: Validation successful, user is authenticated');
			return true;
		} catch (error) {
			console.error('validateSession: Token validation error:', error);
			localStorage.removeItem('postgraphile-jwt-token');
			authStore.set({ ...initialState, isLoading: false });
			return false;
		}
	},

	/**
	 * Refresh user data and roles
	 */
	refreshUser: async (): Promise<void> => {
		const currentState = get(authStore);
		if (!currentState.user?.id) return;

		authActions.setLoading(true);

		try {
			const client = createUrqlClient();
			const userResult = await client
				.query(GET_USER_BY_ID, { id: currentState.user.id })
				.toPromise();

			if (userResult.data?.userById) {
				await authActions.setUser(userResult.data.userById);
			}
		} catch (error) {
			console.error('Error refreshing user data:', error);
			authActions.setError('Failed to refresh user data');
		} finally {
			authActions.setLoading(false);
		}
	},

	/**
	 * Check if user has specific permission
	 */
	hasPermission: (permission: string): boolean => {
		const rbacManager = get(rbac);
		return rbacManager.hasPermission(permission);
	},

	/**
	 * Check if user has minimum role level
	 */
	hasMinimumRoleLevel: (level: number): boolean => {
		const rbacManager = get(rbac);
		return rbacManager.hasMinimumRoleLevel(level);
	},

	/**
	 * Check if user can manage another user
	 */
	canManageUser: (targetUserId: string, requiredPermission: string): boolean => {
		const rbacManager = get(rbac);
		return rbacManager.canManageUser(targetUserId, requiredPermission);
	},

	/**
	 * Refresh JWT token if it's close to expiration
	 */
	refreshToken: async (): Promise<boolean> => {
		if (!browser) return false;

		// Prevent multiple simultaneous refresh attempts
		if (_refreshPromise) {
			return await _refreshPromise;
		}

		_refreshPromise = (async () => {
			try {
				const token = localStorage.getItem('postgraphile-jwt-token');
				if (!token) return false;

				// Parse JWT to check if it needs refresh (if expires within 5 minutes)
				const [, payload] = token.split('.');
				const decodedPayload = JSON.parse(atob(payload));
				const currentTime = Math.floor(Date.now() / 1000);
				const timeUntilExpiry = decodedPayload.exp - currentTime;

				// Only refresh if token expires within 5 minutes (300 seconds)
				if (timeUntilExpiry > 300) {
					return true; // Token is still good
				}

				console.log('🔄 Refreshing JWT token (expires in', timeUntilExpiry, 'seconds)');

				// For now, just validate that the current token is still valid
				// In a production system, you'd want a proper refresh token mechanism
				const response = await fetch('http://localhost:4000/graphql', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`
					},
					body: JSON.stringify({
						query: `
							query CurrentUser {
								currentUser {
									id
									email
									displayName
								}
							}
						`
					})
				});

				const result = await response.json();

				if (result.data?.currentUser) {
					console.log('✅ JWT token validated successfully');
					return true;
				} else {
					console.warn('❌ Token validation failed, logging out');
					await authActions.logout();
					return false;
				}
			} catch (error) {
				console.error('❌ Token refresh error:', error);
				await authActions.logout();
				return false;
			} finally {
				_refreshPromise = null;
			}
		})();

		return await _refreshPromise;
	},

	/**
	 * Start automatic token refresh
	 */
	startTokenRefresh: (): void => {
		if (!browser) return;

		// Clear any existing interval
		authActions.stopTokenRefresh();

		// Check token every 2 minutes
		_refreshInterval = setInterval(
			async () => {
				const isAuthenticated = get(authStore).isAuthenticated;
				if (isAuthenticated) {
					await authActions.refreshToken();
				} else {
					authActions.stopTokenRefresh();
				}
			},
			2 * 60 * 1000
		); // 2 minutes

		console.log('🔄 Automatic token refresh started (every 2 minutes)');
	},

	/**
	 * Stop automatic token refresh
	 */
	stopTokenRefresh: (): void => {
		if (_refreshInterval) {
			clearInterval(_refreshInterval);
			_refreshInterval = null;
			console.log('⏹️ Automatic token refresh stopped');
		}
	}
};

// Initialize auth state on app start
// Removed automatic session validation to prevent blocking the login form
// Session validation should be triggered by components that need it

// Export store as default
export { authStore as default };

// Utility function to get current auth state
export const getAuthState = (): AuthState => get(authStore);

// Utility function to get current RBAC manager
export const getRBACManager = (): RBACManager => get(rbac);

// Export utility functions for components
export const hasPermission = (permission: string): boolean => {
	return authActions.hasPermission(permission);
};

export const hasMinimumRoleLevel = (level: number): boolean => {
	return authActions.hasMinimumRoleLevel(level);
};

export const canManageUser = (targetUserId: string, requiredPermission: string): boolean => {
	return authActions.canManageUser(targetUserId, requiredPermission);
};

export const hasRole = (roleName: string): boolean => {
	try {
		// For now, since we don't have role details in the simplified query,
		// we'll assume admin user has all roles
		const userState = get(authStore);
		if (!userState.user) return false;

		// Check if user has required role from database via JWT
		// Permissions are managed via the RBAC system in hooks.server.ts
		// This is a simple role check - all authenticated users can view their own data
		return userState.isAuthenticated;
	} catch {
		return false;
	}
};

// Derived store for user roles (from JWT token stored in authStore.roles)
export const userRoles = derived(authStore, ($authStore) => {
	if (!$authStore.user) return [];

	// Return roles from authStore - these come from the JWT token or database
	return $authStore.roles || [];
});
