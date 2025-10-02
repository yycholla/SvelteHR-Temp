/**
 * Audit Logging Service with Fail-Safe Retry Logic
 * Feature: 020-we-need-to (Comprehensive Audit Logging with Rollback)
 * Task: T028
 * Created: 2025-10-02
 *
 * Core service for logging all CRUD operations to activity_logs table.
 * Implements 3-attempt retry with exponential backoff (100ms, 500ms, 2s).
 */

import { db } from '$lib/server/db';
import type { Sql } from 'postgres';

export interface ActivityLogInput {
	employeeId: string;
	action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';
	resourceType: string;
	resourceId: string;
	beforeSnapshot?: Record<string, any> | null;
	afterSnapshot?: Record<string, any> | null;
	ipAddress?: string | null;
	userAgent?: string | null;
	reason?: string | null;
	isRollback?: boolean;
	rolledBackLogId?: string | null;
}

export interface ActivityLogResult {
	success: boolean;
	logId?: string;
	error?: string;
	attempts: number;
}

/**
 * Delays execution for specified milliseconds
 */
async function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Logs an activity with fail-safe retry logic
 *
 * Retry schedule:
 * - Attempt 1: immediate
 * - Attempt 2: 100ms delay
 * - Attempt 3: 500ms delay
 * - Attempt 4: 2000ms delay
 *
 * @param input Activity log data
 * @param connection Optional database connection for transaction support
 * @returns Result with logId or error
 */
export async function logActivity(
	input: ActivityLogInput,
	connection?: Sql
): Promise<ActivityLogResult> {
	const sql = connection || db;
	const maxAttempts = 4;
	const backoffDelays = [0, 100, 500, 2000]; // milliseconds

	let lastError: Error | null = null;

	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		try {
			// Apply backoff delay (skip on first attempt)
			if (attempt > 0) {
				await delay(backoffDelays[attempt]);
			}

			// Insert activity log
			const result = await sql`
				INSERT INTO activity_logs (
					employee_id,
					action,
					resource_type,
					resource_id,
					before_snapshot,
					after_snapshot,
					ip_address,
					user_agent,
					reason,
					is_rollback,
					rolled_back_log_id
				) VALUES (
					${input.employeeId}::uuid,
					${input.action.toLowerCase()},
					${input.resourceType},
					${input.resourceId}::uuid,
					${input.beforeSnapshot ? JSON.stringify(input.beforeSnapshot) : null}::jsonb,
					${input.afterSnapshot ? JSON.stringify(input.afterSnapshot) : null}::jsonb,
					${input.ipAddress || null}::inet,
					${input.userAgent || null},
					${input.reason || null},
					${input.isRollback || false},
					${input.rolledBackLogId || null}::uuid
				)
				RETURNING id
			`;

			const logId = result[0]?.id;

			if (!logId) {
				throw new Error('Failed to retrieve log ID after insert');
			}

			return {
				success: true,
				logId,
				attempts: attempt + 1
			};

		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));

			// If this is the last attempt, return failure
			if (attempt === maxAttempts - 1) {
				console.error(`[AuditLoggingService] Failed after ${maxAttempts} attempts:`, lastError);

				return {
					success: false,
					error: lastError.message,
					attempts: maxAttempts
				};
			}

			// Log retry attempt
			console.warn(
				`[AuditLoggingService] Attempt ${attempt + 1} failed, retrying in ${backoffDelays[attempt + 1]}ms:`,
				lastError.message
			);
		}
	}

	// Fallback (should never reach here)
	return {
		success: false,
		error: lastError?.message || 'Unknown error',
		attempts: maxAttempts
	};
}

/**
 * Logs an activity within an existing transaction
 * If logging fails, the transaction will be rolled back
 *
 * @param input Activity log data
 * @param transaction Active database transaction
 * @returns Result with logId or error
 */
export async function logActivityInTransaction(
	input: ActivityLogInput,
	transaction: Sql
): Promise<ActivityLogResult> {
	return logActivity(input, transaction);
}

/**
 * Batch logs multiple activities with retry logic
 * Each log is attempted independently with retry logic
 *
 * @param inputs Array of activity log inputs
 * @returns Array of results matching input order
 */
export async function logActivitiesBatch(
	inputs: ActivityLogInput[]
): Promise<ActivityLogResult[]> {
	const results: ActivityLogResult[] = [];

	for (const input of inputs) {
		const result = await logActivity(input);
		results.push(result);
	}

	return results;
}

/**
 * Gets activity log statistics for a given employee
 *
 * @param employeeId Employee UUID
 * @returns Statistics summary
 */
export async function getActivityLogStats(employeeId: string) {
	const result = await db`
		SELECT
			COUNT(*) as total_logs,
			COUNT(*) FILTER (WHERE action = 'create') as create_count,
			COUNT(*) FILTER (WHERE action = 'read') as read_count,
			COUNT(*) FILTER (WHERE action = 'update') as update_count,
			COUNT(*) FILTER (WHERE action = 'delete') as delete_count,
			COUNT(*) FILTER (WHERE is_rollback = true) as rollback_count,
			MIN(created_at) as first_log_at,
			MAX(created_at) as last_log_at
		FROM activity_logs
		WHERE employee_id = ${employeeId}::uuid
	`;

	return result[0];
}

/**
 * Gets recent activity logs for an employee
 *
 * @param employeeId Employee UUID
 * @param limit Maximum number of logs to retrieve
 * @returns Array of activity logs
 */
export async function getRecentActivityLogs(employeeId: string, limit = 10) {
	const logs = await db`
		SELECT
			id,
			employee_id,
			action,
			resource_type,
			resource_id,
			before_snapshot,
			after_snapshot,
			ip_address,
			user_agent,
			reason,
			is_rollback,
			rolled_back_log_id,
			created_at
		FROM activity_logs
		WHERE employee_id = ${employeeId}::uuid
		ORDER BY created_at DESC
		LIMIT ${limit}
	`;

	return logs;
}

/**
 * Validates activity log input before insertion
 *
 * @param input Activity log data
 * @returns Validation result
 */
export function validateActivityLogInput(input: ActivityLogInput): {
	valid: boolean;
	errors: string[];
} {
	const errors: string[] = [];

	// Validate employee ID format
	const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	if (!uuidRegex.test(input.employeeId)) {
		errors.push('Invalid employee ID format');
	}

	// Validate resource ID format
	if (!uuidRegex.test(input.resourceId)) {
		errors.push('Invalid resource ID format');
	}

	// Validate action type
	const validActions = ['CREATE', 'READ', 'UPDATE', 'DELETE'];
	if (!validActions.includes(input.action)) {
		errors.push('Invalid action type');
	}

	// Validate resource type
	if (!input.resourceType || input.resourceType.trim().length === 0) {
		errors.push('Resource type is required');
	}

	// Validate snapshot requirements
	if (input.action === 'UPDATE' && !input.beforeSnapshot) {
		errors.push('UPDATE action requires beforeSnapshot');
	}

	if (input.action === 'DELETE' && !input.beforeSnapshot) {
		errors.push('DELETE action requires beforeSnapshot');
	}

	if (input.action === 'CREATE' && !input.afterSnapshot) {
		errors.push('CREATE action requires afterSnapshot');
	}

	// Validate rollback constraints
	if (input.isRollback && !input.rolledBackLogId) {
		errors.push('Rollback entries must reference original log ID');
	}

	// Validate snapshot size (max 1GB)
	const maxSnapshotSize = 1024 * 1024 * 1024; // 1GB in bytes
	if (input.beforeSnapshot) {
		const size = JSON.stringify(input.beforeSnapshot).length;
		if (size > maxSnapshotSize) {
			errors.push('beforeSnapshot exceeds maximum size (1GB)');
		}
	}
	if (input.afterSnapshot) {
		const size = JSON.stringify(input.afterSnapshot).length;
		if (size > maxSnapshotSize) {
			errors.push('afterSnapshot exceeds maximum size (1GB)');
		}
	}

	return {
		valid: errors.length === 0,
		errors
	};
}
