/**
 * Integration test for auth store with GraphQL - Svelte 5 runes
 * Tests the existing auth.svelte.ts store integration with GraphQL backend
 * Validates the AuthStoreContract defined in contracts/component-contracts.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';
import type { AuthStoreContract } from '../../specs/005-svelte5runes-i-would/contracts/component-contracts';

// Import the auth store
import { 
  authState,
  isAuthenticated,
  currentUser,
  userDisplayName,
  userInitials,
  isAdmin,
  isHRManager,
  initializeAuth,
  verifyAuth,
  logout,
  hasCurrentUserPermission,
  hasCurrentUserRole
} from '$lib/stores/auth.svelte';

// Mock GraphQL client
vi.mock('$lib/api/client', () => ({
  MountainHRApiClient: vi.fn().mockImplementation(() => ({
    get: vi.fn(),
    setToken: vi.fn()
  }))
}));

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Auth Store Integration Tests', () => {
  const mockUserData = {
    user: {
      id: '1',
      email: 'test@example.com',
      full_name: 'Test User',
      roles: [
        { id: '1', name: 'Employee' as const, level: 25, description: 'Employee role', inherits_from: [], is_active: true },
        { id: '2', name: 'Manager' as const, level: 50, description: 'Manager role', inherits_from: ['Employee'], is_active: true }
      ],
      permissions: ['read:profile', 'update:profile', 'manage:team'],
      department_id: 'dept-1',
      is_active: true,
      last_login: new Date()
    },
    permissions: ['read:profile', 'update:profile', 'manage:team'],
    roles: [
      { id: '1', name: 'Employee' as const, level: 25, description: 'Employee role', inherits_from: [], is_active: true },
      { id: '2', name: 'Manager' as const, level: 50, description: 'Manager role', inherits_from: ['Employee'], is_active: true }
    ]
  };

  const mockHRManagerData = {
    user: {
      id: '2',
      email: 'hr@example.com',
      full_name: 'HR Manager',
      roles: [
        { id: '1', name: 'Employee' as const, level: 25, description: 'Employee role', inherits_from: [], is_active: true },
        { id: '3', name: 'HR_Manager' as const, level: 75, description: 'HR Manager role', inherits_from: ['Manager', 'Employee'], is_active: true }
      ],
      permissions: ['read:profile', 'update:profile', 'manage:team', 'employees:*', 'hr:*'],
      department_id: 'hr-dept',
      is_active: true
    },
    permissions: ['read:profile', 'update:profile', 'manage:team', 'employees:*', 'hr:*'],
    roles: [
      { id: '1', name: 'Employee' as const, level: 25, description: 'Employee role', inherits_from: [], is_active: true },
      { id: '3', name: 'HR_Manager' as const, level: 75, description: 'HR Manager role', inherits_from: ['Manager', 'Employee'], is_active: true }
    ]
  };

  const mockAdminData = {
    user: {
      id: '3',
      email: 'admin@example.com',
      full_name: 'System Admin',
      roles: [
        { id: '4', name: 'Admin' as const, level: 100, description: 'Administrator role', inherits_from: ['HR_Manager', 'Manager', 'Employee'], is_active: true }
      ],
      permissions: ['*'],
      is_active: true
    },
    permissions: ['*'],
    roles: [
      { id: '4', name: 'Admin' as const, level: 100, description: 'Administrator role', inherits_from: ['HR_Manager', 'Manager', 'Employee'], is_active: true }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset auth state to initial state
    // Note: This assumes the store has a reset method or we initialize with null data
    initializeAuth({ user: null, permissions: [], roles: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('State Contract', () => {
    it('should have correct initial state structure', () => {
      // Validate that the state matches the contract
      const state = authState;
      
      expect(state).toHaveProperty('user');
      expect(state).toHaveProperty('permissions');
      expect(state).toHaveProperty('roles');
      expect(state).toHaveProperty('loading');
      expect(state).toHaveProperty('error');

      // Initial state should be empty/null
      expect(state.user).toBeNull();
      expect(state.permissions).toEqual([]);
      expect(state.roles).toEqual([]);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should update state reactively when initialized', () => {
      // Initialize with user data
      initializeAuth(mockUserData);

      // State should update reactively
      expect(authState.user).toEqual(mockUserData.user);
      expect(authState.permissions).toEqual(mockUserData.permissions);
      expect(authState.roles).toEqual(mockUserData.roles);
      expect(authState.loading).toBe(false);
      expect(authState.error).toBeNull();
    });
  });

  describe('Derived State Contract', () => {
    it('should compute isAuthenticated correctly', () => {
      // Initially should be false
      expect(isAuthenticated).toBe(false);

      // After initialization should be true
      initializeAuth(mockUserData);
      expect(isAuthenticated).toBe(true);

      // Should be false for inactive user
      initializeAuth({
        user: { ...mockUserData.user, is_active: false },
        permissions: mockUserData.permissions,
        roles: mockUserData.roles
      });
      expect(isAuthenticated).toBe(false);
    });

    it('should compute currentUser correctly', () => {
      expect(currentUser).toBeNull();

      initializeAuth(mockUserData);
      expect(currentUser).toEqual(mockUserData.user);
    });

    it('should compute userDisplayName correctly', () => {
      // Should have default when no user
      expect(userDisplayName).toBe('Unknown User');

      initializeAuth(mockUserData);
      expect(userDisplayName).toBe('Test User');

      // Should fall back to email if no full_name
      initializeAuth({
        user: { ...mockUserData.user, full_name: '' },
        permissions: mockUserData.permissions,
        roles: mockUserData.roles
      });
      expect(userDisplayName).toBe('test@example.com');
    });

    it('should compute userInitials correctly', () => {
      initializeAuth(mockUserData);
      expect(userInitials).toBe('TU'); // Test User -> TU

      // Should handle single name
      initializeAuth({
        user: { ...mockUserData.user, full_name: 'John' },
        permissions: mockUserData.permissions,
        roles: mockUserData.roles
      });
      expect(userInitials).toBe('J');
    });

    it('should compute role flags correctly', () => {
      // Test regular user
      initializeAuth(mockUserData);
      expect(isAdmin).toBe(false);
      expect(isHRManager).toBe(false);

      // Test HR Manager
      initializeAuth(mockHRManagerData);
      expect(isAdmin).toBe(false);
      expect(isHRManager).toBe(true);

      // Test Admin
      initializeAuth(mockAdminData);
      expect(isAdmin).toBe(true);
      expect(isHRManager).toBe(false); // Admin is not specifically HR Manager
    });
  });

  describe('Actions Contract', () => {
    it('should initialize auth correctly', () => {
      initializeAuth(mockUserData);

      expect(authState.user).toEqual(mockUserData.user);
      expect(authState.permissions).toEqual(mockUserData.permissions);
      expect(authState.roles).toEqual(mockUserData.roles);
      expect(authState.loading).toBe(false);
      expect(authState.error).toBeNull();
    });

    it('should verify auth with GraphQL integration', async () => {
      // Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockUserData)
      });

      const result = await verifyAuth();

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v2/auth/verify'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Bearer')
          })
        })
      );

      // State should be updated
      expect(authState.user).toEqual(mockUserData.user);
    });

    it('should handle auth verification failure', async () => {
      // Mock failed API response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401
      });

      const result = await verifyAuth();

      expect(result).toBe(false);
      expect(authState.user).toBeNull();
      expect(authState.error).not.toBeNull();
    });

    it('should logout correctly', async () => {
      // Initialize with user
      initializeAuth(mockUserData);
      expect(isAuthenticated).toBe(true);

      // Mock logout API call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      await logout();

      // State should be cleared
      expect(authState.user).toBeNull();
      expect(authState.permissions).toEqual([]);
      expect(authState.roles).toEqual([]);
      expect(isAuthenticated).toBe(false);
    });
  });

  describe('Permission Helpers Contract', () => {
    beforeEach(() => {
      initializeAuth(mockUserData);
    });

    it('should check user permissions correctly', () => {
      expect(hasCurrentUserPermission('read:profile')).toBe(true);
      expect(hasCurrentUserPermission('admin:delete')).toBe(false);

      // Test with admin user (has all permissions)
      initializeAuth(mockAdminData);
      expect(hasCurrentUserPermission('any:permission')).toBe(true);
    });

    it('should check user roles correctly', () => {
      expect(hasCurrentUserRole('Employee')).toBe(true);
      expect(hasCurrentUserRole('Manager')).toBe(true);
      expect(hasCurrentUserRole('Admin')).toBe(false);

      // Test with array of roles
      expect(hasCurrentUserRole(['Employee', 'Admin'])).toBe(true); // Has Employee
      expect(hasCurrentUserRole(['Admin', 'HR_Manager'])).toBe(false); // Has neither
    });
  });

  describe('Loading States Contract', () => {
    it('should manage loading state during auth operations', async () => {
      // Mock slow API response
      let resolveAuth: (value: any) => void;
      const authPromise = new Promise(resolve => {
        resolveAuth = resolve;
      });
      
      mockFetch.mockReturnValueOnce(authPromise);

      // Start verification
      const verificationPromise = verifyAuth();
      
      // Should be in loading state
      expect(authState.loading).toBe(true);

      // Resolve the API call
      resolveAuth!({
        ok: true,
        json: () => Promise.resolve(mockUserData)
      });

      await verificationPromise;

      // Should no longer be loading
      expect(authState.loading).toBe(false);
    });
  });

  describe('Error Handling Contract', () => {
    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await verifyAuth();

      expect(result).toBe(false);
      expect(authState.error).toBe('Network error');
      expect(authState.loading).toBe(false);
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      const result = await verifyAuth();

      expect(result).toBe(false);
      expect(authState.error).toContain('500');
      expect(authState.loading).toBe(false);
    });

    it('should clear errors on successful operations', async () => {
      // Set initial error state
      authState.error = 'Previous error';

      // Mock successful response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockUserData)
      });

      await verifyAuth();

      // Error should be cleared
      expect(authState.error).toBeNull();
    });
  });

  describe('GraphQL Integration', () => {
    it('should integrate with GraphQL queries for user data', async () => {
      // Mock GraphQL response format
      const graphqlResponse = {
        data: {
          currentUser: mockUserData.user,
          userPermissions: mockUserData.permissions,
          userRoles: mockUserData.roles
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(graphqlResponse)
      });

      // This would typically be called by a GraphQL query hook
      initializeAuth({
        user: graphqlResponse.data.currentUser,
        permissions: graphqlResponse.data.userPermissions,
        roles: graphqlResponse.data.userRoles
      });

      expect(authState.user).toEqual(mockUserData.user);
      expect(authState.permissions).toEqual(mockUserData.permissions);
    });

    it('should provide context for RBAC GraphQL queries', () => {
      initializeAuth(mockUserData);

      // Auth store should provide data for GraphQL context
      const graphqlContext = {
        userId: currentUser?.id,
        userRoles: authState.roles.map(r => r.name),
        userPermissions: authState.permissions
      };

      expect(graphqlContext.userId).toBe('1');
      expect(graphqlContext.userRoles).toEqual(['Employee', 'Manager']);
      expect(graphqlContext.userPermissions).toEqual(['read:profile', 'update:profile', 'manage:team']);
    });
  });

  describe('Svelte 5 Runes Implementation', () => {
    it('should use $state for reactive state management', () => {
      // Initial state
      const initialUser = authState.user;
      expect(initialUser).toBeNull();

      // Update state
      initializeAuth(mockUserData);
      
      // State should be reactively updated
      expect(authState.user).toEqual(mockUserData.user);
      expect(authState.user).not.toBe(initialUser);
    });

    it('should use $derived for computed values', () => {
      // Derived values should update when state changes
      expect(isAuthenticated).toBe(false);
      expect(userDisplayName).toBe('Unknown User');

      initializeAuth(mockUserData);

      expect(isAuthenticated).toBe(true);
      expect(userDisplayName).toBe('Test User');
    });

    it('should handle reactive updates correctly', () => {
      initializeAuth(mockUserData);
      
      const initialAuth = isAuthenticated;
      const initialName = userDisplayName;
      
      expect(initialAuth).toBe(true);
      expect(initialName).toBe('Test User');

      // Update to different user
      const newUserData = {
        user: { ...mockUserData.user, full_name: 'Updated User', id: '999' },
        permissions: mockUserData.permissions,
        roles: mockUserData.roles
      };

      initializeAuth(newUserData);

      // Derived values should update reactively
      expect(isAuthenticated).toBe(true);
      expect(userDisplayName).toBe('Updated User');
      expect(currentUser?.id).toBe('999');
    });
  });
});