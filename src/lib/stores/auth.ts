/**
 * Authentication Store - Svelte 5 Runes
 * 
 * Modern reactive authentication state management using Svelte 5's new runes syntax.
 * Handles user authentication, permissions, and RBAC state with server-side integration.
 */

import type { 
  UserContext, 
  Role, 
  AuthState,
  RoleName 
} from '$lib/types';
import { 
  hasPermission, 
  hasRole, 
  getUserRoleLevel,
  canAccessResource,
  isValidUserContext 
} from '$lib/utils/rbac';

// ============================================================================
// Core Authentication State (Svelte 5 Runes)
// ============================================================================

/**
 * Primary authentication state using $state rune
 */
const authState = $state<AuthState>({
  user: null,
  permissions: [],
  roles: [],
  loading: false,
  error: null
});

// ============================================================================
// Derived State (Computed Values)
// ============================================================================

/**
 * Check if user is authenticated
 */
export const isAuthenticated = $derived(
  authState.user !== null && authState.user.is_active
);

/**
 * Check if user is loading
 */
export const isLoading = $derived(authState.loading);

/**
 * Get current error state
 */
export const authError = $derived(authState.error);

/**
 * Get current user
 */
export const currentUser = $derived(authState.user);

/**
 * Get user permissions
 */
export const userPermissions = $derived(authState.permissions);

/**
 * Get user roles
 */
export const userRoles = $derived(authState.roles);

/**
 * Check if user is admin
 */
export const isAdmin = $derived(
  authState.user ? hasRole(authState.user, 'Admin') : false
);

/**
 * Check if user is HR Manager
 */
export const isHRManager = $derived(
  authState.user ? hasRole(authState.user, ['HR_Manager', 'Admin']) : false
);

/**
 * Check if user is Manager
 */
export const isManager = $derived(
  authState.user ? hasRole(authState.user, ['Manager', 'HR_Manager', 'Admin']) : false
);

/**
 * Get user role level
 */
export const userRoleLevel = $derived(
  authState.user ? getUserRoleLevel(authState.user) : 0
);

/**
 * Get primary role (highest level)
 */
export const primaryRole = $derived(() => {
  if (!authState.user || !authState.user.roles.length) return null;
  
  return authState.user.roles.reduce((highest, current) => 
    current.level > highest.level ? current : highest
  );
});

/**
 * Get user display name
 */
export const userDisplayName = $derived(
  authState.user?.full_name || authState.user?.email || 'Unknown User'
);

/**
 * Get user initials for avatar
 */
export const userInitials = $derived(() => {
  if (!authState.user?.full_name) return 'UN';
  
  return authState.user.full_name
    .split(' ')
    .map(name => name.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2);
});

// ============================================================================
// Authentication Actions
// ============================================================================

/**
 * Set loading state
 */
function setLoading(loading: boolean) {
  authState.loading = loading;
}

/**
 * Set error state
 */
function setError(error: string | null) {
  authState.error = error;
}

/**
 * Set user and related state
 */
function setUser(user: UserContext | null) {
  if (user && !isValidUserContext(user)) {
    console.error('Invalid user context provided to auth store');
    setError('Invalid user data received');
    return;
  }
  
  authState.user = user;
  authState.permissions = user?.permissions || [];
  authState.roles = user?.roles || [];
  authState.error = null;
}

/**
 * Initialize authentication from server-side data
 * Called from layout server load function
 */
export function initializeAuth(userData: {
  user: UserContext | null;
  permissions: string[];
  roles: Role[];
}) {
  setLoading(false);
  
  if (userData.user) {
    // Ensure user object has all required fields
    const completeUser: UserContext = {
      ...userData.user,
      permissions: userData.permissions,
      roles: userData.roles
    };
    
    setUser(completeUser);
  } else {
    setUser(null);
  }
}

/**
 * Verify current authentication status
 * Useful for refreshing auth state
 */
export async function verifyAuth(): Promise<boolean> {
  setLoading(true);
  setError(null);
  
  try {
    const response = await fetch('/api/v2/auth/verify', {
      method: 'GET',
      credentials: 'include', // Include cookies
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        setUser(null);
        return false;
      }
      throw new Error(`Authentication verification failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.user) {
      const completeUser: UserContext = {
        ...data.user,
        permissions: data.permissions || [],
        roles: data.roles || data.user.roles || []
      };
      
      setUser(completeUser);
      return true;
    } else {
      setUser(null);
      return false;
    }
  } catch (error) {
    console.error('Auth verification error:', error);
    setError(error instanceof Error ? error.message : 'Authentication verification failed');
    setUser(null);
    return false;
  } finally {
    setLoading(false);
  }
}

/**
 * Logout user
 */
export async function logout(): Promise<void> {
  setLoading(true);
  
  try {
    // Call server logout endpoint
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Clear auth state regardless of API call result
    setUser(null);
    setLoading(false);
    
    // Redirect to login page
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }
}

/**
 * Refresh user permissions
 * Call when user roles/permissions might have changed
 */
export async function refreshPermissions(): Promise<void> {
  if (!authState.user) return;
  
  await verifyAuth();
}

// ============================================================================
// Permission Checking Functions (Derived from Store)
// ============================================================================

/**
 * Check if current user has specific permission
 */
export const hasCurrentUserPermission = $derived.by(() => {
  return (permission: string): boolean => {
    return authState.user ? hasPermission(authState.user, permission) : false;
  };
});

/**
 * Check if current user has specific role
 */
export const hasCurrentUserRole = $derived.by(() => {
  return (role: RoleName | RoleName[]): boolean => {
    return authState.user ? hasRole(authState.user, role) : false;
  };
});

/**
 * Check if current user can access resource
 */
export const canCurrentUserAccessResource = $derived.by(() => {
  return (resource: string, action = 'read', scope = 'all', resourceOwnerId?: string): boolean => {
    return authState.user ? 
      canAccessResource(authState.user, resource, action as any, scope as any, resourceOwnerId) : 
      false;
  };
});

// ============================================================================
// Route Protection Helpers
// ============================================================================

/**
 * Check if current user can access a route
 */
export function canAccessCurrentRoute(routePath: string): boolean {
  if (!authState.user) return false;
  
  // Define route permissions mapping
  const routePermissions: Record<string, { permissions?: string[]; roles?: RoleName[] }> = {
    '/dashboard': { permissions: ['profile:read'] },
    '/profile': { permissions: ['profile:read'] },
    '/timesheet': { permissions: ['timesheet:read'] },
    '/requests': { permissions: ['requests:read'] },
    '/hr/employees': { roles: ['HR_Manager', 'Admin'] },
    '/hr/departments': { roles: ['HR_Manager', 'Admin'] },
    '/hr/analytics': { roles: ['HR_Manager', 'Admin'] },
    '/hr/reports': { roles: ['HR_Manager', 'Admin'] },
    '/admin/users': { roles: ['Admin'] },
    '/admin/roles': { roles: ['Admin'] },
    '/admin/system': { roles: ['Admin'] }
  };
  
  const config = routePermissions[routePath];
  if (!config) return true; // No restrictions defined
  
  // Check role requirements
  if (config.roles && !hasRole(authState.user, config.roles)) {
    return false;
  }
  
  // Check permission requirements
  if (config.permissions) {
    const hasRequiredPermission = config.permissions.some(permission =>
      hasPermission(authState.user!, permission)
    );
    if (!hasRequiredPermission) return false;
  }
  
  return true;
}

/**
 * Get redirect URL for unauthorized access
 */
export function getUnauthorizedRedirect(attemptedPath: string): string {
  if (!authState.user) {
    return `/login?redirectTo=${encodeURIComponent(attemptedPath)}`;
  }
  
  // User is authenticated but lacks permissions
  return '/dashboard?error=insufficient_permissions';
}

// ============================================================================
// Development & Debug Helpers
// ============================================================================

/**
 * Debug function to log current auth state (development only)
 */
export function debugAuthState() {
  if (import.meta.env.DEV) {
    console.log('Auth State:', {
      user: authState.user,
      permissions: authState.permissions,
      roles: authState.roles,
      loading: authState.loading,
      error: authState.error,
      isAuthenticated: isAuthenticated,
      isAdmin: isAdmin,
      isHRManager: isHRManager,
      userRoleLevel: userRoleLevel,
      primaryRole: primaryRole
    });
  }
}

/**
 * Mock authentication for development/testing
 */
export function mockAuth(role: RoleName = 'Employee') {
  if (!import.meta.env.DEV) {
    console.warn('mockAuth should only be used in development');
    return;
  }
  
  const mockUsers: Record<RoleName, UserContext> = {
    Employee: {
      id: 'emp-123',
      email: 'employee@company.com',
      full_name: 'John Employee',
      roles: [{ id: 'role-1', name: 'Employee', level: 25, description: 'Employee', inherits_from: [], is_active: true }],
      permissions: ['profile:read:own', 'profile:update:own', 'timesheet:*:own'],
      department_id: 'dept-1',
      is_active: true,
      last_login: new Date()
    },
    Manager: {
      id: 'mgr-123',
      email: 'manager@company.com',
      full_name: 'Jane Manager',
      roles: [{ id: 'role-2', name: 'Manager', level: 50, description: 'Manager', inherits_from: ['role-1'], is_active: true }],
      permissions: ['profile:read:own', 'employees:read:department', 'reports:read:team'],
      department_id: 'dept-1',
      is_active: true,
      last_login: new Date()
    },
    HR_Manager: {
      id: 'hr-123',
      email: 'hr.manager@company.com',
      full_name: 'Bob HR Manager',
      roles: [{ id: 'role-3', name: 'HR_Manager', level: 75, description: 'HR Manager', inherits_from: ['role-2'], is_active: true }],
      permissions: ['employees:*', 'departments:*', 'reports:hr', 'analytics:*'],
      department_id: 'dept-hr',
      is_active: true,
      last_login: new Date()
    },
    Admin: {
      id: 'admin-123',
      email: 'admin@company.com',
      full_name: 'Alice Admin',
      roles: [{ id: 'role-4', name: 'Admin', level: 100, description: 'Administrator', inherits_from: ['role-3'], is_active: true }],
      permissions: ['*'],
      is_active: true,
      last_login: new Date()
    }
  };
  
  setUser(mockUsers[role]);
  console.log(`Mocked auth as ${role}:`, mockUsers[role]);
}

// ============================================================================
// Store Subscription Helpers (for legacy compatibility)
// ============================================================================

/**
 * Subscribe to auth state changes (legacy compatibility)
 * For use in components that need to reactively respond to auth changes
 */
export function subscribeToAuth(callback: (state: AuthState) => void) {
  // In Svelte 5, this would typically be handled by reactive statements
  // This is for compatibility with components that need explicit subscriptions
  $effect(() => {
    callback({
      user: authState.user,
      permissions: authState.permissions,
      roles: authState.roles,
      loading: authState.loading,
      error: authState.error
    });
  });
}

/**
 * Get current auth state snapshot
 */
export function getAuthSnapshot(): AuthState {
  return {
    user: authState.user,
    permissions: authState.permissions,
    roles: authState.roles,
    loading: authState.loading,
    error: authState.error
  };
}

// ============================================================================
// Type Exports for Components
// ============================================================================

export type { AuthState, UserContext, Role, RoleName };