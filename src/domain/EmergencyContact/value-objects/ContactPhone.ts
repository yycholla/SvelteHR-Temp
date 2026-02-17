// src/domain/EmergencyContact/value-objects/ContactPhone.ts
import { Result } from '$domain/Result';
import { InvalidEmergencyContactError } from '../errors/EmergencyContactErrors';

const MIN_LENGTH = 7;
const MAX_LENGTH = 20;

// Allows digits, spaces, dashes, parentheses, and plus sign
const VALID_PHONE_PATTERN = /^[0-9\s\-()+]+$/;

/**
 * Value object representing an emergency contact's phone number.
 *
 * Invariants:
 * - Must be 7-20 characters
 * - Must only contain digits, spaces, dashes, parentheses, and plus sign
 */
export class ContactPhone {
	private constructor(private readonly _value: string) {}

	/**
	 * Create a ContactPhone value object.
	 * @param value - Raw phone number string
	 * @returns Result containing ContactPhone or InvalidEmergencyContactError
	 */
	static create(value: string): Result<ContactPhone, InvalidEmergencyContactError> {
		if (typeof value !== 'string') {
			return Result.error(new InvalidEmergencyContactError('Contact phone must be a string'));
		}

		const trimmed = value.trim();

		if (trimmed.length === 0) {
			return Result.error(new InvalidEmergencyContactError('Contact phone cannot be empty'));
		}

		if (trimmed.length < MIN_LENGTH) {
			return Result.error(
				new InvalidEmergencyContactError(
					`Contact phone must be at least ${MIN_LENGTH} characters`
				)
			);
		}

		if (trimmed.length > MAX_LENGTH) {
			return Result.error(
				new InvalidEmergencyContactError(
					`Contact phone must be at most ${MAX_LENGTH} characters`
				)
			);
		}

		if (!VALID_PHONE_PATTERN.test(trimmed)) {
			return Result.error(
				new InvalidEmergencyContactError(
					'Contact phone contains invalid characters. Only digits, spaces, dashes, parentheses, and plus sign are allowed'
				)
			);
		}

		return Result.ok(new ContactPhone(trimmed));
	}

	/** The phone number value */
	get value(): string {
		return this._value;
	}

	equals(other: ContactPhone): boolean {
		return this._value === other._value;
	}

	toString(): string {
		return this._value;
	}
}
