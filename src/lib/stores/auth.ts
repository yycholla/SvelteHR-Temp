/**
 * Authentication and Authorization Store
 * Manages user authentication state and role-based permissions for PostGraphile
 */

import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { createUrqlClient } from '$lib/graphql/client';
import { GET_USER_BY_ID, GET_USER_ROLES } from '$lib/graphql/postgraphile-operations';
import { createRBACManager, type UserRoleAssignment, type RBACManager } from '$lib/auth/rbac';

// User interface
export interface User {
  id: string;
  email: string;
  displayName: string;
  onboardingStatus: string;
  isActive: boolean;
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
  isLoading: true, // Start with loading true to prevent redirect loop
  error: null
};

// Create the main auth store
export const authStore = writable<AuthState>(initialState);

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
    authStore.update(state => ({ ...state, isLoading: loading }));
  },

  /**
   * Set error state
   */
  setError: (error: string | null) => {
    authStore.update(state => ({ ...state, error }));
  },

  /**
   * Login with email and password
   */
  login: async (email: string, password: string, rememberMe: boolean = false): Promise<boolean> => {
    authActions.setLoading(true);
    authActions.setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, rememberMe })
      });

      const data = await response.json();

      if (data.success && data.user) {
        await authActions.setUser(data.user);
        return true;
      } else {
        authActions.setError(data.error || 'Login failed');
        return false;
      }
    } catch (error) {
      authActions.setError('Network error during login');
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
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local state regardless of API response
      authStore.set(initialState);
    }
  },

  /**
   * Set user and load their roles
   */
  setUser: async (user: User): Promise<void> => {
    authStore.update(state => ({
      ...state,
      isAuthenticated: true,
      user,
      isLoading: true
    }));

    // Load user roles
    await authActions.loadUserRoles(user.id);
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

        authStore.update(state => ({
          ...state,
          roles: adminRoles,
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

        authStore.update(state => ({
          ...state,
          roles: rolesWithDetails,
          isLoading: false
        }));
      } else {
        authStore.update(state => ({
          ...state,
          roles: [],
          isLoading: false
        }));
      }
    } catch (error) {
      console.error('Error loading user roles:', error);
      authStore.update(state => ({
        ...state,
        roles: [],
        isLoading: false,
        error: 'Failed to load user permissions'
      }));
    }
  },

  /**
   * Validate current session
   */
  validateSession: async (): Promise<boolean> => {
    if (!browser) return false;

    authActions.setLoading(true);

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include'
      });
      const data = await response.json();

      if (data.success && data.user) {
        await authActions.setUser(data.user);
        return true;
      } else {
        // Reset to initial state but with loading false
        authStore.set({ ...initialState, isLoading: false });
        return false;
      }
    } catch (error) {
      console.error('Auth: Session validation error:', error);
      // Reset to initial state but with loading false
      authStore.set({ ...initialState, isLoading: false });
      return false;
    } finally {
      authActions.setLoading(false);
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
      const userResult = await client.query(GET_USER_BY_ID, { id: currentState.user.id }).toPromise();

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
    return rbacManager.canManageUser(targetUserId, requiredPermission);
  }
};

// Initialize auth state on app start
if (browser) {
  // Validate session on app load
  authActions.validateSession();
}

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