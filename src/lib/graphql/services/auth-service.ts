/**
 * GraphQL Authentication Service
 * 
 * Provides high-level authentication service functions using GraphQL operations.
 * Handles token management, session persistence, and RBAC integration.
 * Designed to replace REST API authentication calls.
 */

import { browser } from '$app/environment';
import { createGraphQLClient, createServerClient, type ServerGraphQLClient, type BrowserGraphQLClient, GraphQLClientError } from '../client-factory';
import { handleGraphQLError, withGraphQLErrorHandling } from '../error-handler';
import {
	GET_CURRENT_USER,
	VERIFY_TOKEN,
	LOGIN,
	MAGIC_LINK_LOGIN,
	REFRESH_TOKEN,
	LOGOUT,
	REQUEST_PASSWORD_RESET,
	RESET_PASSWORD,
	UPDATE_PROFILE,
	CHANGE_PASSWORD,
	hasPermission,
	hasRole,
	isTokenExpired,
	validatePasswordStrength,
	type LoginVariables,
	type MagicLinkLoginVariables,
	type RefreshTokenVariables,
	type RequestPasswordResetVariables,
	type ResetPasswordVariables,
	type UpdateProfileVariables,
	type ChangePasswordVariables,
	type GetCurrentUserQuery,
	type VerifyTokenQuery,
	type LoginMutation
} from '../operations/auth';
import type { GraphQLResponse } from '../types';

/**
 * Authentication service configuration
 */
export interface AuthServiceConfig {
	tokenCookieName?: string;
	refreshTokenCookieName?: string;
	autoRefresh?: boolean;
	refreshBuffer?: number; // minutes before expiry to refresh
}

/**
 * Authentication result interfaces
 */
export interface AuthResult {
	success: boolean;
	user?: any;
	token?: string;
	expiresAt?: string;
	message?: string;
	errors?: Array<{ field: string; message: string }>;
}

export interface UserContext {
	user: any;
	authenticated: boolean;
	permissions: string[];
	roles: Array<{ name: string; level: number }>;
	session?: {
		id: string;
		expires_at: string;
		last_accessed: string;
	};
}

/**
 * GraphQL Authentication Service Class
 */
export class GraphQLAuthService {
	private client: ServerGraphQLClient | BrowserGraphQLClient;
	private config: AuthServiceConfig;
	
	constructor(
		token?: string,
		config: AuthServiceConfig = {}
	) {
		this.config = {
			tokenCookieName: 'hr_token',
			refreshTokenCookieName: 'hr_refresh_token',
			autoRefresh: true,
			refreshBuffer: 5, // 5 minutes
			...config
		};

		// Create appropriate client based on environment
		this.client = browser 
			? createGraphQLClient()
			: createServerClient(token);
	}

	/**
	 * Set authentication token
	 */
	setToken(token: string): void {
		if ('setToken' in this.client) {
			this.client.setToken(token);
		}
	}

	/**
	 * Get current user context with full authentication details
	 */
	async getCurrentUser(): Promise<GraphQLResponse<GetCurrentUserQuery>> {
		try {
			const result = await this.client.query<GetCurrentUserQuery>(GET_CURRENT_USER);
			
			if (result.success && result.data?.me?.authenticated) {
				// Check if token needs refresh
				if (this.config.autoRefresh && result.data.me.session?.expires_at) {
					const needsRefresh = isTokenExpired(result.data.me.session.expires_at);
					if (needsRefresh) {
						console.warn('Token expires soon, consider refreshing');
					}
				}
			}
			
			return result;
		} catch (error) {
			console.error('Failed to get current user:', error);
			return {
				success: false,
				errors: [{ message: 'Failed to get user context' }]
			};
		}
	}

	/**
	 * Verify authentication token
	 */
	async verifyToken(): Promise<GraphQLResponse<VerifyTokenQuery>> {
		try {
			return await this.client.query<VerifyTokenQuery>(VERIFY_TOKEN);
		} catch (error) {
			console.error('Token verification failed:', error);
			return {
				success: false,
				errors: [{ message: 'Token verification failed' }]
			};
		}
	}

	/**
	 * Login with email and password
	 */
	async login(variables: LoginVariables): Promise<AuthResult> {
		return withGraphQLErrorHandling(
			async () => {
				const result = await this.client.query<LoginMutation>(LOGIN, variables);
				
				if (result.success && result.data?.login) {
					const loginData = result.data.login;
					
					if (loginData.success && loginData.token) {
						// Update client token
						this.setToken(loginData.token);
						
						return {
							success: true,
							user: loginData.user,
							token: loginData.token,
							expiresAt: loginData.expiresAt,
							message: loginData.message
						};
					} else {
						return {
							success: false,
							message: loginData.message,
							errors: loginData.errors
						};
					}
				}
				
				return {
					success: false,
					message: 'Login failed',
					errors: result.errors?.map(e => ({ field: 'general', message: e.message }))
				};
			},
			'auth-service-login',
			{
				showToast: false, // Login components handle their own error display
				fallbackValue: {
					success: false,
					message: 'Login request failed',
					errors: [{ field: 'general', message: 'Unable to connect to authentication server' }]
				}
			}
		) || {
			success: false,
			message: 'Login request failed',
			errors: [{ field: 'general', message: 'Authentication service unavailable' }]
		};
	}

	/**
	 * Login with enhanced error handling and user feedback
	 */
	async loginWithFeedback(variables: LoginVariables): Promise<AuthResult> {
		return withGraphQLErrorHandling(
			async () => {
				const result = await this.client.query<LoginMutation>(LOGIN, variables);
				
				if (result.success && result.data?.login) {
					const loginData = result.data.login;
					
					if (loginData.success && loginData.token) {
						this.setToken(loginData.token);
						
						return {
							success: true,
							user: loginData.user,
							token: loginData.token,
							expiresAt: loginData.expiresAt,
							message: loginData.message
						};
					} else {
						// Handle login validation errors
						const authError = new GraphQLClientError(
							loginData.message || 'Invalid credentials',
							undefined,
							401,
							{ code: 'AUTHENTICATION_FAILED', field_errors: loginData.errors },
							'LoginMutation',
							{ email: variables.email } // Don't log password
						);
						throw authError;
					}
				}
				
				throw new GraphQLClientError(
					'Login failed - invalid response format',
					result.errors,
					undefined,
					undefined,
					'LoginMutation'
				);
			},
			'auth-service-login-with-feedback',
			{
				showToast: true,
				showActions: false, // Login forms handle their own retry logic
				customMessage: 'Please check your credentials and try again',
				fallbackValue: {
					success: false,
					message: 'Unable to connect to authentication server',
					errors: [{ field: 'general', message: 'Connection failed' }]
				}
			}
		) || {
			success: false,
			message: 'Authentication service unavailable',
			errors: [{ field: 'general', message: 'Service temporarily unavailable' }]
		};
	}

	/**
	 * Magic link authentication
	 */
	async magicLinkLogin(variables: MagicLinkLoginVariables): Promise<AuthResult> {
		try {
			const result = await this.client.query(MAGIC_LINK_LOGIN, variables);
			
			if (result.success && result.data?.magicLinkLogin) {
				const loginData = result.data.magicLinkLogin;
				
				if (loginData.success && loginData.token) {
					this.setToken(loginData.token);
					
					return {
						success: true,
						user: loginData.user,
						token: loginData.token,
						expiresAt: loginData.expiresAt,
						message: loginData.message
					};
				}
				
				return {
					success: false,
					message: loginData.message,
					errors: loginData.errors
				};
			}
			
			return {
				success: false,
				message: 'Magic link authentication failed'
			};
		} catch (error) {
			console.error('Magic link login error:', error);
			return {
				success: false,
				message: 'Magic link authentication request failed',
				errors: [{ field: 'general', message: error instanceof Error ? error.message : 'Unknown error' }]
			};
		}
	}

	/**
	 * Refresh authentication token
	 */
	async refreshToken(variables: RefreshTokenVariables): Promise<AuthResult> {
		try {
			const result = await this.client.query(REFRESH_TOKEN, variables);
			
			if (result.success && result.data?.refreshToken) {
				const refreshData = result.data.refreshToken;
				
				if (refreshData.success && refreshData.token) {
					this.setToken(refreshData.token);
					
					return {
						success: true,
						token: refreshData.token,
						expiresAt: refreshData.expiresAt,
						message: refreshData.message
					};
				}
				
				return {
					success: false,
					message: refreshData.error || 'Token refresh failed'
				};
			}
			
			return {
				success: false,
				message: 'Token refresh failed'
			};
		} catch (error) {
			console.error('Token refresh error:', error);
			return {
				success: false,
				message: 'Token refresh request failed'
			};
		}
	}

	/**
	 * Logout (invalidate token)
	 */
	async logout(allDevices: boolean = false): Promise<AuthResult> {
		try {
			const result = await this.client.query(LOGOUT, { allDevices });
			
			if (result.success && result.data?.logout) {
				const logoutData = result.data.logout;
				
				// Clear token regardless of server response
				this.setToken('');
				
				return {
					success: logoutData.success,
					message: logoutData.message
				};
			}
			
			// Clear token even if request failed
			this.setToken('');
			
			return {
				success: false,
				message: 'Logout failed'
			};
		} catch (error) {
			console.error('Logout error:', error);
			
			// Clear token even on error
			this.setToken('');
			
			return {
				success: false,
				message: 'Logout request failed'
			};
		}
	}

	/**
	 * Request password reset
	 */
	async requestPasswordReset(variables: RequestPasswordResetVariables): Promise<AuthResult> {
		try {
			const result = await this.client.query(REQUEST_PASSWORD_RESET, variables);
			
			if (result.success && result.data?.requestPasswordReset) {
				const resetData = result.data.requestPasswordReset;
				
				return {
					success: resetData.success,
					message: resetData.message,
					errors: resetData.errors
				};
			}
			
			return {
				success: false,
				message: 'Password reset request failed'
			};
		} catch (error) {
			console.error('Password reset request error:', error);
			return {
				success: false,
				message: 'Password reset request failed'
			};
		}
	}

	/**
	 * Reset password with token
	 */
	async resetPassword(variables: ResetPasswordVariables): Promise<AuthResult> {
		// Validate password strength
		const validation = validatePasswordStrength(variables.newPassword);
		if (!validation.isValid) {
			return {
				success: false,
				message: 'Password does not meet strength requirements',
				errors: validation.errors.map(error => ({ field: 'newPassword', message: error }))
			};
		}
		
		// Check password confirmation
		if (variables.newPassword !== variables.confirmPassword) {
			return {
				success: false,
				message: 'Passwords do not match',
				errors: [{ field: 'confirmPassword', message: 'Passwords do not match' }]
			};
		}
		
		try {
			const result = await this.client.query(RESET_PASSWORD, variables);
			
			if (result.success && result.data?.resetPassword) {
				const resetData = result.data.resetPassword;
				
				return {
					success: resetData.success,
					message: resetData.message,
					errors: resetData.errors
				};
			}
			
			return {
				success: false,
				message: 'Password reset failed'
			};
		} catch (error) {
			console.error('Password reset error:', error);
			return {
				success: false,
				message: 'Password reset request failed'
			};
		}
	}

	/**
	 * Update user profile
	 */
	async updateProfile(variables: UpdateProfileVariables): Promise<AuthResult> {
		try {
			const result = await this.client.query(UPDATE_PROFILE, variables);
			
			if (result.success && result.data?.updateMyProfile) {
				const updateData = result.data.updateMyProfile;
				
				return {
					success: updateData.success,
					user: updateData.user,
					message: updateData.message,
					errors: updateData.errors
				};
			}
			
			return {
				success: false,
				message: 'Profile update failed'
			};
		} catch (error) {
			console.error('Profile update error:', error);
			return {
				success: false,
				message: 'Profile update request failed'
			};
		}
	}

	/**
	 * Change password
	 */
	async changePassword(variables: ChangePasswordVariables): Promise<AuthResult> {
		// Validate new password strength
		const validation = validatePasswordStrength(variables.newPassword);
		if (!validation.isValid) {
			return {
				success: false,
				message: 'New password does not meet strength requirements',
				errors: validation.errors.map(error => ({ field: 'newPassword', message: error }))
			};
		}
		
		// Check password confirmation
		if (variables.newPassword !== variables.confirmPassword) {
			return {
				success: false,
				message: 'Passwords do not match',
				errors: [{ field: 'confirmPassword', message: 'Passwords do not match' }]
			};
		}
		
		try {
			const result = await this.client.query(CHANGE_PASSWORD, variables);
			
			if (result.success && result.data?.changePassword) {
				const changeData = result.data.changePassword;
				
				return {
					success: changeData.success,
					message: changeData.message,
					errors: changeData.errors
				};
			}
			
			return {
				success: false,
				message: 'Password change failed'
			};
		} catch (error) {
			console.error('Password change error:', error);
			return {
				success: false,
				message: 'Password change request failed'
			};
		}
	}

	/**
	 * Check if user has specific permission
	 */
	checkPermission(permissions: string[], resource: string, action: string): boolean {
		return hasPermission(permissions, resource, action);
	}

	/**
	 * Check if user has any of the required roles
	 */
	checkRole(userRoles: Array<{ name: string; level: number }>, requiredRoles: string[]): boolean {
		return hasRole(userRoles, requiredRoles);
	}
}

/**
 * Factory function to create authentication service
 */
export function createAuthService(token?: string, config?: AuthServiceConfig): GraphQLAuthService {
	return new GraphQLAuthService(token, config);
}

/**
 * Server-side authentication service factory
 */
export function createServerAuthService(token: string, config?: AuthServiceConfig): GraphQLAuthService {
	const service = new GraphQLAuthService(token, config);
	service.setToken(token);
	return service;
}

/**
 * Browser-side authentication service factory
 */
export function createBrowserAuthService(config?: AuthServiceConfig): GraphQLAuthService {
	if (!browser) {
		throw new Error('Browser auth service can only be created in browser environment');
	}
	
	return new GraphQLAuthService(undefined, config);
}