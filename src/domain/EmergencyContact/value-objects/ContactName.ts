// src/domain/EmergencyContact/value-objects/ContactName.ts
import { Result } from '$domain/Result';
import { InvalidEmergencyContactError } from '../errors/EmergencyContactErrors';

const MIN_LENGTH = 1;
const MAX_LENGTH = 100;

// Regex: only allow letters (including unicode accented), spaces, hyphens, apostrophes, and periods
const VALID_NAME_PATTERN = /^[\p{L}\s'\-\.]+$/u;

/**
 * Value object representing an emergency contact's name.
 *
 * Invariants:
 * - Must be 1-100 characters (after trimming)
 * - Must not be empty
 * - Must only contain valid name characters (letters, spaces, hyphens, apostrophes, periods)
 */
export class ContactName {
	private constructor(private readonly _value: string) {}

	/**
	 * Create a ContactName value object.
	 * @param value - Raw name string
	 * @returns Result containing ContactName or InvalidEmergencyContactError
	 */
	static create(value: string): Result<ContactName, InvalidEmergencyContactError> {
		if (typeof value !== 'string') {
			return Result.error(new InvalidEmergencyContactError('Contact name must be a string'));
		}

		const trimmed = value.trim();

		if (trimmed.length === 0) {
			return Result.error(new InvalidEmergencyContactError('Contact name cannot be empty'));
		}

		if (trimmed.length < MIN_LENGTH) {
			return Result.error(
				new InvalidEmergencyContactError(
					`Contact name must be at least ${MIN_LENGTH} character(s)`
				)
			);
		}

		if (trimmed.length > MAX_LENGTH) {
			return Result.error(
				new InvalidEmergencyContactError(
					`Contact name must be at most ${MAX_LENGTH} characters`
				)
			);
		}

		if (!VALID_NAME_PATTERN.test(trimmed)) {
			return Result.error(
				new InvalidEmergencyContactError(
					'Contact name contains invalid characters. Only letters, spaces, hyphens, apostrophes, and periods are allowed'
				)
			);
		}

		return Result.ok(new ContactName(trimmed));
	}

	/** The trimmed name value */
	get value(): string {
		return this._value;
	}

	equals(other: ContactName): boolean {
		return this._value === other._value;
	}

	toString(): string {
		return this._value;
	}
}
