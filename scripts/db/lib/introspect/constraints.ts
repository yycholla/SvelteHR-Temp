/**
 * Constraint Introspection (T018 - Part 3)
 *
 * Queries information_schema for table constraints (PK, FK, UNIQUE, CHECK).
 */

import type { Client } from 'pg';
import type {
	PrimaryKeyConstraint,
	ForeignKeyConstraint,
	UniqueConstraint,
	CheckConstraint,
	ReferentialAction
} from '../../types/constraints';

interface ConstraintResult {
	primaryKey: PrimaryKeyConstraint | null;
	foreignKeys: ForeignKeyConstraint[];
	uniqueConstraints: UniqueConstraint[];
	checkConstraints: CheckConstraint[];
}

/**
 * Introspects all constraints for a specific table.
 *
 * @param client - PostgreSQL client
 * @param schemaName - Schema name
 * @param tableName - Table name
 * @returns Object containing all constraint types
 */
export async function introspectConstraints(
	client: Client,
	schemaName: string,
	tableName: string
): Promise<ConstraintResult> {
	const primaryKey = await introspectPrimaryKey(client, schemaName, tableName);
	const foreignKeys = await introspectForeignKeys(client, schemaName, tableName);
	const uniqueConstraints = await introspectUniqueConstraints(client, schemaName, tableName);
	const checkConstraints = await introspectCheckConstraints(client, schemaName, tableName);

	return {
		primaryKey,
		foreignKeys,
		uniqueConstraints,
		checkConstraints
	};
}

/**
 * Introspects primary key constraint for a table.
 *
 * @param client - PostgreSQL client
 * @param schemaName - Schema name
 * @param tableName - Table name
 * @returns PrimaryKeyConstraint or null if no PK
 */
async function introspectPrimaryKey(
	client: Client,
	schemaName: string,
	tableName: string
): Promise<PrimaryKeyConstraint | null> {
	const query = `
		SELECT
			tc.constraint_name,
			array_agg(kcu.column_name ORDER BY kcu.ordinal_position) as columns
		FROM information_schema.table_constraints tc
		JOIN information_schema.key_column_usage kcu
			ON tc.constraint_name = kcu.constraint_name
			AND tc.table_schema = kcu.table_schema
		WHERE tc.constraint_type = 'PRIMARY KEY'
			AND tc.table_schema = $1
			AND tc.table_name = $2
		GROUP BY tc.constraint_name;
	`;

	const result = await client.query(query, [schemaName, tableName]);

	if (result.rows.length === 0) {
		return null;
	}

	const row = result.rows[0];
	return {
		constraintName: row.constraint_name,
		columns: row.columns
	};
}

/**
 * Introspects foreign key constraints for a table.
 *
 * @param client - PostgreSQL client
 * @param schemaName - Schema name
 * @param tableName - Table name
 * @returns Array of ForeignKeyConstraint objects
 */
async function introspectForeignKeys(
	client: Client,
	schemaName: string,
	tableName: string
): Promise<ForeignKeyConstraint[]> {
	const query = `
		SELECT
			tc.constraint_name,
			array_agg(kcu.column_name ORDER BY kcu.ordinal_position) as columns,
			ccu.table_name as referenced_table,
			array_agg(ccu.column_name ORDER BY kcu.ordinal_position) as referenced_columns,
			rc.update_rule as on_update,
			rc.delete_rule as on_delete
		FROM information_schema.table_constraints tc
		JOIN information_schema.key_column_usage kcu
			ON tc.constraint_name = kcu.constraint_name
			AND tc.table_schema = kcu.table_schema
		JOIN information_schema.constraint_column_usage ccu
			ON tc.constraint_name = ccu.constraint_name
			AND tc.table_schema = ccu.table_schema
		JOIN information_schema.referential_constraints rc
			ON tc.constraint_name = rc.constraint_name
			AND tc.table_schema = rc.constraint_schema
		WHERE tc.constraint_type = 'FOREIGN KEY'
			AND tc.table_schema = $1
			AND tc.table_name = $2
		GROUP BY tc.constraint_name, ccu.table_name, rc.update_rule, rc.delete_rule;
	`;

	const result = await client.query(query, [schemaName, tableName]);

	return result.rows.map((row) => ({
		constraintName: row.constraint_name,
		columns: row.columns,
		referencedTable: row.referenced_table,
		referencedColumns: row.referenced_columns,
		onUpdate: normalizeReferentialAction(row.on_update),
		onDelete: normalizeReferentialAction(row.on_delete)
	}));
}

/**
 * Introspects unique constraints for a table.
 *
 * @param client - PostgreSQL client
 * @param schemaName - Schema name
 * @param tableName - Table name
 * @returns Array of UniqueConstraint objects
 */
async function introspectUniqueConstraints(
	client: Client,
	schemaName: string,
	tableName: string
): Promise<UniqueConstraint[]> {
	const query = `
		SELECT
			tc.constraint_name,
			array_agg(kcu.column_name ORDER BY kcu.ordinal_position) as columns,
			tc.is_deferrable,
			tc.initially_deferred
		FROM information_schema.table_constraints tc
		JOIN information_schema.key_column_usage kcu
			ON tc.constraint_name = kcu.constraint_name
			AND tc.table_schema = kcu.table_schema
		WHERE tc.constraint_type = 'UNIQUE'
			AND tc.table_schema = $1
			AND tc.table_name = $2
		GROUP BY tc.constraint_name, tc.is_deferrable, tc.initially_deferred;
	`;

	const result = await client.query(query, [schemaName, tableName]);

	return result.rows.map((row) => ({
		constraintName: row.constraint_name,
		columns: row.columns,
		isDeferrable: row.is_deferrable === 'YES',
		isInitiallyDeferred: row.initially_deferred === 'YES'
	}));
}

/**
 * Introspects check constraints for a table.
 *
 * @param client - PostgreSQL client
 * @param schemaName - Schema name
 * @param tableName - Table name
 * @returns Array of CheckConstraint objects
 */
async function introspectCheckConstraints(
	client: Client,
	schemaName: string,
	tableName: string
): Promise<CheckConstraint[]> {
	const query = `
		SELECT
			cc.constraint_name,
			cc.check_clause,
			tc.is_deferrable,
			tc.initially_deferred
		FROM information_schema.check_constraints cc
		JOIN information_schema.table_constraints tc
			ON cc.constraint_name = tc.constraint_name
			AND cc.constraint_schema = tc.table_schema
		WHERE tc.table_schema = $1
			AND tc.table_name = $2;
	`;

	const result = await client.query(query, [schemaName, tableName]);

	return result.rows.map((row) => ({
		constraintName: row.constraint_name,
		checkClause: row.check_clause,
		isDeferrable: row.is_deferrable === 'YES',
		isInitiallyDeferred: row.initially_deferred === 'YES'
	}));
}

/**
 * Normalizes referential action strings from information_schema.
 *
 * @param action - Action string (e.g., "NO ACTION", "CASCADE")
 * @returns Normalized ReferentialAction
 */
function normalizeReferentialAction(action: string): ReferentialAction {
	const normalized = action.toUpperCase();
	switch (normalized) {
		case 'CASCADE':
			return 'CASCADE';
		case 'SET NULL':
			return 'SET NULL';
		case 'RESTRICT':
			return 'RESTRICT';
		case 'NO ACTION':
			return 'NO ACTION';
		case 'SET DEFAULT':
			return 'SET DEFAULT';
		default:
			return 'NO ACTION';
	}
}
