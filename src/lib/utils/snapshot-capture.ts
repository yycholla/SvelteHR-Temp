/**
 * Snapshot Capture Utility
 * Feature: 020-we-need-to (Comprehensive Audit Logging with Rollback)
 * Task: T029
 * Created: 2025-10-02
 *
 * Utilities for capturing JSONB snapshots of resources with metadata and relationships.
 * Snapshots are used for audit logging and rollback operations.
 */

import { db } from '$lib/server/db';
import type { Sql } from 'postgres';

export interface SnapshotMetadata {
	captured_at: string;
	captured_by: string;
	snapshot_version: string;
	size_bytes: number;
}

export interface SnapshotRelationship {
	[relationName: string]: {
		type: 'one' | 'many';
		foreign_key: string;
		related_ids: string[];
	};
}

export interface ResourceSnapshot {
	[key: string]: any;
	_metadata: SnapshotMetadata;
	_relationships?: SnapshotRelationship;
}

/**
 * Captures a snapshot of a resource by table name and ID
 *
 * @param tableName Database table name
 * @param resourceId Resource UUID
 * @param capturedBy Employee UUID capturing the snapshot
 * @param connection Optional database connection for transaction support
 * @returns Snapshot with metadata
 */
export async function captureSnapshot(
	tableName: string,
	resourceId: string,
	capturedBy: string,
	connection?: Sql
): Promise<ResourceSnapshot | null> {
	const sql = connection || db;

	try {
		// Query resource data
		const result = await sql`
			SELECT * FROM ${sql(tableName)}
			WHERE id = ${resourceId}::uuid
		`;

		if (result.length === 0) {
			return null;
		}

		const resource = result[0];

		// Calculate snapshot size
		const snapshotJson = JSON.stringify(resource);
		const sizeBytes = Buffer.byteLength(snapshotJson, 'utf8');

		// Validate size limit (1GB)
		const maxSize = 1024 * 1024 * 1024; // 1GB
		if (sizeBytes > maxSize) {
			throw new Error(`Snapshot size (${sizeBytes} bytes) exceeds maximum (${maxSize} bytes)`);
		}

		// Build snapshot with metadata
		const snapshot: ResourceSnapshot = {
			...resource,
			_metadata: {
				captured_at: new Date().toISOString(),
				captured_by: capturedBy,
				snapshot_version: '1.0',
				size_bytes: sizeBytes
			}
		};

		return snapshot;
	} catch (error) {
		console.error(`[SnapshotCapture] Failed to capture snapshot for ${tableName}/${resourceId}:`, error);
		throw error;
	}
}

/**
 * Captures before and after snapshots for UPDATE operations
 *
 * @param tableName Database table name
 * @param resourceId Resource UUID
 * @param capturedBy Employee UUID
 * @param connection Optional database connection
 * @returns Object with before and after snapshots
 */
export async function captureBeforeAfterSnapshots(
	tableName: string,
	resourceId: string,
	capturedBy: string,
	connection?: Sql
): Promise<{
	before: ResourceSnapshot | null;
	after: ResourceSnapshot | null;
}> {
	const beforeSnapshot = await captureSnapshot(tableName, resourceId, capturedBy, connection);

	// Note: afterSnapshot would be captured after the actual update
	// This function captures the "before" state. The "after" state is captured
	// by the calling code after performing the update.

	return {
		before: beforeSnapshot,
		after: null // To be populated after update
	};
}

/**
 * Captures snapshot with relationship metadata
 *
 * @param tableName Database table name
 * @param resourceId Resource UUID
 * @param capturedBy Employee UUID
 * @param includeRelationships Whether to include relationship metadata
 * @param connection Optional database connection
 * @returns Snapshot with relationships
 */
export async function captureSnapshotWithRelationships(
	tableName: string,
	resourceId: string,
	capturedBy: string,
	includeRelationships = true,
	connection?: Sql
): Promise<ResourceSnapshot | null> {
	const snapshot = await captureSnapshot(tableName, resourceId, capturedBy, connection);

	if (!snapshot || !includeRelationships) {
		return snapshot;
	}

	// Discover relationships from foreign keys
	const relationships = await discoverRelationships(tableName, resourceId, connection);

	if (relationships && Object.keys(relationships).length > 0) {
		snapshot._relationships = relationships;
	}

	return snapshot;
}

/**
 * Discovers foreign key relationships for a resource
 *
 * @param tableName Database table name
 * @param resourceId Resource UUID
 * @param connection Optional database connection
 * @returns Relationship metadata
 */
async function discoverRelationships(
	tableName: string,
	resourceId: string,
	connection?: Sql
): Promise<SnapshotRelationship> {
	const sql = connection || db;
	const relationships: SnapshotRelationship = {};

	try {
		// Query foreign key constraints pointing TO this table
		const incomingFks = await sql`
			SELECT
				tc.table_name as referencing_table,
				kcu.column_name as referencing_column,
				ccu.column_name as referenced_column
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

		// For each incoming FK, find related records
		for (const fk of incomingFks) {
			const referencingTable = fk.referencing_table;
			const referencingColumn = fk.referencing_column;

			// Query related records
			const relatedRecords = await sql`
				SELECT id FROM ${sql(referencingTable)}
				WHERE ${sql(referencingColumn)} = ${resourceId}::uuid
			`;

			const relatedIds = relatedRecords.map((r: any) => r.id);

			if (relatedIds.length > 0) {
				relationships[referencingTable] = {
					type: 'many',
					foreign_key: referencingColumn,
					related_ids: relatedIds
				};
			}
		}

		return relationships;
	} catch (error) {
		console.warn(`[SnapshotCapture] Failed to discover relationships for ${tableName}:`, error);
		return {};
	}
}

/**
 * Validates snapshot structure and size
 *
 * @param snapshot Snapshot to validate
 * @returns Validation result
 */
export function validateSnapshot(snapshot: ResourceSnapshot): {
	valid: boolean;
	errors: string[];
} {
	const errors: string[] = [];

	// Check for metadata
	if (!snapshot._metadata) {
		errors.push('Snapshot missing _metadata field');
	} else {
		// Validate metadata fields
		if (!snapshot._metadata.captured_at) {
			errors.push('Snapshot metadata missing captured_at');
		}
		if (!snapshot._metadata.captured_by) {
			errors.push('Snapshot metadata missing captured_by');
		}
		if (!snapshot._metadata.snapshot_version) {
			errors.push('Snapshot metadata missing snapshot_version');
		}
		if (typeof snapshot._metadata.size_bytes !== 'number') {
			errors.push('Snapshot metadata missing size_bytes');
		}
	}

	// Validate size
	const snapshotJson = JSON.stringify(snapshot);
	const actualSize = Buffer.byteLength(snapshotJson, 'utf8');
	const maxSize = 1024 * 1024 * 1024; // 1GB

	if (actualSize > maxSize) {
		errors.push(`Snapshot size (${actualSize} bytes) exceeds maximum (${maxSize} bytes)`);
	}

	// Check if size_bytes matches actual size (within 1% tolerance)
	if (snapshot._metadata?.size_bytes) {
		const tolerance = 0.01;
		const sizeDiff = Math.abs(actualSize - snapshot._metadata.size_bytes);
		const sizeRatio = sizeDiff / actualSize;

		if (sizeRatio > tolerance) {
			errors.push(`Snapshot size_bytes mismatch: declared ${snapshot._metadata.size_bytes}, actual ${actualSize}`);
		}
	}

	return {
		valid: errors.length === 0,
		errors
	};
}

/**
 * Strips metadata from snapshot for comparison
 *
 * @param snapshot Snapshot with metadata
 * @returns Snapshot without metadata fields
 */
export function stripMetadata(snapshot: ResourceSnapshot): Record<string, any> {
	const { _metadata, _relationships, ...data } = snapshot;
	return data;
}

/**
 * Compares two snapshots and returns changed fields
 *
 * @param before Before snapshot
 * @param after After snapshot
 * @returns Array of changed field names
 */
export function getChangedFields(
	before: ResourceSnapshot | null,
	after: ResourceSnapshot | null
): string[] {
	if (!before || !after) {
		return [];
	}

	const beforeData = stripMetadata(before);
	const afterData = stripMetadata(after);

	const changedFields: string[] = [];
	const allKeys = new Set([...Object.keys(beforeData), ...Object.keys(afterData)]);

	for (const key of allKeys) {
		const beforeValue = beforeData[key];
		const afterValue = afterData[key];

		// Deep comparison
		if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
			changedFields.push(key);
		}
	}

	return changedFields;
}

/**
 * Batch captures snapshots for multiple resources
 *
 * @param tableName Database table name
 * @param resourceIds Array of resource UUIDs
 * @param capturedBy Employee UUID
 * @param connection Optional database connection
 * @returns Array of snapshots
 */
export async function captureSnapshotsBatch(
	tableName: string,
	resourceIds: string[],
	capturedBy: string,
	connection?: Sql
): Promise<(ResourceSnapshot | null)[]> {
	const snapshots: (ResourceSnapshot | null)[] = [];

	for (const resourceId of resourceIds) {
		const snapshot = await captureSnapshot(tableName, resourceId, capturedBy, connection);
		snapshots.push(snapshot);
	}

	return snapshots;
}
