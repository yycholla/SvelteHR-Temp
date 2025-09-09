/**
 * GraphQL Contract Tests: Authentication Operations
 * 
 * CRITICAL: These tests MUST FAIL initially (TDD RED phase)
 * Tests validate GraphQL schema contracts before implementation
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { LoginInput } from '../../lib/generated/graphql';
import { createServerGraphQLClient } from '../../lib/graphql/client';
import { TEST_CONFIG, waitForServer } from '../config';

// Define GraphQLResponse type locally to avoid circular imports
interface GraphQLResponse<T = any> {
	data?: T;
	errors?: Array<{ message: string }>;
}

// Real GraphQL client - will connect to actual SvelteKit server
const graphqlClient = createServerGraphQLClient();

// Authentication GraphQL operations
const LOGIN_MUTATION = `
	mutation Login($input: LoginInput!) {
		login(input: $input) {
			token
			refreshToken
			user {
				id
				email
				firstName
				lastName
				roles {
					id
					name
					level
				}
			}
			expiresAt
		}
	}
`;

const ME_QUERY = `
	query Me {
		me {
			id
			email
			firstName
			lastName
			isActive
			roles {
				id
				name
				level
				permissions {
					resource
					action
					scope
				}
			}
			employee {
				id
				employeeId
				position
				department {
					id
					name
				}
			}
		}
	}
`;

const REFRESH_TOKEN_MUTATION = `
	mutation RefreshToken($refreshToken: String!) {
		refreshToken(refreshToken: $refreshToken) {
			token
			refreshToken
			expiresAt
		}
	}
`;

describe('GraphQL Contract: Authentication Operations', () => {
	let authToken: string | null = null;
	let refreshToken: string | null = null;

	beforeAll(async () => {
		// This will fail until GraphQL endpoint is implemented
		console.log('🚨 Starting GraphQL Auth Contract Tests - Expected to FAIL initially');
	});

	afterAll(async () => {
		// Cleanup any auth state
		authToken = null;
		refreshToken = null;
	});

	describe('Login Mutation Contract', () => {
		it('should successfully authenticate with valid credentials', async () => {
			// Contract test: Login mutation must return proper response structure
			const loginInput: LoginInput = {
				email: 'admin@mountainhr.com',
				password: 'admin123'
			};

			// This MUST FAIL until backend implements GraphQL login
			const response = await graphqlClient.request(LOGIN_MUTATION, {
				input: loginInput
			});

			// Contract expectations
			expect(response.data).toBeDefined();
			expect(response.data.login).toBeDefined();
			expect(response.data.login.token).toBeTypeOf('string');
			expect(response.data.login.refreshToken).toBeTypeOf('string');
			expect(response.data.login.expiresAt).toBeTypeOf('string');
			
			// User data contract
			expect(response.data.login.user).toBeDefined();
			expect(response.data.login.user.id).toBeTypeOf('string');
			expect(response.data.login.user.email).toBe(loginInput.email);
			expect(response.data.login.user.firstName).toBeTypeOf('string');
			expect(response.data.login.user.lastName).toBeTypeOf('string');
			
			// Roles contract
			expect(Array.isArray(response.data.login.user.roles)).toBe(true);
			if (response.data.login.user.roles.length > 0) {
				const role = response.data.login.user.roles[0];
				expect(role.id).toBeTypeOf('string');
				expect(role.name).toBeTypeOf('string');
				expect(role.level).toBeTypeOf('number');
			}

			// Store tokens for subsequent tests
			authToken = response.data.login.token;
			refreshToken = response.data.login.refreshToken;
		});

		it('should reject invalid credentials', async () => {
			const loginInput: LoginInput = {
				email: 'invalid@example.com',
				password: 'wrongpassword'
			};

			// This MUST FAIL until backend implements GraphQL login with error handling
			const response = await graphqlClient.request(LOGIN_MUTATION, {
				input: loginInput
			});

			// Contract: Should return GraphQL errors for invalid credentials
			expect(response.errors).toBeDefined();
			expect(response.errors!.length).toBeGreaterThan(0);
			expect(response.errors![0].message).toMatch(/invalid|unauthorized|authentication failed/i);
			expect(response.data?.login).toBeNull();
		});

		it('should validate required input fields', async () => {
			// Contract test: Missing required fields should cause GraphQL validation errors
			const invalidInput = {
				email: '', // Empty email should fail validation
				password: ''  // Empty password should fail validation
			};

			// This MUST FAIL until backend implements GraphQL schema validation
			const response = await graphqlClient.request(LOGIN_MUTATION, {
				input: invalidInput
			});

			expect(response.errors).toBeDefined();
			expect(response.errors!.length).toBeGreaterThan(0);
			expect(response.errors![0].message).toMatch(/validation|required|invalid/i);
		});
	});

	describe('Me Query Contract', () => {
		it('should return current user data with valid token', async () => {
			// This test requires authentication token from login
			// Will fail until both login and me query are implemented
			
			if (!authToken) {
				throw new Error('No auth token available - login test must pass first');
			}

			// This MUST FAIL until backend implements GraphQL me query
			const response = await graphqlClient.authenticatedRequest(ME_QUERY, {}, authToken);

			// Contract expectations for current user
			expect(response.data).toBeDefined();
			expect(response.data.me).toBeDefined();
			expect(response.data.me.id).toBeTypeOf('string');
			expect(response.data.me.email).toBeTypeOf('string');
			expect(response.data.me.firstName).toBeTypeOf('string');
			expect(response.data.me.lastName).toBeTypeOf('string');
			expect(response.data.me.isActive).toBeTypeOf('boolean');

			// Roles with permissions contract
			expect(Array.isArray(response.data.me.roles)).toBe(true);
			if (response.data.me.roles.length > 0) {
				const role = response.data.me.roles[0];
				expect(role.id).toBeTypeOf('string');
				expect(role.name).toBeTypeOf('string');
				expect(role.level).toBeTypeOf('number');
				
				if (role.permissions && role.permissions.length > 0) {
					const permission = role.permissions[0];
					expect(permission.resource).toBeTypeOf('string');
					expect(permission.action).toBeTypeOf('string');
					expect(['allow', 'deny', 'inherit'].includes(permission.scope)).toBe(true);
				}
			}

			// Employee data contract (if user has employee profile)
			if (response.data.me.employee) {
				expect(response.data.me.employee.id).toBeTypeOf('string');
				expect(response.data.me.employee.employeeId).toBeTypeOf('string');
				expect(response.data.me.employee.position).toBeTypeOf('string');
				
				if (response.data.me.employee.department) {
					expect(response.data.me.employee.department.id).toBeTypeOf('string');
					expect(response.data.me.employee.department.name).toBeTypeOf('string');
				}
			}
		});

		it('should reject unauthenticated requests', async () => {
			// Contract test: Me query without valid token should fail
			// This MUST FAIL until backend implements GraphQL authentication middleware
			
			const response = await graphqlClient.request(ME_QUERY);

			// Should return authentication error
			expect(response.errors).toBeDefined();
			expect(response.errors.length).toBeGreaterThan(0);
			expect(response.errors[0].message).toMatch(/unauthorized|authentication|token/i);
			expect(response.data?.me).toBeNull();
		});
	});

	describe('RefreshToken Mutation Contract', () => {
		it('should refresh token with valid refresh token', async () => {
			if (!refreshToken) {
				throw new Error('No refresh token available - login test must pass first');
			}

			// This MUST FAIL until backend implements GraphQL token refresh
			const response = await graphqlClient.request(REFRESH_TOKEN_MUTATION, {
				refreshToken
			});

			// Contract expectations for token refresh
			expect(response.data).toBeDefined();
			expect(response.data.refreshToken).toBeDefined();
			expect(response.data.refreshToken.token).toBeTypeOf('string');
			expect(response.data.refreshToken.refreshToken).toBeTypeOf('string');
			expect(response.data.refreshToken.expiresAt).toBeTypeOf('string');

			// New token should be different from original
			expect(response.data.refreshToken.token).not.toBe(authToken);
			
			// Update stored token
			authToken = response.data.refreshToken.token;
		});

		it('should reject invalid refresh token', async () => {
			const invalidRefreshToken = 'invalid-refresh-token';

			// This MUST FAIL until backend implements GraphQL refresh token validation
			const response = await graphqlClient.request(REFRESH_TOKEN_MUTATION, {
				refreshToken: invalidRefreshToken
			});

			// Should return error for invalid refresh token
			expect(response.errors).toBeDefined();
			expect(response.errors.length).toBeGreaterThan(0);
			expect(response.errors[0].message).toMatch(/invalid|expired|unauthorized/i);
			expect(response.data?.refreshToken).toBeNull();
		});

		it('should reject missing refresh token', async () => {
			// Contract test: Missing refresh token should cause validation error
			const response = await graphqlClient.request(REFRESH_TOKEN_MUTATION, {
				refreshToken: null
			});

			expect(response.errors).toBeDefined();
			expect(response.errors.length).toBeGreaterThan(0);
			expect(response.errors[0].message).toMatch(/required|validation/i);
		});
	});

	describe('GraphQL Schema Validation', () => {
		it('should enforce LoginInput type requirements', async () => {
			// Contract test: GraphQL schema should validate input types
			const invalidInputs = [
				{ email: null, password: 'test123' },
				{ email: 'test@example.com', password: null },
				{ email: 'invalid-email', password: 'test123' },
				{ email: 'test@example.com', password: '12' } // Too short
			];

			for (const invalidInput of invalidInputs) {
				const response = await graphqlClient.request(LOGIN_MUTATION, {
					input: invalidInput
				});

				expect(response.errors).toBeDefined();
				expect(response.errors.length).toBeGreaterThan(0);
			}
		});

		it('should return proper error structure for GraphQL errors', async () => {
			// Contract test: GraphQL errors should have consistent structure
			const response = await graphqlClient.request('invalid query');

			expect(response.errors).toBeDefined();
			expect(Array.isArray(response.errors)).toBe(true);
			
			if (response.errors.length > 0) {
				const error = response.errors[0];
				expect(error.message).toBeTypeOf('string');
				// Path is optional but if present should be array
				if (error.path) {
					expect(Array.isArray(error.path)).toBe(true);
				}
			}
		});
	});
});

// Export for potential integration with other contract tests
export {
	LOGIN_MUTATION,
	ME_QUERY, 
	REFRESH_TOKEN_MUTATION,
	type GraphQLClient,
	type GraphQLResponse
};