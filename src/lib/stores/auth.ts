import { writable, derived, type Readable } from 'svelte/store';
import { browser } from '$app/environment';
import { authUtils } from '$lib/graphql/hasura-client';

/**
 * Authentication Store for SvelteHR
 * Manages user authentication state, tokens, and permissions
 */

// Types
export interface User {
  id: string;
  email: string;
  displayName: string;
  jobTitle?: string;
  roles: string[];
  defaultRole: string;
  departmentId?: string;
  managerId?: string;
  onboardingStatus: string;
  lastLoginAt?: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  sessionId?: string;
  expiresAt?: number;
}

// Initial state
const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true, // Start loading to check existing tokens
  error: null,
};

/**
 * Main auth store
 */
export const authStore = (() => {
  const { subscribe, set, update } = writable<AuthState>(initialState);

  return {
    subscribe,
    
    /**
     * Initialize authentication state on app load
     */
    init: async (): Promise<void> => {
      if (!browser) return;

      try {
        const accessToken = authUtils.getAccessToken();
        const refreshToken = authUtils.getRefreshToken();

        if (accessToken && refreshToken) {
          // Check if access token is expired
          if (authUtils.isTokenExpired(accessToken)) {
            // Try to refresh
            const newAccessToken = await authUtils.refreshAccessToken();
            if (newAccessToken) {
              // Get user info with new token
              await authStore.fetchCurrentUser();
              return;
            }
          } else {
            // Token is still valid, get user info
            await authStore.fetchCurrentUser();
            return;
          }
        }

        // No valid tokens, clear state
        authStore.clearAuth();
      } catch (error) {
        console.error('Auth initialization error:', error);
        authStore.clearAuth();
      }
    },

    /**
     * Login with email and password
     */
    login: async (email: string, password: string, rememberMe = false): Promise<{ success: boolean; error?: string }> => {
      update(state => ({ ...state, isLoading: true, error: null }));

      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ email, password, rememberMe }),
        });

        const data = await response.json();

        if (data.success && data.accessToken && data.user) {
          // Store tokens
          authUtils.setAccessToken(data.accessToken);
          if (data.refreshToken) {
            authUtils.setRefreshToken(data.refreshToken);
          }

          // Calculate expiry time
          const expiresAt = Date.now() + (data.expiresIn * 1000);

          // Update store
          set({
            user: data.user,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            sessionId: data.sessionId,
            expiresAt,
          });

          return { success: true };
        } else {
          const error = data.error || 'Login failed';
          update(state => ({ ...state, isLoading: false, error }));
          return { success: false, error };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Network error';
        update(state => ({ ...state, isLoading: false, error: errorMessage }));
        return { success: false, error: errorMessage };
      }
    },

    /**
     * Logout user
     */
    logout: async (): Promise<void> => {
      update(state => ({ ...state, isLoading: true }));

      try {
        // Call backend logout if user is authenticated
        const currentState = get(authStore);
        if (currentState.isAuthenticated && currentState.accessToken) {
          await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${currentState.accessToken}`,
            },
            credentials: 'include',
          });
        }
      } catch (error) {
        console.error('Logout request failed:', error);
        // Continue with local cleanup even if server request fails
      }

      // Clear local state
      authStore.clearAuth();
    },

    /**
     * Clear authentication state
     */
    clearAuth: (): void => {
      authUtils.clearTokens();
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    },

    /**
     * Refresh access token
     */
    refreshAccessToken: async (): Promise<boolean> => {
      try {
        const newToken = await authUtils.refreshAccessToken();
        
        if (newToken) {
          const expiresAt = Date.now() + (15 * 60 * 1000); // 15 minutes
          
          update(state => ({
            ...state,
            accessToken: newToken,
            expiresAt,
            error: null,
          }));
          
          return true;
        }
        
        authStore.clearAuth();
        return false;
      } catch (error) {
        console.error('Token refresh failed:', error);
        authStore.clearAuth();
        return false;
      }
    },

    /**
     * Fetch current user data from API
     */
    fetchCurrentUser: async (): Promise<void> => {
      const accessToken = authUtils.getAccessToken();
      
      if (!accessToken) {
        authStore.clearAuth();
        return;
      }

      try {
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          
          if (data.success && data.user) {
            const expiresAt = Date.now() + (15 * 60 * 1000); // Assume 15 minutes
            
            update(state => ({
              ...state,
              user: data.user,
              accessToken,
              isAuthenticated: true,
              isLoading: false,
              error: null,
              expiresAt,
            }));
          } else {
            throw new Error(data.error || 'Failed to get user info');
          }
        } else if (response.status === 401) {
          // Token is invalid, try to refresh
          const refreshed = await authStore.refreshAccessToken();
          if (refreshed) {
            // Retry fetching user
            await authStore.fetchCurrentUser();
          } else {
            authStore.clearAuth();
          }
        } else {
          throw new Error('Failed to get user info');
        }
      } catch (error) {
        console.error('Fetch current user error:', error);
        authStore.clearAuth();
      }
    },

    /**
     * Update user data in store
     */
    updateUser: (updates: Partial<User>): void => {
      update(state => ({
        ...state,
        user: state.user ? { ...state.user, ...updates } : null,
      }));
    },

    /**
     * Set loading state
     */
    setLoading: (loading: boolean): void => {
      update(state => ({ ...state, isLoading: loading }));
    },

    /**
     * Set error state
     */
    setError: (error: string | null): void => {
      update(state => ({ ...state, error }));
    },

    /**
     * Change password
     */
    changePassword: async (currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
      const currentState = get(authStore);
      
      if (!currentState.isAuthenticated || !currentState.accessToken) {
        return { success: false, error: 'Not authenticated' };
      }

      try {
        const response = await fetch('/api/auth/change-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentState.accessToken}`,
          },
          credentials: 'include',
          body: JSON.stringify({
            currentPassword,
            newPassword,
            confirmPassword: newPassword,
          }),
        });

        const data = await response.json();
        
        if (data.success) {
          return { success: true };
        } else {
          return { success: false, error: data.error || 'Password change failed' };
        }
      } catch (error) {
        return { success: false, error: 'Network error' };
      }
    },
  };
})();

/**
 * Derived stores for convenient access to auth state
 */

// Current user
export const currentUser: Readable<User | null> = derived(
  authStore,
  $authStore => $authStore.user
);

// Authentication status
export const isAuthenticated: Readable<boolean> = derived(
  authStore,
  $authStore => $authStore.isAuthenticated
);

// Loading state
export const isLoading: Readable<boolean> = derived(
  authStore,
  $authStore => $authStore.isLoading
);

// Error state
export const authError: Readable<string | null> = derived(
  authStore,
  $authStore => $authStore.error
);

// User roles
export const userRoles: Readable<string[]> = derived(
  authStore,
  $authStore => $authStore.user?.roles || []
);

// User permissions (could be enhanced with more complex logic)
export const userPermissions: Readable<string[]> = derived(
  userRoles,
  $roles => {
    const permissions: string[] = [];
    
    // Add role-based permissions
    if ($roles.includes('admin')) {
      permissions.push('admin:*', 'hr:*', 'manager:*', 'employee:*');
    } else if ($roles.includes('hr_admin')) {
      permissions.push('hr:*', 'manager:*', 'employee:*');
    } else if ($roles.includes('manager')) {
      permissions.push('manager:*', 'employee:*');
    } else if ($roles.includes('employee')) {
      permissions.push('employee:*');
    }
    
    return permissions;
  }
);

// User role level (highest level)
export const userRoleLevel: Readable<number> = derived(
  userRoles,
  $roles => {
    const roleLevels: Record<string, number> = {
      admin: 80,
      hr_admin: 60,
      finance: 50,
      manager: 30,
      employee: 10,
    };
    
    return Math.max(...$roles.map(role => roleLevels[role] || 0));
  }
);

// Convenience function to get current auth state
export const get = (store: typeof authStore) => {
  let value: AuthState;
  store.subscribe(v => value = v)();
  return value!;
};

// Permission checking utilities
export const hasPermission = (permission: string): boolean => {
  const permissions = get(userPermissions);
  return permissions.some(p => 
    p === permission || 
    p.endsWith(':*') && permission.startsWith(p.slice(0, -1))
  );
};

export const hasRole = (role: string): boolean => {
  const roles = get(userRoles);
  return roles.includes(role);
};

export const hasMinimumRoleLevel = (requiredLevel: number): boolean => {
  const currentLevel = get(userRoleLevel);
  return currentLevel >= requiredLevel;
};