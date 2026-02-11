export class RBACError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'RBACError';
	}
}

export class PermissionValidationError extends RBACError {
	constructor(message: string) {
		super(message);
		this.name = 'PermissionValidationError';
	}
}

export class RoleValidationError extends RBACError {
	constructor(message: string) {
		super(message);
		this.name = 'RoleValidationError';
	}
}

export class RoleNotFoundError extends RBACError {
	constructor(roleId: string) {
		super(`Role not found: ${roleId}`);
		this.name = 'RoleNotFoundError';
	}
}

export class InvalidRoleHierarchyError extends RBACError {
	constructor(message: string) {
		super(message);
		this.name = 'InvalidRoleHierarchyError';
	}
}

export class PermissionDeniedError extends RBACError {
	constructor(permission: string) {
		super(`Permission denied: ${permission}`);
		this.name = 'PermissionDeniedError';
	}
}
