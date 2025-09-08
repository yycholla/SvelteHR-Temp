/**
 * Authentication Service
 * 
 * Provides high-level authentication operations using GraphQL client
 * Implements business logic for login, logout, token management, and user session handling
 * 
 * This service acts as an abstraction layer over the GraphQL operations
 * and integrates with the Svelte auth store for state management.
 */

import { authOperations, type GraphQLResponse } from '../graphql/client';
import { authStore } from '../stores/auth';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';

/**
 * Authentication result types
 */
export interface AuthResult {
	success: boolean;
	data?: {
		user: any;
		token: string;
		refreshToken: string;
	};
	error?: string;
}

export interface UserProfileResult {
	success: boolean;
	data?: any;
	error?: string;
}

/**
 * Authentication Service Class
 * 
 * Provides business-level authentication operations that integrate
 * GraphQL operations with application state management
 */
export class AuthService {
	/**
	 * Authenticate user with email and password
	 */
	async login(email: string, password: string): Promise<AuthResult> {
		try {
			const response = await authOperations.login(email, password);
			
			if (response.errors || !response.data?.login) {
				return {
					success: false,
					error: response.errors?.[0]?.message || 'Login failed'
				};
			}

			const loginData = response.data.login;
			
			// Transform GraphQL response to service format
			const authResult: AuthResult = {
				success: true,
				data: {
					user: {
						id: loginData.user.id,
						email: loginData.user.email,
						firstName: loginData.user.firstName,
						lastName: loginData.user.lastName,
						isActive: loginData.user.isActive,
						roles: loginData.user.roles || [],
						employee: loginData.user.employee || null
					},
					token: loginData.token,
					refreshToken: loginData.refreshToken
				}
			};

			// Update auth store with login result
			if (browser) {
				authStore.setAuthData({
					token: authResult.data.token,
					user: authResult.data.user,
					refreshToken: authResult.data.refreshToken
				});
			}

			return authResult;
		} catch (error) {
			console.error('AuthService.login error:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Authentication failed'
			};
		}
	}

	/**
	 * Get current user profile and verify authentication
	 */
	async getCurrentUser(): Promise<UserProfileResult> {
		try {
			const response = await authOperations.me();
			
			if (response.errors || !response.data?.me) {
				return {
					success: false,
					error: response.errors?.[0]?.message || 'Failed to get user profile'
				};
			}

			const userData = response.data.me;
			
			return {
				success: true,
				data: {
					id: userData.id,
					email: userData.email,
					firstName: userData.firstName,
					lastName: userData.lastName,
					isActive: userData.isActive,
					roles: userData.roles || [],
					employee: userData.employee || null
				}
			};
		} catch (error) {
			console.error('AuthService.getCurrentUser error:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to get user profile'
			};
		}
	}

	/**
	 * Refresh authentication token
	 */
	async refreshToken(refreshToken: string): Promise<AuthResult> {
		try {
			const response = await authOperations.refreshToken(refreshToken);
			
			if (response.errors || !response.data?.refreshToken) {
				return {
					success: false,
					error: response.errors?.[0]?.message || 'Token refresh failed'
				};
			}

			const refreshData = response.data.refreshToken;
			
			const authResult: AuthResult = {
				success: true,
				data: {
					user: {
						id: refreshData.user.id,
						email: refreshData.user.email,
						firstName: refreshData.user.firstName,
						lastName: refreshData.user.lastName,
						isActive: refreshData.user.isActive,
						roles: refreshData.user.roles || [],
						employee: refreshData.user.employee || null
					},
					token: refreshData.token,
					refreshToken: refreshData.refreshToken
				}
			};

			// Update auth store with refreshed tokens
			if (browser) {
				authStore.setAuthData({
					token: authResult.data.token,
					user: authResult.data.user,
					refreshToken: authResult.data.refreshToken
				});
			}

			return authResult;
		} catch (error) {
			console.error('AuthService.refreshToken error:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Token refresh failed'
			};
		}
	}

	/**
	 * Logout user and clear authentication state
	 */
	async logout(): Promise<void> {
		try {
			// Clear auth store
			if (browser) {
				authStore.clearAuth();
				
				// Redirect to login page
				await goto('/login');
			}
		} catch (error) {
			console.error('AuthService.logout error:', error);
		}
	}

	/**
	 * Check if user has specific permission
	 */
	hasPermission(permission: string): boolean {
		const { user } = authStore.getState();
		
		if (!user || !user.roles) {
			return false;
		}

		// Check if user has admin role (full access)
		const hasAdminRole = user.roles.some((role: any) => role.name === 'Admin');
		if (hasAdminRole) {
			return true;
		}

		// Check specific permission across all user roles
		return user.roles.some((role: any) => 
			role.permissions?.some((perm: any) => 
				`${perm.resource}:${perm.action}` === permission
			)
		);
	}

	/**
	 * Check if user has specific role
	 */
	hasRole(roleName: string): boolean {
		const { user } = authStore.getState();
		
		if (!user || !user.roles) {
			return false;
		}

		return user.roles.some((role: any) => role.name === roleName);
	}

	/**
	 * Get user's highest privilege role level
	 */
	getUserRoleLevel(): number {
		const { user } = authStore.getState();
		
		if (!user || !user.roles) {
			return 0;
		}

		// Return highest role level (Admin=100, HR=75, Manager=50, Employee=25)
		return Math.max(...user.roles.map((role: any) => role.level || 0));
	}

	/**
	 * Initialize authentication on app startup
	 */
	async initialize(): Promise<void> {
		if (!browser) return;

		try {
			// Check if we have stored authentication
			const storedAuth = authStore.getState();
			
			if (storedAuth.token && storedAuth.user) {
				// Verify the stored token is still valid
				const userResult = await this.getCurrentUser();
				
				if (!userResult.success) {
					// Token is invalid, try to refresh
					if (storedAuth.refreshToken) {
						const refreshResult = await this.refreshToken(storedAuth.refreshToken);
						
						if (!refreshResult.success) {
							// Refresh failed, clear auth state
							authStore.clearAuth();
						}
					} else {
						// No refresh token available, clear auth state
						authStore.clearAuth();
					}
				}
			}
		} catch (error) {
			console.error('AuthService.initialize error:', error);
			// Clear auth state on initialization errors
			authStore.clearAuth();
		}
	}
}

/**
 * Singleton instance of AuthService
 */
export const authService = new AuthService();