// src/adapters/graphql/GraphQLRoleAdapter.test.ts
import { describe, it, expect } from 'vitest';
import { GraphQLRoleAdapter } from './GraphQLRoleAdapter';
import { RoleNotFoundError } from '$domain/RBAC';
import { Client } from '@urql/core';

// Mock URQL client
function createMockClient(responses: Record<string, unknown>): Client {
	return {
		query: (query: unknown, variables: unknown) => ({
			toPromise: async () => responses['query'] ?? { data: null, error: null }
		}),
		mutation: (mutation: unknown, variables: unknown) => ({
			toPromise: async () => responses['mutation'] ?? { data: null, error: null }
		})
	} as unknown as Client;
}

describe('GraphQLRoleAdapter', () => {
	describe('findById', () => {
		it('should return role when found', async () => {
			const mockClient = createMockClient({
				query: {
					data: {
						role: {
							id: 'role-123',
							name: 'Manager',
							level: 50,
							permissions: [
								{
									id: 'p1',
									resource: 'employees',
									action: 'read',
									fullPermission: 'employees:read:team'
								},
								{ id: 'p2', resource: 'tasks', action: 'write', fullPermission: 'tasks:write:team' }
							],
							description: 'Team manager',
							createdAt: '2026-02-11T10:00:00Z',
							updatedAt: '2026-02-11T10:00:00Z'
						}
					}
				}
			});

			const adapter = new GraphQLRoleAdapter(mockClient);
			const result = await adapter.findById('role-123');

			expect(result.isOk).toBe(true);
			expect(result.value.id).toBe('role-123');
			expect(result.value.name).toBe('Manager');
			expect(result.value.permissions).toHaveLength(2);
		});

		it('should return error when role not found', async () => {
			const mockClient = createMockClient({
				query: {
					data: { role: null }
				}
			});

			const adapter = new GraphQLRoleAdapter(mockClient);
			const result = await adapter.findById('nonexistent');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(RoleNotFoundError);
		});

		it('should handle GraphQL errors', async () => {
			const mockClient = createMockClient({
				query: {
					error: { message: 'Network error' }
				}
			});

			const adapter = new GraphQLRoleAdapter(mockClient);
			const result = await adapter.findById('role-123');

			expect(result.isError).toBe(true);
		});
	});

	describe('create', () => {
		it('should create role', async () => {
			const mockClient = createMockClient({
				mutation: {
					data: {
						createRole: {
							id: 'role-new',
							name: 'Custom Role',
							level: 40,
							permissions: [
								{ id: 'p3', resource: 'tasks', action: 'read', fullPermission: 'tasks:read:team' }
							],
							description: 'Custom role',
							createdAt: '2026-02-11T10:00:00Z',
							updatedAt: '2026-02-11T10:00:00Z'
						}
					}
				}
			});

			const adapter = new GraphQLRoleAdapter(mockClient);
			const result = await adapter.create({
				name: 'Custom Role',
				hierarchyLevel: 40,
				permissions: ['tasks:read:team'],
				description: 'Custom role'
			});

			expect(result.isOk).toBe(true);
			expect(result.value.name).toBe('Custom Role');
		});
	});

	describe('getRolesForUser', () => {
		it('should return user roles', async () => {
			const mockClient = createMockClient({
				query: {
					data: {
						userRoles: [
							{
								id: 'role-123',
								name: 'Manager',
								level: 50,
								permissions: [
									{
										id: 'p4',
										resource: 'employees',
										action: 'read',
										fullPermission: 'employees:read:team'
									}
								],
								createdAt: '2026-02-11T10:00:00Z',
								updatedAt: '2026-02-11T10:00:00Z'
							}
						]
					}
				}
			});

			const adapter = new GraphQLRoleAdapter(mockClient);
			const result = await adapter.getRolesForUser('user-123');

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1);
			expect(result.value[0].name).toBe('Manager');
		});
	});
});
