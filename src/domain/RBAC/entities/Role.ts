import { Result } from '$domain/Result';
import { Permission } from '../value-objects/Permission';
import { RoleHierarchy } from '../value-objects/RoleHierarchy';
import { RoleValidationError } from '../errors/RBACErrors';

interface RoleProps {
	id: string;
	name: string;
	hierarchy: RoleHierarchy;
	permissions: Permission[];
	description?: string;
	createdAt: Date;
	updatedAt: Date;
}

export class Role {
	private constructor(private readonly props: RoleProps) {}

	static create(props: RoleProps): Result<Role, RoleValidationError> {
		const trimmedName = props.name.trim();

		if (trimmedName.length === 0) {
			return Result.error(new RoleValidationError('Role name cannot be empty'));
		}

		return Result.ok(
			new Role({
				...props,
				name: trimmedName
			})
		);
	}

	get id(): string {
		return this.props.id;
	}

	get name(): string {
		return this.props.name;
	}

	get hierarchy(): RoleHierarchy {
		return this.props.hierarchy;
	}

	get permissions(): Permission[] {
		return [...this.props.permissions]; // Defensive copy
	}

	get description(): string | undefined {
		return this.props.description;
	}

	get createdAt(): Date {
		return new Date(this.props.createdAt.getTime()); // Defensive copy
	}

	get updatedAt(): Date {
		return new Date(this.props.updatedAt.getTime()); // Defensive copy
	}

	hasPermission(permission: Permission): boolean {
		return this.props.permissions.some((p) => p.matches(permission));
	}

	addPermission(permission: Permission): Role {
		// Don't add if already exists
		if (this.hasPermission(permission)) {
			return this;
		}

		return new Role({
			...this.props,
			permissions: [...this.props.permissions, permission],
			updatedAt: new Date()
		});
	}

	removePermission(permission: Permission): Role {
		return new Role({
			...this.props,
			permissions: this.props.permissions.filter((p) => !p.equals(permission)),
			updatedAt: new Date()
		});
	}

	equals(other: Role): boolean {
		return this.props.id === other.props.id;
	}
}
