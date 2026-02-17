// src/domain/EmergencyContact/errors/EmergencyContactErrors.ts

/**
 * Base error class for all emergency contact domain errors.
 */
export class EmergencyContactError extends Error {
	constructor(
		message: string,
		public readonly code: string
	) {
		super(message);
		this.name = 'EmergencyContactError';
	}
}

/**
 * Error thrown when an emergency contact is not found.
 */
export class EmergencyContactNotFoundError extends EmergencyContactError {
	constructor(id: string) {
		super(`Emergency contact not found: ${id}`, 'EMERGENCY_CONTACT_NOT_FOUND');
		this.name = 'EmergencyContactNotFoundError';
	}
}

/**
 * Error thrown when emergency contact data is invalid.
 */
export class InvalidEmergencyContactError extends EmergencyContactError {
	constructor(message: string) {
		super(message, 'INVALID_EMERGENCY_CONTACT');
		this.name = 'InvalidEmergencyContactError';
	}
}
