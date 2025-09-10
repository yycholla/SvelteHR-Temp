/**
 * Authentication Store - Svelte 5 Runes with GraphQL
 * 
 * Modern reactive authentication state management using Svelte 5 runes.
 * Handles user authentication, permissions, and RBAC state with GraphQL operations.
 * Migrated from REST API to GraphQL for improved type safety and performance.
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
import { createBrowserAuthService, type GraphQLAuthService } from '$lib/graphql/services/auth-service';
import { browser } from '$app/environment';

// ============================================================================
// Core Authentication State (Svelte 5 Runes)
// ============================================================================

/**
 * GraphQL authentication service instance
 */
let authService: GraphQLAuthService | null = null;

/**
 * Initialize GraphQL auth service (browser-only)
 */
function initializeAuthService(): GraphQLAuthService {
  if (!authService && browser) {
    authService = createBrowserAuthService({
      tokenCookieName: 'hr_token',
      refreshTokenCookieName: 'hr_refresh_token',
      autoRefresh: true,
      refreshBuffer: 5
    });
  }
  return authService!;
}

/**
 * Primary authentication state using $state rune
 */
let authState = $state<AuthState>({
  user: null,
  permissions: [],
  roles: [],
  loading: false,
  error: null
});

// ============================================================================
// Derived State (Computed Values using $derived)
// ============================================================================

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return authState.user !== null && authState.user?.is_active === true;
}

/**
 * Check if user is loading
 */
export function isLoading(): boolean {
  return authState.loading;
}

/**
 * Get current error state
 */
export function authError(): string | null {
  return authState.error;
}

/**
 * Get current user
 */
export function currentUser(): UserContext | null {
  return authState.user;
}

/**
 * Get user permissions
 */
export function userPermissions(): string[] {
  return authState.permissions;
}

/**
 * Get user roles
 */
export function userRoles(): Role[] {
  return authState.roles;
}

/**
 * Check if user is admin
 */
export function isAdmin(): boolean {
  return authState.user ? hasRole(authState.user, 'Admin') : false;
}

/**
 * Check if user is HR Manager
 */
export function isHRManager(): boolean {
  return authState.user ? hasRole(authState.user, ['HR_Manager', 'Admin']) : false;
}

/**
 * Check if user is Manager
 */
export function isManager(): boolean {
  return authState.user ? hasRole(authState.user, ['Manager', 'HR_Manager', 'Admin']) : false;
}

/**
 * Get user role level
 */
export function userRoleLevel(): number {
  return authState.user ? getUserRoleLevel(authState.user) : 0;
}

/**
 * Get primary role (highest level)
 */
export function primaryRole(): Role | null {
  if (!authState.user || !authState.user.roles.length) return null;
  
  return authState.user.roles.reduce((highest, current) => 
    current.level > highest.level ? current : highest
  );
}

/**
 * Get user display name
 */
export function userDisplayName(): string {
  return authState.user?.full_name || authState.user?.email || 'Unknown User';
}

/**
 * Get user initials for avatar
 */
export function userInitials(): string {
  if (!authState.user?.full_name) return 'UN';
  
  return authState.user.full_name
    .split(' ')
    .map(name => name.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2);
}

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
 * Verify current authentication status using GraphQL
 * Useful for refreshing auth state
 */
export async function verifyAuth(): Promise<boolean> {
  setLoading(true);
  setError(null);
  
  try {
    if (!browser) {
      // Server-side verification should be handled by hooks.server.ts
      setLoading(false);
      return authState.user !== null;
    }
    
    const service = initializeAuthService();
    const result = await service.verifyToken();
    
    if (result.success && result.data?.me) {
      const { me } = result.data;
      
      if (me.authenticated && me.user) {
        const completeUser: UserContext = {
          ...me.user,
          permissions: me.permissions || [],
          roles: me.user.roles || []
        };
        
        setUser(completeUser);
        return true;
      } else {
        setUser(null);
        return false;
      }
    } else {
      console.warn('Token verification failed:', result.errors);
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
 * Logout user using GraphQL
 */
export async function logout(allDevices: boolean = false): Promise<void> {
  setLoading(true);
  
  try {
    if (browser) {
      const service = initializeAuthService();
      const result = await service.logout(allDevices);
      
      if (!result.success) {
        console.warn('Logout API call failed:', result.message);
      }
    }
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
 * Login with email and password using GraphQL
 */
export async function loginWithPassword(email: string, password: string, remember?: boolean): Promise<boolean> {
  setLoading(true);
  setError(null);
  
  try {
    if (!browser) {
      throw new Error('Password login can only be performed in browser environment');
    }
    
    const service = initializeAuthService();
    const result = await service.login({ email, password, remember });
    
    if (result.success && result.user) {
      const completeUser: UserContext = {
        ...result.user,
        permissions: result.user.permissions || [],
        roles: result.user.roles || []
      };
      
      setUser(completeUser);
      return true;
    } else {
      setError(result.message || 'Login failed');
      if (result.errors) {
        console.error('Login validation errors:', result.errors);
      }
      return false;
    }
  } catch (error) {
    console.error('Login error:', error);
    setError(error instanceof Error ? error.message : 'Login request failed');
    return false;
  } finally {
    setLoading(false);
  }
}

/**
 * Magic link authentication using GraphQL
 */
export async function loginWithMagicLink(token: string): Promise<boolean> {
  setLoading(true);
  setError(null);
  
  try {
    if (!browser) {
      throw new Error('Magic link login can only be performed in browser environment');
    }
    
    const service = initializeAuthService();
    const result = await service.magicLinkLogin({ token });
    
    if (result.success && result.user) {
      const completeUser: UserContext = {
        ...result.user,
        permissions: result.user.permissions || [],
        roles: result.user.roles || []
      };
      
      setUser(completeUser);
      return true;
    } else {
      setError(result.message || 'Magic link authentication failed');
      return false;
    }
  } catch (error) {
    console.error('Magic link login error:', error);
    setError(error instanceof Error ? error.message : 'Magic link authentication failed');
    return false;
  } finally {
    setLoading(false);
  }
}

/**
 * Legacy login function - redirect to GelDB authentication
 * Kept for backward compatibility
 */
export async function login(redirectTo?: string): Promise<void> {
  setLoading(true);
  setError(null);
  
  try {
    // Build GelDB auth URL with redirect
    const params = new URLSearchParams();
    if (redirectTo) {
      params.set('redirectTo', redirectTo);
    }
    
    const authUrl = `/api/auth/login${params.toString() ? '?' + params.toString() : ''}`;
    
    // Redirect to GelDB auth
    if (typeof window !== 'undefined') {
      window.location.href = authUrl;
    }
  } catch (error) {
    console.error('Login error:', error);
    setError(error instanceof Error ? error.message : 'Login failed');
    setLoading(false);
  }
}

/**
 * Refresh user permissions using GraphQL
 * Call when user roles/permissions might have changed
 */
export async function refreshPermissions(): Promise<void> {
  if (!authState.user) return;
  
  setLoading(true);
  
  try {
    if (!browser) {
      setLoading(false);
      return;
    }
    
    const service = initializeAuthService();
    const result = await service.getCurrentUser();
    
    if (result.success && result.data?.me?.authenticated && result.data.me.user) {
      const { me } = result.data;
      const completeUser: UserContext = {
        ...me.user,
        permissions: me.permissions || [],
        roles: me.user.roles || []
      };
      
      setUser(completeUser);
    } else {
      console.warn('Failed to refresh user permissions');
    }
  } catch (error) {
    console.error('Permission refresh error:', error);
    setError('Failed to refresh permissions');
  } finally {
    setLoading(false);
  }
}

/**
 * Update user profile using GraphQL
 */
export async function updateProfile(profileData: {
  first_name?: string;
  last_name?: string;
  name?: string;
  profile_picture_url?: string;
}): Promise<boolean> {
  if (!authState.user) return false;
  
  setLoading(true);
  setError(null);
  
  try {
    if (!browser) {
      throw new Error('Profile update can only be performed in browser environment');
    }
    
    const service = initializeAuthService();
    const result = await service.updateProfile({ input: profileData });
    
    if (result.success && result.user) {
      // Update local user state with new profile data
      const updatedUser: UserContext = {
        ...authState.user,
        ...result.user
      };
      
      setUser(updatedUser);
      return true;
    } else {
      setError(result.message || 'Profile update failed');
      return false;
    }
  } catch (error) {
    console.error('Profile update error:', error);
    setError(error instanceof Error ? error.message : 'Profile update failed');
    return false;
  } finally {
    setLoading(false);
  }
}

/**
 * Change password using GraphQL
 */
export async function changePassword(currentPassword: string, newPassword: string, confirmPassword: string): Promise<boolean> {
  if (!authState.user) return false;
  
  setLoading(true);
  setError(null);
  
  try {
    if (!browser) {
      throw new Error('Password change can only be performed in browser environment');
    }
    
    const service = initializeAuthService();
    const result = await service.changePassword({
      currentPassword,
      newPassword,
      confirmPassword
    });
    
    if (result.success) {
      return true;
    } else {
      setError(result.message || 'Password change failed');
      if (result.errors) {
        console.error('Password change validation errors:', result.errors);
      }
      return false;
    }
  } catch (error) {
    console.error('Password change error:', error);
    setError(error instanceof Error ? error.message : 'Password change failed');
    return false;
  } finally {
    setLoading(false);
  }
}

/**
 * Request password reset using GraphQL
 */
export async function requestPasswordReset(email: string): Promise<boolean> {
  setLoading(true);
  setError(null);
  
  try {
    if (!browser) {
      throw new Error('Password reset request can only be performed in browser environment');
    }
    
    const service = initializeAuthService();
    const result = await service.requestPasswordReset({ email });
    
    if (result.success) {
      return true;
    } else {
      setError(result.message || 'Password reset request failed');
      return false;
    }
  } catch (error) {
    console.error('Password reset request error:', error);
    setError(error instanceof Error ? error.message : 'Password reset request failed');
    return false;
  } finally {
    setLoading(false);
  }
}

/**
 * Reset password with token using GraphQL
 */
export async function resetPassword(token: string, newPassword: string, confirmPassword: string): Promise<boolean> {
  setLoading(true);
  setError(null);
  
  try {
    if (!browser) {
      throw new Error('Password reset can only be performed in browser environment');
    }
    
    const service = initializeAuthService();
    const result = await service.resetPassword({
      token,
      newPassword,
      confirmPassword
    });
    
    if (result.success) {
      return true;
    } else {
      setError(result.message || 'Password reset failed');
      if (result.errors) {
        console.error('Password reset validation errors:', result.errors);
      }
      return false;
    }
  } catch (error) {
    console.error('Password reset error:', error);
    setError(error instanceof Error ? error.message : 'Password reset failed');
    return false;
  } finally {
    setLoading(false);
  }
}

// ============================================================================
// Permission Checking Functions (Derived State)
// ============================================================================

/**
 * Check if current user has specific permission
 */
export function hasCurrentUserPermission(permission: string): boolean {
  return authState.user ? hasPermission(authState.user, permission) : false;
}

/**
 * Check if current user has specific role
 */
export function hasCurrentUserRole(role: RoleName | RoleName[]): boolean {
  return authState.user ? hasRole(authState.user, role) : false;
}

/**
 * Check if current user can access resource
 */
export function canCurrentUserAccessResource(resource: string, action = 'read', scope = 'all', resourceOwnerId?: string): boolean {
  return authState.user ? 
    canAccessResource(authState.user, resource, action as any, scope as any, resourceOwnerId) : 
    false;
}

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
    $effect(() => {
      console.log('Auth State:', {
        user: authState.user,
        permissions: authState.permissions,
        roles: authState.roles,
        loading: authState.loading,
        error: authState.error
      });
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
// Store Subscription Helpers (for backward compatibility)
// ============================================================================

/**
 * Get current auth state snapshot
 */
export function getAuthSnapshot(): AuthState {
  return { ...authState };
}

// ============================================================================
// Action Object Export (for components that expect grouped actions)
// ============================================================================

export const authActions = {
  initializeAuth,
  verifyAuth,
  login,
  logout,
  refreshPermissions,
  mockAuth,
  debugAuthState
};

// ============================================================================
// Main Auth Store Export (backward compatibility)
// ============================================================================

export const authStore = {
  // For backward compatibility with components expecting subscribe
  subscribe: (callback: (state: AuthState) => void) => {
    // Use $effect to track changes and call callback
    $effect(() => {
      callback({ ...authState });
    });
    
    // Return unsubscribe function
    return () => {};
  },
  
  // Derived state getters (for backward compatibility)
  get isAuthenticated() { return isAuthenticated(); },
  get isLoading() { return isLoading(); },
  get authError() { return authError(); },
  get currentUser() { return currentUser(); },
  get userPermissions() { return userPermissions(); },
  get userRoles() { return userRoles(); },
  get isAdmin() { return isAdmin(); },
  get isHRManager() { return isHRManager(); },
  get isManager() { return isManager(); },
  get userRoleLevel() { return userRoleLevel(); },
  get primaryRole() { return primaryRole(); },
  get userDisplayName() { return userDisplayName(); },
  get userInitials() { return userInitials(); },
  
  // Actions
  ...authActions,
  
  // Utilities
  getAuthSnapshot
};

// ============================================================================
// Type Exports for Components
// ============================================================================

export type { AuthState, UserContext, Role, RoleName };