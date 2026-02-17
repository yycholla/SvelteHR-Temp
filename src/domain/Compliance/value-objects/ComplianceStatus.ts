// src/domain/Compliance/value-objects/ComplianceStatus.ts
import { Result } from '$domain/Result';
import { InvalidComplianceError } from '../errors/ComplianceErrors';

type ComplianceStatusValue = 'compliant' | 'warning' | 'failed' | 'pending';

const VALID_STATUSES: ReadonlySet<string> = new Set([
	'compliant',
	'warning',
	'failed',
	'pending'
]);

const ACTION_REQUIRED_STATUSES: ReadonlySet<string> = new Set(['warning', 'failed']);

/**
 * Value object representing the compliance status of a compliance area.
 *
 * Valid values: compliant, warning, failed, pending
 *
 * Provides business logic via:
 * - isCompliant() to check if status is compliant
 * - requiresAction() to identify statuses needing attention (warning or failed)
 */
export class ComplianceStatus {
	private constructor(private readonly _value: ComplianceStatusValue) {}

	/**
	 * Create a ComplianceStatus value object.
	 * @param value - Status string value
	 * @returns Result containing ComplianceStatus or InvalidComplianceError
	 */
	static create(value: string): Result<ComplianceStatus, InvalidComplianceError> {
		if (!VALID_STATUSES.has(value)) {
			return Result.error(
				new InvalidComplianceError(
					`Invalid compliance status: "${value}". Must be one of: ${Array.from(VALID_STATUSES).join(', ')}`
				)
			);
		}

		return Result.ok(new ComplianceStatus(value as ComplianceStatusValue));
	}

	/** The status value */
	get value(): ComplianceStatusValue {
		return this._value;
	}

	/**
	 * Returns true if the status is 'compliant'.
	 */
	isCompliant(): boolean {
		return this._value === 'compliant';
	}

	/**
	 * Returns true if the status requires action (warning or failed).
	 */
	requiresAction(): boolean {
		return ACTION_REQUIRED_STATUSES.has(this._value);
	}

	equals(other: ComplianceStatus): boolean {
		return this._value === other._value;
	}

	toString(): string {
		return this._value;
	}
}
