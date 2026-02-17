// src/domain/UserSettings/value-objects/ColorScheme.ts
import { Result } from '$domain/Result';
import { InvalidUserSettingsError } from '../errors/UserSettingsErrors';

type ColorSchemeValue = 'blue' | 'green' | 'purple' | 'orange';

const VALID_COLOR_SCHEMES: ReadonlySet<string> = new Set(['blue', 'green', 'purple', 'orange']);

/**
 * Value object representing the color scheme preference.
 *
 * Valid values: 'blue', 'green', 'purple', 'orange'
 */
export class ColorScheme {
	private constructor(private readonly _value: ColorSchemeValue) {}

	/**
	 * Create a ColorScheme value object.
	 * @param value - Color scheme string
	 * @returns Result containing ColorScheme or InvalidUserSettingsError
	 */
	static create(value: string): Result<ColorScheme, InvalidUserSettingsError> {
		if (!VALID_COLOR_SCHEMES.has(value)) {
			return Result.error(
				new InvalidUserSettingsError(
					`Invalid color scheme: "${value}". Must be one of: ${Array.from(VALID_COLOR_SCHEMES).join(', ')}`
				)
			);
		}

		return Result.ok(new ColorScheme(value as ColorSchemeValue));
	}

	/** The color scheme value */
	get value(): ColorSchemeValue {
		return this._value;
	}

	equals(other: ColorScheme): boolean {
		return this._value === other._value;
	}

	toString(): string {
		return this._value;
	}
}
