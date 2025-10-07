/**
 * Constraint and Index Definition Types
 *
 * Type definitions for PostgreSQL constraints (PK, FK, UNIQUE, CHECK)
 * and indexes.
 */

export interface PrimaryKeyConstraint {
	constraintName: string;
	columns: string[]; // Ordered list of column names
}

export type ReferentialAction = 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION' | 'SET DEFAULT';

export interface ForeignKeyConstraint {
	constraintName: string;
	columns: string[]; // Local columns
	referencedTable: string;
	referencedColumns: string[]; // Remote columns
	onDelete: ReferentialAction; // CASCADE | SET NULL | RESTRICT | NO ACTION
	onUpdate: ReferentialAction;
}

export interface UniqueConstraint {
	constraintName: string;
	columns: string[];
	isDeferrable: boolean;
	isInitiallyDeferred: boolean;
}

export interface CheckConstraint {
	constraintName: string;
	checkClause: string; // SQL expression
	isDeferrable: boolean;
	isInitiallyDeferred: boolean;
}

export type IndexType = 'BTREE' | 'HASH' | 'GIN' | 'GIST' | 'SP-GIST' | 'BRIN';

export interface IndexDefinition {
	indexName: string;
	columns: string[]; // Ordered list
	isUnique: boolean;
	indexType: IndexType; // BTREE | HASH | GIN | GIST | SP-GIST | BRIN
	whereClause: string | null; // Partial index predicate
	indexDefinition: string; // Full CREATE INDEX statement
}

/**
 * Validation Functions
 */

export function validatePrimaryKeyConstraint(pk: PrimaryKeyConstraint): string[] {
	const errors: string[] = [];

	if (pk.columns.length === 0) {
		errors.push('Primary key columns array must be non-empty');
	}

	return errors;
}

export function validateForeignKeyConstraint(fk: ForeignKeyConstraint): string[] {
	const errors: string[] = [];

	if (fk.columns.length !== fk.referencedColumns.length) {
		errors.push('columns and referencedColumns must have same length');
	}

	if (fk.columns.length === 0) {
		errors.push('Foreign key columns array must be non-empty');
	}

	return errors;
}

export function validateUniqueConstraint(unique: UniqueConstraint): string[] {
	const errors: string[] = [];

	if (unique.columns.length === 0) {
		errors.push('Unique constraint columns array must be non-empty');
	}

	if (unique.isInitiallyDeferred && !unique.isDeferrable) {
		errors.push('If isInitiallyDeferred is true, isDeferrable must also be true');
	}

	return errors;
}

export function validateCheckConstraint(check: CheckConstraint): string[] {
	const errors: string[] = [];

	if (!check.checkClause || check.checkClause.trim().length === 0) {
		errors.push('checkClause must be non-empty SQL expression');
	}

	if (check.isInitiallyDeferred && !check.isDeferrable) {
		errors.push('If isInitiallyDeferred is true, isDeferrable must also be true');
	}

	return errors;
}

export function validateIndexDefinition(index: IndexDefinition): string[] {
	const errors: string[] = [];

	if (index.columns.length === 0) {
		errors.push('Index columns array must be non-empty');
	}

	const validIndexTypes: IndexType[] = ['BTREE', 'HASH', 'GIN', 'GIST', 'SP-GIST', 'BRIN'];
	if (!validIndexTypes.includes(index.indexType)) {
		errors.push(`indexType must be one of: ${validIndexTypes.join(', ')}`);
	}

	if (!index.indexDefinition || index.indexDefinition.trim().length === 0) {
		errors.push('indexDefinition must be valid CREATE INDEX SQL');
	}

	return errors;
}
