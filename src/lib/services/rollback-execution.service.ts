/**
 * Rollback Execution Engine
 * Feature: 020-we-need-to (Comprehensive Audit Logging with Rollback)
 * Task: T033
 * Created: 2025-10-02
 *
 * Core engine for executing rollback operations with atomic transactions.
 * Supports UPDATE, DELETE, and CREATE rollbacks with cascade handling.
 */

import { db } from '$lib/server/db';
import type { Sql } from 'postgres';
import { logActivity } from './audit-logging.service';
import { captureCascadeSnapshot, flattenCascadeSnapshot } from '$lib/utils/cascade-snapshot';
import type { CascadeSnapshot } from '$lib/utils/cascade-snapshot';

export interface RollbackExecutionResult {
	success: boolean;
	newLogId?: string;
	restoredRecords?: string[];
	errors?: string[];
}

export interface RollbackOptions {
	logId: string;
	userId: string;
	reason: string;
	strategy?: 'force' | 'cancel' | 'merge';
	mergeFields?: string[];
}

/**
 * Executes a rollback operation atomically
 *
 * @param options Rollback options
 * @returns Execution result
 */
export async function executeRollback(
	options: RollbackOptions
): Promise<RollbackExecutionResult> {
	const errors: string[] = [];
	const restoredRecords: string[] = [];

	try {
		// Execute rollback in transaction
		const result = await db.begin(async (transaction) => {
			// Fetch activity log
			const logResult = await transaction`
				SELECT
					id,
					employee_id,
					action,
					resource_type,
					resource_id,
					before_snapshot,
					after_snapshot,
					is_rollback,
					rolled_back_log_id
				FROM activity_logs
				WHERE id = ${options.logId}::uuid
				FOR UPDATE
			`;

			if (logResult.length === 0) {
				throw new Error('Activity log not found');
			}

			const log = logResult[0];

			// Validate not a rollback
			if (log.is_rollback) {
				throw new Error('Cannot rollback a rollback operation');
			}

			// Execute appropriate rollback based on action type
			let executionResult: RollbackExecutionResult;

			switch (log.action) {
				case 'update':
					executionResult = await executeUpdateRollback(log, transaction);
					break;

				case 'delete':
					executionResult = await executeDeleteRollback(log, transaction);
					break;

				case 'create':
					executionResult = await executeCreateRollback(log, transaction);
					break;

				default:
					throw new Error(`Cannot rollback ${log.action} operations`);
			}

			if (!executionResult.success) {
				throw new Error(executionResult.errors?.join(', ') || 'Rollback execution failed');
			}

			// Capture after snapshot for the rollback log
			const afterSnapshot = await captureAfterSnapshot(
				log.resource_type,
				log.resource_id,
				transaction
			);

			// Create new activity log entry with is_rollback=TRUE
			const logResult2 = await logActivity(
				{
					employeeId: options.userId,
					action: log.action.toUpperCase() as any,
					resourceType: log.resource_type,
					resourceId: log.resource_id,
					beforeSnapshot: log.after_snapshot || null, // Current state before rollback
					afterSnapshot, // State after rollback
					reason: options.reason,
					isRollback: true,
					rolledBackLogId: options.logId
				},
				transaction
			);

			if (!logResult2.success) {
				throw new Error('Failed to create rollback activity log');
			}

			return {
				success: true,
				newLogId: logResult2.logId,
				restoredRecords: executionResult.restoredRecords || [],
				errors: []
			};
		});

		return result;
	} catch (error) {
		console.error('[RollbackExecution] Rollback failed:', error);
		errors.push(error instanceof Error ? error.message : String(error));

		return {
			success: false,
			errors
		};
	}
}

/**
 * Executes UPDATE rollback (restore before_snapshot)
 *
 * @param log Activity log
 * @param transaction Database transaction
 * @returns Execution result
 */
async function executeUpdateRollback(
	log: any,
	transaction: Sql
): Promise<RollbackExecutionResult> {
	const errors: string[] = [];

	try {
		if (!log.before_snapshot) {
			throw new Error('Missing before_snapshot for UPDATE rollback');
		}

		const beforeSnapshot = log.before_snapshot;

		// Build UPDATE statement dynamically
		const fields = Object.keys(beforeSnapshot).filter(
			(key) => key !== 'id' && !key.startsWith('_')
		);

		const setClause = fields
			.map((field) => `${field} = $${fields.indexOf(field) + 2}`)
			.join(', ');

		const values = fields.map((field) => {
			const value = beforeSnapshot[field];
			// Handle JSON fields
			if (typeof value === 'object' && value !== null) {
				return JSON.stringify(value);
			}
			return value;
		});

		// Execute UPDATE
		await transaction.unsafe(
			`UPDATE ${log.resource_type} SET ${setClause} WHERE id = $1`,
			[log.resource_id, ...values]
		);

		return {
			success: true,
			restoredRecords: [log.resource_id],
			errors: []
		};
	} catch (error) {
		console.error('[RollbackExecution] UPDATE rollback failed:', error);
		errors.push(error instanceof Error ? error.message : String(error));

		return {
			success: false,
			errors
		};
	}
}

/**
 * Executes DELETE rollback (recreate from before_snapshot with original ID)
 *
 * @param log Activity log
 * @param transaction Database transaction
 * @returns Execution result
 */
async function executeDeleteRollback(
	log: any,
	transaction: Sql
): Promise<RollbackExecutionResult> {
	const errors: string[] = [];
	const restoredRecords: string[] = [];

	try {
		if (!log.before_snapshot) {
			throw new Error('Missing before_snapshot for DELETE rollback');
		}

		// Check if there's cascade data
		let cascadeSnapshot: CascadeSnapshot | null = null;
		if (log.before_snapshot.cascaded_deletes) {
			cascadeSnapshot = log.before_snapshot as CascadeSnapshot;
		}

		// Restore records in correct order (children first, parent last)
		if (cascadeSnapshot) {
			const orderedRecords = flattenCascadeSnapshot(cascadeSnapshot);

			for (const record of orderedRecords) {
				await insertRecord(record.table, record.data, transaction);
				restoredRecords.push(record.id);
			}
		} else {
			// Simple restore without cascade
			await insertRecord(log.resource_type, log.before_snapshot, transaction);
			restoredRecords.push(log.resource_id);
		}

		return {
			success: true,
			restoredRecords,
			errors: []
		};
	} catch (error) {
		console.error('[RollbackExecution] DELETE rollback failed:', error);
		errors.push(error instanceof Error ? error.message : String(error));

		return {
			success: false,
			errors
		};
	}
}

/**
 * Executes CREATE rollback (delete the created resource)
 *
 * @param log Activity log
 * @param transaction Database transaction
 * @returns Execution result
 */
async function executeCreateRollback(
	log: any,
	transaction: Sql
): Promise<RollbackExecutionResult> {
	const errors: string[] = [];

	try {
		// Check if resource still exists
		const existsResult = await transaction`
			SELECT EXISTS(
				SELECT 1 FROM ${transaction(log.resource_type)}
				WHERE id = ${log.resource_id}::uuid
			) as exists
		`;

		if (!existsResult[0]?.exists) {
			// Resource already deleted, consider it successful
			return {
				success: true,
				restoredRecords: [],
				errors: []
			};
		}

		// Delete the resource
		await transaction`
			DELETE FROM ${transaction(log.resource_type)}
			WHERE id = ${log.resource_id}::uuid
		`;

		return {
			success: true,
			restoredRecords: [log.resource_id],
			errors: []
		};
	} catch (error) {
		console.error('[RollbackExecution] CREATE rollback failed:', error);
		errors.push(error instanceof Error ? error.message : String(error));

		return {
			success: false,
			errors
		};
	}
}

/**
 * Inserts a record into a table
 *
 * @param tableName Table name
 * @param data Record data
 * @param transaction Database transaction
 */
async function insertRecord(
	tableName: string,
	data: Record<string, any>,
	transaction: Sql
): Promise<void> {
	// Filter out metadata fields
	const cleanData = { ...data };
	delete cleanData._metadata;
	delete cleanData._relationships;

	const fields = Object.keys(cleanData);
	const values = fields.map((field) => {
		const value = cleanData[field];
		// Handle JSON fields
		if (typeof value === 'object' && value !== null) {
			return JSON.stringify(value);
		}
		return value;
	});

	const fieldsList = fields.join(', ');
	const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');

	await transaction.unsafe(
		`INSERT INTO ${tableName} (${fieldsList}) VALUES (${placeholders})`,
		values
	);
}

/**
 * Captures after snapshot for rollback log
 *
 * @param tableName Table name
 * @param resourceId Resource UUID
 * @param transaction Database transaction
 * @returns Snapshot or null
 */
async function captureAfterSnapshot(
	tableName: string,
	resourceId: string,
	transaction: Sql
): Promise<Record<string, any> | null> {
	try {
		const result = await transaction`
			SELECT * FROM ${transaction(tableName)}
			WHERE id = ${resourceId}::uuid
		`;

		return result.length > 0 ? result[0] : null;
	} catch (error) {
		console.warn('[RollbackExecution] Failed to capture after snapshot:', error);
		return null;
	}
}

/**
 * Executes merge strategy rollback (rollback only selected fields)
 *
 * @param options Rollback options with merge fields
 * @returns Execution result
 */
export async function executeMergeRollback(
	options: RollbackOptions
): Promise<RollbackExecutionResult> {
	const errors: string[] = [];

	try {
		if (!options.mergeFields || options.mergeFields.length === 0) {
			throw new Error('Merge fields are required for merge strategy');
		}

		// Execute merge in transaction
		const result = await db.begin(async (transaction) => {
			// Fetch activity log
			const logResult = await transaction`
				SELECT
					id,
					action,
					resource_type,
					resource_id,
					before_snapshot,
					after_snapshot
				FROM activity_logs
				WHERE id = ${options.logId}::uuid
				FOR UPDATE
			`;

			if (logResult.length === 0) {
				throw new Error('Activity log not found');
			}

			const log = logResult[0];

			if (log.action !== 'update') {
				throw new Error('Merge strategy only supported for UPDATE operations');
			}

			if (!log.before_snapshot) {
				throw new Error('Missing before_snapshot for merge');
			}

			const beforeSnapshot = log.before_snapshot;

			// Build partial UPDATE for selected fields only
			const setClause = options.mergeFields
				.map((field, i) => `${field} = $${i + 2}`)
				.join(', ');

			const values = options.mergeFields.map((field) => {
				const value = beforeSnapshot[field];
				if (typeof value === 'object' && value !== null) {
					return JSON.stringify(value);
				}
				return value;
			});

			// Execute partial UPDATE
			await transaction.unsafe(
				`UPDATE ${log.resource_type} SET ${setClause} WHERE id = $1`,
				[log.resource_id, ...values]
			);

			// Capture after snapshot
			const afterSnapshot = await captureAfterSnapshot(
				log.resource_type,
				log.resource_id,
				transaction
			);

			// Create rollback log
			const logResult2 = await logActivity(
				{
					employeeId: options.userId,
					action: 'UPDATE',
					resourceType: log.resource_type,
					resourceId: log.resource_id,
					beforeSnapshot: log.after_snapshot || null,
					afterSnapshot,
					reason: `Merge rollback: ${options.mergeFields.join(', ')} - ${options.reason}`,
					isRollback: true,
					rolledBackLogId: options.logId
				},
				transaction
			);

			if (!logResult2.success) {
				throw new Error('Failed to create rollback activity log');
			}

			return {
				success: true,
				newLogId: logResult2.logId,
				restoredRecords: [log.resource_id],
				errors: []
			};
		});

		return result;
	} catch (error) {
		console.error('[RollbackExecution] Merge rollback failed:', error);
		errors.push(error instanceof Error ? error.message : String(error));

		return {
			success: false,
			errors
		};
	}
}

/**
 * Validates rollback execution prerequisites
 *
 * @param options Rollback options
 * @returns Validation result
 */
export async function validateRollbackExecution(
	options: RollbackOptions
): Promise<{ valid: boolean; errors: string[] }> {
	const errors: string[] = [];

	try {
		// Fetch log
		const logResult = await db`
			SELECT
				id,
				action,
				resource_type,
				resource_id,
				before_snapshot,
				is_rollback
			FROM activity_logs
			WHERE id = ${options.logId}::uuid
		`;

		if (logResult.length === 0) {
			errors.push('Activity log not found');
			return { valid: false, errors };
		}

		const log = logResult[0];

		// Check if already rollback
		if (log.is_rollback) {
			errors.push('Cannot rollback a rollback operation');
		}

		// Check READ operations
		if (log.action === 'read') {
			errors.push('Cannot rollback READ operations');
		}

		// Check required snapshots
		if ((log.action === 'update' || log.action === 'delete') && !log.before_snapshot) {
			errors.push(`Missing before_snapshot for ${log.action.toUpperCase()} rollback`);
		}

		// Validate merge fields
		if (options.strategy === 'merge') {
			if (!options.mergeFields || options.mergeFields.length === 0) {
				errors.push('Merge strategy requires mergeFields to be specified');
			}

			if (log.action !== 'update') {
				errors.push('Merge strategy only applicable to UPDATE operations');
			}
		}

		return {
			valid: errors.length === 0,
			errors
		};
	} catch (error) {
		console.error('[RollbackExecution] Validation error:', error);
		errors.push(error instanceof Error ? error.message : String(error));

		return {
			valid: false,
			errors
		};
	}
}
