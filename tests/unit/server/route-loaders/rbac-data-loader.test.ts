/**
 * RBACDataLoader Unit Tests
 * Phase 1 Foundation - Workstream 1B
 *
 * Tests RBAC-aware data loader with integrated GraphQL client.
 * Validates authentication, session creation, and GraphQL query execution.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RBACDataLoader } from '$lib/server/route-loaders/rbac-data-loader';
import { requireAuth, getUserPermissions } from '$lib/server/rbac-utils';
import { createGraphQLClient } from '$lib/server/graphql/unified-client';
import type { RequestEvent } from '@sveltejs/kit';

// Mock dependencies
vi.mock('$lib/server/rbac-utils', () => ({
	requireAuth: vi.fn(),
	getUserPermissions: vi.fn(() => ({
		canViewEmployees: true,
		canEditEmployees: false,
		user: { id: 'test-user-id', email: 'test@example.com' },
		roles: ['employee'],
		permissions: ['employees:read', 'departments:read']
	}))
}));

vi.mock('$lib/server/graphql/unified-client', () => ({
	createGraphQLClient: vi.fn(() => ({
		query: vi.fn(async (query, variables) => {
			// Mock successful GraphQL response
			if (query.includes('GetTasks')) {
				return [{ id: '1', title: 'Test Task' }];
			}
			return [];
		}),
		mutate: vi.fn()
	})),
	UnifiedGraphQLClient: vi.fn()
}));

describe('RBACDataLoader', () => {
	let mockEvent: Partial<RequestEvent>;

	beforeEach(() => {
		vi.clearAllMocks();

		// Create mock SvelteKit request event
		mockEvent = {
			request: {
				headers: new Headers({ cookie: 'session=test-session' })
			} as Request,
			locals: {
				user: {
					id: 'test-user-id',
					email: 'test@example.com',
					role: 'employee',
					display_name: 'Test User'
				},
				roles: ['employee'],
				permissions: ['tasks:read']
			},
			cookies: {
				get: vi.fn((name: string) => 'test-cookie-value'),
				set: vi.fn(),
				delete: vi.fn(),
				serialize: vi.fn()
			} as any,
			url: new URL('http://localhost:5173/dashboard/tasks')
		};
	});

	describe('Constructor', () => {
		it('should create instance with required permissions', () => {
			const loader = new RBACDataLoader(mockEvent as RequestEvent, ['tasks:read']);

			expect(loader).toBeDefined();
			expect(loader['client']).toBeDefined();
		});

		it('should accept empty permissions array', () => {
			const loader = new RBACDataLoader(mockEvent as RequestEvent, []);

			expect(loader).toBeDefined();
		});

		it('should call requireAuth with permissions', () => {
			new RBACDataLoader(mockEvent as RequestEvent, ['tasks:read', 'tasks:write']);

			expect(requireAuth).toHaveBeenCalledWith(mockEvent, {
				requiredPermissions: ['tasks:read', 'tasks:write']
			});
		});
	});

	describe('loadWithClient', () => {
		it('should execute callback with GraphQL client', async () => {
			const loader = new RBACDataLoader(mockEvent as RequestEvent, ['tasks:read']);

			const mockCallback = vi.fn(async (client) => ({
				tasks: [{ id: '1', title: 'Test' }]
			}));

			const result = await loader.loadWithClient(mockCallback);

			expect(mockCallback).toHaveBeenCalled();
			expect(mockCallback).toHaveBeenCalledWith(loader['client']);
			expect(result).toHaveProperty('tasks');
		});

		it('should return data with user session properties', async () => {
			const loader = new RBACDataLoader(mockEvent as RequestEvent, ['tasks:read']);

			const result = await loader.loadWithClient(async (client) => ({
				tasks: [{ id: '1' }]
			}));

			// BaseRouteLoader spreads permissions directly, not wrapped in userSession
			expect(result).toHaveProperty('user');
			expect(result.user).toHaveProperty('id', 'test-user-id');
			expect(result).toHaveProperty('roles');
			expect(result).toHaveProperty('permissions');
		});

		it('should return data with user permissions', async () => {
			const loader = new RBACDataLoader(mockEvent as RequestEvent, ['tasks:read']);

			const result = await loader.loadWithClient(async (client) => ({
				tasks: []
			}));

			expect(result).toHaveProperty('canViewEmployees');
			expect(result).toHaveProperty('user');
		});

		it('should include loadedAt timestamp', async () => {
			const loader = new RBACDataLoader(mockEvent as RequestEvent, ['tasks:read']);

			const result = await loader.loadWithClient(async (client) => ({
				tasks: []
			}));

			expect(result).toHaveProperty('loadedAt');
			expect(typeof result.loadedAt).toBe('string');
		});

		it('should merge callback data with session data', async () => {
			const loader = new RBACDataLoader(mockEvent as RequestEvent, ['tasks:read']);

			const result = await loader.loadWithClient(async (client) => ({
				customField: 'custom-value',
				tasks: [{ id: '1' }]
			}));

			expect(result).toHaveProperty('customField', 'custom-value');
			expect(result).toHaveProperty('tasks');
			expect(result).toHaveProperty('canViewEmployees');
		});

		it('should allow async GraphQL queries in callback', async () => {
			const loader = new RBACDataLoader(mockEvent as RequestEvent, ['tasks:read']);

			const result = await loader.loadWithClient(async (client) => {
				const tasks = await client.query(
					'query GetTasks { tasks { id title } }',
					{},
					{ operationName: 'GetTasks' }
				);

				return { tasks };
			});

			expect(result.tasks).toBeDefined();
			expect(Array.isArray(result.tasks)).toBe(true);
		});
	});

	describe('Error Handling', () => {
		it('should wrap errors from callback in SvelteKit error', async () => {
			const loader = new RBACDataLoader(mockEvent as RequestEvent, ['tasks:read']);

			const mockError = new Error('GraphQL query failed');

			try {
				await loader.loadWithClient(async (client) => {
					throw mockError;
				});
				expect.fail('Should have thrown an error');
			} catch (err: any) {
				// BaseRouteLoader.execute() wraps errors in SvelteKit error() with status 500
				expect(err).toHaveProperty('status', 500);
				expect(err.body).toMatchObject({
					message: expect.stringContaining('GraphQL query failed')
				});
			}
		});

		it('should propagate SvelteKit errors unchanged', async () => {
			const loader = new RBACDataLoader(mockEvent as RequestEvent, ['tasks:read']);

			const svelteKitError = { status: 404, body: { message: 'Not found' } };

			await expect(
				loader.loadWithClient(async (client) => {
					throw svelteKitError;
				})
			).rejects.toEqual(svelteKitError);
		});
	});

	describe('Session Creation', () => {
		it('should create session with correct structure', async () => {
			const loader = new RBACDataLoader(mockEvent as RequestEvent, ['tasks:read']);

			const result = await loader.loadWithClient(async (client) => ({}));

			// Verify spread permissions structure
			expect(result).toMatchObject({
				user: expect.objectContaining({
					id: 'test-user-id',
					email: 'test@example.com'
				}),
				roles: expect.arrayContaining(['employee']),
				permissions: expect.arrayContaining(['employees:read', 'departments:read'])
			});
		});

		it('should include user data from permissions', async () => {
			const loader = new RBACDataLoader(mockEvent as RequestEvent, ['tasks:read']);

			const result = await loader.loadWithClient(async (client) => ({}));

			expect(result.user).toBeDefined();
			expect(result.user).toHaveProperty('id', 'test-user-id');
			expect(result.user).toHaveProperty('email', 'test@example.com');
		});

		it('should include loadedAt timestamp', async () => {
			const loader = new RBACDataLoader(mockEvent as RequestEvent, ['tasks:read']);

			const result = await loader.loadWithClient(async (client) => ({}));

			expect(result).toHaveProperty('loadedAt');
			expect(typeof result.loadedAt).toBe('string');

			// Verify timestamp is valid and recent
			const loadedAt = new Date(result.loadedAt);
			expect(loadedAt.getTime()).toBeGreaterThan(Date.now() - 5000);
		});
	});

	describe('GraphQL Client Integration', () => {
		it('should provide GraphQL client to callback', async () => {
			const loader = new RBACDataLoader(mockEvent as RequestEvent, ['tasks:read']);

			let capturedClient: any;

			await loader.loadWithClient(async (client) => {
				capturedClient = client;
				return {};
			});

			expect(capturedClient).toBeDefined();
			expect(capturedClient).toHaveProperty('query');
		});

		it('should forward session cookies to GraphQL client', async () => {
			new RBACDataLoader(mockEvent as RequestEvent, ['tasks:read']);

			expect(createGraphQLClient).toHaveBeenCalledWith(mockEvent);
		});
	});
});
