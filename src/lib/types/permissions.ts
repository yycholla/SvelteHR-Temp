// T001: TypeScript permission types matching backend format
// Backend permission format: resource:action:scope OR resource:action
// Resources: lowercase (employees, departments, teams, etc.)
// Actions: lowercase (read, write, delete, approve, etc.)
// Scopes: lowercase (self, team, all) - READ-ONLY
// Roles: PascalCase (Admin, HR Manager, Manager, Employee)
// Admin wildcard: "*" or "*:*" grants all permissions

/**
 * Permission string literal type matching backend format
 * Format: "resource:action:scope" OR "resource:action" OR "*"
 */
export type PermissionString =
	// Admin wildcard
	| '*'
	| '*:*'
	// Employees
	| 'employees:read'
	| 'employees:read:self'
	| 'employees:read:team'
	| 'employees:read:all'
	| 'employees:write'
	| 'employees:write:self'
	| 'employees:write:team'
	| 'employees:write:all'
	| 'employees:delete'
	| 'employees:delete:all'
	// Departments
	| 'departments:read'
	| 'departments:read:all'
	| 'departments:write'
	| 'departments:write:all'
	| 'departments:delete'
	| 'departments:delete:all'
	// Teams
	| 'teams:read'
	| 'teams:read:team'
	| 'teams:read:all'
	| 'teams:write'
	| 'teams:write:team'
	| 'teams:write:all'
	| 'teams:delete'
	| 'teams:delete:all'
	// Performance
	| 'performance:read'
	| 'performance:read:self'
	| 'performance:read:team'
	| 'performance:read:all'
	| 'performance:write'
	| 'performance:write:team'
	| 'performance:write:all'
	// Goals
	| 'goals:read'
	| 'goals:read:self'
	| 'goals:read:team'
	| 'goals:read:all'
	| 'goals:write'
	| 'goals:write:self'
	| 'goals:write:team'
	| 'goals:write:all'
	| 'goals:delete'
	| 'goals:delete:all'
	// Reports
	| 'reports:read'
	| 'reports:read:team'
	| 'reports:read:all'
	| 'reports:execute'
	| 'reports:analytics'
	// Tasks
	| 'tasks:read'
	| 'tasks:read:self'
	| 'tasks:read:team'
	| 'tasks:read:all'
	| 'tasks:write'
	| 'tasks:write:self'
	| 'tasks:write:team'
	| 'tasks:write:all'
	| 'tasks:delete'
	| 'tasks:delete:all'
	| 'tasks:reassign'
	// Documents
	| 'documents:read'
	| 'documents:read:self'
	| 'documents:read:all'
	| 'documents:write'
	| 'documents:write:self'
	| 'documents:write:all'
	| 'documents:delete'
	| 'documents:delete:all'
	// Events
	| 'events:read'
	| 'events:read:all'
	| 'events:write'
	| 'events:write:all'
	| 'events:delete'
	| 'events:delete:all'
	// Attendance
	| 'attendance:read'
	| 'attendance:read:self'
	| 'attendance:read:team'
	| 'attendance:read:all'
	| 'attendance:write'
	| 'attendance:write:team'
	| 'attendance:write:all'
	| 'attendance:approve'
	// Admin
	| 'admin:read'
	| 'admin:write'
	| 'admin:delete'
	| 'admin:audit'
	// Leave
	| 'leave:read'
	| 'leave:read:self'
	| 'leave:read:team'
	| 'leave:read:all'
	| 'leave:write'
	| 'leave:write:self'
	| 'leave:approve'
	// Dashboard
	| 'dashboard:read'
	| 'dashboard:analytics'
	// Management
	| 'management:read'
	| 'management:write';

/**
 * Role names matching backend format (PascalCase)
 */
export type RoleName = 'Admin' | 'HR Manager' | 'Manager' | 'Employee' | 'guest';

/**
 * Role hierarchy with numeric levels
 * Higher number = more privileges
 */
export const RoleHierarchy = {
	Admin: 100,
	'HR Manager': 75,
	Manager: 50,
	Employee: 25,
	guest: 0
} as const satisfies Record<RoleName, number>;

/**
 * Role information with hierarchy level
 */
export interface Role {
	id: string;
	name: RoleName;
	level: number;
}

/**
 * User with roles and permissions
 */
export interface UserWithPermissions {
	id: string;
	email: string;
	displayName?: string;
	roles: Role[];
	permissions: PermissionString[];
}

/**
 * Permission context passed to components
 * Contains user's full permission set and helper flags
 */
export interface PermissionContext {
	/** User's permission strings from backend */
	permissions: PermissionString[];
	/** User's roles */
	roles: Role[];
	/** User ID for scope checks */
	userId: string;
	/** Computed permission flags for common checks */
	flags?: {
		isAdmin: boolean;
		isHRManager: boolean;
		isManager: boolean;
		canReadEmployees: boolean;
		canWriteEmployees: boolean;
		canDeleteEmployees: boolean;
		canReadDepartments: boolean;
		canWriteDepartments: boolean;
		canDeleteDepartments: boolean;
		canAccessAdmin: boolean;
		canAccessHR: boolean;
	};
}

/**
 * Permission check result with reasoning
 */
export interface PermissionCheckResult {
	allowed: boolean;
	reason?: string;
	matchedPermission?: PermissionString;
}

/**
 * Resource types matching backend lowercase format
 */
export type ResourceType =
	| 'employees'
	| 'departments'
	| 'teams'
	| 'performance'
	| 'goals'
	| 'reports'
	| 'tasks'
	| 'documents'
	| 'events'
	| 'attendance'
	| 'admin'
	| 'leave'
	| 'dashboard'
	| 'management';

/**
 * Action types matching backend lowercase format
 */
export type ActionType =
	| 'read'
	| 'write'
	| 'delete'
	| 'approve'
	| 'execute'
	| 'analytics'
	| 'audit'
	| 'reassign';

/**
 * Scope types matching backend lowercase format (read-only scopes)
 */
export type ScopeType = 'self' | 'team' | 'all';
