/**
 * Role-Based Access Control (RBAC) Utilities
 * 
 * Comprehensive utilities for implementing fine-grained access control
 * in the SvelteHR frontend. All functions are pure and support the 
 * hierarchical role system defined in the data model.
 */

import type { 
  UserContext, 
  Role, 
  RoleName, 
  RoleLevel, 
  PermissionAction, 
  PermissionScope,
  RouteProtection,
  DataFilter,
  ROLE_LEVELS
} from '$lib/types';

// ============================================================================
// Core Permission Checking
// ============================================================================

/**
 * Check if user has a specific permission string
 * Supports wildcard permissions (*) and role-based inheritance
 */
export function hasPermission(user: UserContext, permission: string): boolean {
  if (!user || !user.permissions) return false;
  
  // Admin wildcard check
  if (user.permissions.includes('*')) return true;
  
  // Exact permission match
  if (user.permissions.includes(permission)) return true;
  
  // Parse permission components for wildcard matching
  const [resource, action, scope] = permission.split(':');
  
  // Check resource wildcards: "employees:*", "employees:*:*"
  const resourceWildcards = [
    `${resource}:*`,
    `${resource}:*:*`
  ];
  
  return resourceWildcards.some(wildcard => user.permissions.includes(wildcard));
}

/**
 * Check if user has any role in the provided list
 */
export function hasRole(user: UserContext, roles: RoleName | RoleName[]): boolean {
  if (!user || !user.roles) return false;
  
  const roleList = Array.isArray(roles) ? roles : [roles];
  return user.roles.some(userRole => roleList.includes(userRole.name));
}

/**
 * Get the highest role level for the user
 * Used for hierarchical permission checks
 */
export function getUserRoleLevel(user: UserContext): RoleLevel {
  if (!user || !user.roles || user.roles.length === 0) return 0 as RoleLevel;
  
  return Math.max(...user.roles.map(role => role.level)) as RoleLevel;
}

/**
 * Check if user meets minimum role level requirement
 */
export function hasMinimumRoleLevel(user: UserContext, minimumLevel: RoleLevel): boolean {
  return getUserRoleLevel(user) >= minimumLevel;
}

// ============================================================================
// Resource Access Control
// ============================================================================

/**
 * Comprehensive resource access checking with scope support
 * Handles resource:action:scope permission patterns
 */
export function canAccessResource(
  user: UserContext,
  resource: string,
  action: PermissionAction = 'read',
  scope: PermissionScope = 'all',
  resourceOwnerId?: string
): boolean {
  if (!user) return false;
  
  // Admin always has access
  if (hasPermission(user, '*')) return true;
  
  // Check specific permission with scope
  const permissionWithScope = `${resource}:${action}:${scope}`;
  if (hasPermission(user, permissionWithScope)) return true;
  
  // Check permission without scope (legacy support)
  const permissionWithoutScope = `${resource}:${action}`;
  if (hasPermission(user, permissionWithoutScope)) return true;
  
  // Check resource wildcard
  if (hasPermission(user, `${resource}:*`)) return true;
  
  // Special handling for "own" scope - check resource ownership
  if (scope === 'own' && resourceOwnerId) {
    const ownPermission = `${resource}:${action}:own`;
    return hasPermission(user, ownPermission) && user.id === resourceOwnerId;
  }
  
  // Department-scoped access
  if (scope === 'department' && user.department_id) {
    const departmentPermission = `${resource}:${action}:department`;
    return hasPermission(user, departmentPermission);
  }
  
  return false;
}

/**
 * Check if user can access employee data based on role hierarchy
 * Implements the business logic for employee data access
 */
export function canAccessEmployee(
  user: UserContext,
  employeeId: string,
  employeeDepartmentId?: string,
  action: PermissionAction = 'read'
): boolean {
  if (!user) return false;
  
  // Admin and HR Manager can access all employees
  if (hasRole(user, ['Admin', 'HR_Manager'])) return true;
  
  // Users can always access their own data
  if (user.id === employeeId) return true;
  
  // Managers can access employees in their department
  if (hasRole(user, 'Manager') && user.department_id && user.department_id === employeeDepartmentId) {
    return canAccessResource(user, 'employees', action, 'department');
  }
  
  // Check specific employee permissions
  return canAccessResource(user, 'employees', action, 'all');
}

/**
 * Check if user can access department data
 */
export function canAccessDepartment(
  user: UserContext,
  departmentId: string,
  action: PermissionAction = 'read'
): boolean {
  if (!user) return false;
  
  // Admin and HR Manager can access all departments
  if (hasRole(user, ['Admin', 'HR_Manager'])) return true;
  
  // Users can access their own department
  if (user.department_id === departmentId) {
    return canAccessResource(user, 'departments', action, 'own');
  }
  
  // Check general department permissions
  return canAccessResource(user, 'departments', action, 'all');
}

// ============================================================================
// Route Protection
// ============================================================================

/**
 * Check if user can access a protected route
 */
export function canAccessRoute(user: UserContext, protection: RouteProtection): boolean {
  if (!user) return false;
  
  // Check required permissions
  if (protection.required_permissions) {
    const hasRequiredPermission = protection.required_permissions.some(permission =>
      hasPermission(user, permission)
    );
    if (!hasRequiredPermission) return false;
  }
  
  // Check required roles
  if (protection.required_roles) {
    const hasRequiredRole = protection.required_roles.some(role =>
      hasRole(user, role as RoleName)
    );
    if (!hasRequiredRole) return false;
  }
  
  return true;
}

/**
 * Get route protection configuration for common routes
 */
export function getRouteProtection(routePath: string): RouteProtection {
  const routeConfigs: Record<string, RouteProtection> = {
    // Employee routes
    '/profile': {
      required_permissions: ['profile:read'],
      allow_own_resource: true
    },
    '/timesheet': {
      required_permissions: ['timesheet:read', 'timesheet:write'],
      allow_own_resource: true
    },
    '/requests': {
      required_permissions: ['requests:read', 'requests:write'],
      allow_own_resource: true
    },
    
    // HR routes
    '/hr/employees': {
      required_permissions: ['employees:read'],
      required_roles: ['HR_Manager', 'Admin']
    },
    '/hr/departments': {
      required_permissions: ['departments:read'],
      required_roles: ['HR_Manager', 'Admin']
    },
    '/hr/analytics': {
      required_permissions: ['analytics:read'],
      required_roles: ['HR_Manager', 'Admin']
    },
    '/hr/reports': {
      required_permissions: ['reports:hr'],
      required_roles: ['HR_Manager', 'Admin']
    },
    
    // Admin routes
    '/admin/users': {
      required_permissions: ['users:read'],
      required_roles: ['Admin']
    },
    '/admin/roles': {
      required_permissions: ['roles:read'],
      required_roles: ['Admin']
    },
    '/admin/system': {
      required_permissions: ['system:read'],
      required_roles: ['Admin']
    }
  };
  
  return routeConfigs[routePath] || {};
}

// ============================================================================
// Data Filtering
// ============================================================================

/**
 * Generate data filters based on user's RBAC permissions
 * Used for server-side data filtering
 */
export function generateDataFilters(user: UserContext, resource: string): DataFilter[] {
  if (!user) return [];
  
  const filters: DataFilter[] = [];
  
  // Admin sees everything
  if (hasRole(user, 'Admin') || hasPermission(user, '*')) {
    return filters; // No filtering needed
  }
  
  // HR Manager sees all in their scope
  if (hasRole(user, 'HR_Manager')) {
    // Could add organization-level filtering here if needed
    return filters;
  }
  
  // Manager sees their department
  if (hasRole(user, 'Manager') && user.department_id) {
    if (resource === 'employees') {
      filters.push({
        field: 'department_id',
        operation: 'equals',
        value: user.department_id
      });
    }
  }
  
  // Employee sees only their own data
  if (hasRole(user, 'Employee')) {
    if (resource === 'employees') {
      filters.push({
        field: 'id',
        operation: 'equals',
        value: user.id
      });
    }
  }
  
  return filters;
}

/**
 * Filter array of data based on user permissions
 * Client-side filtering utility
 */
export function filterDataByPermissions<T extends { id: string; department_id?: string }>(
  data: T[],
  user: UserContext,
  resource: string
): T[] {
  if (!user) return [];
  
  const filters = generateDataFilters(user, resource);
  if (filters.length === 0) return data; // No filtering needed
  
  return data.filter(item => {
    return filters.every(filter => {
      const itemValue = (item as any)[filter.field];
      
      switch (filter.operation) {
        case 'equals':
          return itemValue === filter.value;
        case 'in':
          return Array.isArray(filter.value) && filter.value.includes(itemValue);
        case 'not_in':
          return Array.isArray(filter.value) && !filter.value.includes(itemValue);
        default:
          return true;
      }
    });
  });
}

// ============================================================================
// UI Helper Functions
// ============================================================================

/**
 * Get user-friendly role name
 */
export function getRoleDisplayName(role: RoleName): string {
  const roleNames: Record<RoleName, string> = {
    Employee: 'Employee',
    Manager: 'Manager', 
    HR_Manager: 'HR Manager',
    Admin: 'Administrator'
  };
  
  return roleNames[role] || role;
}

/**
 * Get role badge color for UI display
 */
export function getRoleBadgeColor(role: RoleName): string {
  const colors: Record<RoleName, string> = {
    Employee: 'bg-blue-100 text-blue-800',
    Manager: 'bg-green-100 text-green-800',
    HR_Manager: 'bg-purple-100 text-purple-800',
    Admin: 'bg-red-100 text-red-800'
  };
  
  return colors[role] || 'bg-gray-100 text-gray-800';
}

/**
 * Check if action should be visible in UI based on permissions
 */
export function shouldShowAction(
  user: UserContext,
  actionPermissions: string[],
  resourceOwnerId?: string
): boolean {
  if (!user) return false;
  
  // Check if user has any of the required permissions
  const hasActionPermission = actionPermissions.some(permission =>
    hasPermission(user, permission)
  );
  
  if (hasActionPermission) return true;
  
  // Check if it's own resource and user has "own" scope permission
  if (resourceOwnerId && user.id === resourceOwnerId) {
    return actionPermissions.some(permission => {
      const [resource, action] = permission.split(':');
      return hasPermission(user, `${resource}:${action}:own`);
    });
  }
  
  return false;
}

/**
 * Get navigation items filtered by user permissions
 */
export function getFilteredNavigation(user: UserContext, allNavItems: any[]): any[] {
  if (!user) return [];
  
  return allNavItems.filter(item => {
    // Check if item has permission requirements
    if (item.permissions_required) {
      const hasRequiredPermission = item.permissions_required.some((permission: string) =>
        hasPermission(user, permission)
      );
      if (!hasRequiredPermission) return false;
    }
    
    // Check if item has role requirements
    if (item.roles_required) {
      const hasRequiredRole = item.roles_required.some((role: RoleName) =>
        hasRole(user, role)
      );
      if (!hasRequiredRole) return false;
    }
    
    // Filter children recursively
    if (item.children) {
      item.children = getFilteredNavigation(user, item.children);
    }
    
    return true;
  });
}

// ============================================================================
// Validation & Security
// ============================================================================

/**
 * Validate user context object
 */
export function isValidUserContext(obj: any): obj is UserContext {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.email === 'string' &&
    typeof obj.full_name === 'string' &&
    Array.isArray(obj.roles) &&
    Array.isArray(obj.permissions) &&
    typeof obj.is_active === 'boolean'
  );
}

/**
 * Sanitize user context for client-side storage
 * Removes sensitive information that shouldn't be stored client-side
 */
export function sanitizeUserContext(user: UserContext): Partial<UserContext> {
  const { permissions, ...sanitized } = user;
  return {
    ...sanitized,
    permissions: [] // Don't store permissions client-side
  };
}

/**
 * Audit log helper for tracking permission checks
 */
export function createAuditLog(
  user: UserContext,
  action: string,
  resource: string,
  granted: boolean,
  metadata?: any
) {
  return {
    user_id: user.id,
    user_email: user.email,
    user_roles: user.roles.map(r => r.name),
    action,
    resource,
    granted,
    timestamp: new Date(),
    metadata
  };
}

// ============================================================================
// Constants and Presets
// ============================================================================

/**
 * Common permission sets for different user types
 */
export const PERMISSION_PRESETS = {
  EMPLOYEE_BASE: [
    'profile:read:own',
    'profile:update:own',
    'timesheet:read:own',
    'timesheet:write:own',
    'requests:read:own',
    'requests:write:own'
  ],
  
  MANAGER_BASE: [
    'employees:read:department',
    'reports:read:team',
    'requests:approve:department'
  ],
  
  HR_MANAGER_BASE: [
    'employees:*',
    'departments:*',
    'reports:hr',
    'analytics:read',
    'analytics:write'
  ],
  
  ADMIN_FULL: ['*']
} as const;

/**
 * Route patterns that require authentication
 */
export const PROTECTED_ROUTES = [
  '/dashboard',
  '/profile',
  '/timesheet',
  '/requests',
  '/hr/**',
  '/admin/**'
] as const;

/**
 * Public routes that don't require authentication
 */
export const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/privacy',
  '/terms',
  '/api/health'
] as const;

/**
 * Check if a route is protected
 */
export function isProtectedRoute(path: string): boolean {
  return PROTECTED_ROUTES.some(pattern => {
    if (pattern.endsWith('**')) {
      return path.startsWith(pattern.replace('**', ''));
    }
    return path === pattern;
  });
}

/**
 * Check if a route is public
 */
export function isPublicRoute(path: string): boolean {
  return PUBLIC_ROUTES.includes(path as any) || path.startsWith('/api/');
}