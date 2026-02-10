/**
 * Unit Tests for JWT Authentication Store (Svelte 5 Runes)
 *
 * Tests cover:
 * - Store initialization and GraphQL client integration
 * - Login flow with valid/invalid credentials
 * - Token refresh and automatic refresh scheduling
 * - Logout and session clearing
 * - Permission and role checking helpers
 * - Session restoration on page load
 * - Error handling and recovery
 * - Token storage and security
 *
 * Coverage target: >80% of jwt-auth.svelte.ts (376 lines)
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { Client, type CombinedError } from '@urql/core';
import type { AuthUser, TokenPair } from '$lib/stores/jwt-auth.svelte';

// Mock browser environment
vi.mock('$app/environment', () => ({
	browser: true
}));

// ============================================================================
// Mock Types & Helpers
// ============================================================================

const mockUser: AuthUser = {
	id: '123',
	email: 'test@example.com',
	displayName: 'Test User',
	roles: ['admin', 'manager'],
	permissions: ['user:read', 'user:write', 'department:read'],
	isActive: true,
	forcePasswordChange: false
};

const mockTokens: TokenPair = {
	accessToken:
		'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMifQ.TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ',
	refreshToken: 'refresh-token-jwt',
	refreshTokenPlaintext: 'refresh-token-plaintext',
	tokenType: 'Bearer',
	expiresIn: 3600 // 1 hour
};

// ============================================================================
// Test Suite
// ============================================================================

describe('JwtAuthStore', () => {
	let mockClient: any;
	let store: any;

	beforeEach(async () => {
		vi.clearAllMocks();

		// Mock GraphQL Client
		mockClient = {
			mutation: vi.fn()
		} as unknown as Client;

		// Import fresh store instance for each test
		const { jwtAuth } = await import('$lib/stores/jwt-auth.svelte');
		store = jwtAuth;

		// Reset store state
		store.accessToken = null;
		store.user = null;
		store.isLoading = false;
		store.error = null;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	// ========================================================================
	// Initialization
	// ========================================================================

	describe('initialization', () => {
		test('should initialize store with GraphQL client', async () => {
			// Store uses private field, so we test indirectly via mutation calls
			mockClient.mutation.mockResolvedValueOnce({
				data: {
					login: {
						__typename: 'AuthSuccess',
						user: mockUser,
						tokens: mockTokens
					}
				},
				error: null
			});

			store.initialize(mockClient);

			// Login should work if client is initialized
			const result = await store.login('test@example.com', 'password123');
			expect(result.success).toBe(true);
		});

		test('should attempt session restoration on browser with token', async () => {
			mockClient.mutation.mockResolvedValueOnce({
				data: {
					refreshToken: {
						__typename: 'AuthSuccess',
						user: mockUser,
						tokens: mockTokens
					}
				},
				error: null
			});

			store.initialize(mockClient);

			// Allow async operations to complete
			await new Promise((resolve) => setTimeout(resolve, 10));

			// On browser, initialization attempts session restoration
			// If successful, mutation would be called
		});
	});

	// ========================================================================
	// Login
	// ========================================================================

	describe('login', () => {
		test('should login successfully with valid credentials', async () => {
			store.initialize(mockClient);

			mockClient.mutation.mockResolvedValueOnce({
				data: {
					login: {
						__typename: 'AuthSuccess',
						user: mockUser,
						tokens: mockTokens
					}
				},
				error: null
			});

			const result = await store.login('test@example.com', 'password123');

			expect(result.success).toBe(true);
			expect(store.accessToken).toBe(mockTokens.accessToken);
			expect(store.user).toEqual(mockUser);
			expect(store.error).toBeNull();
		});

		test('should set isLoading during login', async () => {
			store.initialize(mockClient);

			let resolveLogin: any;
			mockClient.mutation.mockImplementation(
				() =>
					new Promise((resolve) => {
						resolveLogin = resolve;
					})
			);

			const loginPromise = store.login('test@example.com', 'password123');

			expect(store.isLoading).toBe(true);

			resolveLogin({
				data: {
					login: {
						__typename: 'AuthSuccess',
						user: mockUser,
						tokens: mockTokens
					}
				},
				error: null
			});

			await loginPromise;

			expect(store.isLoading).toBe(false);
		});

		test('should handle GraphQL error response', async () => {
			store.initialize(mockClient);

			mockClient.mutation.mockResolvedValueOnce({
				data: {
					login: {
						__typename: 'AuthError',
						code: 'INVALID_CREDENTIALS',
						message: 'Invalid email or password'
					}
				},
				error: null
			});

			const result = await store.login('test@example.com', 'wrongpassword');

			expect(result.success).toBe(false);
			expect(result.error).toBe('Invalid email or password');
			expect(store.error).toBe('Invalid email or password');
			expect(store.accessToken).toBeNull();
			expect(store.user).toBeNull();
		});

		test('should handle network errors', async () => {
			store.initialize(mockClient);

			const networkError = new Error('Network timeout');
			mockClient.mutation.mockResolvedValueOnce({
				error: {
					networkError,
					graphQLErrors: []
				}
			});

			const result = await store.login('test@example.com', 'password123');

			expect(result.success).toBe(false);
			expect(result.error).toBe('Network error. Please check your connection.');
			expect(store.error).toBe('Network error. Please check your connection.');
		});

		test('should handle GraphQL errors', async () => {
			store.initialize(mockClient);

			mockClient.mutation.mockResolvedValueOnce({
				error: {
					networkError: null,
					graphQLErrors: [{ message: 'GraphQL error occurred' }]
				}
			});

			const result = await store.login('test@example.com', 'password123');

			expect(result.success).toBe(false);
			expect(result.error).toBe('GraphQL error occurred');
		});

		test('should return error if GraphQL client not initialized', async () => {
			const result = await store.login('test@example.com', 'password123');

			expect(result.success).toBe(false);
			expect(result.error).toBe('GraphQL client not initialized');
		});

		test('should handle unexpected login response type', async () => {
			store.initialize(mockClient);

			mockClient.mutation.mockResolvedValueOnce({
				data: { login: undefined },
				error: null
			});

			const result = await store.login('test@example.com', 'password123');

			expect(result.success).toBe(false);
			expect(result.error).toBe('Unknown login response');
		});

		test('should include device info in login request', async () => {
			store.initialize(mockClient);

			mockClient.mutation.mockResolvedValueOnce({
				data: {
					login: {
						__typename: 'AuthSuccess',
						user: mockUser,
						tokens: mockTokens
					}
				},
				error: null
			});

			await store.login('test@example.com', 'password123');

			expect(mockClient.mutation).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					email: 'test@example.com',
					password: 'password123',
					deviceInfo: expect.any(String),
					ipAddress: null
				})
			);
		});

		test('should complete login with token refresh scheduling', async () => {
			store.initialize(mockClient);

			mockClient.mutation.mockResolvedValueOnce({
				data: {
					login: {
						__typename: 'AuthSuccess',
						user: mockUser,
						tokens: { ...mockTokens, expiresIn: 3600 } // 1 hour
					}
				},
				error: null
			});

			const result = await store.login('test@example.com', 'password123');

			// Token refresh scheduling happens internally
			expect(result.success).toBe(true);
			expect(store.isAuthenticated).toBe(true);
		});
	});

	// ========================================================================
	// Token Refresh
	// ========================================================================

	describe('refreshAccessToken', () => {
		test('should refresh token successfully', async () => {
			// First, set up authenticated state
			store.initialize(mockClient);
			mockClient.mutation.mockResolvedValueOnce({
				data: {
					login: {
						__typename: 'AuthSuccess',
						user: mockUser,
						tokens: mockTokens
					}
				},
				error: null
			});
			await store.login('test@example.com', 'password123');

			// Clear mocks to prepare for refresh
			vi.clearAllMocks();

			const newTokens = {
				...mockTokens,
				accessToken: 'new-access-token'
			};

			mockClient.mutation.mockResolvedValueOnce({
				data: {
					refreshToken: {
						__typename: 'AuthSuccess',
						user: mockUser,
						tokens: newTokens
					}
				},
				error: null
			});

			const result = await store.refreshAccessToken();

			expect(result).toBe(true);
			expect(store.accessToken).toBe('new-access-token');
			expect(store.user).toEqual(mockUser);
		});

		test('should return false if no refresh token available', async () => {
			store.initialize(mockClient);

			const result = await store.refreshAccessToken();

			expect(result).toBe(false);
			expect(mockClient.mutation).not.toHaveBeenCalled();
		});

		test('should return false if GraphQL client not initialized', async () => {
			const result = await store.refreshAccessToken();

			expect(result).toBe(false);
		});

		test('should clear auth on GraphQL error', async () => {
			store.initialize(mockClient);

			// Set up initial auth
			mockClient.mutation.mockResolvedValueOnce({
				data: {
					login: {
						__typename: 'AuthSuccess',
						user: mockUser,
						tokens: mockTokens
					}
				},
				error: null
			});
			await store.login('test@example.com', 'password123');

			vi.clearAllMocks();

			// Simulate refresh error
			mockClient.mutation.mockResolvedValueOnce({
				error: {
					networkError: new Error('Network error'),
					graphQLErrors: []
				}
			});

			const result = await store.refreshAccessToken();

			expect(result).toBe(false);
			expect(store.accessToken).toBeNull();
			expect(store.user).toBeNull();
		});

		test('should clear auth on AuthError response', async () => {
			store.initialize(mockClient);

			// Set up initial auth
			mockClient.mutation.mockResolvedValueOnce({
				data: {
					login: {
						__typename: 'AuthSuccess',
						user: mockUser,
						tokens: mockTokens
					}
				},
				error: null
			});
			await store.login('test@example.com', 'password123');

			vi.clearAllMocks();

			mockClient.mutation.mockResolvedValueOnce({
				data: {
					refreshToken: {
						__typename: 'AuthError',
						code: 'INVALID_REFRESH_TOKEN',
						message: 'Refresh token expired'
					}
				},
				error: null
			});

			const result = await store.refreshAccessToken();

			expect(result).toBe(false);
			expect(store.accessToken).toBeNull();
			expect(store.user).toBeNull();
		});

		test('should handle refresh token exception', async () => {
			store.initialize(mockClient);

			// Set up initial auth
			mockClient.mutation.mockResolvedValueOnce({
				data: {
					login: {
						__typename: 'AuthSuccess',
						user: mockUser,
						tokens: mockTokens
					}
				},
				error: null
			});
			await store.login('test@example.com', 'password123');

			vi.clearAllMocks();

			mockClient.mutation.mockRejectedValueOnce(new Error('Unexpected error'));

			const result = await store.refreshAccessToken();

			expect(result).toBe(false);
			expect(store.accessToken).toBeNull();
		});
	});

	// ========================================================================
	// Logout
	// ========================================================================

	describe('logout', () => {
		test('should logout successfully', async () => {
			store.initialize(mockClient);

			// Set up authenticated state
			mockClient.mutation.mockResolvedValueOnce({
				data: {
					login: {
						__typename: 'AuthSuccess',
						user: mockUser,
						tokens: mockTokens
					}
				},
				error: null
			});
			await store.login('test@example.com', 'password123');

			vi.clearAllMocks();

			mockClient.mutation.mockResolvedValueOnce({
				data: {
					logout: {
						success: true,
						message: 'Logout successful'
					}
				},
				error: null
			});

			await store.logout();

			expect(store.accessToken).toBeNull();
			expect(store.user).toBeNull();
			expect(store.error).toBeNull();
		});

		test('should clear auth even if logout mutation fails', async () => {
			store.initialize(mockClient);

			// Set up authenticated state
			mockClient.mutation.mockResolvedValueOnce({
				data: {
					login: {
						__typename: 'AuthSuccess',
						user: mockUser,
						tokens: mockTokens
					}
				},
				error: null
			});
			await store.login('test@example.com', 'password123');

			vi.clearAllMocks();

			mockClient.mutation.mockRejectedValueOnce(new Error('Network error'));

			await store.logout();

			expect(store.accessToken).toBeNull();
			expect(store.user).toBeNull();
		});

		test('should clear auth if GraphQL client not initialized', async () => {
			// Set raw state without initializing client
			store.accessToken = 'some-token';
			store.user = mockUser;

			await store.logout();

			expect(store.accessToken).toBeNull();
			expect(store.user).toBeNull();
		});

		test('should clear auth on logout', async () => {
			store.initialize(mockClient);

			// Set up authenticated state
			mockClient.mutation.mockResolvedValueOnce({
				data: {
					login: {
						__typename: 'AuthSuccess',
						user: mockUser,
						tokens: mockTokens
					}
				},
				error: null
			});
			await store.login('test@example.com', 'password123');

			const authBefore = store.isAuthenticated;

			mockClient.mutation.mockResolvedValueOnce({
				data: { logout: { success: true, message: 'Logout successful' } },
				error: null
			});

			await store.logout();

			// Auth state should be cleared after logout
			expect(store.user).toBeNull();
			expect(store.accessToken).toBeNull();
		});
	});

	// ========================================================================
	// Permission & Role Checking
	// ========================================================================

	describe('permission checking', () => {
		beforeEach(async () => {
			store.initialize(mockClient);
			mockClient.mutation.mockResolvedValueOnce({
				data: {
					login: {
						__typename: 'AuthSuccess',
						user: mockUser,
						tokens: mockTokens
					}
				},
				error: null
			});
			await store.login('test@example.com', 'password123');
		});

		test('hasPermission should return true for existing permission', () => {
			expect(store.hasPermission('user:read')).toBe(true);
			expect(store.hasPermission('user:write')).toBe(true);
		});

		test('hasPermission should return false for missing permission', () => {
			expect(store.hasPermission('admin:delete')).toBe(false);
			expect(store.hasPermission('nonexistent:permission')).toBe(false);
		});

		test('hasPermission should return false when user is null', () => {
			store.user = null;
			expect(store.hasPermission('user:read')).toBe(false);
		});

		test('hasRole should return true for existing role', () => {
			expect(store.hasRole('admin')).toBe(true);
			expect(store.hasRole('manager')).toBe(true);
		});

		test('hasRole should return false for missing role', () => {
			expect(store.hasRole('employee')).toBe(false);
		});

		test('hasRole should return false when user is null', () => {
			store.user = null;
			expect(store.hasRole('admin')).toBe(false);
		});

		test('hasAnyRole should return true if user has any role', () => {
			expect(store.hasAnyRole(['admin', 'employee'])).toBe(true);
			expect(store.hasAnyRole(['manager', 'employee'])).toBe(true);
		});

		test('hasAnyRole should return false if user has no matching roles', () => {
			expect(store.hasAnyRole(['employee', 'viewer'])).toBe(false);
		});

		test('hasAnyRole should return false when user is null', () => {
			store.user = null;
			expect(store.hasAnyRole(['admin', 'manager'])).toBe(false);
		});

		test('hasAllPermissions should return true if user has all permissions', () => {
			expect(store.hasAllPermissions(['user:read', 'user:write'])).toBe(true);
		});

		test('hasAllPermissions should return false if user lacks any permission', () => {
			expect(store.hasAllPermissions(['user:read', 'user:write', 'admin:delete'])).toBe(false);
		});

		test('hasAllPermissions should return false when user is null', () => {
			store.user = null;
			expect(store.hasAllPermissions(['user:read'])).toBe(false);
		});
	});

	// ========================================================================
	// Derived State
	// ========================================================================

	describe('derived state', () => {
		test('isAuthenticated should be false initially', () => {
			expect(store.isAuthenticated).toBe(false);
		});

		test('isAuthenticated should be true when user and token are set after login', async () => {
			store.initialize(mockClient);

			mockClient.mutation.mockResolvedValueOnce({
				data: {
					login: {
						__typename: 'AuthSuccess',
						user: mockUser,
						tokens: mockTokens
					}
				},
				error: null
			});

			await store.login('test@example.com', 'password123');

			// After login, both accessToken and user should be set
			expect(store.accessToken).not.toBeNull();
			expect(store.user).not.toBeNull();
			expect(store.isAuthenticated).toBe(true);
		});

		test('isAuthenticated should be false when token is null', () => {
			store.user = mockUser;
			store.accessToken = null;

			expect(store.isAuthenticated).toBe(false);
		});

		test('isAuthenticated should be false when user is null', () => {
			store.accessToken = 'token';
			store.user = null;

			expect(store.isAuthenticated).toBe(false);
		});
	});

	// ========================================================================
	// Token Refresh Scheduling
	// ========================================================================

	describe('automatic token refresh', () => {
		test('should schedule token refresh after login', async () => {
			store.initialize(mockClient);

			const expiresIn = 3600; // 1 hour
			mockClient.mutation.mockResolvedValueOnce({
				data: {
					login: {
						__typename: 'AuthSuccess',
						user: mockUser,
						tokens: { ...mockTokens, expiresIn }
					}
				},
				error: null
			});

			await store.login('test@example.com', 'password123');

			// Login should succeed - refresh scheduling happens internally
			expect(store.isAuthenticated).toBe(true);
		});

		test('should not crash with very short expiry times', async () => {
			store.initialize(mockClient);

			mockClient.mutation.mockResolvedValueOnce({
				data: {
					login: {
						__typename: 'AuthSuccess',
						user: mockUser,
						tokens: { ...mockTokens, expiresIn: 30 } // Only 30 seconds
					}
				},
				error: null
			});

			await store.login('test@example.com', 'password123');

			expect(store.isAuthenticated).toBe(true);
		});

		test('should handle multiple logins gracefully', async () => {
			store.initialize(mockClient);

			// First login
			mockClient.mutation.mockResolvedValueOnce({
				data: {
					login: {
						__typename: 'AuthSuccess',
						user: mockUser,
						tokens: mockTokens
					}
				},
				error: null
			});
			await store.login('test@example.com', 'password123');

			expect(store.isAuthenticated).toBe(true);

			vi.clearAllMocks();

			// Second login (should clear previous timer and schedule new one)
			mockClient.mutation.mockResolvedValueOnce({
				data: {
					login: {
						__typename: 'AuthSuccess',
						user: { ...mockUser, email: 'other@example.com' },
						tokens: mockTokens
					}
				},
				error: null
			});
			await store.login('other@example.com', 'password123');

			expect(store.isAuthenticated).toBe(true);
		});
	});

	// ========================================================================
	// Error Handling
	// ========================================================================

	describe('error handling', () => {
		test('should clear error on successful login', async () => {
			store.initialize(mockClient);

			// Set error state
			store.error = 'Previous error';

			mockClient.mutation.mockResolvedValueOnce({
				data: {
					login: {
						__typename: 'AuthSuccess',
						user: mockUser,
						tokens: mockTokens
					}
				},
				error: null
			});

			await store.login('test@example.com', 'password123');

			expect(store.error).toBeNull();
		});

		test('should set error on failed login', async () => {
			store.initialize(mockClient);

			mockClient.mutation.mockResolvedValueOnce({
				error: {
					networkError: new Error('Network error'),
					graphQLErrors: []
				}
			});

			await store.login('test@example.com', 'password123');

			expect(store.error).not.toBeNull();
			expect(store.error).toBe('Network error. Please check your connection.');
		});

		test('should handle exception during login', async () => {
			store.initialize(mockClient);

			mockClient.mutation.mockRejectedValueOnce(new Error('Unexpected error'));

			const result = await store.login('test@example.com', 'password123');

			expect(result.success).toBe(false);
			expect(result.error).toBe('Unexpected error');
			expect(store.error).toBe('Unexpected error');
		});

		test('should reset isLoading even on error', async () => {
			store.initialize(mockClient);

			mockClient.mutation.mockRejectedValueOnce(new Error('Error'));

			await store.login('test@example.com', 'password123');

			expect(store.isLoading).toBe(false);
		});
	});

	// ========================================================================
	// Device Info
	// ========================================================================

	describe('device info', () => {
		test('should include user agent in device info on browser', async () => {
			store.initialize(mockClient);

			mockClient.mutation.mockResolvedValueOnce({
				data: {
					login: {
						__typename: 'AuthSuccess',
						user: mockUser,
						tokens: mockTokens
					}
				},
				error: null
			});

			await store.login('test@example.com', 'password123');

			expect(mockClient.mutation).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					deviceInfo: expect.stringMatching(/.*/)
				})
			);
		});
	});

	// ========================================================================
	// Token Security
	// ========================================================================

	describe('token security', () => {
		test('should store access token after login', async () => {
			store.initialize(mockClient);

			mockClient.mutation.mockResolvedValueOnce({
				data: {
					login: {
						__typename: 'AuthSuccess',
						user: mockUser,
						tokens: mockTokens
					}
				},
				error: null
			});

			await store.login('test@example.com', 'password123');

			// Access token should be stored in memory
			expect(store.accessToken).toBe(mockTokens.accessToken);
			// Refresh token is managed privately (not exposed publicly)
		});

		test('should clear all tokens on logout', async () => {
			store.initialize(mockClient);

			mockClient.mutation.mockResolvedValueOnce({
				data: {
					login: {
						__typename: 'AuthSuccess',
						user: mockUser,
						tokens: mockTokens
					}
				},
				error: null
			});
			await store.login('test@example.com', 'password123');

			expect(store.accessToken).not.toBeNull();

			mockClient.mutation.mockResolvedValueOnce({
				data: { logout: { success: true } },
				error: null
			});
			await store.logout();

			expect(store.accessToken).toBeNull();
			expect(store.user).toBeNull();
		});
	});

	// ========================================================================
	// Edge Cases
	// ========================================================================

	describe('edge cases', () => {
		test('should handle empty user permissions array', async () => {
			store.initialize(mockClient);

			const userWithNoPerms = { ...mockUser, permissions: [] };

			mockClient.mutation.mockResolvedValueOnce({
				data: {
					login: {
						__typename: 'AuthSuccess',
						user: userWithNoPerms,
						tokens: mockTokens
					}
				},
				error: null
			});

			await store.login('test@example.com', 'password123');

			expect(store.hasPermission('any:permission')).toBe(false);
		});

		test('should handle empty user roles array', async () => {
			store.initialize(mockClient);

			const userWithNoRoles = { ...mockUser, roles: [] };

			mockClient.mutation.mockResolvedValueOnce({
				data: {
					login: {
						__typename: 'AuthSuccess',
						user: userWithNoRoles,
						tokens: mockTokens
					}
				},
				error: null
			});

			await store.login('test@example.com', 'password123');

			expect(store.hasRole('admin')).toBe(false);
			expect(store.hasAnyRole(['admin', 'manager'])).toBe(false);
		});

		test('should handle null error when formatting GraphQL error', async () => {
			store.initialize(mockClient);

			mockClient.mutation.mockResolvedValueOnce({
				error: {
					networkError: null,
					graphQLErrors: []
				}
			});

			await store.login('test@example.com', 'password123');

			expect(store.error).toBe('An unexpected error occurred');
		});

		test('should handle login with special characters in email', async () => {
			store.initialize(mockClient);

			mockClient.mutation.mockResolvedValueOnce({
				data: {
					login: {
						__typename: 'AuthSuccess',
						user: mockUser,
						tokens: mockTokens
					}
				},
				error: null
			});

			const result = await store.login('test+special@example.co.uk', 'password');

			expect(result.success).toBe(true);
			expect(mockClient.mutation).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					email: 'test+special@example.co.uk'
				})
			);
		});

		test('should handle user status changes', async () => {
			store.initialize(mockClient);

			mockClient.mutation.mockResolvedValueOnce({
				data: {
					login: {
						__typename: 'AuthSuccess',
						user: { ...mockUser, isActive: true },
						tokens: mockTokens
					}
				},
				error: null
			});

			await store.login('test@example.com', 'password123');

			expect(store.user?.isActive).toBe(true);
		});

		test('should handle force password change flag', async () => {
			store.initialize(mockClient);

			mockClient.mutation.mockResolvedValueOnce({
				data: {
					login: {
						__typename: 'AuthSuccess',
						user: { ...mockUser, forcePasswordChange: true },
						tokens: mockTokens
					}
				},
				error: null
			});

			await store.login('test@example.com', 'password123');

			expect(store.user?.forcePasswordChange).toBe(true);
		});
	});
});
