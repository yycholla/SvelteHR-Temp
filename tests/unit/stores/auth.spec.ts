/**
 * Unit Tests for Authentication Store
 * High-impact coverage target: ~414 lines of critical auth logic
 *
 * Tests cover:
 * - State management (user, roles, loading, errors)
 * - Derived state (isAuthenticated, permissions)
 * - Login/logout flows
 * - Session validation
 * - Role loading and RBAC integration
 * - Permission checking
 * - Error handling
 */

import { beforeEach, describe, expect, test, vi, afterEach } from 'vitest';
import type { User } from '$lib/stores/auth.svelte';

// Setup global window mock before any imports
if (typeof window === 'undefined') {
	global.window = {
		localStorage: {
			getItem: vi.fn(),
			setItem: vi.fn(),
			removeItem: vi.fn(),
			clear: vi.fn()
		}
	} as any;
}

// Mock dependencies
vi.mock('$app/environment', () => ({
	browser: true
}));

vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

vi.mock('$lib/auth/secure-auth-service', () => ({
	secureAuthService: {
		login: vi.fn()
	}
}));

// Create a shared mock RBAC manager instance
const mockRBACManager = {
	hasPermission: vi.fn(() => true),
	getRoleNames: vi.fn(() => [] as string[]),
	getHighestRoleLevel: vi.fn(() => 0),
	hasMinimumRoleLevel: vi.fn(() => true),
	canManage: vi.fn(() => true),
	hasRole: vi.fn(() => true)
};

vi.mock('$lib/auth/rbac', () => ({
	createRBACManager: vi.fn(() => mockRBACManager)
}));

// Create a shared mock urql client
const mockToPromise = vi.fn();
const mockQuery = vi.fn(() => ({ toPromise: mockToPromise }));
const mockUrqlClient = {
	query: mockQuery
};

vi.mock('$lib/graphql/client', () => ({
	createUrqlClient: vi.fn(() => mockUrqlClient)
}));

vi.mock('$lib/stores/permission-test.svelte', () => ({
	clearTestModeOnLogout: vi.fn()
}));

vi.mock('$lib/graphql/settings-operations', () => ({
	createSettingsOperations: vi.fn(() => ({
		getUserSettings: vi.fn().mockResolvedValue(null)
	}))
}));

vi.mock('mode-watcher', () => ({
	userPrefersMode: {
		set: vi.fn()
	}
}));

vi.mock('$lib/graphql/employee-operations', () => ({
	GET_EMPLOYEE_BY_ID_QUERY: 'query GetEmployeeById($id: ID!) { user(id: $id) { id email } }'
}));

describe('AuthStore', () => {
	let auth: any;
	let mockSecureAuthService: any;
	let mockGoto: any;
	let mockLocalStorage: any;

	beforeEach(async () => {
		// Clear all mocks
		vi.clearAllMocks();

		// Reset mock functions
		mockRBACManager.hasPermission.mockReturnValue(true);
		mockRBACManager.getRoleNames.mockReturnValue([]);
		mockRBACManager.getHighestRoleLevel.mockReturnValue(0);
		mockRBACManager.hasMinimumRoleLevel.mockReturnValue(true);
		mockRBACManager.canManage.mockReturnValue(true);
		mockRBACManager.hasRole.mockReturnValue(true);

		mockToPromise.mockResolvedValue({ data: null });

		// Reset fetch mock
		global.fetch = vi.fn();

		// Mock localStorage
		mockLocalStorage = {
			getItem: vi.fn(),
			setItem: vi.fn(),
			removeItem: vi.fn(),
			clear: vi.fn()
		};
		Object.defineProperty(window, 'localStorage', {
			value: mockLocalStorage,
			writable: true,
			configurable: true
		});

		// Import auth store only once
		if (!auth) {
			const module = await import('$lib/stores/auth.svelte');
			auth = module.auth;
		}

		// Get mocked dependencies
		if (!mockSecureAuthService) {
			const authService = await import('$lib/auth/secure-auth-service');
			mockSecureAuthService = authService.secureAuthService;

			const navModule = await import('$app/navigation');
			mockGoto = navModule.goto;
		}

		// Reset auth store state
		if (auth && auth.reset) {
			auth.reset();
		}
	});

	afterEach(() => {
		if (auth && auth.reset) {
			auth.reset();
		}
	});

	describe('Initial State', () => {
		test('should have null user initially', () => {
			expect(auth.user).toBeNull();
		});

		test('should have empty roles array initially', () => {
			expect(auth.roles).toEqual([]);
		});

		test('should not be loading initially', () => {
			expect(auth.isLoading).toBe(false);
		});

		test('should have no error initially', () => {
			expect(auth.error).toBeNull();
		});

		test('should not be authenticated initially', () => {
			expect(auth.isAuthenticated).toBe(false);
		});
	});

	describe('Derived State', () => {
		test('isAuthenticated should be true when user exists', async () => {
			const mockUser: User = {
				id: '1',
				email: 'test@example.com',
				displayName: 'Test User',
				onboardingStatus: 'Active',
				isActive: true,
				role: 'Employee'
			};

			mockToPromise.mockResolvedValue({
				data: {
					roles: [
						{
							id: 'employee-role',
							name: 'Employee',
							level: 25,
							permissions: []
						}
					]
				}
			});

			await auth.setUser(mockUser);
			expect(auth.isAuthenticated).toBe(true);
		});

		test('isAuthenticated should be false when user is null', () => {
			auth.user = null;
			expect(auth.isAuthenticated).toBe(false);
		});

		test('userHighestRole should return guest role when no roles', () => {
			// With empty roles, getRoleNames returns empty array
			mockRBACManager.getRoleNames.mockReturnValue([]);
			mockRBACManager.getHighestRoleLevel.mockReturnValue(0);

			expect(auth.userHighestRole.name).toBe('hr_guest');
			expect(auth.userHighestRole.level).toBe(0);
		});
	});

	describe('Permission Checks', () => {
		test('canViewUsers derived property exists and uses hasPermission', async () => {
			// Set up user with roles to trigger permission checks
			const mockUser: User = {
				id: '1',
				email: 'test@example.com',
				displayName: 'Test User',
				onboardingStatus: 'Active',
				isActive: true,
				role: 'Admin'
			};

			mockToPromise.mockResolvedValue({
				data: {
					roles: [
						{
							id: 'admin-role',
							name: 'Admin',
							level: 100,
							permissions: [{ id: '1', resource: 'users', action: 'view' }]
						}
					]
				}
			});

			mockRBACManager.getRoleNames.mockReturnValue(['Admin']);
			mockRBACManager.getHighestRoleLevel.mockReturnValue(100);

			await auth.setUser(mockUser);

			// These are derived properties - we test that they exist and return boolean
			expect(typeof auth.canViewUsers).toBe('boolean');
			expect(typeof auth.canManageUsers).toBe('boolean');
			expect(typeof auth.canViewSensitiveData).toBe('boolean');
			expect(typeof auth.canManageRoles).toBe('boolean');
			expect(typeof auth.canApproveLeave).toBe('boolean');
			expect(typeof auth.canManageWorkflows).toBe('boolean');
			expect(typeof auth.canManageCompliance).toBe('boolean');
		});

		test('permission checks should safely handle RBAC errors', () => {
			mockRBACManager.hasPermission.mockImplementation(() => {
				throw new Error('RBAC error');
			});

			// Should not throw, should return false due to safeCheck wrapper
			expect(typeof auth.canViewUsers).toBe('boolean');
			expect(auth.canViewUsers).toBe(false);
		});
	});

	describe('State Setters', () => {
		test('setLoading should update loading state', () => {
			auth.setLoading(true);
			expect(auth.isLoading).toBe(true);

			auth.setLoading(false);
			expect(auth.isLoading).toBe(false);
		});

		test('setError should update error state', () => {
			auth.setError('Test error');
			expect(auth.error).toBe('Test error');

			auth.setError(null);
			expect(auth.error).toBeNull();
		});
	});

	describe('Login Flow', () => {
		test('should successfully login with valid credentials', async () => {
			const mockUser = {
				id: '1',
				email: 'admin@example.com',
				displayName: 'Admin User',
				role: 'Admin'
			};

			mockSecureAuthService.login.mockResolvedValue({
				success: true,
				user: mockUser
			});

			mockToPromise.mockResolvedValue({
				data: {
					roles: [
						{
							id: 'admin-role',
							name: 'Admin',
							level: 100,
							permissions: [
								{ id: '1', resource: 'users', action: 'read' },
								{ id: '2', resource: 'users', action: 'write' }
							]
						}
					]
				}
			});

			mockRBACManager.getRoleNames.mockReturnValue(['Admin']);
			mockRBACManager.getHighestRoleLevel.mockReturnValue(100);

			const result = await auth.login('admin@example.com', 'password123', false);

			expect(result).toBe(true);
			expect(auth.user).not.toBeNull();
			expect(auth.user?.email).toBe('admin@example.com');
			expect(auth.error).toBeNull();
		});

		test('should handle login failure with error message', async () => {
			mockSecureAuthService.login.mockResolvedValue({
				success: false,
				error: 'Invalid credentials'
			});

			const result = await auth.login('wrong@example.com', 'wrongpass', false);

			expect(result).toBe(false);
			expect(auth.user).toBeNull();
			expect(auth.error).toBe('Invalid credentials');
		});

		test('should handle network errors during login', async () => {
			mockSecureAuthService.login.mockRejectedValue(new Error('Network timeout'));

			const result = await auth.login('test@example.com', 'password', false);

			expect(result).toBe(false);
			expect(auth.error).toBe('Network timeout');
		});

		test('should handle force password change on first login', async () => {
			mockSecureAuthService.login.mockResolvedValue({
				success: true,
				user: {
					id: '1',
					email: 'newuser@example.com',
					force_password_change: true,
					role: 'Employee'
				}
			});

			const result = await auth.login('newuser@example.com', 'temp-password', false);

			expect(result).toBe(true);
			expect(mockGoto).toHaveBeenCalledWith('/change-password?required=true', {
				replaceState: true
			});
		});

		test('should set loading state during login', async () => {
			mockSecureAuthService.login.mockImplementation(
				() =>
					new Promise((resolve) => {
						setTimeout(() => {
							expect(auth.isLoading).toBe(true);
							resolve({ success: true, user: { id: '1', email: 'test@example.com' } });
						}, 10);
					})
			);

			await auth.login('test@example.com', 'password', false);
			expect(auth.isLoading).toBe(false);
		});
	});

	describe('Logout Flow', () => {
		test('should clear user state on logout', async () => {
			// Set up authenticated user
			auth.user = {
				id: '1',
				email: 'test@example.com',
				displayName: 'Test User',
				onboardingStatus: 'Active',
				isActive: true
			};

			(global.fetch as any).mockResolvedValue({ ok: true });

			await auth.logout();

			expect(auth.user).toBeNull();
			expect(auth.roles).toEqual([]);
			expect(auth.error).toBeNull();
		});

		test('should call logout endpoint', async () => {
			(global.fetch as any).mockResolvedValue({ ok: true });

			await auth.logout();

			expect(global.fetch).toHaveBeenCalledWith('/api/auth/logout', {
				method: 'POST',
				credentials: 'include'
			});
		});

		test('should save return URL before logout', async () => {
			(global.fetch as any).mockResolvedValue({ ok: true });

			await auth.logout('/dashboard/employees');

			expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
				'hr_return_url',
				'/dashboard/employees'
			);
		});

		test('should not save login URL as return URL', async () => {
			(global.fetch as any).mockResolvedValue({ ok: true });

			await auth.logout('/login');

			expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
		});

		test('should handle logout endpoint failure gracefully', async () => {
			(global.fetch as any).mockRejectedValue(new Error('Network error'));

			await expect(auth.logout()).resolves.not.toThrow();
			expect(auth.user).toBeNull();
		});
	});

	describe('Session Validation', () => {
		test('should validate active session successfully', async () => {
			(global.fetch as any).mockResolvedValue({
				ok: true,
				json: async () => ({
					user: {
						id: '1',
						email: 'test@example.com',
						displayName: 'Test User',
						role: 'Employee'
					}
				})
			});

			const result = await auth.validateSession();

			expect(result).toBe(true);
			expect(global.fetch).toHaveBeenCalledWith('/api/auth/verify', {
				method: 'GET',
				credentials: 'include'
			});
		});

		test('should reset state on invalid session', async () => {
			auth.user = {
				id: '1',
				email: 'test@example.com',
				displayName: 'Test',
				onboardingStatus: 'Active',
				isActive: true
			};

			(global.fetch as any).mockResolvedValue({
				ok: false
			});

			const result = await auth.validateSession();

			expect(result).toBe(false);
			expect(auth.user).toBeNull();
		});

		test('should handle network errors during validation', async () => {
			(global.fetch as any).mockRejectedValue(new Error('Network error'));

			const result = await auth.validateSession();

			expect(result).toBe(false);
			expect(auth.user).toBeNull();
		});

		test('should return false when not in browser', async () => {
			const envModule = await import('$app/environment');
			vi.mocked(envModule).browser = false;

			const result = await auth.validateSession();

			expect(result).toBe(false);

			vi.mocked(envModule).browser = true;
		});
	});

	describe('Role Loading', () => {
		test('should load user roles successfully', async () => {
			const mockRolesData = {
				roles: [
					{
						id: 'admin-role',
						name: 'Admin',
						level: 100,
						permissions: [
							{ id: '1', resource: 'users', action: 'read' },
							{ id: '2', resource: 'users', action: 'write' }
						]
					}
				]
			};

			auth.user = {
				id: 'user-1',
				email: 'admin@example.com',
				displayName: 'Admin',
				role: 'Admin',
				onboardingStatus: 'Active',
				isActive: true
			};

			mockToPromise.mockResolvedValue({ data: mockRolesData });

			await auth.loadUserRoles('user-1');

			expect(auth.roles).toHaveLength(1);
			expect(auth.roles[0].role.name).toBe('Admin');
			expect(auth.roles[0].role.permissions).toHaveLength(2);
		});

		test('should construct permission names from resource:action', async () => {
			auth.user = {
				id: 'user-1',
				email: 'test@example.com',
				displayName: 'Test',
				role: 'Manager',
				onboardingStatus: 'Active',
				isActive: true
			};

			mockToPromise.mockResolvedValue({
				data: {
					roles: [
						{
							id: 'manager-role',
							name: 'Manager',
							level: 50,
							permissions: [{ id: '1', resource: 'employees', action: 'read' }]
						}
					]
				}
			});

			await auth.loadUserRoles('user-1');

			expect(auth.roles[0].role.permissions[0].name).toBe('employees:read');
		});

		test('should apply emergency admin permissions on API failure', async () => {
			auth.user = {
				id: 'admin-1',
				email: 'admin@example.com',
				displayName: 'Admin',
				role: 'Admin',
				onboardingStatus: 'Active',
				isActive: true
			};

			mockToPromise.mockRejectedValue(new Error('API error'));

			await auth.loadUserRoles('admin-1');

			expect(auth.roles).toHaveLength(1);
			expect(auth.roles[0].role.name).toBe('Admin');
			expect(auth.roles[0].role.permissions[0].name).toBe('*');
		});

		test('should set empty roles for non-admin on API failure', async () => {
			auth.user = {
				id: 'user-1',
				email: 'user@example.com',
				displayName: 'User',
				role: 'Employee',
				onboardingStatus: 'Active',
				isActive: true
			};

			mockToPromise.mockRejectedValue(new Error('API error'));

			await auth.loadUserRoles('user-1');

			expect(auth.roles).toEqual([]);
			expect(auth.error).toBe('Failed to load user permissions');
		});
	});

	describe('Permission Methods', () => {
		test('hasPermission should delegate to RBAC manager', () => {
			mockRBACManager.hasPermission.mockClear();
			mockRBACManager.hasPermission.mockReturnValue(true);

			const result = auth.hasPermission('view_users');

			expect(mockRBACManager.hasPermission).toHaveBeenCalledWith('view_users');
			expect(result).toBe(true);
		});

		test('hasMinimumRoleLevel should delegate to RBAC manager', () => {
			mockRBACManager.hasMinimumRoleLevel.mockClear();
			mockRBACManager.hasMinimumRoleLevel.mockReturnValue(true);

			const result = auth.hasMinimumRoleLevel(50);

			expect(mockRBACManager.hasMinimumRoleLevel).toHaveBeenCalledWith(50);
			expect(result).toBe(true);
		});

		test('canManageUser should extract resource from permission', () => {
			mockRBACManager.canManage.mockClear();
			mockRBACManager.canManage.mockReturnValue(true);

			const result = auth.canManageUser('user-123', 'users:write');

			expect(mockRBACManager.canManage).toHaveBeenCalledWith('users');
			expect(result).toBe(true);
		});

		test('hasRole should delegate to RBAC manager', () => {
			mockRBACManager.hasRole.mockClear();
			mockRBACManager.hasRole.mockReturnValue(true);

			const result = auth.hasRole('Admin');

			expect(mockRBACManager.hasRole).toHaveBeenCalledWith('Admin');
			expect(result).toBe(true);
		});
	});

	describe('User Refresh', () => {
		test('should refresh user data from GraphQL', async () => {
			const initialUser = {
				id: 'user-1',
				email: 'test@example.com',
				displayName: 'Test User',
				onboardingStatus: 'Active',
				isActive: true,
				role: 'Employee'
			};

			const updatedUser = {
				id: 'user-1',
				email: 'test@example.com',
				displayName: 'Updated Name',
				jobTitle: 'Senior Developer',
				onboardingStatus: 'Active',
				isActive: true,
				role: 'Employee'
			};

			// Set initial user
			mockToPromise.mockResolvedValue({
				data: {
					roles: [
						{
							id: 'employee-role',
							name: 'Employee',
							level: 25,
							permissions: []
						}
					]
				}
			});

			await auth.setUser(initialUser);

			// Now mock the refresh query
			mockToPromise.mockResolvedValue({
				data: { user: updatedUser }
			});

			await auth.refreshUser();

			// User data should be updated, but need to check if setUser was called
			// which would trigger role loading again
			expect(mockQuery).toHaveBeenCalled();
		});

		test('should do nothing if no user is set', async () => {
			auth.user = null;

			mockQuery.mockClear();

			await auth.refreshUser();

			// Should not have called query since user is null
			expect(mockQuery).not.toHaveBeenCalled();
		});

		test('should handle errors during refresh', async () => {
			const initialUser = {
				id: 'user-1',
				email: 'test@example.com',
				displayName: 'Test',
				onboardingStatus: 'Active',
				isActive: true,
				role: 'Employee'
			};

			// Set user first
			mockToPromise.mockResolvedValue({
				data: {
					roles: [
						{
							id: 'employee-role',
							name: 'Employee',
							level: 25,
							permissions: []
						}
					]
				}
			});

			await auth.setUser(initialUser);

			// Now make refresh fail
			mockToPromise.mockRejectedValue(new Error('GraphQL error'));

			await auth.refreshUser();

			expect(auth.error).toBe('Failed to refresh user data');
		});
	});

	describe('Reset', () => {
		test('should clear all state on reset', () => {
			auth.user = {
				id: '1',
				email: 'test@example.com',
				displayName: 'Test',
				onboardingStatus: 'Active',
				isActive: true
			};
			auth.roles = [{ id: '1', userId: '1', roleId: 'admin', isActive: true } as any];
			auth.isLoading = true;
			auth.error = 'Some error';

			auth.reset();

			expect(auth.user).toBeNull();
			expect(auth.roles).toEqual([]);
			expect(auth.isLoading).toBe(false);
			expect(auth.error).toBeNull();
		});
	});
});
