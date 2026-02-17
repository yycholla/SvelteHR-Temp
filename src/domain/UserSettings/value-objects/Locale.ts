// src/domain/UserSettings/value-objects/Locale.ts
import { Result } from '$domain/Result';
import { InvalidUserSettingsError } from '../errors/UserSettingsErrors';

/**
 * BCP 47 locale format regex.
 * Accepts: 'en', 'en-US', 'fr-FR', 'zh-CN', etc.
 * Two-letter language code, optionally followed by hyphen and two-letter/digit region code.
 */
const BCP47_REGEX = /^[a-z]{2}(-[A-Z]{2})?$/;

/**
 * Value object representing a BCP 47 locale string.
 *
 * Valid examples: 'en', 'en-US', 'fr-FR', 'zh-CN'
 * Format: two-letter language code, optionally followed by dash and two-letter region code.
 */
export class Locale {
	private constructor(private readonly _value: string) {}

	/**
	 * Create a Locale value object.
	 * @param value - BCP 47 locale string
	 * @returns Result containing Locale or InvalidUserSettingsError
	 */
	static create(value: string): Result<Locale, InvalidUserSettingsError> {
		if (typeof value !== 'string') {
			return Result.error(new InvalidUserSettingsError('Locale must be a string'));
		}

		const trimmed = value.trim();

		if (trimmed.length === 0) {
			return Result.error(new InvalidUserSettingsError('Locale must not be empty'));
		}

		if (!BCP47_REGEX.test(trimmed)) {
			return Result.error(
				new InvalidUserSettingsError(
					`Invalid locale format: "${trimmed}". Must be BCP 47 format (e.g., 'en', 'en-US', 'fr-FR')`
				)
			);
		}

		return Result.ok(new Locale(trimmed));
	}

	/** The locale string value */
	get value(): string {
		return this._value;
	}

	/** Returns the language portion of the locale (e.g., 'en' from 'en-US') */
	get language(): string {
		return this._value.split('-')[0];
	}

	/** Returns the region portion of the locale if present (e.g., 'US' from 'en-US'), or null */
	get region(): string | null {
		const parts = this._value.split('-');
		return parts.length > 1 ? parts[1] : null;
	}

	equals(other: Locale): boolean {
		return this._value === other._value;
	}

	toString(): string {
		return this._value;
	}
}
