// src/domain/Compliance/errors/ComplianceErrors.ts

/**
 * Base error class for all compliance domain errors.
 *
 * All compliance-specific errors extend this class to provide
 * a consistent error hierarchy with machine-readable codes.
 */
export class ComplianceError extends Error {
	constructor(
		message: string,
		public readonly code: string
	) {
		super(message);
		this.name = 'ComplianceError';
	}
}

/**
 * Thrown when a compliance area cannot be found by its identifier.
 *
 * @example
 * throw new ComplianceAreaNotFoundError('area-uuid-123');
 */
export class ComplianceAreaNotFoundError extends ComplianceError {
	constructor(id: string) {
		super(`Compliance area not found: ${id}`, 'COMPLIANCE_AREA_NOT_FOUND');
		this.name = 'ComplianceAreaNotFoundError';
	}
}

/**
 * Thrown when compliance data fails validation rules.
 *
 * @example
 * throw new InvalidComplianceError('Score must be between 0 and 100');
 */
export class InvalidComplianceError extends ComplianceError {
	constructor(message: string) {
		super(message, 'INVALID_COMPLIANCE');
		this.name = 'InvalidComplianceError';
	}
}
