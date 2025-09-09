/**
 * Authentication System
 * Handles JWT tokens, RBAC, and secure session management
 */

export type UserRole = 'employee' | 'manager' | 'hr_manager' | 'admin';

export interface User {
	id: string;
	email: string;
	name: string;
	role: UserRole;
	department_id?: string;
	permissions: string[];
	last_login?: string;
	created_at: string;
	updated_at: string;
}

export interface AuthSession {
	user: User;
	token: string;
	expires_at: string;
	refresh_token?: string;
	session_id: string;
}

export interface LoginCredentials {
	email: string;
	password: string;
	remember?: boolean;
}

export interface LoginResponse {
	success: boolean;
	user?: User;
	token?: string;
	refresh_token?: string;
	expires_at?: string;
	session_id?: string;
	error?: string;
	requires_2fa?: boolean;
	partial_token?: string;
}

export interface TokenPayload {
	user_id: string;
	email: string;
	role: UserRole;
	permissions: string[];
	department_id?: string;
	session_id: string;
	iat: number;
	exp: number;
}

// Permission constants for RBAC
export const PERMISSIONS = {
	// Profile permissions
	PROFILE_READ: 'profile:read',
	PROFILE_UPDATE: 'profile:update',
	
	// Employee permissions
	EMPLOYEES_CREATE: 'employees:create',
	EMPLOYEES_READ: 'employees:read',
	EMPLOYEES_UPDATE: 'employees:update',
	EMPLOYEES_DELETE: 'employees:delete',
	EMPLOYEES_ALL: 'employees:*',
	
	// Payroll permissions
	PAYROLL_READ: 'payroll:read',
	PAYROLL_WRITE: 'payroll:write',
	PAYROLL_ALL: 'payroll:*',
	
	// Department permissions
	DEPARTMENTS_READ: 'departments:read',
	DEPARTMENTS_WRITE: 'departments:write',
	DEPARTMENTS_ALL: 'departments:*',
	
	// Role permissions
	ROLES_READ: 'roles:read',
	ROLES_WRITE: 'roles:write',
	ROLES_ALL: 'roles:*',
	
	// System permissions
	SYSTEM_ADMIN: '*',
	AUDIT_READ: 'audit:read',
	REPORTS_READ: 'reports:read',
	REPORTS_HR: 'reports:hr'
} as const;

// Role hierarchy and default permissions
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
	employee: [
		PERMISSIONS.PROFILE_READ,
		PERMISSIONS.PROFILE_UPDATE,
		'timesheet:*',
		'leave:create',
		'documents:own'
	],
	manager: [
		PERMISSIONS.PROFILE_READ,
		PERMISSIONS.PROFILE_UPDATE,
		PERMISSIONS.EMPLOYEES_READ,
		PERMISSIONS.EMPLOYEES_UPDATE,
		'team:manage',
		'reports:team',
		'approvals:*'
	],
	hr_manager: [
		PERMISSIONS.EMPLOYEES_ALL,
		PERMISSIONS.PAYROLL_READ,
		PERMISSIONS.DEPARTMENTS_ALL,
		PERMISSIONS.REPORTS_HR,
		'compliance:*',
		'benefits:*',
		'recruitment:*'
	],
	admin: [
		PERMISSIONS.SYSTEM_ADMIN
	]
};

// Role hierarchy levels (higher number = more privileged)
export const ROLE_LEVELS: Record<UserRole, number> = {
	employee: 1,
	manager: 2,
	hr_manager: 3,
	admin: 4
};

/**
 * Check if user has specific permission
 */
export function hasPermission(user: User, permission: string): boolean {
	if (!user || !user.permissions) {
		return false;
	}
	
	// Admin wildcard permission
	if (user.permissions.includes(PERMISSIONS.SYSTEM_ADMIN)) {
		return true;
	}
	
	// Direct permission match
	if (user.permissions.includes(permission)) {
		return true;
	}
	
	// Wildcard permission match (e.g., employees:* matches employees:read)
	const [resource] = permission.split(':');
	const wildcardPermission = `${resource}:*`;
	return user.permissions.includes(wildcardPermission);
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(user: User, permissions: string[]): boolean {
	return permissions.some(permission => hasPermission(user, permission));
}

/**
 * Check if user has all specified permissions
 */
export function hasAllPermissions(user: User, permissions: string[]): boolean {
	return permissions.every(permission => hasPermission(user, permission));
}

/**
 * Check if user role is at least the specified level
 */
export function hasRoleLevel(user: User, minRole: UserRole): boolean {
	if (!user || !user.role) {
		return false;
	}
	
	const userLevel = ROLE_LEVELS[user.role] || 0;
	const minLevel = ROLE_LEVELS[minRole] || 0;
	
	return userLevel >= minLevel;
}

/**
 * Check if user can access department data
 */
export function canAccessDepartment(user: User, departmentId: string): boolean {
	// Admin and HR Manager can access all departments
	if (hasPermission(user, PERMISSIONS.SYSTEM_ADMIN) || 
		hasPermission(user, PERMISSIONS.EMPLOYEES_ALL)) {
		return true;
	}
	
	// Manager can only access their own department
	if (user.role === 'manager') {
		return user.department_id === departmentId;
	}
	
	// Employee can only access their own department for limited data
	if (user.role === 'employee') {
		return user.department_id === departmentId;
	}
	
	return false;
}

/**
 * Check if user can access another user's data
 */
export function canAccessUser(currentUser: User, targetUserId: string): boolean {
	// User can always access their own data
	if (currentUser.id === targetUserId) {
		return true;
	}
	
	// Admin can access anyone
	if (hasPermission(currentUser, PERMISSIONS.SYSTEM_ADMIN)) {
		return true;
	}
	
	// HR Manager can access all employees
	if (hasPermission(currentUser, PERMISSIONS.EMPLOYEES_ALL)) {
		return true;
	}
	
	// Managers can access employees in their department (would need to check target user's department)
	if (currentUser.role === 'manager' && 
		hasPermission(currentUser, PERMISSIONS.EMPLOYEES_READ)) {
		// This would require a database lookup to check target user's department
		// For now, return true if manager has employee read permission
		return true;
	}
	
	return false;
}

/**
 * Validate JWT token format (basic client-side validation)
 */
export function isValidTokenFormat(token: string): boolean {
	if (!token) return false;
	
	const parts = token.split('.');
	if (parts.length !== 3) return false;
	
	try {
		// Validate base64 encoding
		atob(parts[0]); // header
		atob(parts[1]); // payload
		// signature is validated server-side
		return true;
	} catch {
		return false;
	}
}

/**
 * Decode JWT payload (client-side - do not trust for security decisions)
 */
export function decodeTokenPayload(token: string): TokenPayload | null {
	if (!isValidTokenFormat(token)) return null;
	
	try {
		const payload = token.split('.')[1];
		const decoded = atob(payload);
		return JSON.parse(decoded) as TokenPayload;
	} catch {
		return null;
	}
}

/**
 * Check if token is expired (client-side check)
 */
export function isTokenExpired(token: string): boolean {
	const payload = decodeTokenPayload(token);
	if (!payload || !payload.exp) return true;
	
	const now = Math.floor(Date.now() / 1000);
	return payload.exp <= now;
}

/**
 * Get user permissions based on role with inheritance
 */
export function getUserPermissions(role: UserRole, customPermissions: string[] = []): string[] {
	const rolePermissions = ROLE_PERMISSIONS[role] || [];
	const allPermissions = [...new Set([...rolePermissions, ...customPermissions])];
	
	// Admin gets all permissions
	if (role === 'admin') {
		return [PERMISSIONS.SYSTEM_ADMIN];
	}
	
	return allPermissions;
}

/**
 * Create authentication error with consistent format
 */
export function createAuthError(
	code: string, 
	message: string, 
	statusCode: number = 401
): { error: string; code: string; status: number } {
	return {
		error: message,
		code,
		status: statusCode
	};
}

// Authentication error types
export const AUTH_ERRORS = {
	INVALID_CREDENTIALS: createAuthError('INVALID_CREDENTIALS', 'Invalid email or password', 401),
	TOKEN_EXPIRED: createAuthError('TOKEN_EXPIRED', 'Authentication token has expired', 401),
	TOKEN_INVALID: createAuthError('TOKEN_INVALID', 'Invalid authentication token', 401),
	INSUFFICIENT_PERMISSIONS: createAuthError('INSUFFICIENT_PERMISSIONS', 'Insufficient permissions for this action', 403),
	USER_NOT_FOUND: createAuthError('USER_NOT_FOUND', 'User not found', 404),
	ACCOUNT_DISABLED: createAuthError('ACCOUNT_DISABLED', 'Account is disabled', 403),
	RATE_LIMITED: createAuthError('RATE_LIMITED', 'Too many authentication attempts', 429),
	TWO_FACTOR_REQUIRED: createAuthError('TWO_FACTOR_REQUIRED', 'Two-factor authentication required', 200),
	SESSION_EXPIRED: createAuthError('SESSION_EXPIRED', 'Session has expired', 401)
} as const;

export default {
	hasPermission,
	hasAnyPermission,
	hasAllPermissions,
	hasRoleLevel,
	canAccessDepartment,
	canAccessUser,
	isValidTokenFormat,
	decodeTokenPayload,
	isTokenExpired,
	getUserPermissions,
	createAuthError,
	PERMISSIONS,
	ROLE_PERMISSIONS,
	ROLE_LEVELS,
	AUTH_ERRORS
};