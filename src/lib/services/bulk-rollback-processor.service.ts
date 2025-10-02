/**
 * Bulk Rollback Batch Processor
 * Feature: 020-we-need-to (Comprehensive Audit Logging with Rollback)
 * Task: T034
 * Created: 2025-10-02
 *
 * Service for processing bulk rollback batches with progress tracking.
 * Processes logs in reverse chronological order and emits SSE progress events.
 */

import { db } from '$lib/server/db';
import { executeRollback } from './rollback-execution.service';
import type { RollbackExecutionResult } from './rollback-execution.service';

export interface BatchProgress {
	batchId: string;
	status: 'QUEUED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
	processedCount: number;
	successfulCount: number;
	failedCount: number;
	totalCount: number;
	currentLogId?: string;
	lastError?: string;
}

export interface FailureDetail {
	logId: string;
	errorMessage: string;
	timestamp: string;
}

export interface ProcessBatchOptions {
	batchId: string;
	userId: string;
	onProgress?: (progress: BatchProgress) => void;
}

/**
 * Processes a bulk rollback batch
 *
 * @param options Process batch options
 * @returns Final batch progress
 */
export async function processBulkRollbackBatch(
	options: ProcessBatchOptions
): Promise<BatchProgress> {
	try {
		// Fetch batch details
		const batchResult = await db`
			SELECT
				id,
				activity_log_ids,
				total_count,
				processed_count,
				successful_count,
				failed_count,
				status
			FROM bulk_rollback_batches
			WHERE id = ${options.batchId}::uuid
			FOR UPDATE
		`;

		if (batchResult.length === 0) {
			throw new Error('Batch not found');
		}

		const batch = batchResult[0];

		// Validate batch size
		if (batch.total_count > 100) {
			throw new Error('Batch size exceeds maximum of 100 operations');
		}

		// Validate batch status
		if (batch.status !== 'queued') {
			throw new Error(`Batch is not queued (current status: ${batch.status})`);
		}

		// Update batch status to IN_PROGRESS
		await db`
			UPDATE bulk_rollback_batches
			SET status = 'in_progress'
			WHERE id = ${options.batchId}::uuid
		`;

		// Fetch activity logs in reverse chronological order
		const logsResult = await db`
			SELECT
				id,
				created_at,
				action,
				resource_type,
				resource_id
			FROM activity_logs
			WHERE id = ANY(${batch.activity_log_ids}::uuid[])
			ORDER BY created_at DESC
		`;

		const logs = logsResult;
		const failureDetails: FailureDetail[] = [];

		let processedCount = 0;
		let successfulCount = 0;
		let failedCount = 0;
		let lastError: string | undefined;

		// Process each log
		for (const log of logs) {
			try {
				// Execute rollback
				const result: RollbackExecutionResult = await executeRollback({
					logId: log.id,
					userId: options.userId,
					reason: `Bulk rollback batch ${options.batchId}`
				});

				if (result.success) {
					successfulCount++;
				} else {
					failedCount++;
					const errorMessage = result.errors?.join(', ') || 'Unknown error';
					lastError = errorMessage;

					failureDetails.push({
						logId: log.id,
						errorMessage,
						timestamp: new Date().toISOString()
					});
				}
			} catch (error) {
				failedCount++;
				const errorMessage = error instanceof Error ? error.message : String(error);
				lastError = errorMessage;

				failureDetails.push({
					logId: log.id,
					errorMessage,
					timestamp: new Date().toISOString()
				});
			}

			processedCount++;

			// Update batch progress
			await db`
				UPDATE bulk_rollback_batches
				SET
					processed_count = ${processedCount},
					successful_count = ${successfulCount},
					failed_count = ${failedCount},
					failure_details = ${failureDetails.length > 0 ? JSON.stringify(failureDetails) : null}::jsonb
				WHERE id = ${options.batchId}::uuid
			`;

			// Emit progress event
			const progress: BatchProgress = {
				batchId: options.batchId,
				status: 'IN_PROGRESS',
				processedCount,
				successfulCount,
				failedCount,
				totalCount: batch.total_count,
				currentLogId: log.id,
				lastError
			};

			if (options.onProgress) {
				options.onProgress(progress);
			}
		}

		// Determine final status
		const finalStatus: 'COMPLETED' | 'FAILED' =
			failedCount === 0 ? 'COMPLETED' : failedCount === batch.total_count ? 'FAILED' : 'COMPLETED';

		// Update batch to final status
		await db`
			UPDATE bulk_rollback_batches
			SET
				status = ${finalStatus},
				completed_at = now(),
				processed_count = ${processedCount},
				successful_count = ${successfulCount},
				failed_count = ${failedCount},
				failure_details = ${failureDetails.length > 0 ? JSON.stringify(failureDetails) : null}::jsonb
			WHERE id = ${options.batchId}::uuid
		`;

		// Return final progress
		const finalProgress: BatchProgress = {
			batchId: options.batchId,
			status: finalStatus,
			processedCount,
			successfulCount,
			failedCount,
			totalCount: batch.total_count,
			lastError
		};

		if (options.onProgress) {
			options.onProgress(finalProgress);
		}

		return finalProgress;
	} catch (error) {
		console.error('[BulkRollbackProcessor] Batch processing failed:', error);

		// Update batch to FAILED status
		try {
			await db`
				UPDATE bulk_rollback_batches
				SET
					status = 'failed',
					completed_at = now(),
					failure_details = ${JSON.stringify([
						{
							error: error instanceof Error ? error.message : String(error),
							timestamp: new Date().toISOString()
						}
					])}::jsonb
				WHERE id = ${options.batchId}::uuid
			`;
		} catch (updateError) {
			console.error('[BulkRollbackProcessor] Failed to update batch status:', updateError);
		}

		throw error;
	}
}

/**
 * Creates a new bulk rollback batch
 *
 * @param logIds Array of activity log IDs (max 100)
 * @param userId User initiating the batch
 * @returns Batch ID
 */
export async function createBulkRollbackBatch(
	logIds: string[],
	userId: string
): Promise<string> {
	// Validate batch size
	if (logIds.length === 0) {
		throw new Error('Batch must contain at least one log ID');
	}

	if (logIds.length > 100) {
		throw new Error('Batch size exceeds maximum of 100 operations');
	}

	// Create batch record
	const result = await db`
		INSERT INTO bulk_rollback_batches (
			initiated_by,
			activity_log_ids,
			total_count,
			status
		) VALUES (
			${userId}::uuid,
			${logIds}::uuid[],
			${logIds.length},
			'queued'
		)
		RETURNING id
	`;

	if (result.length === 0) {
		throw new Error('Failed to create batch');
	}

	return result[0].id;
}

/**
 * Gets batch progress
 *
 * @param batchId Batch UUID
 * @returns Batch progress
 */
export async function getBatchProgress(batchId: string): Promise<BatchProgress | null> {
	const result = await db`
		SELECT
			id,
			status,
			processed_count,
			successful_count,
			failed_count,
			total_count,
			failure_details
		FROM bulk_rollback_batches
		WHERE id = ${batchId}::uuid
	`;

	if (result.length === 0) {
		return null;
	}

	const batch = result[0];

	// Extract last error from failure details
	let lastError: string | undefined;
	if (batch.failure_details && Array.isArray(batch.failure_details)) {
		const details = batch.failure_details as FailureDetail[];
		if (details.length > 0) {
			lastError = details[details.length - 1].errorMessage;
		}
	}

	return {
		batchId: batch.id,
		status: batch.status.toUpperCase() as any,
		processedCount: batch.processed_count,
		successfulCount: batch.successful_count,
		failedCount: batch.failed_count,
		totalCount: batch.total_count,
		lastError
	};
}

/**
 * Cancels a queued batch
 *
 * @param batchId Batch UUID
 * @returns True if cancelled successfully
 */
export async function cancelBatch(batchId: string): Promise<boolean> {
	try {
		const result = await db`
			UPDATE bulk_rollback_batches
			SET
				status = 'failed',
				completed_at = now(),
				failure_details = ${JSON.stringify([
					{
						error: 'Batch cancelled by user',
						timestamp: new Date().toISOString()
					}
				])}::jsonb
			WHERE id = ${batchId}::uuid
				AND status = 'queued'
			RETURNING id
		`;

		return result.length > 0;
	} catch (error) {
		console.error('[BulkRollbackProcessor] Failed to cancel batch:', error);
		return false;
	}
}

/**
 * Gets batch statistics
 *
 * @param userId User UUID (optional, filters by user)
 * @returns Batch statistics
 */
export async function getBatchStatistics(userId?: string) {
	const filter = userId ? db`WHERE initiated_by = ${userId}::uuid` : db``;

	const result = await db`
		SELECT
			COUNT(*) as total_batches,
			COUNT(*) FILTER (WHERE status = 'queued') as queued_count,
			COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count,
			COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
			COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
			SUM(total_count) as total_operations,
			SUM(successful_count) as successful_operations,
			SUM(failed_count) as failed_operations
		FROM bulk_rollback_batches
		${filter}
	`;

	return result[0];
}

/**
 * Gets recent batches
 *
 * @param userId User UUID (optional, filters by user)
 * @param limit Maximum number of batches to retrieve
 * @returns Array of batch summaries
 */
export async function getRecentBatches(userId?: string, limit = 10) {
	const filter = userId ? db`WHERE initiated_by = ${userId}::uuid` : db``;

	const batches = await db`
		SELECT
			id,
			initiated_by,
			started_at,
			completed_at,
			status,
			total_count,
			processed_count,
			successful_count,
			failed_count
		FROM bulk_rollback_batches
		${filter}
		ORDER BY started_at DESC
		LIMIT ${limit}
	`;

	return batches;
}

/**
 * Validates batch creation
 *
 * @param logIds Array of log IDs
 * @returns Validation result
 */
export async function validateBatchCreation(logIds: string[]): Promise<{
	valid: boolean;
	errors: string[];
}> {
	const errors: string[] = [];

	// Validate size
	if (logIds.length === 0) {
		errors.push('Batch must contain at least one log ID');
	}

	if (logIds.length > 100) {
		errors.push('Batch size exceeds maximum of 100 operations');
	}

	// Validate all logs exist
	const logsResult = await db`
		SELECT id FROM activity_logs
		WHERE id = ANY(${logIds}::uuid[])
	`;

	if (logsResult.length !== logIds.length) {
		errors.push('Some log IDs do not exist');
	}

	// Validate no rollback entries
	const rollbackResult = await db`
		SELECT id FROM activity_logs
		WHERE id = ANY(${logIds}::uuid[])
			AND is_rollback = true
	`;

	if (rollbackResult.length > 0) {
		errors.push('Cannot rollback entries that are already rollbacks');
	}

	// Validate no READ operations
	const readResult = await db`
		SELECT id FROM activity_logs
		WHERE id = ANY(${logIds}::uuid[])
			AND action = 'read'
	`;

	if (readResult.length > 0) {
		errors.push('Cannot rollback READ operations');
	}

	return {
		valid: errors.length === 0,
		errors
	};
}
