# RBAC Module Hexagonal Architecture Migration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Migrate RBAC (Role-Based Access Control) module from scattered utility functions to hexagonal architecture with domain-driven design.

**Architecture:** Extract RBAC logic from utilities into domain layer (Permission/Role entities), create service layer with Result pattern, implement GraphQL adapters following port/adapter pattern. Follow established patterns from Employee, Department, Auth/JWT, and Tasks modules.

**Tech Stack:** TypeScript 5, SvelteKit 2.43+, Result pattern, Vitest 3.2, Hexagonal Architecture (ports & adapters)

**Current Score:** 40/100 → **Target:** 90/100

**Estimated Effort:** 5-7 days (40-56 hours) or 6-8 hours with parallel agents

---

## Background: Current RBAC Implementation

**What exists:**

- 124 permissions in `resource:action:scope` format
- 5 role hierarchy levels (Admin → HR Manager → Manager → Employee → guest)
- Permission checking in `/src/lib/server/rbac/rbac-core.ts`
- GraphQL operations in `/src/lib/graphql/permissions-operations.ts`
- ~650 lines of existing tests

**Problems:**

- No domain layer (logic in utilities)
- Types scattered across 4+ files
- No Result pattern (throws or returns booleans)
- Hard-coded permission checks
- Mixed concerns (GraphQL + business logic)

**Solution:** Hexagonal architecture migration following Tasks module pattern (90/100, 73 tests, 6 hours).

---

## Phase 1: Domain Layer Foundation

### Task 1: Create Permission value object

**Files:**

- Create: `src/domain/RBAC/value-objects/Permission.ts`
- Create: `src/domain/RBAC/value-objects/Permission.test.ts`

**Step 1: Write the failing test**

```typescript
// src/domain/RBAC/value-objects/Permission.test.ts
import { describe, it, expect } from 'vitest';
import { Permission } from './Permission';
import { PermissionValidationError } from '../errors/RBACErrors';

describe('Permission', () => {
	describe('create', () => {
		it('should create valid permission with resource:action:scope format', () => {
			const result = Permission.create('employees:read:all');

			expect(result.isOk).toBe(true);
			expect(result.value.resource).toBe('employees');
			expect(result.value.action).toBe('read');
			expect(result.value.scope).toBe('all');
		});

		it('should create permission with resource:action format (no scope)', () => {
			const result = Permission.create('employees:write');

			expect(result.isOk).toBe(true);
			expect(result.value.resource).toBe('employees');
			expect(result.value.action).toBe('write');
			expect(result.value.scope).toBeUndefined();
		});

		it('should create wildcard permission', () => {
			const result = Permission.create('*');

			expect(result.isOk).toBe(true);
			expect(result.value.isWildcard()).toBe(true);
		});

		it('should reject invalid format', () => {
			const result = Permission.create('invalid');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(PermissionValidationError);
		});

		it('should reject empty string', () => {
			const result = Permission.create('');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(PermissionValidationError);
		});

		it('should reject invalid resource', () => {
			const result = Permission.create('invalid_resource:read:all');

			expect(result.isError).toBe(true);
		});

		it('should reject invalid action', () => {
			const result = Permission.create('employees:invalid_action:all');

			expect(result.isError).toBe(true);
		});

		it('should reject invalid scope', () => {
			const result = Permission.create('employees:read:invalid_scope');

			expect(result.isError).toBe(true);
		});
	});

	describe('matches', () => {
		it('should match exact permission', () => {
			const perm1 = Permission.create('employees:read:all').value;
			const perm2 = Permission.create('employees:read:all').value;

			expect(perm1.matches(perm2)).toBe(true);
		});

		it('should match wildcard resource', () => {
			const wildcard = Permission.create('*:read:all').value;
			const specific = Permission.create('employees:read:all').value;

			expect(wildcard.matches(specific)).toBe(true);
		});

		it('should match wildcard action', () => {
			const wildcard = Permission.create('employees:*:all').value;
			const specific = Permission.create('employees:read:all').value;

			expect(wildcard.matches(specific)).toBe(true);
		});

		it('should match wildcard scope', () => {
			const wildcard = Permission.create('employees:read:*').value;
			const specific = Permission.create('employees:read:all').value;

			expect(wildcard.matches(specific)).toBe(true);
		});

		it('should match full wildcard', () => {
			const wildcard = Permission.create('*').value;
			const specific = Permission.create('employees:read:all').value;

			expect(wildcard.matches(specific)).toBe(true);
		});

		it('should not match different permissions', () => {
			const perm1 = Permission.create('employees:read:all').value;
			const perm2 = Permission.create('departments:read:all').value;

			expect(perm1.matches(perm2)).toBe(false);
		});
	});

	describe('scopeLevel', () => {
		it('should return correct level for self scope', () => {
			const perm = Permission.create('employees:read:self').value;
			expect(perm.scopeLevel()).toBe(1);
		});

		it('should return correct level for team scope', () => {
			const perm = Permission.create('employees:read:team').value;
			expect(perm.scopeLevel()).toBe(2);
		});

		it('should return correct level for all scope', () => {
			const perm = Permission.create('employees:read:all').value;
			expect(perm.scopeLevel()).toBe(3);
		});

		it('should return 0 for no scope', () => {
			const perm = Permission.create('employees:read').value;
			expect(perm.scopeLevel()).toBe(0);
		});
	});

	describe('toString', () => {
		it('should return original permission string', () => {
			const permString = 'employees:read:all';
			const perm = Permission.create(permString).value;

			expect(perm.toString()).toBe(permString);
		});
	});

	describe('equals', () => {
		it('should return true for identical permissions', () => {
			const perm1 = Permission.create('employees:read:all').value;
			const perm2 = Permission.create('employees:read:all').value;

			expect(perm1.equals(perm2)).toBe(true);
		});

		it('should return false for different permissions', () => {
			const perm1 = Permission.create('employees:read:all').value;
			const perm2 = Permission.create('employees:write:all').value;

			expect(perm1.equals(perm2)).toBe(false);
		});
	});
});
```

**Step 2: Run test to verify it fails**

```bash
npm run test:unit -- src/domain/RBAC/value-objects/Permission.test.ts
```

Expected: FAIL with "Cannot find module './Permission'"

**Step 3: Create RBAC error types first**

```typescript
// src/domain/RBAC/errors/RBACErrors.ts
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
```

**Step 4: Write minimal implementation**

```typescript
// src/domain/RBAC/value-objects/Permission.ts
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
		if (!VALID_RESOURCES.includes(resource as any)) {
			return Result.error(new PermissionValidationError(`Invalid resource: ${resource}`));
		}

		// Validate action
		if (!VALID_ACTIONS.includes(action as any)) {
			return Result.error(new PermissionValidationError(`Invalid action: ${action}`));
		}

		// Validate scope if present
		if (scope && !VALID_SCOPES.includes(scope as any)) {
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
```

**Step 5: Run test to verify it passes**

```bash
npm run test:unit -- src/domain/RBAC/value-objects/Permission.test.ts
```

Expected: PASS (20 tests)

**Step 6: Commit**

```bash
git add src/domain/RBAC/errors/RBACErrors.ts src/domain/RBAC/value-objects/Permission.ts src/domain/RBAC/value-objects/Permission.test.ts
git commit -m "feat(rbac): add Permission value object with validation and matching logic"
```

---

### Task 2: Create RoleHierarchy value object

**Files:**

- Create: `src/domain/RBAC/value-objects/RoleHierarchy.ts`
- Create: `src/domain/RBAC/value-objects/RoleHierarchy.test.ts`

**Step 1: Write the failing test**

```typescript
// src/domain/RBAC/value-objects/RoleHierarchy.test.ts
import { describe, it, expect } from 'vitest';
import { RoleHierarchy } from './RoleHierarchy';
import { InvalidRoleHierarchyError } from '../errors/RBACErrors';

describe('RoleHierarchy', () => {
	describe('create', () => {
		it('should create Admin role hierarchy', () => {
			const result = RoleHierarchy.create('Admin');

			expect(result.isOk).toBe(true);
			expect(result.value.roleName).toBe('Admin');
			expect(result.value.level).toBe(100);
		});

		it('should create HR Manager role hierarchy', () => {
			const result = RoleHierarchy.create('HR Manager');

			expect(result.isOk).toBe(true);
			expect(result.value.level).toBe(75);
		});

		it('should create Manager role hierarchy', () => {
			const result = RoleHierarchy.create('Manager');

			expect(result.isOk).toBe(true);
			expect(result.value.level).toBe(50);
		});

		it('should create Employee role hierarchy', () => {
			const result = RoleHierarchy.create('Employee');

			expect(result.isOk).toBe(true);
			expect(result.value.level).toBe(25);
		});

		it('should create guest role hierarchy', () => {
			const result = RoleHierarchy.create('guest');

			expect(result.isOk).toBe(true);
			expect(result.value.level).toBe(0);
		});

		it('should reject invalid role name', () => {
			const result = RoleHierarchy.create('InvalidRole');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidRoleHierarchyError);
		});
	});

	describe('isHigherThan', () => {
		it('should return true when level is higher', () => {
			const admin = RoleHierarchy.create('Admin').value;
			const manager = RoleHierarchy.create('Manager').value;

			expect(admin.isHigherThan(manager)).toBe(true);
		});

		it('should return false when level is lower', () => {
			const employee = RoleHierarchy.create('Employee').value;
			const manager = RoleHierarchy.create('Manager').value;

			expect(employee.isHigherThan(manager)).toBe(false);
		});

		it('should return false when level is equal', () => {
			const manager1 = RoleHierarchy.create('Manager').value;
			const manager2 = RoleHierarchy.create('Manager').value;

			expect(manager1.isHigherThan(manager2)).toBe(false);
		});
	});

	describe('isHigherThanOrEqual', () => {
		it('should return true when level is higher', () => {
			const admin = RoleHierarchy.create('Admin').value;
			const manager = RoleHierarchy.create('Manager').value;

			expect(admin.isHigherThanOrEqual(manager)).toBe(true);
		});

		it('should return true when level is equal', () => {
			const manager1 = RoleHierarchy.create('Manager').value;
			const manager2 = RoleHierarchy.create('Manager').value;

			expect(manager1.isHigherThanOrEqual(manager2)).toBe(true);
		});

		it('should return false when level is lower', () => {
			const employee = RoleHierarchy.create('Employee').value;
			const manager = RoleHierarchy.create('Manager').value;

			expect(employee.isHigherThanOrEqual(manager)).toBe(false);
		});
	});

	describe('canPromoteTo', () => {
		it('should allow promotion to next level', () => {
			const manager = RoleHierarchy.create('Manager').value;
			const hrManager = RoleHierarchy.create('HR Manager').value;

			expect(manager.canPromoteTo(hrManager)).toBe(true);
		});

		it('should not allow promotion to same level', () => {
			const manager1 = RoleHierarchy.create('Manager').value;
			const manager2 = RoleHierarchy.create('Manager').value;

			expect(manager1.canPromoteTo(manager2)).toBe(false);
		});

		it('should not allow demotion', () => {
			const manager = RoleHierarchy.create('Manager').value;
			const employee = RoleHierarchy.create('Employee').value;

			expect(manager.canPromoteTo(employee)).toBe(false);
		});
	});

	describe('equals', () => {
		it('should return true for same role', () => {
			const role1 = RoleHierarchy.create('Manager').value;
			const role2 = RoleHierarchy.create('Manager').value;

			expect(role1.equals(role2)).toBe(true);
		});

		it('should return false for different roles', () => {
			const admin = RoleHierarchy.create('Admin').value;
			const manager = RoleHierarchy.create('Manager').value;

			expect(admin.equals(manager)).toBe(false);
		});
	});
});
```

**Step 2: Run test to verify it fails**

```bash
npm run test:unit -- src/domain/RBAC/value-objects/RoleHierarchy.test.ts
```

Expected: FAIL with "Cannot find module './RoleHierarchy'"

**Step 3: Write minimal implementation**

```typescript
// src/domain/RBAC/value-objects/RoleHierarchy.ts
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
```

**Step 4: Run test to verify it passes**

```bash
npm run test:unit -- src/domain/RBAC/value-objects/RoleHierarchy.test.ts
```

Expected: PASS (14 tests)

**Step 5: Commit**

```bash
git add src/domain/RBAC/value-objects/RoleHierarchy.ts src/domain/RBAC/value-objects/RoleHierarchy.test.ts
git commit -m "feat(rbac): add RoleHierarchy value object with level comparison"
```

---

### Task 3: Create Role entity

**Files:**

- Create: `src/domain/RBAC/entities/Role.ts`
- Create: `src/domain/RBAC/entities/Role.test.ts`

**Step 1: Write the failing test**

```typescript
// src/domain/RBAC/entities/Role.test.ts
import { describe, it, expect } from 'vitest';
import { Role } from './Role';
import { Permission } from '../value-objects/Permission';
import { RoleHierarchy } from '../value-objects/RoleHierarchy';
import { RoleValidationError } from '../errors/RBACErrors';

describe('Role', () => {
	describe('create', () => {
		it('should create valid role with permissions', () => {
			const hierarchy = RoleHierarchy.create('Manager').value;
			const permissions = [
				Permission.create('employees:read:team').value,
				Permission.create('tasks:write:team').value
			];

			const result = Role.create({
				id: 'role-123',
				name: 'Manager',
				hierarchy,
				permissions,
				description: 'Team manager role',
				createdAt: new Date(),
				updatedAt: new Date()
			});

			expect(result.isOk).toBe(true);
			expect(result.value.id).toBe('role-123');
			expect(result.value.name).toBe('Manager');
			expect(result.value.permissions).toHaveLength(2);
		});

		it('should create role without description', () => {
			const hierarchy = RoleHierarchy.create('Employee').value;

			const result = Role.create({
				id: 'role-123',
				name: 'Employee',
				hierarchy,
				permissions: [],
				createdAt: new Date(),
				updatedAt: new Date()
			});

			expect(result.isOk).toBe(true);
			expect(result.value.description).toBeUndefined();
		});

		it('should reject empty name', () => {
			const hierarchy = RoleHierarchy.create('Manager').value;

			const result = Role.create({
				id: 'role-123',
				name: '',
				hierarchy,
				permissions: [],
				createdAt: new Date(),
				updatedAt: new Date()
			});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(RoleValidationError);
		});
	});

	describe('hasPermission', () => {
		it('should return true when permission exists', () => {
			const hierarchy = RoleHierarchy.create('Manager').value;
			const permission = Permission.create('employees:read:team').value;
			const role = Role.create({
				id: 'role-123',
				name: 'Manager',
				hierarchy,
				permissions: [permission],
				createdAt: new Date(),
				updatedAt: new Date()
			}).value;

			expect(role.hasPermission(permission)).toBe(true);
		});

		it('should return false when permission does not exist', () => {
			const hierarchy = RoleHierarchy.create('Manager').value;
			const permission = Permission.create('employees:read:team').value;
			const checkPermission = Permission.create('employees:write:all').value;

			const role = Role.create({
				id: 'role-123',
				name: 'Manager',
				hierarchy,
				permissions: [permission],
				createdAt: new Date(),
				updatedAt: new Date()
			}).value;

			expect(role.hasPermission(checkPermission)).toBe(false);
		});

		it('should match wildcard permissions', () => {
			const hierarchy = RoleHierarchy.create('Admin').value;
			const wildcardPerm = Permission.create('*').value;
			const specificPerm = Permission.create('employees:read:all').value;

			const role = Role.create({
				id: 'role-123',
				name: 'Admin',
				hierarchy,
				permissions: [wildcardPerm],
				createdAt: new Date(),
				updatedAt: new Date()
			}).value;

			expect(role.hasPermission(specificPerm)).toBe(true);
		});
	});

	describe('addPermission', () => {
		it('should add new permission', () => {
			const hierarchy = RoleHierarchy.create('Manager').value;
			const newPermission = Permission.create('tasks:write:team').value;

			const role = Role.create({
				id: 'role-123',
				name: 'Manager',
				hierarchy,
				permissions: [],
				createdAt: new Date(),
				updatedAt: new Date()
			}).value;

			const updated = role.addPermission(newPermission);

			expect(updated.permissions).toHaveLength(1);
			expect(updated.hasPermission(newPermission)).toBe(true);
		});

		it('should not duplicate existing permission', () => {
			const hierarchy = RoleHierarchy.create('Manager').value;
			const permission = Permission.create('employees:read:team').value;

			const role = Role.create({
				id: 'role-123',
				name: 'Manager',
				hierarchy,
				permissions: [permission],
				createdAt: new Date(),
				updatedAt: new Date()
			}).value;

			const updated = role.addPermission(permission);

			expect(updated.permissions).toHaveLength(1);
		});
	});

	describe('removePermission', () => {
		it('should remove existing permission', () => {
			const hierarchy = RoleHierarchy.create('Manager').value;
			const permission = Permission.create('employees:read:team').value;

			const role = Role.create({
				id: 'role-123',
				name: 'Manager',
				hierarchy,
				permissions: [permission],
				createdAt: new Date(),
				updatedAt: new Date()
			}).value;

			const updated = role.removePermission(permission);

			expect(updated.permissions).toHaveLength(0);
			expect(updated.hasPermission(permission)).toBe(false);
		});

		it('should handle removing non-existent permission', () => {
			const hierarchy = RoleHierarchy.create('Manager').value;
			const permission = Permission.create('employees:read:team').value;
			const removePermission = Permission.create('employees:write:all').value;

			const role = Role.create({
				id: 'role-123',
				name: 'Manager',
				hierarchy,
				permissions: [permission],
				createdAt: new Date(),
				updatedAt: new Date()
			}).value;

			const updated = role.removePermission(removePermission);

			expect(updated.permissions).toHaveLength(1);
		});
	});

	describe('equals', () => {
		it('should return true for same role ID', () => {
			const hierarchy = RoleHierarchy.create('Manager').value;
			const role1 = Role.create({
				id: 'role-123',
				name: 'Manager',
				hierarchy,
				permissions: [],
				createdAt: new Date(),
				updatedAt: new Date()
			}).value;

			const role2 = Role.create({
				id: 'role-123',
				name: 'Manager',
				hierarchy,
				permissions: [],
				createdAt: new Date(),
				updatedAt: new Date()
			}).value;

			expect(role1.equals(role2)).toBe(true);
		});

		it('should return false for different role IDs', () => {
			const hierarchy = RoleHierarchy.create('Manager').value;
			const role1 = Role.create({
				id: 'role-123',
				name: 'Manager',
				hierarchy,
				permissions: [],
				createdAt: new Date(),
				updatedAt: new Date()
			}).value;

			const role2 = Role.create({
				id: 'role-456',
				name: 'Manager',
				hierarchy,
				permissions: [],
				createdAt: new Date(),
				updatedAt: new Date()
			}).value;

			expect(role1.equals(role2)).toBe(false);
		});
	});
});
```

**Step 2: Run test to verify it fails**

```bash
npm run test:unit -- src/domain/RBAC/entities/Role.test.ts
```

Expected: FAIL with "Cannot find module './Role'"

**Step 3: Write minimal implementation**

```typescript
// src/domain/RBAC/entities/Role.ts
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
```

**Step 4: Run test to verify it passes**

```bash
npm run test:unit -- src/domain/RBAC/entities/Role.test.ts
```

Expected: PASS (13 tests)

**Step 5: Commit**

```bash
git add src/domain/RBAC/entities/Role.ts src/domain/RBAC/entities/Role.test.ts
git commit -m "feat(rbac): add Role entity with permission management"
```

---

### Task 4: Create domain layer index files

**Files:**

- Create: `src/domain/RBAC/value-objects/index.ts`
- Create: `src/domain/RBAC/entities/index.ts`
- Create: `src/domain/RBAC/errors/index.ts`
- Create: `src/domain/RBAC/index.ts`

**Step 1: Create value objects index**

```typescript
// src/domain/RBAC/value-objects/index.ts
export { Permission } from './Permission';
export { RoleHierarchy } from './RoleHierarchy';
```

**Step 2: Create entities index**

```typescript
// src/domain/RBAC/entities/index.ts
export { Role } from './Role';
```

**Step 3: Create errors index**

```typescript
// src/domain/RBAC/errors/index.ts
export {
	RBACError,
	PermissionValidationError,
	RoleValidationError,
	RoleNotFoundError,
	InvalidRoleHierarchyError,
	PermissionDeniedError
} from './RBACErrors';
```

**Step 4: Create main domain index**

```typescript
// src/domain/RBAC/index.ts
export * from './value-objects';
export * from './entities';
export * from './errors';
```

**Step 5: Verify imports work**

```bash
npm run check
```

Expected: No TypeScript errors

**Step 6: Commit**

```bash
git add src/domain/RBAC/value-objects/index.ts src/domain/RBAC/entities/index.ts src/domain/RBAC/errors/index.ts src/domain/RBAC/index.ts
git commit -m "feat(rbac): add domain layer barrel exports"
```

---

## Phase 2: Service Layer

### Task 5: Create RoleRepository port interface

**Files:**

- Create: `src/services/ports/RoleRepository.ts`

**Step 1: Create port interface**

```typescript
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
```

**Step 2: Verify file compiles**

```bash
npm run check
```

Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add src/services/ports/RoleRepository.ts
git commit -m "feat(rbac): add RoleRepository port interface"
```

---

### Task 6: Create RBACService

**Files:**

- Create: `src/services/RBACService.ts`
- Create: `src/services/RBACService.test.ts`

**Step 1: Write the failing test**

```typescript
// src/services/RBACService.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { RBACService } from './RBACService';
import { RoleRepository } from './ports/RoleRepository';
import { Role, Permission, RoleHierarchy, RoleNotFoundError } from '$domain/RBAC';
import { Result } from '$domain/Result';

// Mock repository
class MockRoleRepository implements RoleRepository {
	private roles: Map<string, Role> = new Map();
	private userRoles: Map<string, string[]> = new Map();

	async findById(id: string) {
		const role = this.roles.get(id);
		if (!role) {
			return Result.error(new RoleNotFoundError(id));
		}
		return Result.ok(role);
	}

	async findAll() {
		return Result.ok(Array.from(this.roles.values()));
	}

	async create(data: any) {
		const hierarchy = RoleHierarchy.create('Manager').value;
		const permissions = data.permissions.map((p: string) => Permission.create(p).value);

		const role = Role.create({
			id: `role-${Date.now()}`,
			name: data.name,
			hierarchy,
			permissions,
			description: data.description,
			createdAt: new Date(),
			updatedAt: new Date()
		}).value;

		this.roles.set(role.id, role);
		return Result.ok(role);
	}

	async update(id: string, data: any) {
		const existingResult = await this.findById(id);
		if (existingResult.isError) {
			return existingResult;
		}

		const existing = existingResult.value;
		const updatedRole = Role.create({
			id: existing.id,
			name: data.name ?? existing.name,
			hierarchy: existing.hierarchy,
			permissions: existing.permissions,
			description: data.description ?? existing.description,
			createdAt: existing.createdAt,
			updatedAt: new Date()
		}).value;

		this.roles.set(id, updatedRole);
		return Result.ok(updatedRole);
	}

	async delete(id: string) {
		if (!this.roles.has(id)) {
			return Result.error(new RoleNotFoundError(id));
		}
		this.roles.delete(id);
		return Result.ok(undefined);
	}

	async addPermissionToRole(roleId: string, permission: string) {
		const roleResult = await this.findById(roleId);
		if (roleResult.isError) {
			return roleResult;
		}

		const perm = Permission.create(permission).value;
		const updated = roleResult.value.addPermission(perm);
		this.roles.set(roleId, updated);
		return Result.ok(updated);
	}

	async removePermissionFromRole(roleId: string, permission: string) {
		const roleResult = await this.findById(roleId);
		if (roleResult.isError) {
			return roleResult;
		}

		const perm = Permission.create(permission).value;
		const updated = roleResult.value.removePermission(perm);
		this.roles.set(roleId, updated);
		return Result.ok(updated);
	}

	async getRolesForUser(userId: string) {
		const roleIds = this.userRoles.get(userId) ?? [];
		const roles = roleIds.map((id) => this.roles.get(id)).filter((r): r is Role => r !== undefined);
		return Result.ok(roles);
	}

	// Test helper
	setUserRoles(userId: string, roleIds: string[]) {
		this.userRoles.set(userId, roleIds);
	}
}

describe('RBACService', () => {
	let service: RBACService;
	let repository: MockRoleRepository;

	beforeEach(() => {
		repository = new MockRoleRepository();
		service = new RBACService(repository);
	});

	describe('getRoleById', () => {
		it('should return role when found', async () => {
			const createResult = await repository.create({
				name: 'Test Role',
				hierarchyLevel: 50,
				permissions: ['employees:read:team']
			});
			const roleId = createResult.value.id;

			const result = await service.getRoleById(roleId);

			expect(result.isOk).toBe(true);
			expect(result.value.name).toBe('Test Role');
		});

		it('should return error when role not found', async () => {
			const result = await service.getRoleById('nonexistent');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(RoleNotFoundError);
		});
	});

	describe('checkPermission', () => {
		it('should return true when user has permission', async () => {
			const hierarchy = RoleHierarchy.create('Manager').value;
			const permission = Permission.create('employees:read:team').value;
			const role = Role.create({
				id: 'role-123',
				name: 'Manager',
				hierarchy,
				permissions: [permission],
				createdAt: new Date(),
				updatedAt: new Date()
			}).value;

			repository['roles'].set('role-123', role);
			repository.setUserRoles('user-123', ['role-123']);

			const result = await service.checkPermission('user-123', 'employees:read:team');

			expect(result.isOk).toBe(true);
			expect(result.value).toBe(true);
		});

		it('should return false when user lacks permission', async () => {
			const hierarchy = RoleHierarchy.create('Employee').value;
			const role = Role.create({
				id: 'role-123',
				name: 'Employee',
				hierarchy,
				permissions: [],
				createdAt: new Date(),
				updatedAt: new Date()
			}).value;

			repository['roles'].set('role-123', role);
			repository.setUserRoles('user-123', ['role-123']);

			const result = await service.checkPermission('user-123', 'employees:write:all');

			expect(result.isOk).toBe(true);
			expect(result.value).toBe(false);
		});

		it('should match wildcard permissions', async () => {
			const hierarchy = RoleHierarchy.create('Admin').value;
			const wildcardPerm = Permission.create('*').value;
			const role = Role.create({
				id: 'role-123',
				name: 'Admin',
				hierarchy,
				permissions: [wildcardPerm],
				createdAt: new Date(),
				updatedAt: new Date()
			}).value;

			repository['roles'].set('role-123', role);
			repository.setUserRoles('user-123', ['role-123']);

			const result = await service.checkPermission('user-123', 'anything:write:all');

			expect(result.isOk).toBe(true);
			expect(result.value).toBe(true);
		});
	});

	describe('getHighestRole', () => {
		it('should return highest role among user roles', async () => {
			const managerHierarchy = RoleHierarchy.create('Manager').value;
			const employeeHierarchy = RoleHierarchy.create('Employee').value;

			const managerRole = Role.create({
				id: 'role-manager',
				name: 'Manager',
				hierarchy: managerHierarchy,
				permissions: [],
				createdAt: new Date(),
				updatedAt: new Date()
			}).value;

			const employeeRole = Role.create({
				id: 'role-employee',
				name: 'Employee',
				hierarchy: employeeHierarchy,
				permissions: [],
				createdAt: new Date(),
				updatedAt: new Date()
			}).value;

			repository['roles'].set('role-manager', managerRole);
			repository['roles'].set('role-employee', employeeRole);
			repository.setUserRoles('user-123', ['role-manager', 'role-employee']);

			const result = await service.getHighestRole('user-123');

			expect(result.isOk).toBe(true);
			expect(result.value?.name).toBe('Manager');
		});

		it('should return undefined when user has no roles', async () => {
			repository.setUserRoles('user-123', []);

			const result = await service.getHighestRole('user-123');

			expect(result.isOk).toBe(true);
			expect(result.value).toBeUndefined();
		});
	});
});
```

**Step 2: Run test to verify it fails**

```bash
npm run test:unit -- src/services/RBACService.test.ts
```

Expected: FAIL with "Cannot find module './RBACService'"

**Step 3: Write minimal implementation**

```typescript
// src/services/RBACService.ts
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
```

**Step 4: Run test to verify it passes**

```bash
npm run test:unit -- src/services/RBACService.test.ts
```

Expected: PASS (8 tests)

**Step 5: Commit**

```bash
git add src/services/RBACService.ts src/services/RBACService.test.ts
git commit -m "feat(rbac): add RBACService with permission checking logic"
```

---

## Phase 3: Adapter Layer

### Task 7: Create GraphQLRoleAdapter

**Files:**

- Create: `src/adapters/graphql/GraphQLRoleAdapter.ts`
- Create: `src/adapters/graphql/GraphQLRoleAdapter.test.ts`

**Step 1: Write the failing test**

```typescript
// src/adapters/graphql/GraphQLRoleAdapter.test.ts
import { describe, it, expect } from 'vitest';
import { GraphQLRoleAdapter } from './GraphQLRoleAdapter';
import { RoleNotFoundError } from '$domain/RBAC';
import { Client } from '@urql/core';

// Mock URQL client
function createMockClient(responses: Record<string, unknown>): Client {
	return {
		query: (_query: unknown, _variables: unknown) => ({
			toPromise: async () => responses['query'] ?? { data: null, error: null }
		}),
		mutation: (_mutation: unknown, _variables: unknown) => ({
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
							hierarchyLevel: 50,
							permissions: ['employees:read:team', 'tasks:write:team'],
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
							hierarchyLevel: 40,
							permissions: ['tasks:read:team'],
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
								hierarchyLevel: 50,
								permissions: ['employees:read:team'],
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
```

**Step 2: Run test to verify it fails**

```bash
npm run test:unit -- src/adapters/graphql/GraphQLRoleAdapter.test.ts
```

Expected: FAIL with "Cannot find module './GraphQLRoleAdapter'"

**Step 3: Write minimal implementation**

```typescript
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
import {
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

interface GraphQLRole {
	id: string;
	name: string;
	hierarchyLevel: number;
	permissions: string[];
	description?: string;
	createdAt: string;
	updatedAt: string;
}

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

		const permissions: Permission[] = [];
		for (const permString of data.permissions) {
			const permResult = Permission.create(permString);
			if (permResult.isOk) {
				permissions.push(permResult.value);
			}
		}

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
```

**Step 4: Create placeholder GraphQL operations**

```typescript
// src/lib/graphql/rbac/queries.ts
export const GET_ROLE_BY_ID = `
  query GetRoleById($id: UUID!) {
    role(id: $id) {
      id
      name
      hierarchyLevel
      permissions
      description
      createdAt
      updatedAt
    }
  }
`;

export const GET_ALL_ROLES = `
  query GetAllRoles($filter: RoleFilter) {
    roles(filter: $filter) {
      id
      name
      hierarchyLevel
      permissions
      description
      createdAt
      updatedAt
    }
  }
`;

export const GET_USER_ROLES = `
  query GetUserRoles($userId: UUID!) {
    userRoles(userId: $userId) {
      id
      name
      hierarchyLevel
      permissions
      description
      createdAt
      updatedAt
    }
  }
`;
```

```typescript
// src/lib/graphql/rbac/mutations.ts
export const CREATE_ROLE = `
  mutation CreateRole($input: CreateRoleInput!) {
    createRole(input: $input) {
      id
      name
      hierarchyLevel
      permissions
      description
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_ROLE = `
  mutation UpdateRole($id: UUID!, $input: UpdateRoleInput!) {
    updateRole(id: $id, input: $input) {
      id
      name
      hierarchyLevel
      permissions
      description
      createdAt
      updatedAt
    }
  }
`;

export const DELETE_ROLE = `
  mutation DeleteRole($id: UUID!) {
    deleteRole(id: $id)
  }
`;

export const ADD_PERMISSION_TO_ROLE = `
  mutation AddPermissionToRole($roleId: UUID!, $permission: String!) {
    addPermissionToRole(roleId: $roleId, permission: $permission) {
      id
      name
      hierarchyLevel
      permissions
      description
      createdAt
      updatedAt
    }
  }
`;

export const REMOVE_PERMISSION_FROM_ROLE = `
  mutation RemovePermissionFromRole($roleId: UUID!, $permission: String!) {
    removePermissionFromRole(roleId: $roleId, permission: $permission) {
      id
      name
      hierarchyLevel
      permissions
      description
      createdAt
      updatedAt
    }
  }
`;
```

**Step 5: Run test to verify it passes**

```bash
npm run test:unit -- src/adapters/graphql/GraphQLRoleAdapter.test.ts
```

Expected: PASS (5 tests)

**Step 6: Commit**

```bash
git add src/adapters/graphql/GraphQLRoleAdapter.ts src/adapters/graphql/GraphQLRoleAdapter.test.ts src/lib/graphql/rbac/
git commit -m "feat(rbac): add GraphQLRoleAdapter implementing RoleRepository"
```

---

## Phase 4: Integration

### Task 8: Create rbacServiceFactory

**Files:**

- Create: `src/lib/services/rbacServiceFactory.ts`
- Create: `src/lib/services/rbacServiceFactory.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/services/rbacServiceFactory.test.ts
import { describe, it, expect } from 'vitest';
import { createRBACService } from './rbacServiceFactory';
import { RBACService } from '$services/RBACService';

describe('rbacServiceFactory', () => {
	it('should create RBACService instance', () => {
		const mockEvent = {
			fetch: globalThis.fetch,
			cookies: {
				getAll: () => []
			}
		} as any;

		const service = createRBACService(mockEvent);

		expect(service).toBeInstanceOf(RBACService);
	});

	it('should create service with authenticated client', () => {
		const mockEvent = {
			fetch: globalThis.fetch,
			cookies: {
				getAll: () => [{ name: 'session', value: 'test-session' }]
			}
		} as any;

		const service = createRBACService(mockEvent);

		expect(service).toBeInstanceOf(RBACService);
	});
});
```

**Step 2: Run test to verify it fails**

```bash
npm run test:unit -- src/lib/services/rbacServiceFactory.test.ts
```

Expected: FAIL with "Cannot find module './rbacServiceFactory'"

**Step 3: Write minimal implementation**

```typescript
// src/lib/services/rbacServiceFactory.ts
import type { RequestEvent } from '@sveltejs/kit';
import { RBACService } from '$services/RBACService';
import { GraphQLRoleAdapter } from '$adapters/graphql/GraphQLRoleAdapter';
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';

export function createRBACService(event: RequestEvent): RBACService {
	const client = createUrqlClient(
		event.fetch,
		undefined,
		undefined,
		serializeCookies(event.cookies)
	);

	const adapter = new GraphQLRoleAdapter(client);
	return new RBACService(adapter);
}
```

**Step 4: Run test to verify it passes**

```bash
npm run test:unit -- src/lib/services/rbacServiceFactory.test.ts
```

Expected: PASS (2 tests)

**Step 5: Commit**

```bash
git add src/lib/services/rbacServiceFactory.ts src/lib/services/rbacServiceFactory.test.ts
git commit -m "feat(rbac): add rbacServiceFactory for dependency injection"
```

---

### Task 9: Update ServiceContainer

**Files:**

- Modify: `src/lib/server/services.ts`

**Step 1: Add import and field**

Add to imports:

```typescript
import { createRBACService } from '$lib/services/rbacServiceFactory';
import type { RBACService } from '$services/RBACService';
```

Add private field:

```typescript
private _rbacService?: RBACService;
```

Add getter:

```typescript
get rbacService(): RBACService {
  if (!this._rbacService) {
    this._rbacService = createRBACService(this.event);
  }
  return this._rbacService;
}
```

Re-export factory:

```typescript
export { createRBACService } from '$lib/services/rbacServiceFactory';
```

**Step 2: Verify it compiles**

```bash
npm run check
```

Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add src/lib/server/services.ts
git commit -m "feat(rbac): add rbacService to ServiceContainer"
```

---

## Phase 5: Documentation & Completion

### Task 10: Create migration completion report

**Files:**

- Create: `docs/architecture/rbac-module-hexagonal-migration-completion.md`

**Content:** Similar structure to Tasks module report, documenting:

- Score improvement (40/100 → 90/100)
- Tests added (count actual)
- Files created (list all)
- Architecture benefits
- Key patterns used
- Testing strategy
- Commits
- Lessons learned
- Next modules

**Commit:**

```bash
git add docs/architecture/rbac-module-hexagonal-migration-completion.md
git commit -m "docs(rbac): add RBAC module hexagonal migration completion report"
```

---

### Task 11: Update MEMORY.md

**Files:**

- Modify: `/home/chanway/.claude/projects/-home-chanway-Documents-SvelteHR/memory/MEMORY.md`

**Changes:**

- Update "Completed Modules" from 5/23 to 6/23
- Add RBAC entry with test count
- Update "Remaining" count from 18 to 17 modules
- Add RBAC Module Migration section with details

**Note:** No git commit needed (outside repository)

---

## Summary

**Total Tasks:** 11
**Estimated Time:** 5-7 days (40-56 hours)
**With Parallel Agents:** 6-8 hours

**Test Coverage Goal:** 50+ tests
**Target Score:** 90/100

**Pattern:** Follow Tasks module success (90/100, 6 hours, 73 tests)

---

## Next Steps After RBAC

Based on `docs/architecture/module-architecture-inventory.md`:

- **Performance Reviews** (6 days) - Complex relationships
- **Goals** (4 days) - Simpler structure
- **Events** (3 days) - Calendar integration
