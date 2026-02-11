import type { Result } from '$domain/Result';
import { Result as ResultClass } from '$domain/Result';
import type {
	AuthTokenRepository,
	TokenPairData,
	TokenValidationContext
} from './ports/AuthTokenRepository';
import type { AccessToken } from '$domain/Auth/value-objects/AccessToken';
import { TokenError, InvalidTokenError, ExpiredTokenError } from '$domain/Auth/errors/TokenErrors';

/**
 * AuthTokenService - JWT token lifecycle orchestration
 *
 * Manages authentication operations using domain entities and the
 * AuthTokenRepository port. Validates inputs at the service boundary
 * before delegating to the repository.
 *
 * This service adds business logic on top of repository operations:
 * - Input validation (email, password, userId)
 * - Expired token detection after repository validation
 * - Clean error propagation using Result<T, E>
 */
export class AuthTokenService {
	constructor(private readonly tokenRepository: AuthTokenRepository) {}

	/**
	 * Authenticate user with email and password.
	 * Validates inputs before delegating to repository.
	 */
	async login(
		email: string,
		password: string,
		options?: { deviceInfo?: string; ipAddress?: string }
	): Promise<Result<TokenPairData, TokenError>> {
		if (!email || email.trim().length === 0) {
			return ResultClass.error(new InvalidTokenError('Email cannot be empty'));
		}

		if (!password || password.length === 0) {
			return ResultClass.error(new InvalidTokenError('Password cannot be empty'));
		}

		return this.tokenRepository.generateTokenPair(email, password, options);
	}

	/**
	 * Refresh access token using HTTP-only cookie refresh token.
	 * The refresh token is sent automatically via cookies.
	 */
	async refreshAccessToken(): Promise<Result<TokenPairData, TokenError>> {
		return this.tokenRepository.refreshAccessToken();
	}

	/**
	 * Logout user by revoking all their tokens.
	 */
	async logout(userId: string): Promise<Result<void, TokenError>> {
		if (!userId || userId.trim().length === 0) {
			return ResultClass.error(new InvalidTokenError('User ID cannot be empty'));
		}

		return this.tokenRepository.revokeAllUserTokens(userId);
	}

	/**
	 * Revoke a specific token family (e.g., on replay attack detection).
	 */
	async revokeTokenFamily(familyId: string, reason: string): Promise<Result<void, TokenError>> {
		if (!familyId || familyId.trim().length === 0) {
			return ResultClass.error(new InvalidTokenError('Family ID cannot be empty'));
		}

		return this.tokenRepository.revokeTokenFamily(familyId, reason);
	}

	/**
	 * Validate an access token and check for expiry.
	 * Returns error if token is expired (additional service-level check).
	 */
	async validateAccessToken(
		token: string,
		context: TokenValidationContext
	): Promise<Result<AccessToken, TokenError>> {
		if (!token || token.trim().length === 0) {
			return ResultClass.error(new InvalidTokenError('Token cannot be empty'));
		}

		const result = await this.tokenRepository.validateAccessToken(token, context);

		if (result.isOk && result.value.isExpired()) {
			return ResultClass.error(new ExpiredTokenError('Access token has expired'));
		}

		return result;
	}

	/**
	 * Check if a user's tokens have been revoked.
	 */
	async areUserTokensRevoked(userId: string): Promise<Result<boolean, TokenError>> {
		if (!userId || userId.trim().length === 0) {
			return ResultClass.error(new InvalidTokenError('User ID cannot be empty'));
		}

		return this.tokenRepository.areUserTokensRevoked(userId);
	}
}
