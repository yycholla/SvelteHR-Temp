/**
 * GraphQL Authentication Operations
 * 
 * Provides typesafe GraphQL queries and mutations for authentication,
 * user context, session management, and RBAC operations.
 * 
 * Uses generated types from GraphQL schema contract.
 */

import type { 
	Query, 
	Mutation,
	User, 
	AuthPayload,
	LoginMutationVariables,
	RefreshTokenMutationVariables,
	RequestPasswordResetMutationVariables,
	ResetPasswordMutationVariables
} from '../generated/graphql';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';

/**
 * Authentication Query Operations
 */

/**
 * Get current user context with roles and permissions
 */
export const GET_CURRENT_USER = `
	query GetCurrentUser {
		me {
			user {
				id
				email
				name
				username
				first_name
				last_name
				full_name
				profile_picture_url
				roles {
					id
					name
					description
					level
				}
				employee {
					id
					employee_id
					department {
						id
						name
					}
					position
					hire_date
					status
				}
				created_at
				updated_at
			}
			authenticated
			permissions
			session {
				id
				expires_at
				last_accessed
			}
		}
	}
` as const;

/**
 * Verify authentication token and get user context
 */
export const VERIFY_TOKEN = `
	query VerifyToken {
		me {
			authenticated
			user {
				id
				email
				name
				roles {
					name
					level
				}
			}
			permissions
			session {
				expires_at
			}
		}
	}
` as const;

/**
 * Get user permissions for RBAC checks
 */
export const GET_USER_PERMISSIONS = `
	query GetUserPermissions {
		me {
			permissions
			user {
				roles {
					id
					name
					level
					permissions {
						resource
						action
						scope
					}
				}
			}
		}
	}
` as const;

/**
 * Check specific permission
 */
export const CHECK_PERMISSION = `
	query CheckPermission($resource: String!, $action: String!, $scope: String) {
		hasPermission(resource: $resource, action: $action, scope: $scope)
	}
` as const;

/**
 * Authentication Mutation Operations
 */

/**
 * Login with email and password
 */
export const LOGIN = `
	mutation Login($email: String!, $password: String!, $remember: Boolean) {
		login(email: $email, password: $password, remember: $remember) {
			success
			token
			refreshToken
			expiresAt
			user {
				id
				email
				name
				roles {
					name
					level
				}
			}
			session {
				id
				expires_at
			}
			message
			errors {
				field
				message
			}
		}
	}
` as const;

/**
 * Magic link authentication
 */
export const MAGIC_LINK_LOGIN = `
	mutation MagicLinkLogin($token: String!) {
		magicLinkLogin(token: $token) {
			success
			token
			refreshToken
			expiresAt
			user {
				id
				email
				name
				roles {
					name
				}
			}
			message
			errors {
				field
				message
			}
		}
	}
` as const;

/**
 * Refresh authentication token
 */
export const REFRESH_TOKEN = `
	mutation RefreshToken($refreshToken: String!) {
		refreshToken(refreshToken: $refreshToken) {
			success
			token
			refreshToken
			expiresAt
			message
			error
		}
	}
` as const;

/**
 * Logout (invalidate token)
 */
export const LOGOUT = `
	mutation Logout($allDevices: Boolean) {
		logout(allDevices: $allDevices) {
			success
			message
		}
	}
` as const;

/**
 * Request password reset
 */
export const REQUEST_PASSWORD_RESET = `
	mutation RequestPasswordReset($email: String!) {
		requestPasswordReset(email: $email) {
			success
			message
			errors {
				field
				message
			}
		}
	}
` as const;

/**
 * Reset password with token
 */
export const RESET_PASSWORD = `
	mutation ResetPassword($token: String!, $newPassword: String!, $confirmPassword: String!) {
		resetPassword(token: $token, newPassword: $newPassword, confirmPassword: $confirmPassword) {
			success
			message
			errors {
				field
				message
			}
		}
	}
` as const;

/**
 * Update user profile
 */
export const UPDATE_PROFILE = `
	mutation UpdateProfile($input: UpdateProfileInput!) {
		updateMyProfile(input: $input) {
			success
			user {
				id
				email
				name
				first_name
				last_name
				profile_picture_url
			}
			message
			errors {
				field
				message
			}
		}
	}
` as const;

/**
 * Change password
 */
export const CHANGE_PASSWORD = `
	mutation ChangePassword($currentPassword: String!, $newPassword: String!, $confirmPassword: String!) {
		changePassword(currentPassword: $currentPassword, newPassword: $newPassword, confirmPassword: $confirmPassword) {
			success
			message
			errors {
				field
				message
			}
		}
	}
` as const;

/**
 * TypeScript interfaces for operation variables
 */

export interface GetCurrentUserQuery {
	me: {
		user: User | null;
		authenticated: boolean;
		permissions: string[];
		session: {
			id: string;
			expires_at: string;
			last_accessed: string;
		} | null;
	};
}

export interface VerifyTokenQuery {
	me: {
		authenticated: boolean;
		user: Pick<User, 'id' | 'email' | 'name'> & {
			roles: Array<{ name: string; level: number }>;
		} | null;
		permissions: string[];
		session: {
			expires_at: string;
		} | null;
	};
}

export interface LoginMutation {
	login: {
		success: boolean;
		token?: string;
		refreshToken?: string;
		expiresAt?: string;
		user?: Pick<User, 'id' | 'email' | 'name'> & {
			roles: Array<{ name: string; level: number }>;
		};
		session?: {
			id: string;
			expires_at: string;
		};
		message?: string;
		errors?: Array<{
			field: string;
			message: string;
		}>;
	};
}

export interface LoginVariables {
	email: string;
	password: string;
	remember?: boolean;
}

export interface MagicLinkLoginVariables {
	token: string;
}

export interface RefreshTokenVariables {
	refreshToken: string;
}

export interface LogoutVariables {
	allDevices?: boolean;
}

export interface RequestPasswordResetVariables {
	email: string;
}

export interface ResetPasswordVariables {
	token: string;
	newPassword: string;
	confirmPassword: string;
}

export interface UpdateProfileVariables {
	input: {
		first_name?: string;
		last_name?: string;
		name?: string;
		profile_picture_url?: string;
	};
}

export interface ChangePasswordVariables {
	currentPassword: string;
	newPassword: string;
	confirmPassword: string;
}

export interface CheckPermissionVariables {
	resource: string;
	action: string;
	scope?: string;
}

/**
 * Utility functions for authentication operations
 */

/**
 * Check if user has specific permission
 */
export function hasPermission(permissions: string[], resource: string, action: string): boolean {
	// Admin has all permissions
	if (permissions.includes('*')) {
		return true;
	}
	
	// Check specific permission
	const permissionPattern = `${resource}:${action}`;
	if (permissions.includes(permissionPattern)) {
		return true;
	}
	
	// Check wildcard resource permissions
	const wildcardResource = `${resource}:*`;
	if (permissions.includes(wildcardResource)) {
		return true;
	}
	
	return false;
}

/**
 * Check if user has any of the specified roles
 */
export function hasRole(userRoles: Array<{ name: string; level: number }>, requiredRoles: string[]): boolean {
	return userRoles.some(role => requiredRoles.includes(role.name));
}

/**
 * Check if user role level meets minimum requirement
 */
export function hasMinimumRoleLevel(userRoles: Array<{ name: string; level: number }>, minimumLevel: number): boolean {
	return userRoles.some(role => role.level >= minimumLevel);
}

/**
 * Get highest role level from user roles
 */
export function getHighestRoleLevel(userRoles: Array<{ name: string; level: number }>): number {
	return Math.max(...userRoles.map(role => role.level), 0);
}

/**
 * Check if authentication token is expired
 */
export function isTokenExpired(expiresAt: string): boolean {
	const expiryTime = new Date(expiresAt).getTime();
	const currentTime = Date.now();
	const bufferTime = 5 * 60 * 1000; // 5 minutes buffer
	
	return currentTime >= (expiryTime - bufferTime);
}

/**
 * Get time until token expires in minutes
 */
export function getTokenExpiryMinutes(expiresAt: string): number {
	const expiryTime = new Date(expiresAt).getTime();
	const currentTime = Date.now();
	const diffInMinutes = Math.floor((expiryTime - currentTime) / (1000 * 60));
	
	return Math.max(0, diffInMinutes);
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
	isValid: boolean;
	errors: string[];
} {
	const errors: string[] = [];
	
	if (password.length < 8) {
		errors.push('Password must be at least 8 characters long');
	}
	
	if (!/[A-Z]/.test(password)) {
		errors.push('Password must contain at least one uppercase letter');
	}
	
	if (!/[a-z]/.test(password)) {
		errors.push('Password must contain at least one lowercase letter');
	}
	
	if (!/\d/.test(password)) {
		errors.push('Password must contain at least one number');
	}
	
	if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
		errors.push('Password must contain at least one special character');
	}
	
	return {
		isValid: errors.length === 0,
		errors
	};
}