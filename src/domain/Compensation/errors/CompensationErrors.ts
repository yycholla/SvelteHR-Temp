// src/domain/Compensation/errors/CompensationErrors.ts
import { DomainError } from '$domain/errors';

/**
 * Error thrown when compensation validation fails.
 */
export class InvalidCompensationError extends DomainError {
	constructor(reason: string, value?: unknown) {
		super(`Invalid compensation: ${reason}`, 'INVALID_COMPENSATION', { reason, value });
		this.name = 'InvalidCompensationError';
	}
}

/**
 * Error thrown when salary validation fails.
 */
export class InvalidSalaryError extends DomainError {
	constructor(reason: string, value?: unknown) {
		super(`Invalid salary: ${reason}`, 'INVALID_SALARY', { reason, value });
		this.name = 'InvalidSalaryError';
	}
}

/**
 * Error thrown when bonus validation fails.
 */
export class InvalidBonusError extends DomainError {
	constructor(reason: string, value?: unknown) {
		super(`Invalid bonus: ${reason}`, 'INVALID_BONUS', { reason, value });
		this.name = 'InvalidBonusError';
	}
}

/**
 * Error thrown when raise percentage validation fails.
 */
export class InvalidRaisePercentageError extends DomainError {
	constructor(reason: string, value?: unknown) {
		super(`Invalid raise percentage: ${reason}`, 'INVALID_RAISE_PERCENTAGE', { reason, value });
		this.name = 'InvalidRaisePercentageError';
	}
}

/**
 * Error thrown when effective date validation fails.
 */
export class InvalidEffectiveDateError extends DomainError {
	constructor(reason: string, date?: unknown) {
		super(`Invalid effective date: ${reason}`, 'INVALID_EFFECTIVE_DATE', { reason, date });
		this.name = 'InvalidEffectiveDateError';
	}
}

/**
 * Error thrown when a compensation package is not found.
 */
export class CompensationNotFoundError extends DomainError {
	constructor(compensationId: string) {
		super(`Compensation with ID ${compensationId} not found`, 'COMPENSATION_NOT_FOUND', {
			compensationId
		});
		this.name = 'CompensationNotFoundError';
	}
}
