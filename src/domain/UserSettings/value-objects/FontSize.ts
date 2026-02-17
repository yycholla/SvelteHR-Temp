// src/domain/UserSettings/value-objects/FontSize.ts
import { Result } from '$domain/Result';
import { InvalidUserSettingsError } from '../errors/UserSettingsErrors';

type FontSizeValue = 'small' | 'medium' | 'large';

const VALID_FONT_SIZES: ReadonlySet<string> = new Set(['small', 'medium', 'large']);

/**
 * Value object representing the font size preference.
 *
 * Valid values: 'small', 'medium', 'large'
 */
export class FontSize {
	private constructor(private readonly _value: FontSizeValue) {}

	/**
	 * Create a FontSize value object.
	 * @param value - Font size string
	 * @returns Result containing FontSize or InvalidUserSettingsError
	 */
	static create(value: string): Result<FontSize, InvalidUserSettingsError> {
		if (!VALID_FONT_SIZES.has(value)) {
			return Result.error(
				new InvalidUserSettingsError(
					`Invalid font size: "${value}". Must be one of: ${Array.from(VALID_FONT_SIZES).join(', ')}`
				)
			);
		}

		return Result.ok(new FontSize(value as FontSizeValue));
	}

	/** The font size value */
	get value(): FontSizeValue {
		return this._value;
	}

	equals(other: FontSize): boolean {
		return this._value === other._value;
	}

	toString(): string {
		return this._value;
	}
}
