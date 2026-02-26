// src/adapters/graphql/GraphQLRoleAdapter.ts
import { Client, gql } from '@urql/core';
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

const LIST_PERMISSIONS_FOR_LOOKUP = gql`
	query ListPermissionsForLookup($limit: Int!, $offset: Int!) {
		permissions(limit: $limit, offset: $offset) {
			id
			resource
			action
			fullPermission
		}
	}
`;

/**
 * GraphQL schema response shape
 */
interface GraphQLRole {
	id: string;
	name: string;
	level: number;
	permissions: Array<{
		id?: string;
		resource?: string;
		action?: string;
		fullPermission?: string;
	}>;
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

	async findAll(_filter?: RoleFilter): Promise<Result<Role[], RBACError>> {
		try {
			const result = await this.client.query(GET_ALL_ROLES, {}).toPromise();

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
			const roleInput = {
				name: data.name,
				description: data.description,
				level: data.hierarchyLevel
			};
			const result = await this.client.mutation(CREATE_ROLE, { input: roleInput }).toPromise();

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
			const roleInput = {
				name: data.name,
				description: data.description
			};
			const result = await this.client.mutation(UPDATE_ROLE, { id, input: roleInput }).toPromise();

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
			const permissionId = await this.resolvePermissionId(permission);
			if (!permissionId) {
				return Result.error(new RBACError(`Permission not found: ${permission}`));
			}

			const result = await this.client
				.mutation(ADD_PERMISSION_TO_ROLE, { roleId, permissionId })
				.toPromise();

			if (result.error) {
				return Result.error(new RBACError(result.error.message));
			}

			const roleResult = await this.findById(roleId);
			return roleResult.isOk ? roleResult : Result.error(new RBACError(roleResult.error.message));
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
			const permissionId = await this.resolvePermissionId(permission);
			if (!permissionId) {
				return Result.error(new RBACError(`Permission not found: ${permission}`));
			}

			const result = await this.client
				.mutation(REMOVE_PERMISSION_FROM_ROLE, { roleId, permissionId })
				.toPromise();

			if (result.error) {
				return Result.error(new RBACError(result.error.message));
			}

			const roleResult = await this.findById(roleId);
			return roleResult.isOk ? roleResult : Result.error(new RBACError(roleResult.error.message));
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

	private async resolvePermissionId(permission: string): Promise<string | null> {
		const uuidPattern =
			/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
		if (uuidPattern.test(permission)) {
			return permission;
		}

		const permissionsResult = await this.client
			.query(LIST_PERMISSIONS_FOR_LOOKUP, { limit: 1000, offset: 0 })
			.toPromise();

		if (permissionsResult.error) {
			return null;
		}

		const permissions = permissionsResult.data?.permissions ?? [];
		type PermissionLookup = {
			id?: string;
			resource?: string;
			action?: string;
			fullPermission?: string;
		};

		const match = (permissions as PermissionLookup[]).find((candidate) => {
			if (typeof candidate.fullPermission === 'string' && candidate.fullPermission === permission) {
				return true;
			}
			if (
				typeof candidate.resource === 'string' &&
				typeof candidate.action === 'string' &&
				`${candidate.resource}:${candidate.action}` === permission
			) {
				return true;
			}
			return false;
		});

		return typeof match?.id === 'string' ? match.id : null;
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

		const roleName = hierarchyMap[data.level] ?? 'Employee';
		const hierarchyResult = RoleHierarchy.create(roleName);

		if (hierarchyResult.isError) {
			return Result.error(new RoleValidationError(`Invalid hierarchy level: ${data.level}`));
		}

		// Data sanitization: filter invalid permissions
		const permissions: Permission[] = [];
		for (const permissionData of data.permissions ?? []) {
			const fullPermission = permissionData.fullPermission?.trim();
			const resource = permissionData.resource?.trim();
			const action = permissionData.action?.trim();
			const permissionString =
				fullPermission && fullPermission.length > 0
					? fullPermission
					: resource && action
						? `${resource}:${action}`
						: '';

			if (!permissionString) {
				continue;
			}

			const permResult = Permission.create(permissionString);
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
