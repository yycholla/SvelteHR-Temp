/**
 * Component Contracts - Svelte 5 Runes Migration
 * 
 * Defines the interface contracts for components migrated to Svelte 5 runes.
 * These contracts serve as the source of truth for component APIs and testing.
 */

import type { Snippet } from 'svelte';

// =============================================================================
// Authentication Components
// =============================================================================

/**
 * AuthButton Component Contract
 * RBAC-aware button with permission and role-based visibility
 */
export interface AuthButtonContract {
  // Props
  props: {
    permissions?: string[];
    roles?: string[];
    requireAll?: boolean;
    disabled?: boolean;
    variant?: 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'warning' | 'danger';
    size?: 'sm' | 'base' | 'lg';
    href?: string;
    class?: string;
    children?: Snippet;
  };
  
  // Events (via callback props)
  events: {
    onclick?: (event: MouseEvent) => void;
  };
  
  // Reactive Behavior
  behavior: {
    // Only renders if user has required permissions/roles
    conditionalRendering: boolean;
    // Applies disabled styles when insufficient permissions
    permissionBasedDisabling: boolean;
    // Supports both button and link modes
    hybridElement: boolean;
  };
  
  // Test Scenarios
  testCases: {
    'renders when user has required permissions': boolean;
    'hidden when user lacks permissions': boolean;
    'disabled state prevents interaction': boolean;
    'href prop creates link element': boolean;
    'click events are handled correctly': boolean;
  };
}

/**
 * RoleGuard Component Contract
 * Conditional rendering based on user roles
 */
export interface RoleGuardContract {
  props: {
    roles: string | string[];
    requireAll?: boolean;
    fallback?: Snippet;
    children?: Snippet;
  };
  
  behavior: {
    roleBasedRendering: boolean;
    fallbackSupport: boolean;
    multipleRoleLogic: boolean;
  };
}

/**
 * PermissionCheck Component Contract
 * Conditional rendering based on user permissions
 */
export interface PermissionCheckContract {
  props: {
    permissions: string | string[];
    requireAll?: boolean;
    fallback?: Snippet;
    children?: Snippet;
  };
  
  behavior: {
    permissionBasedRendering: boolean;
    granularPermissionChecks: boolean;
    logicalOperators: boolean;
  };
}

// =============================================================================
// Performance Components
// =============================================================================

/**
 * PreloadLink Component Contract
 * Smart link with hover-based preloading
 */
export interface PreloadLinkContract {
  props: {
    href: string;
    preloadData?: boolean;
    preloadCode?: boolean;
    hoverDelay?: number;
    class?: string;
    children?: Snippet;
  };
  
  events: {
    onmouseenter?: () => void;
    onmouseleave?: () => void;
    onfocus?: () => void;
  };
  
  behavior: {
    // Preloads route data on hover after delay
    hoverPreloading: boolean;
    // Preloads route code on hover
    codePreloading: boolean;
    // Visual indication of current page
    currentPageStyling: boolean;
    // Keyboard navigation support
    focusPreloading: boolean;
    // Debounced hover to prevent excessive preloading
    debouncedPreload: boolean;
  };
  
  testCases: {
    'preloads data on hover after delay': boolean;
    'cancels preload on mouse leave': boolean;
    'indicates current page status': boolean;
    'handles focus events for keyboard navigation': boolean;
    'debounces rapid hover events': boolean;
  };
}

/**
 * CacheProvider Component Contract
 * Provides caching context to child components
 */
export interface CacheProviderContract {
  props: {
    maxSize?: number;
    defaultTtl?: number;
    cleanupInterval?: number;
    children?: Snippet;
  };
  
  context: {
    cache: ReactiveCache;
    statistics: CacheStats;
  };
  
  behavior: {
    automaticCleanup: boolean;
    reactiveStatistics: boolean;
    contextPropagation: boolean;
  };
}

// =============================================================================
// Store Contracts
// =============================================================================

/**
 * Authentication Store Contract
 * Runes-based authentication state management
 */
export interface AuthStoreContract {
  // State (reactive via runes)
  state: {
    user: UserContext | null;
    permissions: string[];
    roles: Role[];
    loading: boolean;
    error: string | null;
  };
  
  // Derived state (computed via $derived)
  derived: {
    isAuthenticated: boolean;
    isLoading: boolean;
    currentUser: UserContext | null;
    userDisplayName: string;
    userInitials: string;
    isAdmin: boolean;
    isHRManager: boolean;
    isManager: boolean;
    userRoleLevel: number;
    primaryRole: Role | null;
  };
  
  // Actions
  actions: {
    initializeAuth(userData: AuthInitData): void;
    verifyAuth(): Promise<boolean>;
    logout(): Promise<void>;
    refreshPermissions(): Promise<void>;
    mockAuth(role: RoleName): void;
  };
  
  // Permission helpers
  helpers: {
    hasCurrentUserPermission(permission: string): boolean;
    hasCurrentUserRole(role: RoleName | RoleName[]): boolean;
    canCurrentUserAccessResource(resource: string, action?: string): boolean;
    canAccessCurrentRoute(routePath: string): boolean;
  };
  
  // Test scenarios
  testCases: {
    'initializes with server data': boolean;
    'handles authentication flow': boolean;
    'updates derived state reactively': boolean;
    'validates user permissions correctly': boolean;
    'manages loading states': boolean;
    'handles error states gracefully': boolean;
  };
}

/**
 * Performance Store Contract  
 * Caching and preloading state management
 */
export interface PerformanceStoreContract {
  state: {
    cache: Map<string, CacheEntry<any>>;
    preloadedRoutes: Set<string>;
    statistics: CacheStats;
  };
  
  actions: {
    preloadRoute(href: string): Promise<void>;
    getCacheEntry<T>(key: string): T | null;
    setCacheEntry<T>(key: string, value: T, ttl?: number): void;
    clearCache(): void;
    invalidateKey(key: string): void;
  };
  
  testCases: {
    'caches data with TTL': boolean;
    'preloads routes efficiently': boolean;
    'provides cache statistics': boolean;
    'handles cache invalidation': boolean;
    'prevents duplicate preloading': boolean;
  };
}

// =============================================================================
// GraphQL Integration Contracts
// =============================================================================

/**
 * GraphQL Query Hook Contract
 * Reactive GraphQL query management with runes
 */
export interface GraphQLQueryContract<TData, TVariables = Record<string, any>> {
  input: {
    query: string;
    variables?: TVariables;
    options?: {
      cache?: boolean;
      cacheTtl?: number;
      errorPolicy?: 'all' | 'ignore' | 'none';
    };
  };
  
  output: {
    data: TData | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
  };
  
  behavior: {
    reactiveVariables: boolean;
    cacheIntegration: boolean;
    errorHandling: boolean;
    automaticRefetch: boolean;
  };
}

/**
 * RBAC GraphQL Contract
 * Permission-aware GraphQL execution
 */
export interface RBACGraphQLContract {
  security: {
    permissionChecks: boolean;
    roleValidation: boolean;
    contextInjection: boolean;
    auditLogging: boolean;
  };
  
  integration: {
    authStateIntegration: boolean;
    automaticPermissionFiltering: boolean;
    errorPropagation: boolean;
  };
}

// =============================================================================
// Type Exports
// =============================================================================

// Supporting types referenced in contracts
export interface UserContext {
  id: string;
  email: string;
  full_name: string;
  roles: Role[];
  permissions: string[];
  department_id?: string;
  is_active: boolean;
  last_login?: Date;
}

export interface Role {
  id: string;
  name: RoleName;
  level: number;
  description: string;
  inherits_from: string[];
  is_active: boolean;
}

export type RoleName = 'Admin' | 'HR_Manager' | 'Manager' | 'Employee';

export interface AuthInitData {
  user: UserContext | null;
  permissions: string[];
  roles: Role[];
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
}

export interface ReactiveCache {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T, ttl?: number): void;
  has(key: string): boolean;
  delete(key: string): boolean;
  clear(): void;
  readonly statistics: CacheStats;
}

// Contract validation helpers
export type ContractTestSuite<T> = {
  [K in keyof T['testCases']]: () => Promise<boolean> | boolean;
};

export type ComponentContract = 
  | AuthButtonContract 
  | RoleGuardContract 
  | PermissionCheckContract 
  | PreloadLinkContract 
  | CacheProviderContract;

export type StoreContract = 
  | AuthStoreContract 
  | PerformanceStoreContract;

export type IntegrationContract = 
  | GraphQLQueryContract<any> 
  | RBACGraphQLContract;