// src/domain/UserSettings/value-objects/Timezone.ts
import { Result } from '$domain/Result';
import { InvalidUserSettingsError } from '../errors/UserSettingsErrors';

const MIN_LENGTH = 1;
const MAX_LENGTH = 50;

/**
 * Value object representing an IANA timezone string.
 *
 * Valid examples: 'UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo'
 * Must be non-empty and at most 50 characters.
 */
export class Timezone {
	private constructor(private readonly _value: string) {}

	/**
	 * Create a Timezone value object.
	 * @param value - IANA timezone string
	 * @returns Result containing Timezone or InvalidUserSettingsError
	 */
	static create(value: string): Result<Timezone, InvalidUserSettingsError> {
		if (typeof value !== 'string') {
			return Result.error(new InvalidUserSettingsError('Timezone must be a string'));
		}

		const trimmed = value.trim();

		if (trimmed.length < MIN_LENGTH) {
			return Result.error(new InvalidUserSettingsError('Timezone must not be empty'));
		}

		if (trimmed.length > MAX_LENGTH) {
			return Result.error(
				new InvalidUserSettingsError(
					`Timezone must not exceed ${MAX_LENGTH} characters, got ${trimmed.length}`
				)
			);
		}

		return Result.ok(new Timezone(trimmed));
	}

	/** The timezone string value */
	get value(): string {
		return this._value;
	}

	equals(other: Timezone): boolean {
		return this._value === other._value;
	}

	toString(): string {
		return this._value;
	}
}
