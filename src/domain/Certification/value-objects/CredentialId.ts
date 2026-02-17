// src/domain/Certification/value-objects/CredentialId.ts
import { Result } from '$domain/Result';
import { InvalidCertificationError } from '../errors/CertificationErrors';

/**
 * Value object representing an optional credential ID for a certification.
 *
 * Rules:
 * - Optional: null is allowed
 * - When present: 1-100 characters, trimmed, non-empty
 */
export class CredentialId {
	private constructor(private readonly _value: string | null) {}

	/**
	 * Create a CredentialId value object.
	 * @param value - The raw credential ID string, or null
	 * @returns Result containing CredentialId or InvalidCertificationError
	 */
	static create(value: string | null | undefined): Result<CredentialId, InvalidCertificationError> {
		if (value === null || value === undefined) {
			return Result.ok(new CredentialId(null));
		}

		if (typeof value !== 'string') {
			return Result.error(new InvalidCertificationError('Credential ID must be a string or null'));
		}

		const trimmed = value.trim();

		if (trimmed.length === 0) {
			return Result.ok(new CredentialId(null));
		}

		if (trimmed.length > 100) {
			return Result.error(
				new InvalidCertificationError(
					`Credential ID must not exceed 100 characters, got ${trimmed.length}`
				)
			);
		}

		return Result.ok(new CredentialId(trimmed));
	}

	/** The credential ID value, or null if not provided */
	get value(): string | null {
		return this._value;
	}

	/**
	 * Returns true if a credential ID is present.
	 */
	hasValue(): boolean {
		return this._value !== null;
	}

	equals(other: CredentialId): boolean {
		return this._value === other._value;
	}

	toString(): string {
		return this._value ?? '';
	}
}
