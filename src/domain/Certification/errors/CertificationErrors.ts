// src/domain/Certification/errors/CertificationErrors.ts

/**
 * Base error class for all certification domain errors.
 */
export class CertificationError extends Error {
	constructor(
		message: string,
		public readonly code: string
	) {
		super(message);
		this.name = 'CertificationError';
	}
}

/**
 * Error thrown when a certification cannot be found by the given ID.
 */
export class CertificationNotFoundError extends CertificationError {
	constructor(id: string) {
		super(`Certification not found: ${id}`, 'CERTIFICATION_NOT_FOUND');
		this.name = 'CertificationNotFoundError';
	}
}

/**
 * Error thrown when certification data is invalid.
 */
export class InvalidCertificationError extends CertificationError {
	constructor(message: string) {
		super(message, 'INVALID_CERTIFICATION');
		this.name = 'InvalidCertificationError';
	}
}
