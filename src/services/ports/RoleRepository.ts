// src/services/ports/RoleRepository.ts
import { Result } from '$domain/Result';
import { Role, RoleNotFoundError, RoleValidationError, RBACError } from '$domain/RBAC';

export interface RoleFilter {
	name?: string;
	hierarchyLevel?: number;
	hasPermission?: string;
}

export interface CreateRoleData {
	name: string;
	hierarchyLevel: number;
	permissions: string[];
	description?: string;
}

export interface UpdateRoleData {
	name?: string;
	permissions?: string[];
	description?: string;
}

export interface RoleRepository {
	/**
	 * Find a role by ID
	 * @returns Role if found, RoleNotFoundError otherwise
	 */
	findById(id: string): Promise<Result<Role, RoleNotFoundError>>;

	/**
	 * Find all roles matching filter
	 * @returns Array of roles (empty if none found)
	 */
	findAll(filter?: RoleFilter): Promise<Result<Role[], RBACError>>;

	/**
	 * Create a new role
	 * @returns Created role or validation error
	 */
	create(data: CreateRoleData): Promise<Result<Role, RoleValidationError>>;

	/**
	 * Update an existing role
	 * @returns Updated role or error
	 */
	update(id: string, data: UpdateRoleData): Promise<Result<Role, RBACError>>;

	/**
	 * Delete a role
	 * @returns Success or error
	 */
	delete(id: string): Promise<Result<void, RoleNotFoundError>>;

	/**
	 * Add permission to role
	 * @returns Updated role or error
	 */
	addPermissionToRole(roleId: string, permission: string): Promise<Result<Role, RBACError>>;

	/**
	 * Remove permission from role
	 * @returns Updated role or error
	 */
	removePermissionFromRole(roleId: string, permission: string): Promise<Result<Role, RBACError>>;

	/**
	 * Get roles for a user
	 * @returns Array of roles for user
	 */
	getRolesForUser(userId: string): Promise<Result<Role[], RBACError>>;
}
