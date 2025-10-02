/**
 * Cascade Snapshot Collector
 * Feature: 020-we-need-to (Comprehensive Audit Logging with Rollback)
 * Task: T032
 * Created: 2025-10-02
 *
 * Utilities for capturing cascaded delete relationships recursively.
 * Used to capture all records that would be deleted due to CASCADE constraints.
 */

import { db } from '$lib/server/db';
import type { Sql } from 'postgres';

export interface CascadedRecord {
	id: string;
	data: Record<string, any>;
}

export interface CascadeRelationship {
	table: string;
	parent_fk: string;
	records: CascadedRecord[];
	children?: CascadeRelationship[]; // Nested cascades
}

export interface CascadeSnapshot {
	parent: {
		table: string;
		id: string;
		data: Record<string, any>;
	};
	cascaded_deletes: CascadeRelationship[];
}

// Cache for foreign key relationships to avoid repeated queries
const relationshipCache = new Map<string, CascadeRelationship[]>();

/**
 * Captures a complete cascade snapshot for a resource
 *
 * @param tableName Parent table name
 * @param resourceId Parent resource UUID
 * @param maxDepth Maximum depth for recursive traversal (default: 5)
 * @param connection Optional database connection
 * @returns Complete cascade snapshot
 */
export async function captureCascadeSnapshot(
	tableName: string,
	resourceId: string,
	maxDepth = 5,
	connection?: Sql
): Promise<CascadeSnapshot | null> {
	const sql = connection || db;

	try {
		// Fetch parent record
		const parentResult = await sql`
			SELECT * FROM ${sql(tableName)}
			WHERE id = ${resourceId}::uuid
		`;

		if (parentResult.length === 0) {
			return null;
		}

		const parent = parentResult[0];

		// Discover and capture cascaded deletes
		const cascadedDeletes = await discoverCascadeRelationships(
			tableName,
			resourceId,
			maxDepth,
			new Set(), // Visited tables to prevent infinite loops
			sql
		);

		return {
			parent: {
				table: tableName,
				id: resourceId,
				data: parent
			},
			cascaded_deletes: cascadedDeletes
		};
	} catch (error) {
		console.error(`[CascadeSnapshot] Failed to capture cascade snapshot:`, error);
		throw error;
	}
}

/**
 * Discovers cascade delete relationships recursively
 *
 * @param tableName Current table name
 * @param resourceId Current resource UUID
 * @param remainingDepth Remaining depth for recursion
 * @param visitedTables Set of already visited tables (prevent loops)
 * @param connection Database connection
 * @returns Array of cascade relationships
 */
async function discoverCascadeRelationships(
	tableName: string,
	resourceId: string,
	remainingDepth: number,
	visitedTables: Set<string>,
	connection: Sql
): Promise<CascadeRelationship[]> {
	// Check depth limit
	if (remainingDepth <= 0) {
		console.warn(`[CascadeSnapshot] Max depth reached for table: ${tableName}`);
		return [];
	}

	// Prevent infinite loops
	if (visitedTables.has(tableName)) {
		return [];
	}

	visitedTables.add(tableName);

	// Find all foreign keys that reference this table with ON DELETE CASCADE
	const cascadeRelationships = await findCascadeConstraints(tableName, connection);

	const results: CascadeRelationship[] = [];

	// For each cascade relationship, fetch affected records
	for (const rel of cascadeRelationships) {
		const referencingTable = rel.referencing_table;
		const referencingColumn = rel.referencing_column;

		// Fetch all records that reference this resource
		const affectedRecords = await connection`
			SELECT * FROM ${connection(referencingTable)}
			WHERE ${connection(referencingColumn)} = ${resourceId}::uuid
		`;

		if (affectedRecords.length === 0) {
			continue;
		}

		// Build cascaded records list
		const cascadedRecords: CascadedRecord[] = affectedRecords.map((record: any) => ({
			id: record.id,
			data: record
		}));

		// Recursively discover nested cascades
		const nestedCascades: CascadeRelationship[] = [];

		for (const record of affectedRecords) {
			const childCascades = await discoverCascadeRelationships(
				referencingTable,
				record.id,
				remainingDepth - 1,
				new Set(visitedTables), // Pass copy of visited tables
				connection
			);

			nestedCascades.push(...childCascades);
		}

		results.push({
			table: referencingTable,
			parent_fk: referencingColumn,
			records: cascadedRecords,
			children: nestedCascades.length > 0 ? nestedCascades : undefined
		});
	}

	return results;
}

/**
 * Finds foreign key constraints with ON DELETE CASCADE
 *
 * @param tableName Referenced table name
 * @param connection Database connection
 * @returns Array of cascade constraints
 */
async function findCascadeConstraints(
	tableName: string,
	connection: Sql
): Promise<Array<{ referencing_table: string; referencing_column: string }>> {
	// Check cache first
	const cacheKey = tableName;
	if (relationshipCache.has(cacheKey)) {
		return relationshipCache.get(cacheKey)!.map((rel) => ({
			referencing_table: rel.table,
			referencing_column: rel.parent_fk
		}));
	}

	try {
		const result = await connection`
			SELECT
				tc.table_name as referencing_table,
				kcu.column_name as referencing_column,
				rc.delete_rule
			FROM information_schema.table_constraints AS tc
			JOIN information_schema.key_column_usage AS kcu
				ON tc.constraint_name = kcu.constraint_name
				AND tc.table_schema = kcu.table_schema
			JOIN information_schema.referential_constraints AS rc
				ON tc.constraint_name = rc.constraint_name
				AND tc.table_schema = rc.constraint_schema
			JOIN information_schema.constraint_column_usage AS ccu
				ON ccu.constraint_name = tc.constraint_name
				AND ccu.table_schema = tc.table_schema
			WHERE tc.constraint_type = 'FOREIGN KEY'
				AND ccu.table_name = ${tableName}
				AND ccu.column_name = 'id'
				AND rc.delete_rule = 'CASCADE'
		`;

		return result.map((row: any) => ({
			referencing_table: row.referencing_table,
			referencing_column: row.referencing_column
		}));
	} catch (error) {
		console.error(`[CascadeSnapshot] Error finding cascade constraints:`, error);
		return [];
	}
}

/**
 * Flattens cascade snapshot into ordered list for restoration
 * Returns records in reverse deletion order (children first, parent last)
 *
 * @param snapshot Cascade snapshot
 * @returns Flattened array of records with table info
 */
export function flattenCascadeSnapshot(
	snapshot: CascadeSnapshot
): Array<{ table: string; id: string; data: Record<string, any> }> {
	const flattened: Array<{ table: string; id: string; data: Record<string, any> }> = [];

	// Recursively flatten cascaded deletes (depth-first)
	function flattenRelationships(relationships: CascadeRelationship[]) {
		for (const rel of relationships) {
			// First, flatten children (if any)
			if (rel.children && rel.children.length > 0) {
				flattenRelationships(rel.children);
			}

			// Then add records from this relationship
			for (const record of rel.records) {
				flattened.push({
					table: rel.table,
					id: record.id,
					data: record.data
				});
			}
		}
	}

	flattenRelationships(snapshot.cascaded_deletes);

	// Finally, add parent record last
	flattened.push({
		table: snapshot.parent.table,
		id: snapshot.parent.id,
		data: snapshot.parent.data
	});

	return flattened;
}

/**
 * Counts total records in cascade snapshot
 *
 * @param snapshot Cascade snapshot
 * @returns Total record count including parent
 */
export function countCascadeRecords(snapshot: CascadeSnapshot): number {
	let count = 1; // Parent record

	function countRelationships(relationships: CascadeRelationship[]): number {
		let total = 0;

		for (const rel of relationships) {
			total += rel.records.length;

			if (rel.children && rel.children.length > 0) {
				total += countRelationships(rel.children);
			}
		}

		return total;
	}

	count += countRelationships(snapshot.cascaded_deletes);

	return count;
}

/**
 * Groups cascade records by table for batch operations
 *
 * @param snapshot Cascade snapshot
 * @returns Map of table name to records
 */
export function groupCascadeRecordsByTable(
	snapshot: CascadeSnapshot
): Map<string, Array<{ id: string; data: Record<string, any> }>> {
	const grouped = new Map<string, Array<{ id: string; data: Record<string, any> }>>();

	const flattened = flattenCascadeSnapshot(snapshot);

	for (const item of flattened) {
		if (!grouped.has(item.table)) {
			grouped.set(item.table, []);
		}

		grouped.get(item.table)!.push({
			id: item.id,
			data: item.data
		});
	}

	return grouped;
}

/**
 * Validates cascade snapshot structure
 *
 * @param snapshot Cascade snapshot
 * @returns Validation result
 */
export function validateCascadeSnapshot(snapshot: CascadeSnapshot): {
	valid: boolean;
	errors: string[];
} {
	const errors: string[] = [];

	// Validate parent
	if (!snapshot.parent) {
		errors.push('Snapshot missing parent record');
	} else {
		if (!snapshot.parent.table) {
			errors.push('Parent missing table name');
		}
		if (!snapshot.parent.id) {
			errors.push('Parent missing ID');
		}
		if (!snapshot.parent.data) {
			errors.push('Parent missing data');
		}
	}

	// Validate cascaded deletes
	if (!Array.isArray(snapshot.cascaded_deletes)) {
		errors.push('cascaded_deletes must be an array');
	} else {
		function validateRelationships(relationships: CascadeRelationship[], path: string) {
			for (let i = 0; i < relationships.length; i++) {
				const rel = relationships[i];
				const relPath = `${path}[${i}]`;

				if (!rel.table) {
					errors.push(`${relPath} missing table name`);
				}
				if (!rel.parent_fk) {
					errors.push(`${relPath} missing parent_fk`);
				}
				if (!Array.isArray(rel.records)) {
					errors.push(`${relPath}.records must be an array`);
				} else {
					for (let j = 0; j < rel.records.length; j++) {
						const record = rel.records[j];
						if (!record.id) {
							errors.push(`${relPath}.records[${j}] missing id`);
						}
						if (!record.data) {
							errors.push(`${relPath}.records[${j}] missing data`);
						}
					}
				}

				// Validate children recursively
				if (rel.children && rel.children.length > 0) {
					validateRelationships(rel.children, `${relPath}.children`);
				}
			}
		}

		validateRelationships(snapshot.cascaded_deletes, 'cascaded_deletes');
	}

	return {
		valid: errors.length === 0,
		errors
	};
}

/**
 * Clears the relationship cache
 */
export function clearRelationshipCache(): void {
	relationshipCache.clear();
}
