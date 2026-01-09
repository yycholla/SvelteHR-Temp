import { logger } from '$lib/utils/logger';
/**
 * RLS (Row-Level Security) Policy Helpers
 * Feature: 020-we-need-to (Comprehensive Audit Logging with Rollback)
 * Task: T035
 * Created: 2025-10-02
 *
 * Utilities for extracting JWT claims and setting PostGraphile session variables.
 * Enables RLS policy enforcement based on user role and department.
 */

import type { Sql } from 'postgres';
import jwt from 'jsonwebtoken';

export interface JWTClaims {
	user_id: string;
	role: string;
	department_id?: string;
	permissions?: string[];
	email?: string;
	full_name?: string;
}

export interface RLSContext {
	userId: string;
	role: string;
	departmentId: string | null;
	scope: 'department' | 'organization' | 'none';
}

/**
 * Extracts JWT claims from token
 *
 * @param token JWT token string
 * @returns JWT claims
 */
export function extractJWTClaims(token: string): JWTClaims {
	try {
		// Decode without verification (verification happens elsewhere)
		const decoded = jwt.decode(token) as any;

		if (!decoded) {
			throw new Error('Invalid JWT token');
		}

		// Extract required claims
		const claims: JWTClaims = {
			user_id: decoded.user_id || decoded.sub || decoded.id,
			role: decoded.role || decoded.user_role || 'employee',
			department_id: decoded.department_id || null,
			permissions: decoded.permissions || [],
			email: decoded.email,
			full_name: decoded.full_name || decoded.name
		};

		// Validate required fields
		if (!claims.user_id) {
			throw new Error('JWT missing user_id claim');
		}

		if (!claims.role) {
			throw new Error('JWT missing role claim');
		}

		return claims;
	} catch (error) {
		logger.error('[RLSHelpers] Failed to extract JWT claims:', error as Error);
		throw new Error('Failed to extract JWT claims');
	}
}

/**
 * Builds RLS context from JWT claims
 *
 * @param claims JWT claims
 * @returns RLS context
 */
export function buildRLSContext(claims: JWTClaims): RLSContext {
	const role = claims.role.toLowerCase();

	// Determine scope based on role
	let scope: 'department' | 'organization' | 'none' = 'none';

	if (role === 'super_admin' || role === 'hr_admin') {
		scope = 'organization';
	} else if (role === 'admin' || role === 'manager') {
		scope = 'department';
	}

	return {
		userId: claims.user_id,
		role: claims.role,
		departmentId: claims.department_id || null,
		scope
	};
}

/**
 * Sets PostGraphile session variables for RLS policies
 *
 * @param context RLS context
 * @param connection Database connection
 */
export async function setPostGraphileSessionVariables(
	context: RLSContext,
	connection: Sql
): Promise<void> {
	try {
		// Set jwt.claims.user_id
		await connection`
			SET LOCAL jwt.claims.user_id = ${context.userId}
		`;

		// Set jwt.claims.role
		await connection`
			SET LOCAL jwt.claims.role = ${context.role}
		`;

		// Set jwt.claims.department_id (if applicable)
		if (context.departmentId) {
			await connection`
				SET LOCAL jwt.claims.department_id = ${context.departmentId}
			`;
		}

		// Set jwt.claims.scope
		await connection`
			SET LOCAL jwt.claims.scope = ${context.scope}
		`;
	} catch (error) {
		logger.error('[RLSHelpers] Failed to set session variables:', error as Error);
		throw new Error('Failed to set session variables for RLS');
	}
}

/**
 * Sets up RLS context from JWT token
 *
 * @param token JWT token string
 * @param connection Database connection
 * @returns RLS context
 */
export async function setupRLSContext(token: string, connection: Sql): Promise<RLSContext> {
	const claims = extractJWTClaims(token);
	const context = buildRLSContext(claims);

	await setPostGraphileSessionVariables(context, connection);

	return context;
}

/**
 * Applies department-scoped WHERE clause for admin queries
 *
 * @param context RLS context
 * @returns SQL WHERE clause fragment
 */
export function applyDepartmentFilter(context: RLSContext): string {
	if (context.scope !== 'department') {
		return ''; // No filter needed
	}

	if (!context.departmentId) {
		throw new Error('Department ID required for department-scoped access');
	}

	return `employee.department_id = '${context.departmentId}'`;
}

/**
 * Applies organization-wide WHERE clause (no filtering)
 *
 * @param context RLS context
 * @returns SQL WHERE clause fragment (empty for org-wide)
 */
export function applyOrganizationFilter(context: RLSContext): string {
	if (context.scope !== 'organization') {
		return ''; // Not org-wide access
	}

	// No filtering for organization-wide access
	return '';
}

/**
 * Checks if user has permission to access resource
 *
 * @param context RLS context
 * @param resourceDepartmentId Department ID of the resource
 * @returns True if access allowed
 */
export function hasAccessToResource(
	context: RLSContext,
	resourceDepartmentId: string | null
): boolean {
	// Organization-wide access
	if (context.scope === 'organization') {
		return true;
	}

	// Department-scoped access
	if (context.scope === 'department') {
		if (!context.departmentId) {
			return false;
		}

		return context.departmentId === resourceDepartmentId;
	}

	// No scope (employee)
	return false;
}

/**
 * Gets SQL filter clause based on RLS context
 *
 * @param context RLS context
 * @param tableName Table name or alias
 * @param departmentColumn Department column name (default: 'department_id')
 * @returns SQL WHERE clause
 */
export function getRLSFilterClause(
	context: RLSContext,
	tableName: string,
	departmentColumn = 'department_id'
): string {
	switch (context.scope) {
		case 'organization':
			// No filtering for org-wide access
			return '';

		case 'department':
			if (!context.departmentId) {
				// Deny all if department_id missing
				return '1 = 0';
			}
			return `${tableName}.${departmentColumn} = '${context.departmentId}'`;

		case 'none':
		default:
			// Deny all for employees
			return '1 = 0';
	}
}

/**
 * Validates RLS context
 *
 * @param context RLS context
 * @returns Validation result
 */
export function validateRLSContext(context: RLSContext): {
	valid: boolean;
	errors: string[];
} {
	const errors: string[] = [];

	// Validate user ID format
	const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	if (!uuidRegex.test(context.userId)) {
		errors.push('Invalid user ID format');
	}

	// Validate role
	const validRoles = ['super_admin', 'hr_admin', 'admin', 'manager', 'employee'];
	if (!validRoles.includes(context.role.toLowerCase())) {
		errors.push('Invalid role');
	}

	// Validate department_id for department-scoped roles
	if (context.scope === 'department' && !context.departmentId) {
		errors.push('Department ID required for department-scoped access');
	}

	// Validate department_id format
	if (context.departmentId && !uuidRegex.test(context.departmentId)) {
		errors.push('Invalid department ID format');
	}

	return {
		valid: errors.length === 0,
		errors
	};
}

/**
 * Clears PostGraphile session variables
 *
 * @param connection Database connection
 */
export async function clearPostGraphileSessionVariables(connection: Sql): Promise<void> {
	try {
		await connection`
			RESET jwt.claims.user_id;
			RESET jwt.claims.role;
			RESET jwt.claims.department_id;
			RESET jwt.claims.scope;
		`;
	} catch (error) {
		logger.error('[RLSHelpers] Failed to clear session variables:', error as Error);
	}
}

/**
 * Checks if role has super admin privileges
 *
 * @param role User role
 * @returns True if super admin
 */
export function isSuperAdmin(role: string): boolean {
	return role.toLowerCase() === 'super_admin';
}

/**
 * Checks if role has HR admin privileges
 *
 * @param role User role
 * @returns True if HR admin or super admin
 */
export function isHRAdmin(role: string): boolean {
	const normalized = role.toLowerCase();
	return normalized === 'hr_admin' || normalized === 'super_admin';
}

/**
 * Checks if role has admin privileges
 *
 * @param role User role
 * @returns True if admin, HR admin, or super admin
 */
export function isAdmin(role: string): boolean {
	const normalized = role.toLowerCase();
	return normalized === 'admin' || normalized === 'hr_admin' || normalized === 'super_admin';
}

/**
 * Gets minimum role level (higher number = more privileges)
 *
 * @param role User role
 * @returns Role level number
 */
export function getRoleLevel(role: string): number {
	const levels: Record<string, number> = {
		employee: 20,
		manager: 50,
		admin: 60,
		hr_admin: 80,
		super_admin: 100
	};

	return levels[role.toLowerCase()] || 0;
}

/**
 * Checks if user role has sufficient level
 *
 * @param userRole User's role
 * @param requiredRole Required role
 * @returns True if user has sufficient level
 */
export function hasMinimumRole(userRole: string, requiredRole: string): boolean {
	return getRoleLevel(userRole) >= getRoleLevel(requiredRole);
}
