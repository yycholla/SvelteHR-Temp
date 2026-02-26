import type { SessionPort } from './ports/SessionPort';
import type { GraphQLPort } from '$services/ports/GraphQLPort';
import { UnauthorizedError, ValidationError } from '$lib/utils/errors/AppError';
import { isValidEmail } from '$lib/utils/validators/email';
import { logger } from '$lib/utils/logger';

/**
 * User data returned from authentication operations
 */
export interface User {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
}

/**
 * AuthService - Authentication business logic
 *
 * This service handles authentication operations (login, logout, session validation)
 * without any coupling to SvelteKit or specific frameworks. It uses dependency injection
 * via ports (SessionPort, GraphQLPort) for framework-agnostic operation.
 */
export class AuthService {
	constructor(
		private readonly sessionPort: SessionPort,
		private readonly graphql: GraphQLPort
	) {}

	/**
	 * Authenticates a user with email and password
	 * @param email - User's email address
	 * @param password - User's password
	 * @throws {ValidationError} If email or password format is invalid
	 * @throws {UnauthorizedError} If credentials are invalid
	 */
	async login(email: string, password: string): Promise<void> {
		// Validate inputs
		if (!isValidEmail(email)) {
			throw new ValidationError('Invalid email format');
		}

		if (!password || password.trim().length < 8) {
			throw new ValidationError('Password must be at least 8 characters');
		}

		// SECURITY: GraphQLPort implementation must NOT log mutation variables
		// to prevent password exposure in logs
		const result = await this.graphql.mutation<{ login: { userId: string; token: string } | null }>(
			`
			mutation Login($email: String!, $password: String!) {
				login(email: $email, password: $password) {
					userId
					token
				}
			}
		`,
			{ email, password }
		);

		if (!result.login) {
			throw new UnauthorizedError('Invalid credentials');
		}

		await this.sessionPort.createSession({
			userId: result.login.userId,
			email
		});

		logger.info('[Auth] User logged in', { userId: result.login.userId });
	}

	/**
	 * Logs out the current user by destroying their session
	 */
	async logout(): Promise<void> {
		const session = await this.sessionPort.getSession();

		if (session) {
			await this.sessionPort.destroySession(session.sessionId);
			logger.info('[Auth] User logged out', { userId: session.userId });
		}
	}

	/**
	 * Validates the current session and returns user data if valid
	 * @returns User data if session is valid, null otherwise
	 */
	async validateSession(): Promise<User | null> {
		const session = await this.sessionPort.getSession();

		if (!session) return null;

		try {
			const result = await this.graphql.query<{ user: User }>(
				`
				query GetUser($id: UUID!) {
					user(id: $id) {
						id
						email
						firstName
						lastName
					}
				}
			`,
				{ id: session.userId }
			);

			return result.user;
		} catch (error) {
			logger.warn('[Auth] Session validation failed', { error });
			return null;
		}
	}

	/**
	 * Gets the currently authenticated user
	 * @returns User data if authenticated, null otherwise
	 */
	async getCurrentUser(): Promise<User | null> {
		return this.validateSession();
	}
}
