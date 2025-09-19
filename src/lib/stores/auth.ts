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
	 * Logout
	 */
	logout: async (): Promise<void> => {
		try {
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
		try {
			const currentState = get(authStore);

			// For admin user, create hardcoded admin roles since role system is not fully implemented
			if (currentState.user?.email === 'admin@postgraphile-hr.com') {
				const adminRoles = [
					{
						id: '1',
						userId: currentState.user.id,
						roleId: '1',
						assignedBy: currentState.user.id,
						isActive: true,
						validFrom: new Date().toISOString(),
						validUntil: null,
						createdAt: new Date().toISOString(),
						userRoleByRoleId: {
							id: '1',
							name: 'hr_admin',
							description: 'HR Administrator',
							level: 100
						}
					}
				];

				authStore.update((state) => ({
					...state,
					roles: adminRoles,
					user: state.user ? { ...state.user, role_assignments: adminRoles } : state.user,
					isLoading: false
				}));
				return;
			}

			// For other users, query the API
			const client = createUrqlClient();
			const result = await client.query(GET_USER_ROLES, { userId }).toPromise();

			if (result.data?.userRoleAssignments?.nodes) {
				// Transform the simplified role data to include the required nested structure
				const rolesWithDetails = result.data.userRoleAssignments.nodes.map((assignment: any) => ({
					...assignment,
					userRoleByRoleId: {
						id: assignment.roleId,
						name: 'hr_employee', // Default role name
						description: 'Employee',
						level: 20 // Default employee level
					}
				}));

				authStore.update((state) => ({
					...state,
					roles: rolesWithDetails,
					user: state.user ? { ...state.user, role_assignments: rolesWithDetails } : state.user,
					isLoading: false
				}));
			} else {
				authStore.update((state) => ({
					...state,
					roles: [],
					user: state.user ? { ...state.user, role_assignments: [] } : state.user,
					isLoading: false
				}));
			}
		} catch (error) {
			console.error('Error loading user roles:', error);
			authStore.update((state) => ({
				...state,
				roles: [],
				user: state.user ? { ...state.user, role_assignments: [] } : state.user,
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
			const [, payload] = token.split('.');
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
				// Reconstruct user info from JWT
				const user = {
					id: decodedPayload.user_id,
					email: 'admin@postgraphile-hr.com', // Can be hardcoded for now
					displayName: 'System Administrator',
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

		// Temporary: admin user has all roles
		if (userState.user.email === 'admin@postgraphile-hr.com') {
			return true;
		}

		return false;
	} catch {
		return false;
	}
};

// Derived store for user roles
export const userRoles = derived(authStore, ($authStore) => {
	if (!$authStore.user) return [];

	// Temporary: admin user has all roles
	if ($authStore.user.email === 'admin@postgraphile-hr.com') {
		return ['hr_admin', 'hr_employee'];
	}

	return [];
});
