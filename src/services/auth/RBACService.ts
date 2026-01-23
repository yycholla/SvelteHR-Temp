export interface User {
	permissions: string[];
	roles?: string[];
}

export class RBACService {
	hasPermission(user: User, permission: string): boolean {
		if (!user.permissions) return false;

		// Admin wildcard
		if (user.permissions.includes('*') || user.permissions.includes('*:*')) {
			return true;
		}

		// Exact match
		if (user.permissions.includes(permission)) {
			return true;
		}

		// Scoped permission matching (users:write:all matches users:write)
		const [resource, action] = permission.split(':');
		return user.permissions.some((p) => {
			const [pResource, pAction] = p.split(':');
			return pResource === resource && pAction === action;
		});
	}

	hasAnyPermission(user: User, permissions: string[]): boolean {
		return permissions.some((p) => this.hasPermission(user, p));
	}

	hasAllPermissions(user: User, permissions: string[]): boolean {
		return permissions.every((p) => this.hasPermission(user, p));
	}

	canAccessResource(user: User, resource: string, action: 'read' | 'write' | 'delete'): boolean {
		return this.hasPermission(user, `${resource}:${action}`);
	}
}
