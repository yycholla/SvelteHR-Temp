// src/adapters/graphql/GraphQLAuthTokenAdapter.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GraphQLAuthTokenAdapter } from './GraphQLAuthTokenAdapter';
import type { GraphQLPort } from '$services/ports/GraphQLPort';
import { TokenError, InvalidTokenError } from '$domain/Auth/errors/TokenErrors';

describe('GraphQLAuthTokenAdapter', () => {
	let mockGraphql: GraphQLPort;
	let adapter: GraphQLAuthTokenAdapter;

	beforeEach(() => {
		mockGraphql = {
			query: vi.fn(),
			mutation: vi.fn()
		};
		adapter = new GraphQLAuthTokenAdapter(mockGraphql);
	});

	describe('generateTokenPair', () => {
		it('should generate token pair from successful login mutation', async () => {
			const mockResponse = {
				login: {
					__typename: 'AuthSuccess',
					user: {
						id: '123e4567-e89b-12d3-a456-426614174000',
						email: 'test@example.com',
						displayName: 'Test User',
						roles: ['employee'],
						permissions: ['users:read'],
						isActive: true,
						forcePasswordChange: false
					},
					tokens: {
						accessToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.test.sig',
						tokenType: 'Bearer',
						expiresIn: 900
					}
				}
			};

			vi.mocked(mockGraphql.mutation).mockResolvedValue(mockResponse);

			const result = await adapter.generateTokenPair('test@example.com', 'password123', {
				deviceInfo: 'test-device'
			});

			expect(result.isOk).toBe(true);
			if (result.isOk) {
				expect(result.value.accessToken.token).toBe(
					'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.test.sig'
				);
				expect(result.value.accessToken.userId).toBe('123e4567-e89b-12d3-a456-426614174000');
				expect(result.value.accessToken.permissions).toContain('users:read');
				expect(result.value.accessToken.roles).toContain('employee');
				expect(result.value.user.email).toBe('test@example.com');
			}

			expect(mockGraphql.mutation).toHaveBeenCalledOnce();
		});

		it('should return error for AuthError response', async () => {
			const mockResponse = {
				login: {
					__typename: 'AuthError',
					code: 'INVALID_CREDENTIALS',
					message: 'Invalid email or password'
				}
			};

			vi.mocked(mockGraphql.mutation).mockResolvedValue(mockResponse);

			const result = await adapter.generateTokenPair('bad@example.com', 'wrongpassword', {});

			expect(result.isError).toBe(true);
			if (result.isError) {
				expect(result.error).toBeInstanceOf(InvalidTokenError);
				expect(result.error.message).toContain('Invalid email or password');
			}
		});

		it('should handle GraphQL errors gracefully', async () => {
			vi.mocked(mockGraphql.mutation).mockRejectedValue(new Error('Network error'));

			const result = await adapter.generateTokenPair('test@example.com', 'password123', {});

			expect(result.isError).toBe(true);
			if (result.isError) {
				expect(result.error).toBeInstanceOf(TokenError);
				expect(result.error.message).toContain('Network error');
			}
		});

		it('should handle null/undefined login response', async () => {
			vi.mocked(mockGraphql.mutation).mockResolvedValue({
				login: null
			});

			const result = await adapter.generateTokenPair('test@example.com', 'password123', {});

			expect(result.isError).toBe(true);
			if (result.isError) {
				expect(result.error).toBeInstanceOf(InvalidTokenError);
			}
		});
	});

	describe('refreshAccessToken', () => {
		it('should refresh tokens from successful mutation', async () => {
			const mockResponse = {
				refreshToken: {
					__typename: 'AuthSuccess',
					user: {
						id: '123e4567-e89b-12d3-a456-426614174000',
						email: 'test@example.com',
						displayName: 'Test User',
						roles: ['employee'],
						permissions: ['users:read'],
						isActive: true,
						forcePasswordChange: false
					},
					tokens: {
						accessToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.new-access.sig',
						tokenType: 'Bearer',
						expiresIn: 900
					}
				}
			};

			vi.mocked(mockGraphql.mutation).mockResolvedValue(mockResponse);

			const result = await adapter.refreshAccessToken();

			expect(result.isOk).toBe(true);
			if (result.isOk) {
				expect(result.value.accessToken.token).toBe(
					'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.new-access.sig'
				);
				expect(result.value.accessToken.userId).toBe('123e4567-e89b-12d3-a456-426614174000');
				expect(result.value.user.email).toBe('test@example.com');
			}
		});

		it('should return error for AuthError on refresh', async () => {
			const mockResponse = {
				refreshToken: {
					__typename: 'AuthError',
					code: 'TOKEN_EXPIRED',
					message: 'Refresh token has expired'
				}
			};

			vi.mocked(mockGraphql.mutation).mockResolvedValue(mockResponse);

			const result = await adapter.refreshAccessToken();

			expect(result.isError).toBe(true);
			if (result.isError) {
				expect(result.error).toBeInstanceOf(InvalidTokenError);
				expect(result.error.message).toContain('Refresh token has expired');
			}
		});

		it('should handle network errors on refresh', async () => {
			vi.mocked(mockGraphql.mutation).mockRejectedValue(new Error('Connection refused'));

			const result = await adapter.refreshAccessToken();

			expect(result.isError).toBe(true);
			if (result.isError) {
				expect(result.error).toBeInstanceOf(TokenError);
				expect(result.error.message).toContain('Connection refused');
			}
		});
	});

	describe('revokeAllUserTokens', () => {
		it('should call logout mutation successfully', async () => {
			vi.mocked(mockGraphql.mutation).mockResolvedValue({
				logout: {
					success: true,
					message: 'Logged out successfully'
				}
			});

			const result = await adapter.revokeAllUserTokens('123e4567-e89b-12d3-a456-426614174000');

			expect(result.isOk).toBe(true);
			expect(mockGraphql.mutation).toHaveBeenCalledOnce();
		});

		it('should handle logout failure gracefully', async () => {
			vi.mocked(mockGraphql.mutation).mockRejectedValue(new Error('Logout failed'));

			const result = await adapter.revokeAllUserTokens('123e4567-e89b-12d3-a456-426614174000');

			expect(result.isError).toBe(true);
			if (result.isError) {
				expect(result.error).toBeInstanceOf(TokenError);
			}
		});

		it('should handle unsuccessful logout response', async () => {
			vi.mocked(mockGraphql.mutation).mockResolvedValue({
				logout: {
					success: false,
					message: 'Already logged out'
				}
			});

			// Should still succeed - idempotent operation
			const result = await adapter.revokeAllUserTokens('123e4567-e89b-12d3-a456-426614174000');

			expect(result.isOk).toBe(true);
		});
	});

	describe('revokeTokenFamily', () => {
		it('should return ok (no-op until backend supports it)', async () => {
			const result = await adapter.revokeTokenFamily('family-uuid-123', 'replay attack detected');

			expect(result.isOk).toBe(true);
		});
	});

	describe('validateAccessToken', () => {
		it('should create AccessToken domain entity from raw token string', async () => {
			const rawToken = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.test.sig';
			const userId = '123e4567-e89b-12d3-a456-426614174000';
			const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

			const result = await adapter.validateAccessToken(rawToken, {
				userId,
				expiresAt,
				permissions: ['users:read'],
				roles: ['employee']
			});

			expect(result.isOk).toBe(true);
			if (result.isOk) {
				expect(result.value.token).toBe(rawToken);
				expect(result.value.userId).toBe(userId);
				expect(result.value.isExpired()).toBe(false);
			}
		});

		it('should return error for empty token string', async () => {
			const result = await adapter.validateAccessToken('', {
				userId: '123e4567-e89b-12d3-a456-426614174000',
				expiresAt: new Date(Date.now() + 15 * 60 * 1000),
				permissions: [],
				roles: []
			});

			expect(result.isError).toBe(true);
			if (result.isError) {
				expect(result.error).toBeInstanceOf(InvalidTokenError);
			}
		});
	});

	describe('areUserTokensRevoked', () => {
		it('should return false by default (revocation checked server-side)', async () => {
			const result = await adapter.areUserTokensRevoked('123e4567-e89b-12d3-a456-426614174000');

			expect(result.isOk).toBe(true);
			if (result.isOk) {
				expect(result.value).toBe(false);
			}
		});
	});
});
