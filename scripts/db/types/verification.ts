/**
 * Verification Report Types
 *
 * Type definitions for schema verification results and reporting.
 */

import type { SchemaMetadata } from './schema';
import type { SchemaDiff } from './diff';

export type VerificationVerdict =
	| 'PASS' // No differences
	| 'WARN' // Differences found, non-critical
	| 'FAIL' // Critical differences
	| 'ERROR'; // Verification process failed

export type Environment = 'development' | 'staging' | 'production';

export type ActionPriority = 'high' | 'medium' | 'low';

export interface RecommendedAction {
	priority: ActionPriority;
	action: string; // Human-readable description
	automatable: boolean;
	estimatedEffort: string; // e.g., "5 minutes", "1 hour"
}

export interface VerificationReport {
	verificationId: string; // UUID
	runAt: string; // ISO-8601 timestamp
	environment: Environment;
	schemaSource: SchemaMetadata; // From version control (init + migrations)
	schemaTarget: SchemaMetadata; // From live database
	diff: SchemaDiff;
	verdict: VerificationVerdict;
	executionTimeMs: number;
	recommendedActions: RecommendedAction[];
}

/**
 * Validation Functions
 */

export function validateEnvironment(env: string): env is Environment {
	return env === 'development' || env === 'staging' || env === 'production';
}

export function validateVerificationReport(report: VerificationReport): string[] {
	const errors: string[] = [];

	// If diff.hasDifferences is false, verdict must be "PASS"
	if (!report.diff.hasDifferences && report.verdict !== 'PASS') {
		errors.push('If diff.hasDifferences is false, verdict must be "PASS"');
	}

	// executionTimeMs must be non-negative
	if (report.executionTimeMs < 0) {
		errors.push('executionTimeMs must be non-negative');
	}

	// environment must be valid
	if (!validateEnvironment(report.environment)) {
		errors.push('environment must be one of: development, staging, production');
	}

	// verificationId should be a valid UUID
	const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	if (!uuidPattern.test(report.verificationId)) {
		errors.push('verificationId must be a valid UUID');
	}

	// runAt should be a valid ISO-8601 timestamp
	try {
		const date = new Date(report.runAt);
		if (isNaN(date.getTime()) || date.toISOString() !== report.runAt) {
			errors.push('runAt must be valid ISO-8601 timestamp');
		}
	} catch {
		errors.push('runAt must be valid ISO-8601 timestamp');
	}

	return errors;
}

/**
 * Exit Code Mapping
 *
 * Maps verification verdicts to process exit codes for CLI usage.
 */
export function getExitCode(verdict: VerificationVerdict): number {
	switch (verdict) {
		case 'PASS':
			return 0;
		case 'WARN':
		case 'FAIL':
			return 1;
		case 'ERROR':
			return 2;
	}
}

/**
 * Helper function to determine verdict from diff
 */
export function determineVerdict(
	diff: SchemaDiff,
	hasCriticalDifferences: boolean = false
): VerificationVerdict {
	if (!diff.hasDifferences) {
		return 'PASS';
	}

	// If there are critical differences (missing tables, type mismatches), return FAIL
	if (hasCriticalDifferences || diff.summary.missingTables > 0) {
		return 'FAIL';
	}

	// Otherwise, return WARN for non-critical differences
	return 'WARN';
}
