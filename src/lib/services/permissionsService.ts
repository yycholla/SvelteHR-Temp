import { writable, derived, get } from 'svelte/store';
import { currentUser } from './auth';
import type { User } from '$lib/types';

/**
 * Enhanced Permissions Service for MountainHR
 * 
 * Provides comprehensive role-based access control including:
 * - Granular permission checking
 * - Resource-based access control
 * - Context-aware permissions (own vs others)
 * - Permission caching and optimization
 * - Admin override capabilities
 */

// =============================================================================
// Permission Types and Interfaces
// =============================================================================

export interface Permission {
  resource: string;
  action: string;
  scope: 'ALL' | 'DEPARTMENT' | 'TEAM' | 'OWN';
  conditions?: PermissionCondition[];
}

export interface PermissionCondition {
  type: 'department' | 'role' | 'status' | 'custom';
  operator: 'equals' | 'in' | 'not_in' | 'greater_than' | 'less_than';
  value: any;
}

export interface PermissionContext {
  targetUserId?: string;
  departmentId?: string;
  resourceOwnerId?: string;
  customContext?: Record<string, any>;
}

export interface RolePermissions {
  role: string;
  permissions: Permission[];
  inheritsFrom?: string[];
}

// =============================================================================
// Permission Definitions
// =============================================================================

const PERMISSION_DEFINITIONS: Record<string, RolePermissions> = {
  'admin': {
    role: 'admin',
    permissions: [
      // Full system access
      { resource: 'users', action: 'create', scope: 'ALL' },
      { resource: 'users', action: 'read', scope: 'ALL' },
      { resource: 'users', action: 'update', scope: 'ALL' },
      { resource: 'users', action: 'delete', scope: 'ALL' },
      { resource: 'users', action: 'view_salary', scope: 'ALL' },
      
      { resource: 'departments', action: 'create', scope: 'ALL' },
      { resource: 'departments', action: 'read', scope: 'ALL' },
      { resource: 'departments', action: 'update', scope: 'ALL' },
      { resource: 'departments', action: 'delete', scope: 'ALL' },
      
      { resource: 'onboarding', action: 'create', scope: 'ALL' },
      { resource: 'onboarding', action: 'read', scope: 'ALL' },
      { resource: 'onboarding', action: 'update', scope: 'ALL' },
      { resource: 'onboarding', action: 'delete', scope: 'ALL' },
      
      { resource: 'compensation', action: 'read', scope: 'ALL' },
      { resource: 'compensation', action: 'update', scope: 'ALL' },
      
      { resource: 'system', action: 'configure', scope: 'ALL' },
      { resource: 'reports', action: 'generate', scope: 'ALL' },
      { resource: 'audit', action: 'view', scope: 'ALL' },
    ]
  },

  'hr_manager': {
    role: 'hr_manager',
    permissions: [
      // User management within company
      { resource: 'users', action: 'create', scope: 'ALL' },
      { resource: 'users', action: 'read', scope: 'ALL' },
      { resource: 'users', action: 'update', scope: 'ALL' },
      { resource: 'users', action: 'view_salary', scope: 'DEPARTMENT' },
      
      // Department management
      { resource: 'departments', action: 'read', scope: 'ALL' },
      { resource: 'departments', action: 'update', scope: 'DEPARTMENT' },
      
      // Onboarding management
      { resource: 'onboarding', action: 'create', scope: 'ALL' },
      { resource: 'onboarding', action: 'read', scope: 'ALL' },
      { resource: 'onboarding', action: 'update', scope: 'ALL' },
      
      // Limited compensation access
      { resource: 'compensation', action: 'read', scope: 'DEPARTMENT' },
      { resource: 'compensation', action: 'update', scope: 'DEPARTMENT' },
      
      { resource: 'reports', action: 'generate', scope: 'DEPARTMENT' },
    ]
  },

  'manager': {
    role: 'manager',
    permissions: [
      // Team management
      { resource: 'users', action: 'read', scope: 'TEAM' },
      { resource: 'users', action: 'update', scope: 'TEAM' },
      
      // Department visibility
      { resource: 'departments', action: 'read', scope: 'OWN' },
      
      // Onboarding for team members
      { resource: 'onboarding', action: 'read', scope: 'TEAM' },
      { resource: 'onboarding', action: 'update', scope: 'TEAM' },
      
      { resource: 'reports', action: 'generate', scope: 'TEAM' },
    ]
  },

  'employee': {
    role: 'employee',
    permissions: [
      // Self-service capabilities
      { resource: 'users', action: 'read', scope: 'OWN' },
      { resource: 'users', action: 'update', scope: 'OWN', 
        conditions: [
          { type: 'custom', operator: 'not_in', value: ['salary', 'role', 'department'] }
        ]
      },
      
      // Basic department visibility
      { resource: 'departments', action: 'read', scope: 'OWN' },
      
      // Own onboarding visibility
      { resource: 'onboarding', action: 'read', scope: 'OWN' },
      { resource: 'onboarding', action: 'update', scope: 'OWN', 
        conditions: [
          { type: 'custom', operator: 'in', value: ['task_completion', 'document_upload'] }
        ]
      },
    ]
  }
};

// =============================================================================
// Permission Service Implementation
// =============================================================================

const createPermissionsService = () => {
  const { subscribe, set, update } = writable({
    userPermissions: [] as Permission[],
    isLoading: false,
    error: null as string | null,
    permissionCache: new Map<string, boolean>()
  });

  return {
    subscribe,

    // =============================================================================
    // Core Permission Checking
    // =============================================================================

    hasPermission(
      resource: string, 
      action: string, 
      context?: PermissionContext
    ): boolean {
      const user = get(currentUser);
      if (!user) return false;

      // Super admin bypass (be careful with this)
      if (this.isSuperAdmin(user)) {
        return true;
      }

      const cacheKey = this.buildCacheKey(resource, action, context);
      const state = get({ subscribe });
      
      if (state.permissionCache.has(cacheKey)) {
        return state.permissionCache.get(cacheKey)!;
      }

      const hasAccess = this.checkPermissionInternal(user, resource, action, context);
      
      // Cache the result
      update(state => ({
        ...state,
        permissionCache: state.permissionCache.set(cacheKey, hasAccess)
      }));

      return hasAccess;
    },

    checkPermissionInternal(
      user: User,
      resource: string,
      action: string,
      context?: PermissionContext
    ): boolean {
      const userRoles = user.role_assignments?.map(ra => ra.role.name.toLowerCase()) || [];
      
      for (const roleName of userRoles) {
        const rolePermissions = PERMISSION_DEFINITIONS[roleName];
        if (!rolePermissions) continue;

        for (const permission of rolePermissions.permissions) {
          if (this.matchesPermission(user, permission, resource, action, context)) {
            return true;
          }
        }
      }

      return false;
    },

    matchesPermission(
      user: User,
      permission: Permission,
      resource: string,
      action: string,
      context?: PermissionContext
    ): boolean {
      // Check resource and action match
      if (permission.resource !== resource || permission.action !== action) {
        return false;
      }

      // Check scope constraints
      if (!this.checkScope(user, permission.scope, context)) {
        return false;
      }

      // Check additional conditions
      if (permission.conditions && !this.checkConditions(user, permission.conditions, context)) {
        return false;
      }

      return true;
    },

    checkScope(user: User, scope: string, context?: PermissionContext): boolean {
      switch (scope) {
        case 'ALL':
          return true;
          
        case 'DEPARTMENT':
          if (!context?.departmentId) return true; // No restriction if no context
          return user.job_information?.department?.id === context.departmentId;
          
        case 'TEAM':
          // TODO: Implement team-based checks when we have manager relationships
          return true;
          
        case 'OWN':
          if (!context?.targetUserId && !context?.resourceOwnerId) return true;
          const targetId = context.targetUserId || context.resourceOwnerId;
          return user.id === targetId;
          
        default:
          return false;
      }
    },

    checkConditions(
      user: User,
      conditions: PermissionCondition[],
      context?: PermissionContext
    ): boolean {
      return conditions.every(condition => {
        switch (condition.type) {
          case 'department':
            const userDeptId = user.job_information?.department?.id;
            return this.evaluateCondition(userDeptId, condition);
            
          case 'role':
            const userRoles = user.role_assignments?.map(ra => ra.role.name) || [];
            return this.evaluateCondition(userRoles, condition);
            
          case 'status':
            return this.evaluateCondition(user.onboarding_status, condition);
            
          case 'custom':
            return this.evaluateCustomCondition(condition, context);
            
          default:
            return true;
        }
      });
    },

    evaluateCondition(value: any, condition: PermissionCondition): boolean {
      switch (condition.operator) {
        case 'equals':
          return value === condition.value;
          
        case 'in':
          return Array.isArray(condition.value) 
            ? condition.value.includes(value)
            : value === condition.value;
            
        case 'not_in':
          return Array.isArray(condition.value) 
            ? !condition.value.includes(value)
            : value !== condition.value;
            
        case 'greater_than':
          return value > condition.value;
          
        case 'less_than':
          return value < condition.value;
          
        default:
          return false;
      }
    },

    evaluateCustomCondition(
      condition: PermissionCondition,
      context?: PermissionContext
    ): boolean {
      // Handle custom business logic conditions
      const customContext = context?.customContext || {};
      
      // Example: Field-level restrictions
      if (condition.value.includes('salary') && condition.operator === 'not_in') {
        return !customContext.restrictedFields?.includes('salary');
      }
      
      return true;
    },

    // =============================================================================
    // Convenience Methods
    // =============================================================================

    canCreate(resource: string, context?: PermissionContext): boolean {
      return this.hasPermission(resource, 'create', context);
    },

    canRead(resource: string, context?: PermissionContext): boolean {
      return this.hasPermission(resource, 'read', context);
    },

    canUpdate(resource: string, context?: PermissionContext): boolean {
      return this.hasPermission(resource, 'update', context);
    },

    canDelete(resource: string, context?: PermissionContext): boolean {
      return this.hasPermission(resource, 'delete', context);
    },

    // Legacy support for existing permission format
    hasLegacyPermission(permission: string): boolean {
      if (permission.includes(':')) {
        const [resource, action] = permission.split(':');
        return this.hasPermission(resource, action);
      }
      
      // Map old format to new format
      const legacyMappings: Record<string, [string, string]> = {
        'user:create': ['users', 'create'],
        'user:read': ['users', 'read'],
        'user:update': ['users', 'update'],
        'user:delete': ['users', 'delete'],
        'user:view_salary': ['users', 'view_salary'],
        'department:create': ['departments', 'create'],
        'department:read': ['departments', 'read'],
        'department:update': ['departments', 'update'],
        'department:delete': ['departments', 'delete'],
        'onboarding:create': ['onboarding', 'create'],
        'onboarding:read': ['onboarding', 'read'],
        'onboarding:update': ['onboarding', 'update'],
        'onboarding:delete': ['onboarding', 'delete'],
      };

      const mapping = legacyMappings[permission];
      if (mapping) {
        return this.hasPermission(mapping[0], mapping[1]);
      }

      return false;
    },

    // =============================================================================
    // Admin and Role Checks
    // =============================================================================

    isSuperAdmin(user: User): boolean {
      return user.role_assignments?.some(ra =>
        (ra.userRoleByRoleId?.name.toLowerCase().includes('admin') || ra.userRoleByRoleId?.name === 'hr_admin') &&
        ra.userRoleByRoleId?.level >= 100
      ) || false;
    },

    isHRManager(user: User): boolean {
      return user.role_assignments?.some(ra =>
        ra.userRoleByRoleId?.name.toLowerCase() === 'hr_manager'
      ) || false;
    },

    isManager(user: User): boolean {
      return user.role_assignments?.some(ra =>
        ['manager', 'hr_manager', 'hr_admin', 'admin'].includes(ra.userRoleByRoleId?.name.toLowerCase() || '')
      ) || false;
    },

    getUserRoles(user: User): string[] {
      return user.role_assignments?.map(ra => ra.userRoleByRoleId?.name || '') || [];
    },

    getHighestRoleLevel(user: User): number {
      return Math.max(...(user.role_assignments?.map(ra => ra.userRoleByRoleId?.level || 0) || [0]));
    },

    // =============================================================================
    // Cache Management
    // =============================================================================

    clearPermissionCache(): void {
      update(state => ({
        ...state,
        permissionCache: new Map()
      }));
    },

    buildCacheKey(resource: string, action: string, context?: PermissionContext): string {
      const user = get(currentUser);
      const userId = user?.id || 'anonymous';
      const contextStr = context ? JSON.stringify(context) : '';
      return `${userId}:${resource}:${action}:${contextStr}`;
    },

    // =============================================================================
    // Permission Analysis
    // =============================================================================

    getEffectivePermissions(user: User): Permission[] {
      const userRoles = user.role_assignments?.map(ra => ra.role.name.toLowerCase()) || [];
      const allPermissions: Permission[] = [];
      
      for (const roleName of userRoles) {
        const rolePermissions = PERMISSION_DEFINITIONS[roleName];
        if (rolePermissions) {
          allPermissions.push(...rolePermissions.permissions);
        }
      }

      return allPermissions;
    },

    canAccessResource(resource: string, user?: User): boolean {
      const targetUser = user || get(currentUser);
      if (!targetUser) return false;

      const permissions = this.getEffectivePermissions(targetUser);
      return permissions.some(p => p.resource === resource);
    },

    getResourceActions(resource: string, user?: User): string[] {
      const targetUser = user || get(currentUser);
      if (!targetUser) return [];

      const permissions = this.getEffectivePermissions(targetUser);
      return permissions
        .filter(p => p.resource === resource)
        .map(p => p.action);
    }
  };
};

// =============================================================================
// Create Service Instance
// =============================================================================

export const permissionsService = createPermissionsService();

// =============================================================================
// Derived Stores and Helpers
// =============================================================================

export const userPermissions = derived(
  [currentUser], 
  ([user]) => user ? permissionsService.getEffectivePermissions(user) : []
);

export const userRoles = derived(
  [currentUser],
  ([user]) => user ? permissionsService.getUserRoles(user) : []
);

export const isAdmin = derived(
  [currentUser],
  ([user]) => user ? permissionsService.isSuperAdmin(user) : false
);

export const isHRManager = derived(
  [currentUser],
  ([user]) => user ? permissionsService.isHRManager(user) : false
);

export const isManager = derived(
  [currentUser],
  ([user]) => user ? permissionsService.isManager(user) : false
);

// =============================================================================
// Permission Helper Functions
// =============================================================================

export function hasPermission(
  resource: string, 
  action: string, 
  context?: PermissionContext
): boolean {
  return permissionsService.hasPermission(resource, action, context);
}

export function canCreate(resource: string, context?: PermissionContext): boolean {
  return permissionsService.canCreate(resource, context);
}

export function canRead(resource: string, context?: PermissionContext): boolean {
  return permissionsService.canRead(resource, context);
}

export function canUpdate(resource: string, context?: PermissionContext): boolean {
  return permissionsService.canUpdate(resource, context);
}

export function canDelete(resource: string, context?: PermissionContext): boolean {
  return permissionsService.canDelete(resource, context);
}

// =============================================================================
// Export Service as Default
// =============================================================================

export default permissionsService;