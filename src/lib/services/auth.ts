import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { client, setAuthTokens, clearAuthTokens, getAuthToken, isAuthenticated } from '$lib/graphql/client';
import type { User } from '$gql/graphql';

/**
 * Authentication Service for MountainHR
 * 
 * Provides comprehensive authentication management including:
 * - Login/logout operations
 * - User session management
 * - Role-based access control
 * - Token refresh handling
 * - Password management
 */

// GraphQL mutations and queries
const LOGIN_MUTATION = `
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      accessToken
      refreshToken
      expiresIn
      user {
        id
        email
        displayName
        firstName
        lastName
        onboardingStatus
        isActive
        roles {
          id
          name
          permissions {
            name
            resource
            action
            scope
          }
        }
        department {
          id
          name
        }
        jobInfo {
          title
          hireDate
          employmentType
        }
        contactInfo {
          phoneNumber
          addressCity
        }
      }
    }
  }
`;

const LOGOUT_MUTATION = `
  mutation Logout {
    logout
  }
`;

const ME_QUERY = `
  query Me {
    me {
      id
      email
      displayName
      firstName
      lastName
      onboardingStatus
      isActive
      roles {
        id
        name
        permissions {
          name
          resource
          action
          scope
        }
      }
      department {
        id
        name
      }
      jobInfo {
        title
        hireDate
        employmentType
      }
      contactInfo {
        phoneNumber
        addressCity
      }
    }
  }
`;

const CHANGE_PASSWORD_MUTATION = `
  mutation ChangePassword($currentPassword: String!, $newPassword: String!) {
    changePassword(currentPassword: $currentPassword, newPassword: $newPassword) {
      success
      requiresReauth
    }
  }
`;

const REQUEST_PASSWORD_RESET_MUTATION = `
  mutation RequestPasswordReset($email: String!) {
    requestPasswordReset(email: $email) {
      success
      message
    }
  }
`;

const VALIDATE_TOKEN_QUERY = `
  query ValidateToken {
    validateToken {
      id
      email
      roles {
        name
      }
    }
  }
`;

// Authentication state types
export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  onboardingStatus: string;
  isActive: boolean;
  roles: Array<{
    id: string;
    name: string;
    permissions: Array<{
      name: string;
      resource: string;
      action: string;
      scope: string;
    }>;
  }>;
  department?: {
    id: string;
    name: string;
  };
  jobInfo?: {
    title: string;
    hireDate: string;
    employmentType: string;
  };
  contactInfo?: {
    phoneNumber: string;
    addressCity: string;
  };
}

export interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

// Create reactive stores
const createAuthStore = () => {
  const initialState: AuthState = {
    user: null,
    isLoading: false,
    isAuthenticated: false,
    error: null
  };

  const { subscribe, set, update } = writable(initialState);

  return {
    subscribe,
    
    // Actions
    async login(email: string, password: string) {
      update(state => ({ ...state, isLoading: true, error: null }));

      try {
        const result = await client.mutation(LOGIN_MUTATION, { email, password }).toPromise();
        
        if (result.error) {
          throw new Error(result.error.graphQLErrors[0]?.message || 'Login failed');
        }

        const { accessToken, refreshToken, expiresIn, user } = result.data.login;
        
        // Store auth tokens
        setAuthTokens({ accessToken, refreshToken, expiresIn });
        
        // Update auth state
        update(state => ({
          ...state,
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null
        }));

        return { success: true, user };
      } catch (error: any) {
        const errorMessage = error.message || 'Login failed';
        update(state => ({
          ...state,
          isLoading: false,
          error: errorMessage,
          isAuthenticated: false,
          user: null
        }));
        
        return { success: false, error: errorMessage };
      }
    },

    async logout() {
      update(state => ({ ...state, isLoading: true }));

      try {
        // Call logout mutation to invalidate server-side session
        await client.mutation(LOGOUT_MUTATION, {}).toPromise();
      } catch (error) {
        // Continue with client-side logout even if server call fails
        console.warn('Server logout failed:', error);
      }

      // Clear client-side auth state
      clearAuthTokens();
      
      update(state => ({
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      }));

      // Redirect to login
      if (browser) {
        goto('/login');
      }
    },

    async loadUser() {
      if (!isAuthenticated()) {
        update(state => ({ ...state, isAuthenticated: false, user: null }));
        return;
      }

      update(state => ({ ...state, isLoading: true }));

      try {
        const result = await client.query(ME_QUERY, {}).toPromise();
        
        if (result.error) {
          throw new Error(result.error.graphQLErrors[0]?.message || 'Failed to load user');
        }

        const user = result.data.me;
        
        update(state => ({
          ...state,
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null
        }));
      } catch (error: any) {
        console.error('Failed to load user:', error);
        
        // Clear invalid auth state
        clearAuthTokens();
        
        update(state => ({
          ...state,
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null
        }));
      }
    },

    async changePassword(currentPassword: string, newPassword: string) {
      update(state => ({ ...state, isLoading: true, error: null }));

      try {
        const result = await client.mutation(CHANGE_PASSWORD_MUTATION, {
          currentPassword,
          newPassword
        }).toPromise();
        
        if (result.error) {
          throw new Error(result.error.graphQLErrors[0]?.message || 'Password change failed');
        }

        const { success, requiresReauth } = result.data.changePassword;
        
        update(state => ({ ...state, isLoading: false }));
        
        if (requiresReauth) {
          // Force re-authentication after password change
          await this.logout();
          return { success: true, requiresReauth: true };
        }
        
        return { success, requiresReauth: false };
      } catch (error: any) {
        const errorMessage = error.message || 'Password change failed';
        update(state => ({ ...state, isLoading: false, error: errorMessage }));
        return { success: false, error: errorMessage };
      }
    },

    async requestPasswordReset(email: string) {
      try {
        const result = await client.mutation(REQUEST_PASSWORD_RESET_MUTATION, { email }).toPromise();
        
        if (result.error) {
          throw new Error(result.error.graphQLErrors[0]?.message || 'Password reset request failed');
        }

        return {
          success: true,
          message: result.data.requestPasswordReset.message
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || 'Password reset request failed'
        };
      }
    },

    async validateToken() {
      if (!getAuthToken()) {
        return { isValid: false };
      }

      try {
        const result = await client.query(VALIDATE_TOKEN_QUERY, {}).toPromise();
        
        if (result.error) {
          return { isValid: false };
        }

        return {
          isValid: true,
          user: result.data.validateToken
        };
      } catch (error) {
        return { isValid: false };
      }
    },

    // State updates
    setError(error: string | null) {
      update(state => ({ ...state, error }));
    },

    clearError() {
      update(state => ({ ...state, error: null }));
    },

    // Initialize auth state on app start
    async initialize() {
      if (!browser) return;

      if (isAuthenticated()) {
        await this.loadUser();
      } else {
        update(state => ({ ...state, isAuthenticated: false, user: null }));
      }
    }
  };
};

// Create the auth store
export const auth = createAuthStore();

// Derived stores for common auth checks
export const currentUser = derived(auth, $auth => $auth.user);

export const isLoggedIn = derived(auth, $auth => $auth.isAuthenticated);

export const userRoles = derived(currentUser, $user => 
  $user?.roles?.map(role => role.name) || []
);

export const userPermissions = derived(currentUser, $user => {
  if (!$user?.roles) return [];
  
  return $user.roles.flatMap(role => role.permissions || []);
});

// Permission checking utilities
export const hasRole = (roleName: string): boolean => {
  const roles = get(userRoles);
  return roles.includes(roleName);
};

export const hasPermission = (resource: string, action: string, scope?: string): boolean => {
  const permissions = get(userPermissions);
  
  return permissions.some(permission => 
    permission.resource === resource &&
    permission.action === action &&
    (!scope || permission.scope === scope || permission.scope === 'ALL')
  );
};

export const hasAnyRole = (roleNames: string[]): boolean => {
  const roles = get(userRoles);
  return roleNames.some(roleName => roles.includes(roleName));
};

export const canAccess = (requiredRoles?: string[], requiredPermissions?: Array<{resource: string, action: string, scope?: string}>): boolean => {
  // Check if user is authenticated
  if (!get(isLoggedIn)) {
    return false;
  }

  // Check required roles
  if (requiredRoles && requiredRoles.length > 0) {
    if (!hasAnyRole(requiredRoles)) {
      return false;
    }
  }

  // Check required permissions
  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasAllPermissions = requiredPermissions.every(perm => 
      hasPermission(perm.resource, perm.action, perm.scope)
    );
    
    if (!hasAllPermissions) {
      return false;
    }
  }

  return true;
};

// Navigation guards
export const requireAuth = (redirectTo = '/login') => {
  return (next: () => void) => {
    if (!get(isLoggedIn)) {
      if (browser) {
        const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
        goto(`${redirectTo}?returnUrl=${returnUrl}`);
      }
      return;
    }
    next();
  };
};

export const requireRole = (roleName: string, redirectTo = '/unauthorized') => {
  return (next: () => void) => {
    if (!hasRole(roleName)) {
      if (browser) {
        goto(redirectTo);
      }
      return;
    }
    next();
  };
};

export const requirePermission = (resource: string, action: string, scope?: string, redirectTo = '/unauthorized') => {
  return (next: () => void) => {
    if (!hasPermission(resource, action, scope)) {
      if (browser) {
        goto(redirectTo);
      }
      return;
    }
    next();
  };
};

// Session management
let sessionCheckInterval: NodeJS.Timeout | null = null;

export const startSessionMonitoring = () => {
  if (!browser || sessionCheckInterval) return;

  // Check session validity every 5 minutes
  sessionCheckInterval = setInterval(async () => {
    if (get(isLoggedIn)) {
      const validation = await auth.validateToken();
      if (!validation.isValid) {
        console.warn('Session expired, logging out');
        await auth.logout();
      }
    }
  }, 5 * 60 * 1000);
};

export const stopSessionMonitoring = () => {
  if (sessionCheckInterval) {
    clearInterval(sessionCheckInterval);
    sessionCheckInterval = null;
  }
};

// Initialize auth service
if (browser) {
  // Initialize auth state on app start
  auth.initialize();
  
  // Start session monitoring
  startSessionMonitoring();
  
  // Handle browser tab visibility for session management
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && get(isLoggedIn)) {
      // Tab became visible, check if session is still valid
      auth.validateToken().then(validation => {
        if (!validation.isValid) {
          auth.logout();
        }
      });
    }
  });

  // Handle network connectivity changes
  window.addEventListener('network-status-change', ((event: CustomEvent) => {
    if (event.detail.isOnline && get(isLoggedIn)) {
      // Connection restored, refresh user data
      auth.loadUser();
    }
  }) as EventListener);
}

// Export auth service as default
export default auth;