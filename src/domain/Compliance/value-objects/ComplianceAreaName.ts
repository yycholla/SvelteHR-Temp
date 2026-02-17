// src/domain/Compliance/value-objects/ComplianceAreaName.ts
import { Result } from '$domain/Result';
import { InvalidComplianceError } from '../errors/ComplianceErrors';

const MIN_LENGTH = 1;
const MAX_LENGTH = 200;

/**
 * Value object representing the name of a compliance area.
 *
 * Rules:
 * - Must be between 1 and 200 characters (after trimming)
 * - Whitespace-only names are rejected
 * - Leading/trailing whitespace is trimmed
 */
export class ComplianceAreaName {
	private constructor(private readonly _value: string) {}

	/**
	 * Create a ComplianceAreaName value object.
	 * @param value - Name string to validate and wrap
	 * @returns Result containing ComplianceAreaName or InvalidComplianceError
	 */
	static create(value: string): Result<ComplianceAreaName, InvalidComplianceError> {
		if (typeof value !== 'string') {
			return Result.error(
				new InvalidComplianceError('Compliance area name must be a string')
			);
		}

		const trimmed = value.trim();

		if (trimmed.length < MIN_LENGTH) {
			return Result.error(
				new InvalidComplianceError('Compliance area name cannot be empty')
			);
		}

		if (trimmed.length > MAX_LENGTH) {
			return Result.error(
				new InvalidComplianceError(
					`Compliance area name must be at most ${MAX_LENGTH} characters, got: ${trimmed.length}`
				)
			);
		}

		return Result.ok(new ComplianceAreaName(trimmed));
	}

	/** The trimmed name value */
	get value(): string {
		return this._value;
	}

	equals(other: ComplianceAreaName): boolean {
		return this._value === other._value;
	}

	toString(): string {
		return this._value;
	}
}
