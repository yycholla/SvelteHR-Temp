// src/services/AuthService.ts
import type { Result } from '$domain/Result';
import { Result as ResultClass } from '$domain/Result';
import type {
	AuthTokenRepository,
	TokenPairData,
	TokenValidationContext
} from './ports/AuthTokenRepository';
import type { AccessToken } from '$domain/Auth/value-objects/AccessToken';
import type { TokenError } from '$domain/Auth/errors/TokenErrors';
import { InvalidTokenError, ExpiredTokenError } from '$domain/Auth/errors/TokenErrors';

interface LoginOptions {
	deviceInfo?: string;
	ipAddress?: string;
}

/**
 * AuthService orchestrates token lifecycle operations.
 *
 * Depends on AuthTokenRepository port (injected via constructor).
 * Contains business logic for validation before delegating to repository.
 *
 * Domain rules enforced:
 * - Email and password must be non-empty for login
 * - Expired tokens are rejected during validation
 */
export class AuthService {
	constructor(private readonly tokenRepository: AuthTokenRepository) {}

	async login(
		email: string,
		password: string,
		options?: LoginOptions
	): Promise<Result<TokenPairData, TokenError>> {
		if (!email || email.trim().length === 0) {
			return ResultClass.error(new InvalidTokenError('Email is required'));
		}

		if (!password || password.length === 0) {
			return ResultClass.error(new InvalidTokenError('Password is required'));
		}

		return this.tokenRepository.generateTokenPair(email, password, {
			deviceInfo: options?.deviceInfo,
			ipAddress: options?.ipAddress
		});
	}

	async refreshAccessToken(): Promise<Result<TokenPairData, TokenError>> {
		return this.tokenRepository.refreshAccessToken();
	}

	async logout(userId: string): Promise<Result<void, TokenError>> {
		return this.tokenRepository.revokeAllUserTokens(userId);
	}

	async revokeTokenFamily(familyId: string, reason: string): Promise<Result<void, TokenError>> {
		return this.tokenRepository.revokeTokenFamily(familyId, reason);
	}

	async validateAccessToken(
		token: string,
		context: TokenValidationContext
	): Promise<Result<AccessToken, TokenError>> {
		const result = await this.tokenRepository.validateAccessToken(token, context);

		if (result.isOk) {
			if (result.value.isExpired()) {
				return ResultClass.error(new ExpiredTokenError('Access token has expired'));
			}
		}

		return result;
	}

	async areUserTokensRevoked(userId: string): Promise<Result<boolean, TokenError>> {
		return this.tokenRepository.areUserTokensRevoked(userId);
	}
}
