// src/domain/Certification/value-objects/CertificationName.ts
import { Result } from '$domain/Result';
import { InvalidCertificationError } from '../errors/CertificationErrors';

/**
 * Value object representing the name of a certification.
 *
 * Rules:
 * - Must be 1-200 characters long
 * - Trimmed of leading/trailing whitespace
 * - Must not be empty after trimming
 */
export class CertificationName {
	private constructor(private readonly _value: string) {}

	/**
	 * Create a CertificationName value object.
	 * @param value - The raw certification name string
	 * @returns Result containing CertificationName or InvalidCertificationError
	 */
	static create(value: string): Result<CertificationName, InvalidCertificationError> {
		if (typeof value !== 'string') {
			return Result.error(new InvalidCertificationError('Certification name must be a string'));
		}

		const trimmed = value.trim();

		if (trimmed.length === 0) {
			return Result.error(new InvalidCertificationError('Certification name must not be empty'));
		}

		if (trimmed.length > 200) {
			return Result.error(
				new InvalidCertificationError(
					`Certification name must not exceed 200 characters, got ${trimmed.length}`
				)
			);
		}

		return Result.ok(new CertificationName(trimmed));
	}

	/** The certification name value */
	get value(): string {
		return this._value;
	}

	equals(other: CertificationName): boolean {
		return this._value === other._value;
	}

	toString(): string {
		return this._value;
	}
}
