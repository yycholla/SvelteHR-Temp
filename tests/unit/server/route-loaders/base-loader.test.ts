/**
 * BaseRouteLoader Unit Tests
 * Phase 1 Foundation - Workstream 1B
 *
 * Tests the base route loader with RBAC integration, session management,
 * and standardized error handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseRouteLoader } from '$lib/server/route-loaders/base-loader';
import type { RequestEvent } from '@sveltejs/kit';

// Mock dependencies
vi.mock('$lib/server/rbac-utils', () => ({
	requireAuth: vi.fn(),
	getUserPermissions: vi.fn(
		() =>
			({
				canViewEmployees: true,
				canEditEmployees: false,
				canViewDepartments: true,
				permissions: ['employees:read', 'departments:read'],
				roles: ['employee'],
				user: { id: 'test-user-id', email: 'test@example.com' }
			}) as unknown
	) // Type assertion to avoid mocking all 50+ permission properties
}));

vi.mock('$lib/utils/logger', () => ({
	logger: {
		error: vi.fn()
	}
}));

// Concrete test implementation of abstract BaseRouteLoader
class TestLoader extends BaseRouteLoader {
	public testData: Record<string, any> = { items: [] };

	protected async load(): Promise<Record<string, any>> {
		return this.testData;
	}

	// Expose protected methods for testing
	public testHasPermission(permission: string): boolean {
		return this.hasPermission(permission);
	}

	public testHasRole(role: string): boolean {
		return this.hasRole(role);
	}

	public testGetUserId(): string {
		return this.getUserId();
	}

	public testGetUserRole(): string {
		return this.getUserRole();
	}
}

describe('BaseRouteLoader', () => {
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
				permissions: ['employees:read', 'departments:read']
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
			const loader = new TestLoader(mockEvent as RequestEvent, ['employees:read']);

			expect(loader).toBeDefined();
			expect(loader['event']).toBe(mockEvent);
			expect(loader['locals']).toBeDefined();
			expect(loader['permissions']).toBeDefined();
		});

		it('should accept empty permissions array', () => {
			const loader = new TestLoader(mockEvent as RequestEvent, []);

			expect(loader).toBeDefined();
		});

		it('should call requireAuth with permissions', async () => {
			const { requireAuth } = await import('$lib/server/rbac-utils');

			new TestLoader(mockEvent as RequestEvent, ['employees:read', 'employees:write']);

			expect(requireAuth).toHaveBeenCalledWith(mockEvent, {
				requiredPermissions: ['employees:read', 'employees:write']
			});
		});

		it('should extract locals after auth check', () => {
			const loader = new TestLoader(mockEvent as RequestEvent, []);

			expect(loader['locals'].user).toBeDefined();
			expect(loader['locals'].user.id).toBe('test-user-id');
		});

		it('should compute user permissions', async () => {
			const { getUserPermissions } = await import('$lib/server/rbac-utils');

			const loader = new TestLoader(mockEvent as RequestEvent, []);

			expect(getUserPermissions).toHaveBeenCalledWith(mockEvent.locals);
			expect(loader['permissions']).toHaveProperty('canViewEmployees');
		});
	});

	describe('execute()', () => {
		it('should execute load() and return data with permissions', async () => {
			const loader = new TestLoader(mockEvent as RequestEvent, []);
			loader.testData = { tasks: [{ id: '1', title: 'Test' }] };

			const result = await loader.execute();

			expect(result).toHaveProperty('tasks');
			expect(result).toHaveProperty('canViewEmployees');
			expect(result).toHaveProperty('canEditEmployees');
		});

		it('should include user permission data', async () => {
			const loader = new TestLoader(mockEvent as RequestEvent, []);
			loader.testData = { items: [] };

			const result = await loader.execute();

			expect(result).toHaveProperty('user');
			expect(result.user).toHaveProperty('id', 'test-user-id');
		});

		it('should add loadedAt timestamp', async () => {
			const loader = new TestLoader(mockEvent as RequestEvent, []);

			const result = await loader.execute();

			expect(result).toHaveProperty('loadedAt');
			expect(typeof result.loadedAt).toBe('string');
		});

		it('should merge route data with permission data', async () => {
			const loader = new TestLoader(mockEvent as RequestEvent, []);
			loader.testData = {
				customField: 'custom-value',
				items: [{ id: '1' }]
			};

			const result = await loader.execute();

			expect(result).toHaveProperty('customField', 'custom-value');
			expect(result).toHaveProperty('items');
			expect(result).toHaveProperty('canViewEmployees');
			expect(result).toHaveProperty('permissions');
		});

		it('should log errors with user context', async () => {
			const { logger } = await import('$lib/utils/logger');
			const loader = new TestLoader(mockEvent as RequestEvent, []);

			// Override load to throw error
			loader['load'] = async () => {
				throw new Error('Test error');
			};

			await expect(loader.execute()).rejects.toThrow();

			expect(logger.error).toHaveBeenCalledWith(
				'[Route Load Error]',
				expect.any(Error),
				expect.objectContaining({
					route: '/dashboard/tasks',
					userId: 'test-user-id',
					userRole: 'employee'
				})
			);
		});

		it('should re-throw SvelteKit errors', async () => {
			const loader = new TestLoader(mockEvent as RequestEvent, []);

			const svelteKitError = { status: 404, body: { message: 'Not found' } };

			loader['load'] = async () => {
				throw svelteKitError;
			};

			await expect(loader.execute()).rejects.toEqual(svelteKitError);
		});

		it('should wrap generic errors in 500 error', async () => {
			const loader = new TestLoader(mockEvent as RequestEvent, []);

			loader['load'] = async () => {
				throw new Error('Database connection failed');
			};

			try {
				await loader.execute();
				expect.fail('Should have thrown an error');
			} catch (err: any) {
				expect(err).toHaveProperty('status', 500);
				expect(err.body).toMatchObject({
					message: expect.stringContaining('Unable to load data: Database connection failed')
				});
			}
		});

		it('should handle non-Error exceptions', async () => {
			const loader = new TestLoader(mockEvent as RequestEvent, []);

			loader['load'] = async () => {
				throw 'String error';
			};

			try {
				await loader.execute();
				expect.fail('Should have thrown an error');
			} catch (err: any) {
				expect(err).toHaveProperty('status', 500);
				expect(err.body).toMatchObject({
					message: expect.stringContaining('Unable to load data: Failed to load page data')
				});
			}
		});
	});

	describe('Helper Methods', () => {
		describe('hasPermission()', () => {
			it('should return true for existing permission', () => {
				const loader = new TestLoader(mockEvent as RequestEvent, []);

				expect(loader.testHasPermission('employees:read')).toBe(true);
				expect(loader.testHasPermission('departments:read')).toBe(true);
			});

			it('should return false for missing permission', () => {
				const loader = new TestLoader(mockEvent as RequestEvent, []);

				expect(loader.testHasPermission('employees:delete')).toBe(false);
			});

			it('should return true for wildcard admin permission', async () => {
				const { getUserPermissions } = await import('$lib/server/rbac-utils');

				// Mock admin user with wildcard permission
				vi.mocked(getUserPermissions).mockReturnValueOnce({
					canViewEmployees: true,
					canEditEmployees: true,
					permissions: ['*'],
					roles: ['Admin'],
					user: { id: 'admin-id', email: 'admin@example.com' }
				} as any);

				const loader = new TestLoader(mockEvent as RequestEvent, []);

				expect(loader.testHasPermission('any:permission')).toBe(true);
			});

			it('should return true for *:* permission', async () => {
				const { getUserPermissions } = await import('$lib/server/rbac-utils');

				vi.mocked(getUserPermissions).mockReturnValueOnce({
					canViewEmployees: true,
					canEditEmployees: true,
					permissions: ['*:*'],
					roles: ['Admin'],
					user: { id: 'admin-id', email: 'admin@example.com' }
				} as any);

				const loader = new TestLoader(mockEvent as RequestEvent, []);

				expect(loader.testHasPermission('employees:delete')).toBe(true);
			});
		});

		describe('hasRole()', () => {
			it('should return true for existing role', () => {
				const loader = new TestLoader(mockEvent as RequestEvent, []);

				expect(loader.testHasRole('employee')).toBe(true);
			});

			it('should return false for missing role', () => {
				const loader = new TestLoader(mockEvent as RequestEvent, []);

				expect(loader.testHasRole('Admin')).toBe(false);
			});
		});

		describe('getUserId()', () => {
			it('should return current user ID', () => {
				const loader = new TestLoader(mockEvent as RequestEvent, []);

				expect(loader.testGetUserId()).toBe('test-user-id');
			});
		});

		describe('getUserRole()', () => {
			it('should return current user role', () => {
				const loader = new TestLoader(mockEvent as RequestEvent, []);

				expect(loader.testGetUserRole()).toBe('employee');
			});

			it('should return default role if not set', () => {
				mockEvent.locals!.user!.role = undefined as any;
				const loader = new TestLoader(mockEvent as RequestEvent, []);

				expect(loader.testGetUserRole()).toBe('employee');
			});
		});
	});

	describe('Abstract load() method', () => {
		it('should be implemented by subclass', async () => {
			const loader = new TestLoader(mockEvent as RequestEvent, []);
			loader.testData = { result: 'test' };

			const data = await loader['load']();

			expect(data).toEqual({ result: 'test' });
		});
	});

	describe('Integration with execute()', () => {
		it('should call load() and merge results properly', async () => {
			const loader = new TestLoader(mockEvent as RequestEvent, []);
			loader.testData = {
				tasks: [{ id: '1' }],
				totalTasks: 1
			};

			const result = await loader.execute();

			// Route-specific data
			expect(result.tasks).toHaveLength(1);
			expect(result.totalTasks).toBe(1);

			// Permission data
			expect(result.canViewEmployees).toBe(true);
			expect(result.permissions).toContain('employees:read');

			// Metadata
			expect(result.loadedAt).toBeDefined();
		});

		it('should preserve all permission boolean flags', async () => {
			const loader = new TestLoader(mockEvent as RequestEvent, []);

			const result = await loader.execute();

			expect(result.canViewEmployees).toBe(true);
			expect(result.canEditEmployees).toBe(false);
			expect(result.canViewDepartments).toBe(true);
		});
	});
});
