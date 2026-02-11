import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from './AuthService';
import type { AuthTokenRepository, TokenPairData } from './ports/AuthTokenRepository';
import { AccessToken } from '$domain/Auth/value-objects/AccessToken';
import { Result } from '$domain/Result';
import { InvalidTokenError, TokenError, ExpiredTokenError } from '$domain/Auth/errors/TokenErrors';
import type { AuthUser } from '$lib/stores/jwt-auth.svelte';

describe('AuthService', () => {
	let mockRepository: AuthTokenRepository;
	let authService: AuthService;

	const testUserId = '123e4567-e89b-12d3-a456-426614174000';

	const testUser: AuthUser = {
		id: testUserId,
		email: 'test@example.com',
		displayName: 'Test User',
		roles: ['employee'],
		permissions: ['users:read'],
		isActive: true,
		forcePasswordChange: false
	};

	function createMockTokenPair(): TokenPairData {
		const accessTokenResult = AccessToken.create({
			token: 'eyJhbGciOiJSUzI1NiJ9.test.signature',
			userId: testUserId,
			expiresAt: new Date(Date.now() + 15 * 60 * 1000),
			permissions: ['users:read'],
			roles: ['employee']
		});

		if (accessTokenResult.isError) {
			throw new Error('Failed to create test access token');
		}

		return {
			accessToken: accessTokenResult.value,
			user: testUser
		};
	}

	beforeEach(() => {
		mockRepository = {
			generateTokenPair: vi.fn(),
			refreshAccessToken: vi.fn(),
			revokeAllUserTokens: vi.fn(),
			revokeTokenFamily: vi.fn(),
			validateAccessToken: vi.fn(),
			areUserTokensRevoked: vi.fn()
		};
		authService = new AuthService(mockRepository);
	});

	describe('login', () => {
		it('should generate token pair for valid credentials', async () => {
			const tokenPair = createMockTokenPair();
			vi.mocked(mockRepository.generateTokenPair).mockResolvedValue(Result.ok(tokenPair));

			const result = await authService.login('test@example.com', 'password123');

			expect(result.isOk).toBe(true);
			expect(mockRepository.generateTokenPair).toHaveBeenCalledWith(
				'test@example.com',
				'password123',
				{ deviceInfo: undefined, ipAddress: undefined }
			);

			if (result.isOk) {
				expect(result.value.accessToken.userId).toBe(testUserId);
				expect(result.value.user.email).toBe('test@example.com');
			}
		});

		it('should pass device info and IP address when provided', async () => {
			const tokenPair = createMockTokenPair();
			vi.mocked(mockRepository.generateTokenPair).mockResolvedValue(Result.ok(tokenPair));

			await authService.login('test@example.com', 'password123', {
				deviceInfo: 'Mozilla/5.0',
				ipAddress: '192.168.1.1'
			});

			expect(mockRepository.generateTokenPair).toHaveBeenCalledWith(
				'test@example.com',
				'password123',
				{ deviceInfo: 'Mozilla/5.0', ipAddress: '192.168.1.1' }
			);
		});

		it('should return error when repository fails', async () => {
			vi.mocked(mockRepository.generateTokenPair).mockResolvedValue(
				Result.error(new InvalidTokenError('Invalid credentials'))
			);

			const result = await authService.login('test@example.com', 'wrong-password');

			expect(result.isError).toBe(true);
			if (result.isError) {
				expect(result.error).toBeInstanceOf(InvalidTokenError);
			}
		});

		it('should reject empty email', async () => {
			const result = await authService.login('', 'password123');

			expect(result.isError).toBe(true);
			if (result.isError) {
				expect(result.error.message).toContain('Email');
			}
			expect(mockRepository.generateTokenPair).not.toHaveBeenCalled();
		});

		it('should reject empty password', async () => {
			const result = await authService.login('test@example.com', '');

			expect(result.isError).toBe(true);
			if (result.isError) {
				expect(result.error.message).toContain('Password');
			}
			expect(mockRepository.generateTokenPair).not.toHaveBeenCalled();
		});
	});

	describe('refreshAccessToken', () => {
		it('should refresh token successfully', async () => {
			const tokenPair = createMockTokenPair();
			vi.mocked(mockRepository.refreshAccessToken).mockResolvedValue(Result.ok(tokenPair));

			const result = await authService.refreshAccessToken();

			expect(result.isOk).toBe(true);
			expect(mockRepository.refreshAccessToken).toHaveBeenCalled();

			if (result.isOk) {
				expect(result.value.accessToken.userId).toBe(testUserId);
			}
		});

		it('should return error when refresh fails', async () => {
			vi.mocked(mockRepository.refreshAccessToken).mockResolvedValue(
				Result.error(new InvalidTokenError('Refresh token expired'))
			);

			const result = await authService.refreshAccessToken();

			expect(result.isError).toBe(true);
			if (result.isError) {
				expect(result.error).toBeInstanceOf(InvalidTokenError);
			}
		});
	});

	describe('logout', () => {
		it('should revoke all tokens for user', async () => {
			vi.mocked(mockRepository.revokeAllUserTokens).mockResolvedValue(Result.ok(undefined));

			const result = await authService.logout(testUserId);

			expect(result.isOk).toBe(true);
			expect(mockRepository.revokeAllUserTokens).toHaveBeenCalledWith(testUserId);
		});

		it('should return error when revocation fails', async () => {
			vi.mocked(mockRepository.revokeAllUserTokens).mockResolvedValue(
				Result.error(new TokenError('Network error'))
			);

			const result = await authService.logout(testUserId);

			expect(result.isError).toBe(true);
		});
	});

	describe('revokeTokenFamily', () => {
		it('should revoke token family with reason', async () => {
			vi.mocked(mockRepository.revokeTokenFamily).mockResolvedValue(Result.ok(undefined));

			const result = await authService.revokeTokenFamily('family-123', 'replay attack detected');

			expect(result.isOk).toBe(true);
			expect(mockRepository.revokeTokenFamily).toHaveBeenCalledWith(
				'family-123',
				'replay attack detected'
			);
		});
	});

	describe('validateAccessToken', () => {
		it('should validate token with context', async () => {
			const accessTokenResult = AccessToken.create({
				token: 'valid-token',
				userId: testUserId,
				expiresAt: new Date(Date.now() + 15 * 60 * 1000),
				permissions: ['users:read'],
				roles: ['employee']
			});

			if (accessTokenResult.isError) throw new Error('Test setup failed');

			vi.mocked(mockRepository.validateAccessToken).mockResolvedValue(
				Result.ok(accessTokenResult.value)
			);

			const context = {
				userId: testUserId,
				expiresAt: new Date(Date.now() + 15 * 60 * 1000),
				permissions: ['users:read'],
				roles: ['employee']
			};

			const result = await authService.validateAccessToken('valid-token', context);

			expect(result.isOk).toBe(true);
			expect(mockRepository.validateAccessToken).toHaveBeenCalledWith('valid-token', context);
		});

		it('should return error for expired token', async () => {
			const expiredTokenResult = AccessToken.create({
				token: 'expired-token',
				userId: testUserId,
				expiresAt: new Date(Date.now() - 1000)
			});

			if (expiredTokenResult.isError) throw new Error('Test setup failed');

			vi.mocked(mockRepository.validateAccessToken).mockResolvedValue(
				Result.ok(expiredTokenResult.value)
			);

			const context = {
				userId: testUserId,
				expiresAt: new Date(Date.now() - 1000),
				permissions: [],
				roles: []
			};

			const result = await authService.validateAccessToken('expired-token', context);

			expect(result.isError).toBe(true);
			if (result.isError) {
				expect(result.error).toBeInstanceOf(ExpiredTokenError);
			}
		});
	});

	describe('areUserTokensRevoked', () => {
		it('should check token revocation status', async () => {
			vi.mocked(mockRepository.areUserTokensRevoked).mockResolvedValue(Result.ok(false));

			const result = await authService.areUserTokensRevoked(testUserId);

			expect(result.isOk).toBe(true);
			if (result.isOk) {
				expect(result.value).toBe(false);
			}
		});

		it('should return true when tokens are revoked', async () => {
			vi.mocked(mockRepository.areUserTokensRevoked).mockResolvedValue(Result.ok(true));

			const result = await authService.areUserTokensRevoked(testUserId);

			expect(result.isOk).toBe(true);
			if (result.isOk) {
				expect(result.value).toBe(true);
			}
		});
	});
});
