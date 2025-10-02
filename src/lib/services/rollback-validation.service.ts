/**
 * Rollback Validation Service
 * Feature: 020-we-need-to (Comprehensive Audit Logging with Rollback)
 * Task: T030
 * Created: 2025-10-02
 *
 * Service for validating rollback operations before execution.
 * Prevents invalid rollbacks and enforces business rules.
 */

import { db } from '$lib/server/db';
import type { Sql } from 'postgres';

export interface ValidationResult {
	valid: boolean;
	errors: string[];
	warnings: string[];
}

export interface RollbackContext {
	logId: string;
	userId: string;
	userRole: string;
	reason?: string;
}

/**
 * Validates if a rollback operation can be performed
 *
 * @param context Rollback context with log ID and user info
 * @param connection Optional database connection
 * @returns Validation result
 */
export async function validateRollback(
	context: RollbackContext,
	connection?: Sql
): Promise<ValidationResult> {
	const sql = connection || db;
	const errors: string[] = [];
	const warnings: string[] = [];

	try {
		// Fetch activity log
		const logResult = await sql`
			SELECT
				id,
				employee_id,
				action,
				resource_type,
				resource_id,
				before_snapshot,
				after_snapshot,
				is_rollback,
				rolled_back_log_id,
				created_at
			FROM activity_logs
			WHERE id = ${context.logId}::uuid
		`;

		if (logResult.length === 0) {
			errors.push('Activity log not found');
			return { valid: false, errors, warnings };
		}

		const log = logResult[0];

		// Rule 1: Cannot rollback a rollback
		if (log.is_rollback) {
			errors.push('Cannot rollback a rollback operation');
		}

		// Rule 2: Cannot rollback READ operations
		if (log.action === 'read') {
			errors.push('Cannot rollback READ operations (no state change occurred)');
		}

		// Rule 3: Validate user has super_admin role
		if (context.userRole !== 'super_admin') {
			errors.push('Only super_admin users can execute rollbacks');
		}

		// Rule 4: Validate resource still exists (for UPDATE/DELETE)
		if (log.action === 'update' || log.action === 'delete') {
			const resourceExists = await checkResourceExists(
				log.resource_type,
				log.resource_id,
				sql
			);

			if (log.action === 'update' && !resourceExists) {
				errors.push('Cannot rollback UPDATE: resource has been deleted');
			}

			if (log.action === 'delete' && resourceExists) {
				warnings.push('Resource already exists (may have been recreated)');
			}
		}

		// Rule 5: Validate resource doesn't exist (for CREATE)
		if (log.action === 'create') {
			const resourceExists = await checkResourceExists(
				log.resource_type,
				log.resource_id,
				sql
			);

			if (!resourceExists) {
				warnings.push('Resource no longer exists (may have been deleted already)');
			}
		}

		// Rule 6: Validate snapshots exist when required
		if (log.action === 'update' || log.action === 'delete') {
			if (!log.before_snapshot) {
				errors.push(`Cannot rollback ${log.action.toUpperCase()}: before_snapshot is missing`);
			}
		}

		// Rule 7: Check if log has already been rolled back
		const existingRollback = await sql`
			SELECT id FROM activity_logs
			WHERE rolled_back_log_id = ${context.logId}::uuid
			LIMIT 1
		`;

		if (existingRollback.length > 0) {
			warnings.push('This log has already been rolled back previously');
		}

		// Rule 8: Validate reason is provided
		if (!context.reason || context.reason.trim().length === 0) {
			errors.push('Rollback reason is required');
		} else if (context.reason.trim().length < 10) {
			errors.push('Rollback reason must be at least 10 characters');
		}

		// Rule 9: Check for foreign key dependencies (for DELETE rollback)
		if (log.action === 'delete' && log.before_snapshot) {
			const dependencies = await checkForeignKeyDependencies(
				log.resource_type,
				log.resource_id,
				sql
			);

			if (dependencies.length > 0) {
				warnings.push(
					`Resource has ${dependencies.length} foreign key dependencies that will be restored`
				);
			}
		}

		// Rule 10: Validate UUID formats
		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		if (!uuidRegex.test(context.logId)) {
			errors.push('Invalid log ID format');
		}
		if (!uuidRegex.test(context.userId)) {
			errors.push('Invalid user ID format');
		}

		return {
			valid: errors.length === 0,
			errors,
			warnings
		};
	} catch (error) {
		console.error('[RollbackValidation] Validation error:', error);
		errors.push(`Validation failed: ${error instanceof Error ? error.message : String(error)}`);

		return {
			valid: false,
			errors,
			warnings
		};
	}
}

/**
 * Checks if a resource exists in the database
 *
 * @param tableName Database table name
 * @param resourceId Resource UUID
 * @param connection Database connection
 * @returns True if resource exists
 */
async function checkResourceExists(
	tableName: string,
	resourceId: string,
	connection: Sql
): Promise<boolean> {
	try {
		const result = await connection`
			SELECT EXISTS(
				SELECT 1 FROM ${connection(tableName)}
				WHERE id = ${resourceId}::uuid
			) as exists
		`;

		return result[0]?.exists || false;
	} catch (error) {
		console.error(`[RollbackValidation] Error checking resource existence:`, error);
		return false;
	}
}

/**
 * Checks for foreign key dependencies that would be restored
 *
 * @param tableName Database table name
 * @param resourceId Resource UUID
 * @param connection Database connection
 * @returns Array of dependent table names
 */
async function checkForeignKeyDependencies(
	tableName: string,
	resourceId: string,
	connection: Sql
): Promise<string[]> {
	try {
		// Query foreign key constraints
		const fkResult = await connection`
			SELECT
				tc.table_name as referencing_table
			FROM information_schema.table_constraints AS tc
			JOIN information_schema.key_column_usage AS kcu
				ON tc.constraint_name = kcu.constraint_name
				AND tc.table_schema = kcu.table_schema
			JOIN information_schema.constraint_column_usage AS ccu
				ON ccu.constraint_name = tc.constraint_name
				AND ccu.table_schema = tc.table_schema
			WHERE tc.constraint_type = 'FOREIGN KEY'
				AND ccu.table_name = ${tableName}
				AND ccu.column_name = 'id'
		`;

		return fkResult.map((row: any) => row.referencing_table);
	} catch (error) {
		console.error(`[RollbackValidation] Error checking FK dependencies:`, error);
		return [];
	}
}

/**
 * Validates batch rollback operation
 *
 * @param logIds Array of log IDs to rollback
 * @param userId User performing rollback
 * @param userRole User's role
 * @param connection Optional database connection
 * @returns Validation result for each log
 */
export async function validateBatchRollback(
	logIds: string[],
	userId: string,
	userRole: string,
	connection?: Sql
): Promise<Map<string, ValidationResult>> {
	const results = new Map<string, ValidationResult>();

	// Validate batch size
	if (logIds.length > 100) {
		const batchError: ValidationResult = {
			valid: false,
			errors: ['Batch size exceeds maximum of 100 operations'],
			warnings: []
		};

		// Apply error to all logs
		for (const logId of logIds) {
			results.set(logId, batchError);
		}

		return results;
	}

	// Validate each log individually
	for (const logId of logIds) {
		const context: RollbackContext = {
			logId,
			userId,
			userRole,
			reason: 'Batch rollback operation'
		};

		const result = await validateRollback(context, connection);
		results.set(logId, result);
	}

	return results;
}

/**
 * Validates user has permission to rollback
 *
 * @param userId User UUID
 * @param connection Optional database connection
 * @returns True if user has permission
 */
export async function validateUserPermission(
	userId: string,
	connection?: Sql
): Promise<boolean> {
	const sql = connection || db;

	try {
		// Check user's role
		const userResult = await sql`
			SELECT role FROM users
			WHERE id = ${userId}::uuid
		`;

		if (userResult.length === 0) {
			return false;
		}

		const user = userResult[0];

		// Only super_admin can rollback
		return user.role === 'super_admin';
	} catch (error) {
		console.error('[RollbackValidation] Error validating user permission:', error);
		return false;
	}
}

/**
 * Validates rollback request
 *
 * @param requestId Rollback request UUID
 * @param connection Optional database connection
 * @returns Validation result
 */
export async function validateRollbackRequest(
	requestId: string,
	connection?: Sql
): Promise<ValidationResult> {
	const sql = connection || db;
	const errors: string[] = [];
	const warnings: string[] = [];

	try {
		// Fetch rollback request
		const requestResult = await sql`
			SELECT
				id,
				activity_log_id,
				requested_by,
				requested_at,
				reason,
				status,
				reviewed_by,
				reviewed_at
			FROM rollback_requests
			WHERE id = ${requestId}::uuid
		`;

		if (requestResult.length === 0) {
			errors.push('Rollback request not found');
			return { valid: false, errors, warnings };
		}

		const request = requestResult[0];

		// Validate request status
		if (request.status !== 'pending') {
			errors.push(`Rollback request has already been ${request.status}`);
		}

		// Validate activity log exists
		const logResult = await sql`
			SELECT id FROM activity_logs
			WHERE id = ${request.activity_log_id}::uuid
		`;

		if (logResult.length === 0) {
			errors.push('Referenced activity log not found');
		}

		return {
			valid: errors.length === 0,
			errors,
			warnings
		};
	} catch (error) {
		console.error('[RollbackValidation] Error validating rollback request:', error);
		errors.push(`Validation failed: ${error instanceof Error ? error.message : String(error)}`);

		return {
			valid: false,
			errors,
			warnings
		};
	}
}
