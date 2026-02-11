import { Result } from '$domain/Result';
import { PermissionValidationError } from '../errors/RBACErrors';

const VALID_RESOURCES = [
	'employees',
	'departments',
	'teams',
	'performance',
	'goals',
	'reports',
	'tasks',
	'documents',
	'events',
	'attendance',
	'admin',
	'leave',
	'dashboard',
	'management',
	'*'
] as const;

const VALID_ACTIONS = [
	'read',
	'write',
	'delete',
	'approve',
	'execute',
	'analytics',
	'audit',
	'reassign',
	'*'
] as const;

const VALID_SCOPES = ['self', 'team', 'all', '*'] as const;

interface PermissionProps {
	resource: string;
	action: string;
	scope?: string;
	originalString: string;
}

export class Permission {
	private constructor(private readonly props: PermissionProps) {}

	static create(permissionString: string): Result<Permission, PermissionValidationError> {
		const trimmed = permissionString.trim();

		if (trimmed.length === 0) {
			return Result.error(new PermissionValidationError('Permission cannot be empty'));
		}

		// Handle full wildcard
		if (trimmed === '*') {
			return Result.ok(
				new Permission({
					resource: '*',
					action: '*',
					scope: '*',
					originalString: trimmed
				})
			);
		}

		// Parse permission string
		const parts = trimmed.split(':');

		if (parts.length < 2 || parts.length > 3) {
			return Result.error(
				new PermissionValidationError(
					`Invalid permission format: ${trimmed}. Expected resource:action or resource:action:scope`
				)
			);
		}

		const [resource, action, scope] = parts;

		// Validate resource
		if (!(VALID_RESOURCES as readonly string[]).includes(resource)) {
			return Result.error(new PermissionValidationError(`Invalid resource: ${resource}`));
		}

		// Validate action
		if (!(VALID_ACTIONS as readonly string[]).includes(action)) {
			return Result.error(new PermissionValidationError(`Invalid action: ${action}`));
		}

		// Validate scope if present
		if (scope && !(VALID_SCOPES as readonly string[]).includes(scope)) {
			return Result.error(new PermissionValidationError(`Invalid scope: ${scope}`));
		}

		return Result.ok(
			new Permission({
				resource,
				action,
				scope,
				originalString: trimmed
			})
		);
	}

	get resource(): string {
		return this.props.resource;
	}

	get action(): string {
		return this.props.action;
	}

	get scope(): string | undefined {
		return this.props.scope;
	}

	isWildcard(): boolean {
		return this.props.resource === '*' && this.props.action === '*';
	}

	matches(other: Permission): boolean {
		// Full wildcard matches everything
		if (this.isWildcard()) {
			return true;
		}

		// Check resource match (wildcard or exact)
		if (this.props.resource !== '*' && this.props.resource !== other.props.resource) {
			return false;
		}

		// Check action match (wildcard or exact)
		if (this.props.action !== '*' && this.props.action !== other.props.action) {
			return false;
		}

		// Check scope match (wildcard or exact or undefined)
		if (this.props.scope && this.props.scope !== '*' && this.props.scope !== other.props.scope) {
			return false;
		}

		return true;
	}

	scopeLevel(): number {
		if (!this.props.scope) return 0;

		const scopeLevels: Record<string, number> = {
			self: 1,
			team: 2,
			all: 3
		};

		return scopeLevels[this.props.scope] ?? 0;
	}

	toString(): string {
		return this.props.originalString;
	}

	equals(other: Permission): boolean {
		return this.props.originalString === other.props.originalString;
	}
}
