// src/adapters/graphql/GraphQLRoleAdapter.ts
import { Client } from '@urql/core';
import { Result } from '$domain/Result';
import {
	Role,
	Permission,
	RoleHierarchy,
	RBACError,
	RoleNotFoundError,
	RoleValidationError
} from '$domain/RBAC';
import type {
	RoleRepository,
	CreateRoleData,
	UpdateRoleData,
	RoleFilter
} from '$services/ports/RoleRepository';
import { GET_ROLE_BY_ID, GET_ALL_ROLES, GET_USER_ROLES } from '$lib/graphql/rbac/queries';
import {
	CREATE_ROLE,
	UPDATE_ROLE,
	DELETE_ROLE,
	ADD_PERMISSION_TO_ROLE,
	REMOVE_PERMISSION_FROM_ROLE
} from '$lib/graphql/rbac/mutations';

/**
 * GraphQL schema response shape
 */
interface GraphQLRole {
	id: string;
	name: string;
	hierarchyLevel: number;
	permissions: string[];
	description?: string;
	createdAt: string;
	updatedAt: string;
}

/**
 * GraphQLRoleAdapter implements RoleRepository port for GraphQL backend integration.
 *
 * Responsibilities:
 * - Translate between GraphQL API and domain entities
 * - Handle GraphQL errors and map to domain errors
 * - Resilient error handling (filter invalid permissions, don't throw)
 *
 * @example
 * ```typescript
 * const adapter = new GraphQLRoleAdapter(urqlClient);
 * const result = await adapter.findById('role-123');
 * if (result.isOk) {
 *   console.log(result.value.name);
 * }
 * ```
 */
export class GraphQLRoleAdapter implements RoleRepository {
	constructor(private readonly client: Client) {}

	async findById(id: string): Promise<Result<Role, RoleNotFoundError>> {
		try {
			const result = await this.client.query(GET_ROLE_BY_ID, { id }).toPromise();

			if (result.error) {
				return Result.error(new RoleNotFoundError(id));
			}

			if (!result.data?.role) {
				return Result.error(new RoleNotFoundError(id));
			}

			return this.mapToRole(result.data.role);
		} catch (error) {
			return Result.error(new RoleNotFoundError(id));
		}
	}

	async findAll(filter?: RoleFilter): Promise<Result<Role[], RBACError>> {
		try {
			const result = await this.client.query(GET_ALL_ROLES, { filter }).toPromise();

			if (result.error) {
				return Result.error(new RBACError(result.error.message));
			}

			const roles = result.data?.roles ?? [];
			const mappedRoles: Role[] = [];

			// Resilient error handling: skip invalid roles instead of failing
			for (const roleData of roles) {
				const roleResult = this.mapToRole(roleData);
				if (roleResult.isOk) {
					mappedRoles.push(roleResult.value);
				}
				// Skip invalid roles (e.g., invalid hierarchy level)
			}

			return Result.ok(mappedRoles);
		} catch (error) {
			return Result.error(
				new RBACError(
					`Failed to fetch roles: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async create(data: CreateRoleData): Promise<Result<Role, RoleValidationError>> {
		try {
			const result = await this.client.mutation(CREATE_ROLE, { input: data }).toPromise();

			if (result.error) {
				return Result.error(new RoleValidationError(result.error.message));
			}

			if (!result.data?.createRole) {
				return Result.error(new RoleValidationError('Failed to create role'));
			}

			return this.mapToRole(result.data.createRole);
		} catch (error) {
			return Result.error(
				new RoleValidationError(
					`Failed to create role: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async update(id: string, data: UpdateRoleData): Promise<Result<Role, RBACError>> {
		try {
			const result = await this.client.mutation(UPDATE_ROLE, { id, input: data }).toPromise();

			if (result.error) {
				return Result.error(new RBACError(result.error.message));
			}

			if (!result.data?.updateRole) {
				return Result.error(new RoleNotFoundError(id));
			}

			return this.mapToRole(result.data.updateRole);
		} catch (error) {
			return Result.error(
				new RBACError(
					`Failed to update role: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async delete(id: string): Promise<Result<void, RoleNotFoundError>> {
		try {
			const result = await this.client.mutation(DELETE_ROLE, { id }).toPromise();

			if (result.error) {
				return Result.error(new RoleNotFoundError(id));
			}

			return Result.ok(undefined);
		} catch (error) {
			return Result.error(new RoleNotFoundError(id));
		}
	}

	async addPermissionToRole(roleId: string, permission: string): Promise<Result<Role, RBACError>> {
		try {
			const result = await this.client
				.mutation(ADD_PERMISSION_TO_ROLE, { roleId, permission })
				.toPromise();

			if (result.error) {
				return Result.error(new RBACError(result.error.message));
			}

			if (!result.data?.addPermissionToRole) {
				return Result.error(new RoleNotFoundError(roleId));
			}

			return this.mapToRole(result.data.addPermissionToRole);
		} catch (error) {
			return Result.error(
				new RBACError(
					`Failed to add permission: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async removePermissionFromRole(
		roleId: string,
		permission: string
	): Promise<Result<Role, RBACError>> {
		try {
			const result = await this.client
				.mutation(REMOVE_PERMISSION_FROM_ROLE, { roleId, permission })
				.toPromise();

			if (result.error) {
				return Result.error(new RBACError(result.error.message));
			}

			if (!result.data?.removePermissionFromRole) {
				return Result.error(new RoleNotFoundError(roleId));
			}

			return this.mapToRole(result.data.removePermissionFromRole);
		} catch (error) {
			return Result.error(
				new RBACError(
					`Failed to remove permission: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async getRolesForUser(userId: string): Promise<Result<Role[], RBACError>> {
		try {
			const result = await this.client.query(GET_USER_ROLES, { userId }).toPromise();

			if (result.error) {
				return Result.error(new RBACError(result.error.message));
			}

			const roles = result.data?.userRoles ?? [];
			const mappedRoles: Role[] = [];

			// Resilient error handling: skip invalid roles instead of failing
			for (const roleData of roles) {
				const roleResult = this.mapToRole(roleData);
				if (roleResult.isOk) {
					mappedRoles.push(roleResult.value);
				}
			}

			return Result.ok(mappedRoles);
		} catch (error) {
			return Result.error(
				new RBACError(
					`Failed to fetch user roles: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	/**
	 * Map GraphQL role data to domain Role entity
	 * @private
	 */
	private mapToRole(data: GraphQLRole): Result<Role, RoleValidationError> {
		// Map hierarchy level to role name
		const hierarchyMap: Record<number, string> = {
			100: 'Admin',
			75: 'HR Manager',
			50: 'Manager',
			25: 'Employee',
			0: 'guest'
		};

		const roleName = hierarchyMap[data.hierarchyLevel] ?? 'Employee';
		const hierarchyResult = RoleHierarchy.create(roleName);

		if (hierarchyResult.isError) {
			return Result.error(
				new RoleValidationError(`Invalid hierarchy level: ${data.hierarchyLevel}`)
			);
		}

		// Data sanitization: filter invalid permissions
		const permissions: Permission[] = [];
		for (const permString of data.permissions) {
			const permResult = Permission.create(permString);
			if (permResult.isOk) {
				permissions.push(permResult.value);
			}
			// Skip invalid permissions (resilient error handling)
		}

		// Create Role entity
		return Role.create({
			id: data.id,
			name: data.name,
			hierarchy: hierarchyResult.value,
			permissions,
			description: data.description,
			createdAt: new Date(data.createdAt),
			updatedAt: new Date(data.updatedAt)
		});
	}
}
