import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthTokenService } from './AuthTokenService';
import type {
	AuthTokenRepository,
	AuthTokenUser,
	TokenPairData,
	TokenValidationContext
} from './ports/AuthTokenRepository';
import { AccessToken } from '$domain/Auth/value-objects/AccessToken';
import { Result } from '$domain/Result';
import { InvalidTokenError, ExpiredTokenError, TokenError } from '$domain/Auth/errors/TokenErrors';

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000';
const VALID_TOKEN = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature';

function futureDate(minutes: number): Date {
	return new Date(Date.now() + minutes * 60 * 1000);
}

function pastDate(minutes: number): Date {
	return new Date(Date.now() - minutes * 60 * 1000);
}

function createMockUser(overrides?: Partial<AuthTokenUser>): AuthTokenUser {
	return {
		id: VALID_UUID,
		email: 'test@example.com',
		displayName: 'Test User',
		roles: ['employee'],
		permissions: ['employees:read'],
		isActive: true,
		forcePasswordChange: false,
		...overrides
	};
}

function createMockTokenPair(overrides?: {
	tokenStr?: string;
	userId?: string;
	expiresAt?: Date;
	permissions?: string[];
	roles?: string[];
	user?: Partial<AuthTokenUser>;
}): TokenPairData {
	const accessTokenResult = AccessToken.create({
		token: overrides?.tokenStr ?? VALID_TOKEN,
		userId: overrides?.userId ?? VALID_UUID,
		expiresAt: overrides?.expiresAt ?? futureDate(15),
		permissions: overrides?.permissions ?? ['employees:read'],
		roles: overrides?.roles ?? ['employee']
	});

	if (accessTokenResult.isError) {
		throw new Error(`Failed to create mock AccessToken: ${accessTokenResult.error.message}`);
	}

	return {
		accessToken: accessTokenResult.value,
		user: createMockUser(overrides?.user)
	};
}

function createMockRepository(): AuthTokenRepository {
	return {
		generateTokenPair: vi.fn(),
		refreshAccessToken: vi.fn(),
		revokeAllUserTokens: vi.fn(),
		revokeTokenFamily: vi.fn(),
		validateAccessToken: vi.fn(),
		areUserTokensRevoked: vi.fn()
	};
}

describe('AuthTokenService', () => {
	let mockRepository: AuthTokenRepository;
	let service: AuthTokenService;

	beforeEach(() => {
		mockRepository = createMockRepository();
		service = new AuthTokenService(mockRepository);
	});

	describe('login', () => {
		it('should delegate to repository generateTokenPair', async () => {
			const tokenPair = createMockTokenPair();
			vi.mocked(mockRepository.generateTokenPair).mockResolvedValue(Result.ok(tokenPair));

			const result = await service.login('test@example.com', 'password123');

			expect(result.isOk).toBe(true);
			expect(result.value.accessToken.userId).toBe(VALID_UUID);
			expect(result.value.user.email).toBe('test@example.com');
			expect(mockRepository.generateTokenPair).toHaveBeenCalledWith(
				'test@example.com',
				'password123',
				undefined
			);
		});

		it('should pass through options to repository', async () => {
			const tokenPair = createMockTokenPair();
			vi.mocked(mockRepository.generateTokenPair).mockResolvedValue(Result.ok(tokenPair));

			await service.login('test@example.com', 'password123', {
				deviceInfo: 'Chrome',
				ipAddress: '192.168.1.1'
			});

			expect(mockRepository.generateTokenPair).toHaveBeenCalledWith(
				'test@example.com',
				'password123',
				{ deviceInfo: 'Chrome', ipAddress: '192.168.1.1' }
			);
		});

		it('should return error when email is empty', async () => {
			const result = await service.login('', 'password123');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidTokenError);
			expect(result.error.message).toContain('Email');
			expect(mockRepository.generateTokenPair).not.toHaveBeenCalled();
		});

		it('should return error when password is empty', async () => {
			const result = await service.login('test@example.com', '');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidTokenError);
			expect(result.error.message).toContain('Password');
			expect(mockRepository.generateTokenPair).not.toHaveBeenCalled();
		});

		it('should propagate repository errors', async () => {
			vi.mocked(mockRepository.generateTokenPair).mockResolvedValue(
				Result.error(new InvalidTokenError('Invalid credentials'))
			);

			const result = await service.login('test@example.com', 'wrong-password');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidTokenError);
		});
	});

	describe('refreshAccessToken', () => {
		it('should delegate to repository refreshAccessToken', async () => {
			const tokenPair = createMockTokenPair();
			vi.mocked(mockRepository.refreshAccessToken).mockResolvedValue(Result.ok(tokenPair));

			const result = await service.refreshAccessToken();

			expect(result.isOk).toBe(true);
			expect(result.value.accessToken.userId).toBe(VALID_UUID);
			expect(mockRepository.refreshAccessToken).toHaveBeenCalled();
		});

		it('should propagate repository errors', async () => {
			vi.mocked(mockRepository.refreshAccessToken).mockResolvedValue(
				Result.error(new ExpiredTokenError('Refresh token expired'))
			);

			const result = await service.refreshAccessToken();

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(ExpiredTokenError);
		});
	});

	describe('logout', () => {
		it('should revoke all user tokens', async () => {
			vi.mocked(mockRepository.revokeAllUserTokens).mockResolvedValue(Result.ok(undefined));

			const result = await service.logout(VALID_UUID);

			expect(result.isOk).toBe(true);
			expect(mockRepository.revokeAllUserTokens).toHaveBeenCalledWith(VALID_UUID);
		});

		it('should return error when userId is empty', async () => {
			const result = await service.logout('');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidTokenError);
			expect(mockRepository.revokeAllUserTokens).not.toHaveBeenCalled();
		});

		it('should propagate repository errors', async () => {
			vi.mocked(mockRepository.revokeAllUserTokens).mockResolvedValue(
				Result.error(new TokenError('Logout failed'))
			);

			const result = await service.logout(VALID_UUID);

			expect(result.isError).toBe(true);
		});
	});

	describe('revokeTokenFamily', () => {
		it('should revoke a token family with reason', async () => {
			vi.mocked(mockRepository.revokeTokenFamily).mockResolvedValue(Result.ok(undefined));

			const result = await service.revokeTokenFamily('family-123', 'replay attack detected');

			expect(result.isOk).toBe(true);
			expect(mockRepository.revokeTokenFamily).toHaveBeenCalledWith(
				'family-123',
				'replay attack detected'
			);
		});

		it('should return error when familyId is empty', async () => {
			const result = await service.revokeTokenFamily('', 'some reason');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidTokenError);
			expect(mockRepository.revokeTokenFamily).not.toHaveBeenCalled();
		});
	});

	describe('validateAccessToken', () => {
		it('should validate a non-expired token', async () => {
			const context: TokenValidationContext = {
				userId: VALID_UUID,
				expiresAt: futureDate(15),
				permissions: ['employees:read'],
				roles: ['employee']
			};

			const accessTokenResult = AccessToken.create({
				token: VALID_TOKEN,
				userId: VALID_UUID,
				expiresAt: futureDate(15),
				permissions: ['employees:read'],
				roles: ['employee']
			});

			vi.mocked(mockRepository.validateAccessToken).mockResolvedValue(
				Result.ok(accessTokenResult.value)
			);

			const result = await service.validateAccessToken(VALID_TOKEN, context);

			expect(result.isOk).toBe(true);
			expect(result.value.userId).toBe(VALID_UUID);
		});

		it('should return error for expired token', async () => {
			const context: TokenValidationContext = {
				userId: VALID_UUID,
				expiresAt: pastDate(5),
				permissions: [],
				roles: []
			};

			const accessTokenResult = AccessToken.create({
				token: VALID_TOKEN,
				userId: VALID_UUID,
				expiresAt: pastDate(5)
			});

			vi.mocked(mockRepository.validateAccessToken).mockResolvedValue(
				Result.ok(accessTokenResult.value)
			);

			const result = await service.validateAccessToken(VALID_TOKEN, context);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(ExpiredTokenError);
		});

		it('should return error when token is empty', async () => {
			const context: TokenValidationContext = {
				userId: VALID_UUID,
				expiresAt: futureDate(15),
				permissions: [],
				roles: []
			};

			const result = await service.validateAccessToken('', context);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidTokenError);
			expect(mockRepository.validateAccessToken).not.toHaveBeenCalled();
		});

		it('should propagate repository validation errors', async () => {
			const context: TokenValidationContext = {
				userId: VALID_UUID,
				expiresAt: futureDate(15),
				permissions: [],
				roles: []
			};

			vi.mocked(mockRepository.validateAccessToken).mockResolvedValue(
				Result.error(new InvalidTokenError('Token validation failed'))
			);

			const result = await service.validateAccessToken(VALID_TOKEN, context);

			expect(result.isError).toBe(true);
		});
	});

	describe('areUserTokensRevoked', () => {
		it('should check if user tokens are revoked', async () => {
			vi.mocked(mockRepository.areUserTokensRevoked).mockResolvedValue(Result.ok(false));

			const result = await service.areUserTokensRevoked(VALID_UUID);

			expect(result.isOk).toBe(true);
			expect(result.value).toBe(false);
			expect(mockRepository.areUserTokensRevoked).toHaveBeenCalledWith(VALID_UUID);
		});

		it('should return true when tokens are revoked', async () => {
			vi.mocked(mockRepository.areUserTokensRevoked).mockResolvedValue(Result.ok(true));

			const result = await service.areUserTokensRevoked(VALID_UUID);

			expect(result.isOk).toBe(true);
			expect(result.value).toBe(true);
		});

		it('should return error when userId is empty', async () => {
			const result = await service.areUserTokensRevoked('');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidTokenError);
			expect(mockRepository.areUserTokensRevoked).not.toHaveBeenCalled();
		});
	});
});
