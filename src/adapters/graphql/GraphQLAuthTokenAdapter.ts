// src/adapters/graphql/GraphQLAuthTokenAdapter.ts
import type {
	AuthTokenRepository,
	AuthTokenUser,
	TokenPairData,
	TokenValidationContext
} from '$services/ports/AuthTokenRepository';
import type { GraphQLPort } from '$services/ports/GraphQLPort';
import { Result } from '$domain/Result';
import { AccessToken } from '$domain/Auth/value-objects/AccessToken';
import { TokenError, InvalidTokenError } from '$domain/Auth/errors/TokenErrors';
import { logger } from '$lib/utils/logger';

// ============================================================================
// GraphQL Response Types
// ============================================================================

interface GraphQLAuthUser {
	id: string;
	email: string;
	displayName: string;
	roles: string[];
	permissions: string[];
	isActive: boolean;
	forcePasswordChange: boolean;
}

interface GraphQLTokens {
	accessToken: string;
	tokenType: string;
	expiresIn: number;
}

interface GraphQLAuthSuccess {
	__typename: 'AuthSuccess';
	user: GraphQLAuthUser;
	tokens: GraphQLTokens;
}

interface GraphQLAuthError {
	__typename: 'AuthError';
	code: string;
	message: string;
}

type GraphQLAuthResult = GraphQLAuthSuccess | GraphQLAuthError;

interface LoginResponse {
	login: GraphQLAuthResult | null;
}

interface RefreshResponse {
	refreshToken: GraphQLAuthResult | null;
}

interface LogoutResponse {
	logout: {
		success: boolean;
		message: string;
	} | null;
}

// ============================================================================
// GraphQL Mutations
// ============================================================================

const LOGIN_MUTATION = `
	mutation Login($email: String!, $password: String!, $deviceInfo: String, $ipAddress: String) {
		login(input: { email: $email, password: $password, deviceInfo: $deviceInfo, ipAddress: $ipAddress }) {
			... on AuthSuccess {
				user {
					id
					email
					displayName
					roles
					permissions
					isActive
					forcePasswordChange
				}
				tokens {
					accessToken
					tokenType
					expiresIn
				}
			}
			... on AuthError {
				code
				message
			}
		}
	}
`;

const REFRESH_TOKEN_MUTATION = `
	mutation RefreshToken {
		refreshToken {
			... on AuthSuccess {
				user {
					id
					email
					displayName
					roles
					permissions
					isActive
					forcePasswordChange
				}
				tokens {
					accessToken
					tokenType
					expiresIn
				}
			}
			... on AuthError {
				code
				message
			}
		}
	}
`;

const LOGOUT_MUTATION = `
	mutation Logout {
		logout {
			success
			message
		}
	}
`;

// ============================================================================
// Adapter Implementation
// ============================================================================

/**
 * GraphQL adapter implementing AuthTokenRepository port
 *
 * Translates between GraphQL auth mutations and domain entities.
 * Handles error boundary conversion from GraphQL errors to domain TokenErrors.
 *
 * SECURITY: Does NOT log passwords or token values.
 */
export class GraphQLAuthTokenAdapter implements AuthTokenRepository {
	constructor(private readonly graphql: GraphQLPort) {}

	async generateTokenPair(
		email: string,
		password: string,
		options: { deviceInfo?: string; ipAddress?: string }
	): Promise<Result<TokenPairData, TokenError>> {
		try {
			const data = await this.graphql.mutation<LoginResponse>(LOGIN_MUTATION, {
				email,
				password,
				deviceInfo: options.deviceInfo ?? null,
				ipAddress: options.ipAddress ?? null
			});

			const loginResult = data.login;

			if (!loginResult) {
				return Result.error(new InvalidTokenError('Login returned no response'));
			}

			if (loginResult.__typename === 'AuthError') {
				return Result.error(new InvalidTokenError(loginResult.message));
			}

			const { user, tokens } = loginResult;

			// Create AccessToken domain entity at the boundary
			const accessTokenResult = AccessToken.create({
				token: tokens.accessToken,
				userId: user.id,
				expiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
				permissions: user.permissions,
				roles: user.roles
			});

			if (accessTokenResult.isError) {
				return Result.error(accessTokenResult.error);
			}

			// Map user data to AuthUser
			const authUser: AuthTokenUser = {
				id: user.id,
				email: user.email,
				displayName: user.displayName,
				roles: user.roles,
				permissions: user.permissions,
				isActive: user.isActive,
				forcePasswordChange: user.forcePasswordChange
			};

			return Result.ok({
				accessToken: accessTokenResult.value,
				user: authUser
			});
		} catch (error) {
			logger.error(
				'[GraphQLAuthTokenAdapter] generateTokenPair failed',
				error instanceof Error ? error : undefined
			);
			return Result.error(
				new TokenError(error instanceof Error ? error.message : 'Unknown error during login')
			);
		}
	}

	async refreshAccessToken(): Promise<Result<TokenPairData, TokenError>> {
		try {
			const data = await this.graphql.mutation<RefreshResponse>(REFRESH_TOKEN_MUTATION, {});

			const refreshResult = data.refreshToken;

			if (!refreshResult) {
				return Result.error(new InvalidTokenError('Refresh returned no response'));
			}

			if (refreshResult.__typename === 'AuthError') {
				return Result.error(new InvalidTokenError(refreshResult.message));
			}

			const { user, tokens } = refreshResult;

			const accessTokenResult = AccessToken.create({
				token: tokens.accessToken,
				userId: user.id,
				expiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
				permissions: user.permissions,
				roles: user.roles
			});

			if (accessTokenResult.isError) {
				return Result.error(accessTokenResult.error);
			}

			const authUser: AuthTokenUser = {
				id: user.id,
				email: user.email,
				displayName: user.displayName,
				roles: user.roles,
				permissions: user.permissions,
				isActive: user.isActive,
				forcePasswordChange: user.forcePasswordChange
			};

			return Result.ok({
				accessToken: accessTokenResult.value,
				user: authUser
			});
		} catch (error) {
			logger.error(
				'[GraphQLAuthTokenAdapter] refreshAccessToken failed',
				error instanceof Error ? error : undefined
			);
			return Result.error(
				new TokenError(
					error instanceof Error ? error.message : 'Unknown error during token refresh'
				)
			);
		}
	}

	async revokeAllUserTokens(_userId: string): Promise<Result<void, TokenError>> {
		try {
			await this.graphql.mutation<LogoutResponse>(LOGOUT_MUTATION, {});
			return Result.ok(undefined);
		} catch (error) {
			logger.error(
				'[GraphQLAuthTokenAdapter] revokeAllUserTokens failed',
				error instanceof Error ? error : undefined
			);
			return Result.error(
				new TokenError(error instanceof Error ? error.message : 'Unknown error during logout')
			);
		}
	}

	async revokeTokenFamily(_familyId: string, _reason: string): Promise<Result<void, TokenError>> {
		// Token family revocation is handled server-side via refresh token rotation.
		// No explicit client-side mutation needed currently.
		return Result.ok(undefined);
	}

	async validateAccessToken(
		token: string,
		context: TokenValidationContext
	): Promise<Result<AccessToken, TokenError>> {
		// Token validation happens on the backend via JWT middleware.
		// This method creates a domain AccessToken from known-valid token data
		// (after the backend has already validated the token).
		const accessTokenResult = AccessToken.create({
			token,
			userId: context.userId,
			expiresAt: context.expiresAt,
			permissions: context.permissions,
			roles: context.roles
		});

		if (accessTokenResult.isError) {
			return Result.error(accessTokenResult.error);
		}

		return Result.ok(accessTokenResult.value);
	}

	async areUserTokensRevoked(_userId: string): Promise<Result<boolean, TokenError>> {
		// Token revocation is checked server-side during JWT validation.
		// The backend checks users.tokens_valid_after against token issued_at.
		return Result.ok(false);
	}
}
