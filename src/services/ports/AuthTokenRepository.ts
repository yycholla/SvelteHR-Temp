import type { Result } from '$domain/Result';
import type { AccessToken } from '$domain/Auth/value-objects/AccessToken';
import type { TokenError } from '$domain/Auth/errors/TokenErrors';

/**
 * User data returned from authentication operations.
 * Defined in the port to avoid coupling with frontend store types.
 */
export interface AuthTokenUser {
	id: string;
	email: string;
	displayName: string;
	roles: string[];
	permissions: string[];
	isActive: boolean;
	forcePasswordChange: boolean;
}

export interface TokenPairData {
	accessToken: AccessToken;
	user: AuthTokenUser;
}

export interface TokenValidationContext {
	userId: string;
	expiresAt: Date;
	permissions: string[];
	roles: string[];
}

export interface AuthTokenRepository {
	/**
	 * Generate new token pair by authenticating with credentials
	 */
	generateTokenPair(
		email: string,
		password: string,
		options?: { deviceInfo?: string; ipAddress?: string }
	): Promise<Result<TokenPairData, TokenError>>;

	/**
	 * Refresh access token using HTTP-only cookie refresh token
	 * (refresh token is sent automatically via cookies)
	 */
	refreshAccessToken(): Promise<Result<TokenPairData, TokenError>>;

	/**
	 * Revoke all tokens for a user (logout)
	 */
	revokeAllUserTokens(userId: string): Promise<Result<void, TokenError>>;

	/**
	 * Revoke specific token family (for replay attack detection)
	 */
	revokeTokenFamily(familyId: string, reason: string): Promise<Result<void, TokenError>>;

	/**
	 * Create a validated AccessToken domain entity from token data
	 */
	validateAccessToken(
		token: string,
		context: TokenValidationContext
	): Promise<Result<AccessToken, TokenError>>;

	/**
	 * Check if user's tokens are revoked (server-side check)
	 */
	areUserTokensRevoked(userId: string): Promise<Result<boolean, TokenError>>;
}
