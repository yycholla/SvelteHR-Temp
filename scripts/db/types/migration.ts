/**
 * Migration File Types
 *
 * Type definitions for migration files, metadata, and history tracking.
 */

import type { SchemaDiff } from './diff';

export interface MigrationFile {
	filename: string; // e.g., "20251003_001_create_users_table.sql"
	timestamp: string; // Extracted from filename: "20251003"
	sequence: number; // Extracted from filename: 1
	description: string; // Extracted from filename: "create_users_table"
	filePath: string; // Absolute path to file
	checksum: string; // SHA-256 of file contents
	appliedAt: string | null; // ISO-8601 timestamp when applied (null if not applied)
	appliedBy: string | null; // User who applied it
	rollbackFile: string | null; // Path to corresponding rollback migration
	sqlContent: string; // Full SQL content
	parsedMetadata: MigrationMetadata;
}

export type MigrationSource = 'manual' | 'auto-generated' | 'unknown';

export interface MigrationMetadata {
	createdAt: string; // Extracted from header comment
	source: MigrationSource;
	affectedObjects: string[]; // Tables/columns mentioned in comments
	isReversible: boolean;
	rollbackReason: string | null; // If not reversible, why?
}

export interface MigrationHistoryRecord {
	id: number;
	filename: string;
	checksum: string;
	appliedAt: string; // ISO-8601 timestamp
	appliedBy: string;
	executionTimeMs: number;
	success: boolean;
	errorMessage: string | null;
}

export type RemediationReason =
	| 'missing_table'
	| 'extra_table'
	| 'missing_column'
	| 'extra_column'
	| 'type_mismatch'
	| 'missing_constraint'
	| 'extra_constraint'
	| 'missing_index'
	| 'extra_index';

export interface RemediationMigration {
	generatedAt: string; // ISO-8601 timestamp
	filename: string; // Auto-generated name
	reason: RemediationReason;
	affectedObjects: string[]; // Tables/columns being fixed
	forwardSql: string; // SQL to apply changes
	rollbackSql: string | null; // SQL to reverse changes (if possible)
	requiresReview: boolean; // Always true per FR-024a
	metadata: {
		sourceDiff: SchemaDiff; // The diff that triggered generation
		manualSteps: string[]; // Any manual actions required
		warnings: string[]; // Warnings about non-reversible changes
	};
}

/**
 * Validation Functions
 */

const MIGRATION_FILENAME_PATTERN = /^(\d{8})_(\d{3})_([a-z0-9_]+)\.sql$/;

export function validateMigrationFilename(filename: string): boolean {
	return MIGRATION_FILENAME_PATTERN.test(filename);
}

export function parseMigrationFilename(filename: string): {
	timestamp: string;
	sequence: number;
	description: string;
} | null {
	const match = filename.match(MIGRATION_FILENAME_PATTERN);
	if (!match) return null;

	return {
		timestamp: match[1],
		sequence: parseInt(match[2], 10),
		description: match[3]
	};
}

export function validateMigrationTimestamp(timestamp: string): boolean {
	// YYYYMMDD format
	if (!/^\d{8}$/.test(timestamp)) return false;

	const year = parseInt(timestamp.substring(0, 4), 10);
	const month = parseInt(timestamp.substring(4, 6), 10);
	const day = parseInt(timestamp.substring(6, 8), 10);

	// Basic date validation
	if (year < 2020 || year > 2100) return false;
	if (month < 1 || month > 12) return false;
	if (day < 1 || day > 31) return false;

	return true;
}

export function validateMigrationSequence(sequence: number): boolean {
	return sequence >= 1 && sequence <= 999;
}

export function validateChecksum(checksum: string): boolean {
	// SHA-256 hex string = 64 characters
	return /^[a-f0-9]{64}$/i.test(checksum);
}

export function validateMigrationFile(migration: MigrationFile): string[] {
	const errors: string[] = [];

	if (!validateMigrationFilename(migration.filename)) {
		errors.push(`filename must match pattern ^\\d{8}_\\d{3}_[a-z0-9_]+\\.sql$`);
	}

	if (!validateMigrationTimestamp(migration.timestamp)) {
		errors.push('timestamp must be valid date in YYYYMMDD format');
	}

	if (!validateMigrationSequence(migration.sequence)) {
		errors.push('sequence must be 1-999');
	}

	if (!validateChecksum(migration.checksum)) {
		errors.push('checksum must be valid SHA-256 hex string (64 characters)');
	}

	if (migration.appliedAt !== null && migration.appliedBy === null) {
		errors.push('If appliedAt is not null, appliedBy must also be not null');
	}

	return errors;
}

export function validateMigrationHistoryRecord(record: MigrationHistoryRecord): string[] {
	const errors: string[] = [];

	if (!validateChecksum(record.checksum)) {
		errors.push('checksum must be valid SHA-256 hex string');
	}

	if (!record.success && !record.errorMessage) {
		errors.push('If success is false, errorMessage must be non-null');
	}

	if (record.executionTimeMs < 0) {
		errors.push('executionTimeMs must be non-negative');
	}

	return errors;
}

export function validateRemediationMigration(migration: RemediationMigration): string[] {
	const errors: string[] = [];

	// FR-024a: requiresReview must always be true
	if (!migration.requiresReview) {
		errors.push('requiresReview must always be true (FR-024a)');
	}

	if (migration.affectedObjects.length === 0) {
		errors.push('affectedObjects array must be non-empty');
	}

	if (!migration.forwardSql || migration.forwardSql.trim().length === 0) {
		errors.push('forwardSql must be valid PostgreSQL DDL');
	}

	if (migration.rollbackSql === null && migration.metadata.warnings.length === 0) {
		errors.push('If rollbackSql is null, metadata.warnings must explain why');
	}

	return errors;
}
