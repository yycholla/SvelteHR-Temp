/**
 * Authentication and Authorization Store
 * Manages user authentication state and role-based permissions for session-based auth
 */

import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { createUrqlClient } from '$lib/graphql/client';
import { GET_EMPLOYEE_BY_ID_QUERY } from '$lib/graphql/employee-operations';
import { createRBACManager, type UserRoleAssignment, type RBACManager } from '$lib/auth/rbac';
import { secureAuthService } from '$lib/auth/secure-auth-service';

// Session validation management (simplified for session-based auth)
let _validationPromise: Promise<boolean> | null = null;

// User interface
export interface User {
	id: string;
	email: string;
	displayName: string;
	firstName?: string;
	lastName?: string;
	first_name?: string; // Support snake_case from backend API
	last_name?: string; // Support snake_case from backend API
	display_name?: string; // Support snake_case from backend API
	onboardingStatus: string;
	isActive: boolean;
	role?: string; // User's role from backend session
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
const authStoreInternal = writable<AuthState>(initialState);

// Create a store with methods
export const authStore = {
	...authStoreInternal,
	setUser: (user: User) => {
		authStoreInternal.update((state) => ({
			...state,
			isAuthenticated: true,
			user,
			isLoading: false
		}));
	},
	clearUser: () => {
		authStoreInternal.set({ ...initialState, isLoading: false });
	}
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
		const roleNames = $rbac.getRoleNames();
		const highestLevel = $rbac.getHighestRoleLevel();
		return {
			name: roleNames.length > 0 ? roleNames[0] : 'hr_guest',
			level: highestLevel
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
			const result = await secureAuthService.login({ email, password });

			if (result.success && result.user) {
				const user: User = {
					id: result.user.id,
					email: result.user.email,
					displayName:
						(result.user as any).displayName || result.user.email.split('@')[0] || 'User',
					onboardingStatus: 'Active',
					isActive: true,
					role: (result.user as any).role // Include role from login response
				};

				// CRITICAL: Load settings and apply theme BEFORE setting user
				// This ensures theme is applied before any UI renders
				await authActions.applyUserTheme(user.id);

				// Now set user and load roles
				await authActions.setUser(user);
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
			// Save current page URL for redirect after login if provided
			if (typeof window !== 'undefined' && currentUrl) {
				// Only save if it's not the login page or root page
				if (!currentUrl.includes('/login') && currentUrl !== '/') {
					localStorage.setItem('hr_return_url', currentUrl);
				}
			}

			// Call logout endpoint to clear session server-side
			await fetch('/api/auth/logout', {
				method: 'POST',
				credentials: 'include' // Include session cookies for server-side session clearing
			}).catch((err) => console.warn('Logout endpoint failed:', err));

			// Clear permission test mode on logout
			const { clearTestModeOnLogout } = await import('$lib/stores/permission-test');
			clearTestModeOnLogout();

			// No client-side token storage to clear - session-based auth only
		} catch (error) {
			console.warn('Logout error:', error);
		} finally {
			// Clear local state
			authStore.set(initialState);
		}
	},

	/**
	 * Apply user theme preference synchronously during login
	 * This runs BEFORE setUser to ensure theme is applied before any UI renders
	 */
	applyUserTheme: async (userId: string): Promise<void> => {
		if (!browser) return;

		try {
			// Dynamically import to avoid circular dependencies
			const { createSettingsOperations } = await import('$lib/graphql/settings-operations');
			const { themeStore } = await import('$lib/stores/theme');

			// Create settings operations instance
			const urqlClient = createUrqlClient();
			const settingsOps = createSettingsOperations(urqlClient);

			// Fetch user settings synchronously
			const userSettings = await settingsOps.getUserSettings({
				userId,
				userCredentials: {
					userId,
					roles: [], // Will be populated after login
					permissions: [], // Will be populated after login
					isAuthenticated: true, // User is authenticated during login
					expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
				}
			});

			// Apply theme from user preferences IMMEDIATELY
			if (userSettings?.preferences?.appearance?.darkMode !== undefined) {
				const theme = userSettings.preferences.appearance.darkMode ? 'dark' : 'light';
				themeStore.setTheme(theme);
				console.log(`✓ Applied user theme on login: ${theme}`);
			} else if (userSettings?.preferences?.theme) {
				// Fallback to legacy theme field
				themeStore.setTheme(userSettings.preferences.theme);
				console.log(`✓ Applied user theme on login: ${userSettings.preferences.theme}`);
			} else {
				console.log('ℹ No theme preference found, using system default');
			}
		} catch (error) {
			console.warn('Unable to load theme preference, using system default:', error);
			// Don't fail login if theme can't be loaded - just use system default
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
		// Simplified role loading - users have a direct 'role' field in the session
		try {
			authStore.update((state) => ({
				...state,
				roles: [], // Empty roles array - permissions come from session validation
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
	 * Validate current session using session cookies
	 */
	validateSession: async (): Promise<boolean> => {
		console.log('validateSession: Starting session validation');
		if (!browser) {
			console.log('validateSession: Not in browser, returning false');
			return false;
		}

		try {
			// Make a request to verify the session
			const response = await fetch('/api/auth/verify', {
				method: 'GET',
				credentials: 'include' // Include session cookies
			});

			if (!response.ok) {
				console.log('validateSession: Session validation failed, clearing auth state');
				authStore.set({ ...initialState, isLoading: false });
				return false;
			}

			const data = await response.json();
			console.log('validateSession: Session is valid');

			// Session is valid, check if we have user info in store
			const currentState = get(authStore);
			if (!currentState.user && data.user) {
				// Set user info from session validation response
				const user: User = {
					id: data.user.id,
					email: data.user.email,
					displayName: (data.user as any).displayName || data.user.email.split('@')[0] || 'User',
					onboardingStatus: 'Active',
					isActive: true,
					role: data.user.role // Include role from backend
				};

				// Apply theme preference BEFORE setting user state
				await authActions.applyUserTheme(user.id);

				// Set user directly without calling loadUserRoles to avoid loops
				authStore.update((state) => ({
					...state,
					isAuthenticated: true,
					user,
					isLoading: false
				}));
			}

			console.log('validateSession: Validation successful, user is authenticated');
			return true;
		} catch (error) {
			console.error('validateSession: Session validation error:', error);
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
				.query(GET_EMPLOYEE_BY_ID_QUERY, { id: currentState.user.id })
				.toPromise();

			if (userResult.data?.user) {
				await authActions.setUser(userResult.data.user);
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
		return rbacManager.canManage(requiredPermission.split(':')[0]);
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
		const userState = get(authStore);
		if (!userState.user) return false;

		// Permissions are validated server-side via session authentication in hooks.server.ts
		// This is a simple role check for authenticated users
		return userState.isAuthenticated;
	} catch {
		return false;
	}
};

// Derived store for user roles (from session data stored in authStore.roles)
export const userRoles = derived(authStore, ($authStore) => {
	if (!$authStore.user) return [];

	// Return roles from authStore - these come from session validation
	return $authStore.roles || [];
});
