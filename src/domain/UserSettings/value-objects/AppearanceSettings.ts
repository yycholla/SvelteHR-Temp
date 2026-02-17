// src/domain/UserSettings/value-objects/AppearanceSettings.ts
import { Result } from '$domain/Result';
import { InvalidUserSettingsError } from '../errors/UserSettingsErrors';
import { FontSize } from './FontSize';
import { ColorScheme } from './ColorScheme';

export interface AppearanceSettingsData {
	darkMode: boolean;
	fontSize: string;
	colorScheme: string;
	sidebarCollapsed: boolean;
}

/**
 * Value object representing user appearance settings.
 *
 * Immutable - mutation methods return new instances.
 *
 * @example
 * ```typescript
 * const result = AppearanceSettings.create({
 *   darkMode: false,
 *   fontSize: 'medium',
 *   colorScheme: 'blue',
 *   sidebarCollapsed: false
 * });
 * if (result.isOk) {
 *   const dark = result.value.withDarkMode(true);
 * }
 * ```
 */
export class AppearanceSettings {
	private constructor(
		private readonly _darkMode: boolean,
		private readonly _fontSize: FontSize,
		private readonly _colorScheme: ColorScheme,
		private readonly _sidebarCollapsed: boolean
	) {}

	/**
	 * Create an AppearanceSettings value object.
	 * @param data - Appearance settings data
	 * @returns Result containing AppearanceSettings or InvalidUserSettingsError
	 */
	static create(data: AppearanceSettingsData): Result<AppearanceSettings, InvalidUserSettingsError> {
		if (typeof data.darkMode !== 'boolean') {
			return Result.error(new InvalidUserSettingsError('Appearance setting "darkMode" must be a boolean'));
		}

		const fontSizeResult = FontSize.create(data.fontSize);
		if (fontSizeResult.isError) {
			return Result.error(fontSizeResult.error);
		}

		const colorSchemeResult = ColorScheme.create(data.colorScheme);
		if (colorSchemeResult.isError) {
			return Result.error(colorSchemeResult.error);
		}

		if (typeof data.sidebarCollapsed !== 'boolean') {
			return Result.error(new InvalidUserSettingsError('Appearance setting "sidebarCollapsed" must be a boolean'));
		}

		return Result.ok(
			new AppearanceSettings(
				data.darkMode,
				fontSizeResult.value,
				colorSchemeResult.value,
				data.sidebarCollapsed
			)
		);
	}

	/** Whether dark mode is enabled */
	get darkMode(): boolean {
		return this._darkMode;
	}

	/** The font size preference */
	get fontSize(): FontSize {
		return this._fontSize;
	}

	/** The color scheme preference */
	get colorScheme(): ColorScheme {
		return this._colorScheme;
	}

	/** Whether the sidebar is collapsed */
	get sidebarCollapsed(): boolean {
		return this._sidebarCollapsed;
	}

	/**
	 * Returns a new instance with the dark mode setting updated.
	 */
	withDarkMode(enabled: boolean): AppearanceSettings {
		return new AppearanceSettings(
			enabled,
			this._fontSize,
			this._colorScheme,
			this._sidebarCollapsed
		);
	}

	/**
	 * Returns a new instance with the sidebar collapsed setting updated.
	 */
	withSidebarCollapsed(collapsed: boolean): AppearanceSettings {
		return new AppearanceSettings(
			this._darkMode,
			this._fontSize,
			this._colorScheme,
			collapsed
		);
	}

	equals(other: AppearanceSettings): boolean {
		return (
			this._darkMode === other._darkMode &&
			this._fontSize.equals(other._fontSize) &&
			this._colorScheme.equals(other._colorScheme) &&
			this._sidebarCollapsed === other._sidebarCollapsed
		);
	}
}
