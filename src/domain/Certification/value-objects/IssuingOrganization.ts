// src/domain/Certification/value-objects/IssuingOrganization.ts
import { Result } from '$domain/Result';
import { InvalidCertificationError } from '../errors/CertificationErrors';

/**
 * Value object representing the organization that issued a certification.
 *
 * Rules:
 * - Must be 1-200 characters long
 * - Trimmed of leading/trailing whitespace
 * - Must not be empty after trimming
 */
export class IssuingOrganization {
	private constructor(private readonly _value: string) {}

	/**
	 * Create an IssuingOrganization value object.
	 * @param value - The raw organization name string
	 * @returns Result containing IssuingOrganization or InvalidCertificationError
	 */
	static create(value: string): Result<IssuingOrganization, InvalidCertificationError> {
		if (typeof value !== 'string') {
			return Result.error(
				new InvalidCertificationError('Issuing organization must be a string')
			);
		}

		const trimmed = value.trim();

		if (trimmed.length === 0) {
			return Result.error(
				new InvalidCertificationError('Issuing organization must not be empty')
			);
		}

		if (trimmed.length > 200) {
			return Result.error(
				new InvalidCertificationError(
					`Issuing organization must not exceed 200 characters, got ${trimmed.length}`
				)
			);
		}

		return Result.ok(new IssuingOrganization(trimmed));
	}

	/** The issuing organization value */
	get value(): string {
		return this._value;
	}

	equals(other: IssuingOrganization): boolean {
		return this._value === other._value;
	}

	toString(): string {
		return this._value;
	}
}
