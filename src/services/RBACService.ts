import { Result } from '$domain/Result';
import { Role, Permission, RBACError, RoleNotFoundError } from '$domain/RBAC';
import { RoleRepository } from './ports/RoleRepository';

export class RBACService {
	constructor(private readonly repository: RoleRepository) {}

	async getRoleById(id: string): Promise<Result<Role, RoleNotFoundError>> {
		try {
			return await this.repository.findById(id);
		} catch (error) {
			return Result.error(new RoleNotFoundError(id));
		}
	}

	async getAllRoles(): Promise<Result<Role[], RBACError>> {
		try {
			return await this.repository.findAll();
		} catch (error) {
			return Result.error(
				new RBACError(
					`Failed to fetch roles: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async checkPermission(
		userId: string,
		permissionString: string
	): Promise<Result<boolean, RBACError>> {
		try {
			const rolesResult = await this.repository.getRolesForUser(userId);

			if (rolesResult.isError) {
				return Result.error(rolesResult.error);
			}

			const permResult = Permission.create(permissionString);
			if (permResult.isError) {
				return Result.error(new RBACError(`Invalid permission format: ${permissionString}`));
			}

			const checkPerm = permResult.value;
			const hasPermission = rolesResult.value.some((role) => role.hasPermission(checkPerm));

			return Result.ok(hasPermission);
		} catch (error) {
			return Result.error(
				new RBACError(
					`Failed to check permission: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async checkAnyPermission(
		userId: string,
		permissions: string[]
	): Promise<Result<boolean, RBACError>> {
		try {
			for (const permission of permissions) {
				const result = await this.checkPermission(userId, permission);
				if (result.isOk && result.value) {
					return Result.ok(true);
				}
			}
			return Result.ok(false);
		} catch (error) {
			return Result.error(
				new RBACError(
					`Failed to check permissions: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async checkAllPermissions(
		userId: string,
		permissions: string[]
	): Promise<Result<boolean, RBACError>> {
		try {
			for (const permission of permissions) {
				const result = await this.checkPermission(userId, permission);
				if (result.isError || !result.value) {
					return Result.ok(false);
				}
			}
			return Result.ok(true);
		} catch (error) {
			return Result.error(
				new RBACError(
					`Failed to check permissions: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async getHighestRole(userId: string): Promise<Result<Role | undefined, RBACError>> {
		try {
			const rolesResult = await this.repository.getRolesForUser(userId);

			if (rolesResult.isError) {
				return Result.error(rolesResult.error);
			}

			if (rolesResult.value.length === 0) {
				return Result.ok(undefined);
			}

			const highest = rolesResult.value.reduce((prev, current) => {
				return current.hierarchy.isHigherThan(prev.hierarchy) ? current : prev;
			});

			return Result.ok(highest);
		} catch (error) {
			return Result.error(
				new RBACError(
					`Failed to get highest role: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async addPermissionToRole(roleId: string, permission: string): Promise<Result<Role, RBACError>> {
		try {
			// Validate permission format
			const permResult = Permission.create(permission);
			if (permResult.isError) {
				return Result.error(new RBACError(`Invalid permission format: ${permission}`));
			}

			return await this.repository.addPermissionToRole(roleId, permission);
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
			return await this.repository.removePermissionFromRole(roleId, permission);
		} catch (error) {
			return Result.error(
				new RBACError(
					`Failed to remove permission: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}
}
