import { redirect } from '@sveltejs/kit';
import { get } from 'svelte/store';
import { goto } from '$app/navigation';
import { authStore } from '$lib/stores/auth';
import type { User } from '../api/types';

export interface PermissionCheck {
  permissions?: string[];
  roles?: string[];
  requireAll?: boolean; // Default: false (any permission/role matches)
}

/**
 * Check if user has required permissions or roles
 */
export function hasAccess(user: User | null, check: PermissionCheck): boolean {
  if (!user) return false;

  const { permissions = [], roles = [], requireAll = false } = check;

  // Check permissions
  if (permissions.length > 0) {
    const userPermissions = user.permissions || [];
    
    // Check for wildcard permission
    if (userPermissions.includes('*')) return true;
    
    const hasPermission = requireAll 
      ? permissions.every(p => userPermissions.includes(p))
      : permissions.some(p => userPermissions.includes(p));
    
    if (hasPermission) return true;
  }

  // Check roles
  if (roles.length > 0) {
    const userRoles = user.roles?.map(r => typeof r === 'string' ? r : r.name) || [];
    
    const hasRole = requireAll
      ? roles.every(r => userRoles.includes(r))
      : roles.some(r => userRoles.includes(r));
    
    if (hasRole) return true;
  }

  return false;
}

/**
 * Route guard for protecting pages
 * Returns true if access granted, false if should redirect
 */
export async function routeGuard(
  check: PermissionCheck,
  options: {
    redirectTo?: string;
    loginRedirect?: string;
    unauthorizedRedirect?: string;
  } = {}
): Promise<boolean> {
  const auth = get(authStore);
  const {
    redirectTo,
    loginRedirect = '/login',
    unauthorizedRedirect = '/unauthorized'
  } = options;

  // Check if user is authenticated
  if (!auth.isAuthenticated || !auth.user) {
    // Redirect to login with return path
    const returnPath = redirectTo || (typeof window !== 'undefined' ? window.location.pathname : '/');
    await goto(`${loginRedirect}?redirectTo=${encodeURIComponent(returnPath)}`);
    return false;
  }

  // Check if user has required access
  if (!hasAccess(auth.user, check)) {
    await goto(unauthorizedRedirect);
    return false;
  }

  return true;
}

/**
 * Higher-order function for page load guards
 * Usage in +page.server.ts or +layout.server.ts
 */
export function withAuthGuard<T extends Record<string, any>>(
  check: PermissionCheck,
  loadFn?: (event: any) => Promise<T> | T
) {
  return async (event: any) => {
    const { cookies, url } = event;
    const token = cookies.get('auth-token');

    if (!token) {
      // Redirect to login
      const redirectTo = url.pathname + url.search;
      throw redirect(302, `/login?redirectTo=${encodeURIComponent(redirectTo)}`);
    }

    // For server-side, we'll need to verify the token and check permissions
    // This would require calling the auth verify endpoint
    // For now, we'll allow the request to proceed and let client-side handle it

    return loadFn ? loadFn(event) : {} as T;
  };
}

/**
 * Utility functions for common role checks
 */
export const roleChecks = {
  admin: (): PermissionCheck => ({ roles: ['admin', 'super_admin', 'system_admin'] }),
  hr: (): PermissionCheck => ({ roles: ['hr', 'hr_admin', 'hr_manager'] }),
  manager: (): PermissionCheck => ({ roles: ['manager', 'senior_manager', 'department_head'] }),
  hrOrAdmin: (): PermissionCheck => ({ roles: ['hr', 'hr_admin', 'hr_manager', 'admin', 'super_admin', 'system_admin'] }),
  managerOrAbove: (): PermissionCheck => ({ 
    roles: ['manager', 'senior_manager', 'department_head', 'hr', 'hr_admin', 'hr_manager', 'admin', 'super_admin', 'system_admin'] 
  })
};

/**
 * Utility functions for common permission checks
 */
export const permissionChecks = {
  readEmployees: (): PermissionCheck => ({ permissions: ['read:employees', '*'] }),
  writeEmployees: (): PermissionCheck => ({ permissions: ['write:employees', '*'] }),
  readReports: (): PermissionCheck => ({ permissions: ['read:reports', '*'] }),
  writeReports: (): PermissionCheck => ({ permissions: ['write:reports', '*'] }),
  manageRoles: (): PermissionCheck => ({ permissions: ['write:roles', '*'] }),
  manageSystem: (): PermissionCheck => ({ permissions: ['admin:system', '*'] }),
  viewHRData: (): PermissionCheck => ({ 
    permissions: ['read:hr', 'read:employees', 'read:compliance', '*'],
    roles: ['hr', 'hr_admin', 'hr_manager', 'admin'] 
  })
};

/**
 * Check if current user can access a resource
 */
export function canAccess(check: PermissionCheck): boolean {
  const auth = get(authStore);
  return auth.isAuthenticated && hasAccess(auth.user, check);
}

// Legacy compatibility exports
export const requireAuth = withAuthGuard({});

export const requireRole = (...roles: string[]) => withAuthGuard({ roles });

export const requirePermission = (permission: string) => withAuthGuard({ permissions: [permission] });