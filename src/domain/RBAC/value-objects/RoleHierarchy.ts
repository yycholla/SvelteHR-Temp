import { Result } from '$domain/Result';
import { InvalidRoleHierarchyError } from '../errors/RBACErrors';

type RoleName = 'Admin' | 'HR Manager' | 'Manager' | 'Employee' | 'guest';

const ROLE_LEVELS: Record<RoleName, number> = {
	Admin: 100,
	'HR Manager': 75,
	Manager: 50,
	Employee: 25,
	guest: 0
};

interface RoleHierarchyProps {
	roleName: RoleName;
	level: number;
}

export class RoleHierarchy {
	private constructor(private readonly props: RoleHierarchyProps) {}

	static create(roleName: string): Result<RoleHierarchy, InvalidRoleHierarchyError> {
		const level = ROLE_LEVELS[roleName as RoleName];

		if (level === undefined) {
			return Result.error(
				new InvalidRoleHierarchyError(
					`Invalid role name: ${roleName}. Valid roles: ${Object.keys(ROLE_LEVELS).join(', ')}`
				)
			);
		}

		return Result.ok(
			new RoleHierarchy({
				roleName: roleName as RoleName,
				level
			})
		);
	}

	get roleName(): RoleName {
		return this.props.roleName;
	}

	get level(): number {
		return this.props.level;
	}

	isHigherThan(other: RoleHierarchy): boolean {
		return this.props.level > other.props.level;
	}

	isHigherThanOrEqual(other: RoleHierarchy): boolean {
		return this.props.level >= other.props.level;
	}

	canPromoteTo(other: RoleHierarchy): boolean {
		return other.props.level > this.props.level;
	}

	equals(other: RoleHierarchy): boolean {
		return this.props.roleName === other.props.roleName;
	}
}
