import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '$services/auth/AuthService';
import type { SessionPort } from '$services/auth/ports/SessionPort';
import type { GraphQLPort } from '$services/ports/GraphQLPort';
import { UnauthorizedError, ValidationError } from '$lib/utils/errors/AppError';

describe('AuthService', () => {
	let mockSession: SessionPort;
	let mockGraphQL: GraphQLPort;
	let authService: AuthService;

	beforeEach(() => {
		mockSession = {
			getSession: vi.fn(),
			createSession: vi.fn(),
			updateSession: vi.fn(),
			destroySession: vi.fn()
		};

		mockGraphQL = {
			query: vi.fn(),
			mutate: vi.fn()
		};

		authService = new AuthService(mockSession, mockGraphQL);
	});

	describe('login', () => {
		it('creates session on successful authentication', async () => {
			vi.mocked(mockGraphQL.mutate).mockResolvedValue({
				login: { userId: '123', token: 'abc' }
			});

			await authService.login('user@test.com', 'password123');

			expect(mockSession.createSession).toHaveBeenCalledWith(
				expect.objectContaining({ userId: '123' })
			);
		});

		it('throws UnauthorizedError on invalid credentials', async () => {
			vi.mocked(mockGraphQL.mutate).mockResolvedValue({
				login: null
			});

			await expect(authService.login('bad@test.com', 'wrongpass123')).rejects.toThrow(
				UnauthorizedError
			);
		});

		it('includes email in session data', async () => {
			vi.mocked(mockGraphQL.mutate).mockResolvedValue({
				login: { userId: '123', token: 'abc' }
			});

			await authService.login('user@test.com', 'password123');

			expect(mockSession.createSession).toHaveBeenCalledWith(
				expect.objectContaining({
					userId: '123',
					email: 'user@test.com'
				})
			);
		});
	});

	describe('login validation', () => {
		it('throws ValidationError for invalid email', async () => {
			await expect(authService.login('invalid-email', 'password123')).rejects.toThrow(
				ValidationError
			);
		});

		it('throws ValidationError for empty password', async () => {
			await expect(authService.login('user@test.com', '')).rejects.toThrow(ValidationError);
		});

		it('throws ValidationError for short password', async () => {
			await expect(authService.login('user@test.com', 'short')).rejects.toThrow(ValidationError);
		});

		it('throws ValidationError for whitespace-only password', async () => {
			await expect(authService.login('user@test.com', '       ')).rejects.toThrow(ValidationError);
		});

		it('accepts valid email and password', async () => {
			vi.mocked(mockGraphQL.mutate).mockResolvedValue({
				login: { userId: '123', token: 'abc' }
			});

			await expect(authService.login('user@test.com', 'password123')).resolves.not.toThrow();
		});
	});

	describe('logout', () => {
		it('destroys session when session exists', async () => {
			vi.mocked(mockSession.getSession).mockResolvedValue({
				sessionId: 'session-123',
				userId: '123',
				createdAt: new Date().toISOString()
			});

			await authService.logout();

			expect(mockSession.destroySession).toHaveBeenCalledWith('session-123');
		});

		it('does nothing when no session exists', async () => {
			vi.mocked(mockSession.getSession).mockResolvedValue(null);

			await authService.logout();

			expect(mockSession.destroySession).not.toHaveBeenCalled();
		});
	});

	describe('validateSession', () => {
		it('returns user data for valid session', async () => {
			vi.mocked(mockSession.getSession).mockResolvedValue({
				userId: '123',
				sessionId: 'session-123',
				createdAt: new Date().toISOString()
			});

			vi.mocked(mockGraphQL.query).mockResolvedValue({
				user: { id: '123', email: 'test@example.com' }
			});

			const user = await authService.validateSession();

			expect(user).toEqual(expect.objectContaining({ id: '123' }));
		});

		it('returns null when no session exists', async () => {
			vi.mocked(mockSession.getSession).mockResolvedValue(null);

			const user = await authService.validateSession();

			expect(user).toBeNull();
		});

		it('returns null when GraphQL query fails', async () => {
			vi.mocked(mockSession.getSession).mockResolvedValue({
				userId: '123',
				sessionId: 'session-123',
				createdAt: new Date().toISOString()
			});

			vi.mocked(mockGraphQL.query).mockRejectedValue(new Error('Network error'));

			const user = await authService.validateSession();

			expect(user).toBeNull();
		});
	});

	describe('getCurrentUser', () => {
		it('delegates to validateSession', async () => {
			const mockUser = { id: '123', email: 'test@example.com' };

			vi.mocked(mockSession.getSession).mockResolvedValue({
				userId: '123',
				sessionId: 'session-123',
				createdAt: new Date().toISOString()
			});

			vi.mocked(mockGraphQL.query).mockResolvedValue({
				user: mockUser
			});

			const user = await authService.getCurrentUser();

			expect(user).toEqual(mockUser);
		});
	});
});
