// RBAC Components
export { default as RoleGuard } from './RoleGuard.svelte';
export { default as AuthButton } from './AuthButton.svelte';
export { default as PermissionCheck } from './PermissionCheck.svelte';

// Re-export types and utilities
export type { PermissionCheck } from '../../auth/guards';
export { 
  hasAccess, 
  canAccess, 
  routeGuard, 
  withAuthGuard,
  roleChecks,
  permissionChecks
} from '../../auth/guards';