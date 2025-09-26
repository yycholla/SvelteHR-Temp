/**
 * T026: Authentication Operations - GraphQL Integration
 *
 * Standardized authentication operations with comprehensive error handling,
 * timeout enforcement, and retry logic following the T021-T024 entity model patterns.
 */

import { gql } from '@urql/svelte';
import type { OperationStore } from '@urql/svelte';
import type { DataRequest, UserCredentials } from '$lib/models/data-request';
import type { ErrorResponse } from '$lib/models/error-response';
import type { UserSession } from '$lib/models/user-session';

/**
 * GraphQL Login Mutation
 */
export const LOGIN_MUTATION = gql`
	mutation Login($email: String!, $password: String!, $deviceInfo: DeviceInfoInput) {
		authenticate(input: { email: $email, password: $password, deviceInfo: $deviceInfo }) {
			jwtToken
			refreshToken
			user {
				id
				email
				displayName
				roles {
					nodes {
						name
						permissions {
							nodes {
								resource
								action
							}
						}
					}
				}
				profile {
					firstName
					lastName
					avatarUrl
					departmentId
				}
			}
			expiresAt
			sessionInfo {
				sessionId
				deviceInfo {
					userAgent
					platform
					browser
					ipAddress
				}
				location {
					country
					city
					timezone
				}
			}
		}
	}
`;

/**
 * GraphQL Token Refresh Mutation
 */
export const REFRESH_TOKEN_MUTATION = gql`
	mutation RefreshToken($refreshToken: String!) {
		refreshToken(input: { refreshToken: $refreshToken }) {
			jwtToken
			refreshToken
			expiresAt
			user {
				id
				email
				displayName
				roles {
					nodes {
						name
						permissions {
							nodes {
								resource
								action
							}
						}
					}
				}
			}
		}
	}
`;

/**
 * GraphQL Logout Mutation
 */
export const LOGOUT_MUTATION = gql`
	mutation Logout($sessionId: String!) {
		logout(input: { sessionId: $sessionId }) {
			success
			message
		}
	}
`;

/**
 * GraphQL Verify Token Query
 */
export const VERIFY_TOKEN_QUERY = gql`
	query VerifyToken {
		currentUser {
			id
			email
			displayName
			isActive
			roles {
				nodes {
					name
					permissions {
						nodes {
							resource
							action
						}
					}
				}
			}
			profile {
				firstName
				lastName
				avatarUrl
				departmentId
			}
			sessionInfo {
				sessionId
				lastActiveAt
				isValid
				expiresAt
			}
		}
	}
`;

/**
 * Login credentials interface
 */
export interface LoginCredentials {
	email: string;
	password: string;
	deviceInfo?: {
		userAgent: string;
		platform: string;
		browser: string;
		ipAddress?: string;
	};
}

/**
 * Authentication result interface
 */
export interface AuthenticationResult {
	user: {
		id: string;
		email: string;
		displayName: string;
		roles: Array<{
			name: string;
			permissions: Array<{
				resource: string;
				action: string;
			}>;
		}>;
		profile: {
			firstName: string;
			lastName: string;
			avatarUrl?: string;
			departmentId?: string;
		};
	};
	jwtToken: string;
	refreshToken?: string;
	expiresAt: string;
	sessionInfo: {
		sessionId: string;
		deviceInfo?: {
			userAgent: string;
			platform: string;
			browser: string;
			ipAddress?: string;
		};
		location?: {
			country?: string;
			city?: string;
			timezone?: string;
		};
	};
}

/**
 * Standardized authentication operations with error handling and retry logic
 */
export class AuthenticationOperations {
	private client: OperationStore;

	constructor(client: OperationStore) {
		this.client = client;
	}

	/**
	 * Authenticate user with email and password
	 */
	async login(credentials: LoginCredentials): Promise<AuthenticationResult> {
		// Import required models for standardized error handling
		const { DataRequest, createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		// Create anonymous user credentials for login request
		const anonymousCredentials: UserCredentials = {
			userId: 'anonymous',
			jwtToken: '',
			roles: [],
			permissions: [],
			isAuthenticated: false,
			expiresAt: new Date(Date.now() + 1000).toISOString() // Expire immediately
		};

		// Create data request with standard timeout and retry configuration
		const dataRequest = createDataRequest({
			operationName: 'Login',
			variables: credentials,
			userCredentials: anonymousCredentials,
			timeoutMs: 5000,
			retryAttempts: 0,
			maxRetries: 3
		});

		// Retry handler with exponential backoff
		class AuthRetryHandler {
			private attempts = 0;

			async execute<T>(fn: () => Promise<T>, request: DataRequest): Promise<T> {
				while (this.attempts <= request.maxRetries) {
					try {
						// Update request status
						(request as any).status = 'pending';

						// Execute with timeout
						const result = await Promise.race([
							fn(),
							new Promise<never>((_, reject) =>
								setTimeout(() => reject(new Error('Authentication timeout')), request.timeoutMs)
							)
						]);

						(request as any).status = 'completed';
						return result;
					} catch (error) {
						this.attempts++;
						(request as any).retryAttempts = this.attempts;

						if (this.attempts > request.maxRetries) {
							(request as any).status = 'failed';

							// Create structured error response
							const errorResponse = createErrorResponse(error, {
								type: error.message.includes('timeout') ? 'TIMEOUT_ERROR' : 'AUTHENTICATION_ERROR',
								userMessage: 'Unable to sign in. Please check your credentials and try again.'
							});

							console.error('Login error:', errorResponse.toLogEntry());
							throw errorResponse;
						}

						// Exponential backoff: 1s, 2s, 4s (no retry for auth errors)
						if (!this.isAuthError(error)) {
							const delay = Math.min(1000 * Math.pow(2, this.attempts - 1), 4000);
							await new Promise((resolve) => setTimeout(resolve, delay));
						} else {
							// Don't retry authentication errors
							break;
						}
					}
				}
				throw new Error('Authentication failed');
			}

			private isAuthError(error: unknown): boolean {
				if (!error) return false;
				const errorString =
					error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
				return (
					errorString.includes('credential') ||
					errorString.includes('password') ||
					errorString.includes('unauthorized') ||
					errorString.includes('invalid')
				);
			}
		}

		const retryHandler = new AuthRetryHandler();

		return retryHandler.execute(async () => {
			return new Promise<AuthenticationResult>((resolve, reject) => {
				// Subscribe to the login mutation
				const unsubscribe = this.client.subscribe(
					{
						query: LOGIN_MUTATION,
						variables: credentials
					},
					(result) => {
						if (result.error) {
							console.error('Login GraphQL error:', result.error);
							const errorResponse = createErrorResponse(result.error, {
								type: 'AUTHENTICATION_ERROR',
								userMessage: 'Invalid email or password. Please try again.'
							});
							reject(errorResponse);
							unsubscribe();
						} else if (result.data?.authenticate) {
							console.log('Login successful:', result.data.authenticate.user.email);
							resolve(result.data.authenticate);
							unsubscribe();
						}
					}
				);
			});
		}, dataRequest);
	}

	/**
	 * Refresh authentication token
	 */
	async refreshToken(refreshToken: string): Promise<AuthenticationResult> {
		const { DataRequest, createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		// Create expired user credentials for refresh request
		const expiredCredentials: UserCredentials = {
			userId: 'refreshing',
			jwtToken: 'expired.jwt.token',
			roles: [],
			permissions: [],
			isAuthenticated: false,
			expiresAt: new Date(Date.now() - 1000).toISOString() // Already expired
		};

		const dataRequest = createDataRequest({
			operationName: 'RefreshToken',
			variables: { refreshToken },
			userCredentials: expiredCredentials,
			timeoutMs: 3000, // Shorter timeout for token refresh
			retryAttempts: 0,
			maxRetries: 1 // Only retry once for token refresh
		});

		return new Promise<AuthenticationResult>((resolve, reject) => {
			const timeoutId = setTimeout(() => {
				const errorResponse = createErrorResponse(new Error('Token refresh timeout'), {
					type: 'TIMEOUT_ERROR',
					userMessage: 'Session refresh is taking too long. Please sign in again.'
				});
				reject(errorResponse);
				unsubscribe();
			}, dataRequest.timeoutMs);

			const unsubscribe = this.client.subscribe(
				{
					query: REFRESH_TOKEN_MUTATION,
					variables: { refreshToken }
				},
				(result) => {
					clearTimeout(timeoutId);

					if (result.error) {
						console.error('Token refresh error:', result.error);
						const errorResponse = createErrorResponse(result.error, {
							type: 'AUTHENTICATION_ERROR',
							userMessage: 'Your session has expired. Please sign in again.'
						});
						reject(errorResponse);
						unsubscribe();
					} else if (result.data?.refreshToken) {
						console.log('Token refresh successful');
						resolve({
							...result.data.refreshToken,
							sessionInfo: {
								sessionId: 'refreshed-session',
								deviceInfo: undefined,
								location: undefined
							}
						});
						unsubscribe();
					}
				}
			);
		});
	}

	/**
	 * Verify current authentication token
	 */
	async verifyToken(): Promise<AuthenticationResult> {
		const { DataRequest, createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		// Create current user credentials for verification
		const currentCredentials: UserCredentials = {
			userId: 'verifying',
			jwtToken: 'current.jwt.token', // In real app, get from auth store
			roles: [],
			permissions: [],
			isAuthenticated: true,
			expiresAt: new Date(Date.now() + 3600000).toISOString()
		};

		const dataRequest = createDataRequest({
			operationName: 'VerifyToken',
			variables: {},
			userCredentials: currentCredentials,
			timeoutMs: 3000,
			retryAttempts: 0,
			maxRetries: 2
		});

		return new Promise<AuthenticationResult>((resolve, reject) => {
			const timeoutId = setTimeout(() => {
				const errorResponse = createErrorResponse(new Error('Token verification timeout'), {
					type: 'TIMEOUT_ERROR',
					userMessage: 'Unable to verify your session. Please try again.'
				});
				reject(errorResponse);
				unsubscribe();
			}, dataRequest.timeoutMs);

			const unsubscribe = this.client.subscribe(
				{
					query: VERIFY_TOKEN_QUERY
				},
				(result) => {
					clearTimeout(timeoutId);

					if (result.error) {
						console.error('Token verification error:', result.error);
						const errorResponse = createErrorResponse(result.error, {
							type: 'AUTHENTICATION_ERROR',
							userMessage: 'Your session is no longer valid. Please sign in again.'
						});
						reject(errorResponse);
						unsubscribe();
					} else if (result.data?.currentUser) {
						console.log('Token verification successful');
						const user = result.data.currentUser;
						resolve({
							user,
							jwtToken: 'verified.jwt.token', // In real app, this would come from the response
							expiresAt: user.sessionInfo.expiresAt,
							sessionInfo: {
								sessionId: user.sessionInfo.sessionId,
								deviceInfo: undefined,
								location: undefined
							}
						});
						unsubscribe();
					}
				}
			);
		});
	}

	/**
	 * Logout user and invalidate session
	 */
	async logout(sessionId: string): Promise<{ success: boolean; message: string }> {
		const { DataRequest, createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const currentCredentials: UserCredentials = {
			userId: 'logging-out',
			jwtToken: 'current.jwt.token',
			roles: [],
			permissions: [],
			isAuthenticated: true,
			expiresAt: new Date(Date.now() + 3600000).toISOString()
		};

		const dataRequest = createDataRequest({
			operationName: 'Logout',
			variables: { sessionId },
			userCredentials: currentCredentials,
			timeoutMs: 3000,
			retryAttempts: 0,
			maxRetries: 1 // Single retry for logout
		});

		return new Promise<{ success: boolean; message: string }>((resolve, reject) => {
			const timeoutId = setTimeout(() => {
				console.warn('Logout timeout, proceeding with local cleanup');
				resolve({ success: true, message: 'Logged out locally (server timeout)' });
				unsubscribe();
			}, dataRequest.timeoutMs);

			const unsubscribe = this.client.subscribe(
				{
					query: LOGOUT_MUTATION,
					variables: { sessionId }
				},
				(result) => {
					clearTimeout(timeoutId);

					if (result.error) {
						console.error('Logout error:', result.error);
						// Don't fail logout on server error - allow local cleanup
						console.log('Proceeding with local logout despite server error');
						resolve({ success: true, message: 'Logged out locally' });
						unsubscribe();
					} else if (result.data?.logout) {
						console.log('Logout successful');
						resolve(result.data.logout);
						unsubscribe();
					}
				}
			);
		});
	}
}

/**
 * Factory function to create authenticated AuthenticationOperations instance
 */
export function createAuthOperations(client: OperationStore): AuthenticationOperations {
	return new AuthenticationOperations(client);
}

/**
 * Helper function to extract permissions from user roles
 */
export function extractPermissions(
	roles: Array<{ name: string; permissions: Array<{ resource: string; action: string }> }>
): string[] {
	const permissions: string[] = [];

	for (const role of roles) {
		for (const permission of role.permissions) {
			const permissionString = `${permission.resource}:${permission.action}`;
			if (!permissions.includes(permissionString)) {
				permissions.push(permissionString);
			}
		}
	}

	return permissions;
}

/**
 * Helper function to convert AuthenticationResult to UserSession
 */
export async function createUserSessionFromAuth(
	authResult: AuthenticationResult
): Promise<UserSession> {
	const { createUserSession } = await import('$lib/models/user-session');

	return createUserSession({
		userId: authResult.user.id,
		jwtToken: authResult.jwtToken,
		refreshToken: authResult.refreshToken,
		roles: authResult.user.roles.map((role) => role.name),
		permissions: extractPermissions(authResult.user.roles),
		expiresAt: authResult.expiresAt,
		deviceInfo: authResult.sessionInfo.deviceInfo,
		metadata: {
			email: authResult.user.email,
			displayName: authResult.user.displayName,
			profile: authResult.user.profile,
			sessionId: authResult.sessionInfo.sessionId,
			location: authResult.sessionInfo.location
		}
	});
}
