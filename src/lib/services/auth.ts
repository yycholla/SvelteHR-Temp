import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';

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


// Authentication state types
export interface AuthUser {
  id: string;
  email: string;
  display_name: string;
  onboarding_status: string;
  job_title?: string;
  is_active: boolean;
  role_assignments: Array<{
    role: {
      id: string;
      name: string;
      level: number;
      description: string;
    };
  }>;
  job_information?: {
    id: string;
    job_title: string;
    hire_date: string;
    employment_type: string;
    work_location: string;
    is_remote: boolean;
    department?: {
      id: string;
      name: string;
      description: string;
    };
  };
  contact_information?: {
    phone_number: string;
    work_phone_number: string;
    address_city: string;
    address_state: string;
  };
  personal_information?: {
    date_of_birth: string;
    gender: string;
    nationality: string;
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
        // Call our authentication API endpoint
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Login failed');
        }

        const { success, user, accessToken, refreshToken, expiresIn } = result;
        
        if (!success) {
          throw new Error(result.error || 'Login failed');
        }
        
        // Tokens are set as cookies by the server
        
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
        // Call logout endpoint to invalidate server-side session
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include', // Include cookies
        });
      } catch (error) {
        // Continue with client-side logout even if server call fails
        console.warn('Server logout failed:', error);
      }

      // Cookies are cleared by the server
      
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
      update(state => ({ ...state, isLoading: true }));

      try {
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to load user');
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to load user');
        }

        const user = result.user;
        
        update(state => ({
          ...state,
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null
        }));
      } catch (error: any) {
        console.error('Failed to load user:', error);
        
        // Clear invalid auth state by calling logout endpoint
        
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
      // TODO: Implement password change functionality when Hasura supports it
      // For now, redirect to external password change flow or disable feature
      return {
        success: false,
        error: 'Password change not yet implemented with Hasura backend'
      };
    },

    async requestPasswordReset(email: string) {
      // TODO: Implement password reset functionality when Hasura supports it
      // For now, redirect to external password reset flow or disable feature
      return {
        success: false,
        error: 'Password reset not yet implemented with Hasura backend'
      };
    },

    async validateToken() {
      try {
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include',
        });

        if (!response.ok) {
          return { isValid: false };
        }

        const result = await response.json();
        
        if (!result.success) {
          return { isValid: false };
        }

        return {
          isValid: true,
          user: result.user
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

      // Try to load user from server (checks cookie-based auth)
      await this.loadUser();
    }
  };
};

// Create the auth store
export const auth = createAuthStore();

// Derived stores for common auth checks
export const currentUser = derived(auth, $auth => $auth.user);

export const isLoggedIn = derived(auth, $auth => $auth.isAuthenticated);

export const userRoles = derived(currentUser, $user => 
  $user?.role_assignments?.map(ra => ra.role.name) || []
);

export const userPermissions = derived(currentUser, $user => {
  if (!$user?.role_assignments) return [];
  
  // For now, return basic permissions based on role names
  // This can be expanded when we have a proper permissions system in the database
  const permissions = [];
  
  for (const roleAssignment of $user.role_assignments) {
    const roleName = roleAssignment.role.name;
    
    switch (roleName.toLowerCase()) {
      case 'admin':
        permissions.push(
          { resource: 'users', action: 'read', scope: 'ALL' },
          { resource: 'users', action: 'write', scope: 'ALL' },
          { resource: 'departments', action: 'read', scope: 'ALL' },
          { resource: 'departments', action: 'write', scope: 'ALL' },
          { resource: 'compensation', action: 'read', scope: 'ALL' },
          { resource: 'compensation', action: 'write', scope: 'ALL' }
        );
        break;
      case 'hr manager':
        permissions.push(
          { resource: 'users', action: 'read', scope: 'ALL' },
          { resource: 'users', action: 'write', scope: 'DEPARTMENT' },
          { resource: 'departments', action: 'read', scope: 'ALL' },
          { resource: 'compensation', action: 'read', scope: 'DEPARTMENT' }
        );
        break;
      case 'manager':
        permissions.push(
          { resource: 'users', action: 'read', scope: 'DEPARTMENT' },
          { resource: 'users', action: 'write', scope: 'TEAM' },
          { resource: 'departments', action: 'read', scope: 'OWN' }
        );
        break;
      case 'employee':
        permissions.push(
          { resource: 'users', action: 'read', scope: 'OWN' },
          { resource: 'users', action: 'write', scope: 'OWN' }
        );
        break;
    }
  }
  
  return permissions;
});

// Permission checking utilities
export const hasRole = (roleName: string): boolean => {
  const roles = get(userRoles);
  return roles.includes(roleName);
};

export const hasPermission = (resourceOrPermission: string, action?: string, scope?: string): boolean => {
  const permissions = get(userPermissions);
  
  // Handle both formats: hasPermission('user:update') and hasPermission('users', 'write')
  if (resourceOrPermission.includes(':') && !action) {
    const [resource, actionPart] = resourceOrPermission.split(':');
    
    // Map legacy permission format to new format
    const resourceMap: Record<string, string> = {
      'user': 'users',
      'users': 'users',
      'department': 'departments',
      'departments': 'departments',
      'compensation': 'compensation'
    };
    
    const actionMap: Record<string, string> = {
      'read': 'read',
      'create': 'write',
      'update': 'write',
      'delete': 'write',
      'view_salary': 'read'
    };
    
    const mappedResource = resourceMap[resource] || resource;
    const mappedAction = actionMap[actionPart] || actionPart;
    
    return permissions.some(permission => 
      permission.resource === mappedResource &&
      permission.action === mappedAction &&
      (!scope || permission.scope === scope || permission.scope === 'ALL')
    );
  }
  
  // Original format: hasPermission('users', 'write', 'ALL')
  return permissions.some(permission => 
    permission.resource === resourceOrPermission &&
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