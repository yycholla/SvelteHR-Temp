// src/domain/UserSettings/value-objects/AppearanceSettings.test.ts
import { describe, it, expect } from 'vitest';
import { AppearanceSettings } from './AppearanceSettings';
import { FontSize } from './FontSize';
import { ColorScheme } from './ColorScheme';
import { InvalidUserSettingsError } from '../errors/UserSettingsErrors';

function createValidData() {
	return {
		darkMode: false,
		fontSize: 'medium',
		colorScheme: 'blue',
		sidebarCollapsed: false
	};
}

describe('AppearanceSettings', () => {
	describe('create', () => {
		it('should create valid appearance settings', () => {
			const result = AppearanceSettings.create(createValidData());
			expect(result.isOk).toBe(true);
		});

		it('should create settings with all font size options', () => {
			for (const fontSize of ['small', 'medium', 'large']) {
				const result = AppearanceSettings.create({ ...createValidData(), fontSize });
				expect(result.isOk).toBe(true);
			}
		});

		it('should create settings with all color scheme options', () => {
			for (const colorScheme of ['blue', 'green', 'purple', 'orange']) {
				const result = AppearanceSettings.create({ ...createValidData(), colorScheme });
				expect(result.isOk).toBe(true);
			}
		});

		it('should reject non-boolean darkMode', () => {
			const data = { ...createValidData(), darkMode: 'true' as unknown as boolean };
			const result = AppearanceSettings.create(data);
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidUserSettingsError);
		});

		it('should reject invalid fontSize', () => {
			const result = AppearanceSettings.create({ ...createValidData(), fontSize: 'huge' });
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidUserSettingsError);
		});

		it('should reject invalid colorScheme', () => {
			const result = AppearanceSettings.create({ ...createValidData(), colorScheme: 'red' });
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidUserSettingsError);
		});

		it('should reject non-boolean sidebarCollapsed', () => {
			const data = { ...createValidData(), sidebarCollapsed: 1 as unknown as boolean };
			const result = AppearanceSettings.create(data);
			expect(result.isError).toBe(true);
		});

		it('should create dark mode enabled settings', () => {
			const result = AppearanceSettings.create({ ...createValidData(), darkMode: true });
			expect(result.isOk).toBe(true);
			expect(result.value.darkMode).toBe(true);
		});
	});

	describe('getters', () => {
		it('should correctly return all field values', () => {
			const settings = AppearanceSettings.create(createValidData()).value;
			expect(settings.darkMode).toBe(false);
			expect(settings.fontSize.value).toBe('medium');
			expect(settings.colorScheme.value).toBe('blue');
			expect(settings.sidebarCollapsed).toBe(false);
		});

		it('should return FontSize instance for fontSize', () => {
			const settings = AppearanceSettings.create(createValidData()).value;
			expect(settings.fontSize).toBeInstanceOf(FontSize);
		});

		it('should return ColorScheme instance for colorScheme', () => {
			const settings = AppearanceSettings.create(createValidData()).value;
			expect(settings.colorScheme).toBeInstanceOf(ColorScheme);
		});
	});

	describe('withDarkMode', () => {
		it('should return a new instance with dark mode enabled', () => {
			const settings = AppearanceSettings.create(createValidData()).value;
			const updated = settings.withDarkMode(true);
			expect(updated.darkMode).toBe(true);
			expect(settings.darkMode).toBe(false); // original unchanged
		});

		it('should not change other fields', () => {
			const settings = AppearanceSettings.create(createValidData()).value;
			const updated = settings.withDarkMode(true);
			expect(updated.fontSize.value).toBe(settings.fontSize.value);
			expect(updated.colorScheme.value).toBe(settings.colorScheme.value);
		});
	});

	describe('withSidebarCollapsed', () => {
		it('should return a new instance with sidebar collapsed', () => {
			const settings = AppearanceSettings.create(createValidData()).value;
			const updated = settings.withSidebarCollapsed(true);
			expect(updated.sidebarCollapsed).toBe(true);
			expect(settings.sidebarCollapsed).toBe(false); // original unchanged
		});
	});

	describe('equals', () => {
		it('should return true for equal settings', () => {
			const s1 = AppearanceSettings.create(createValidData()).value;
			const s2 = AppearanceSettings.create(createValidData()).value;
			expect(s1.equals(s2)).toBe(true);
		});

		it('should return false for different dark mode', () => {
			const s1 = AppearanceSettings.create(createValidData()).value;
			const s2 = AppearanceSettings.create({ ...createValidData(), darkMode: true }).value;
			expect(s1.equals(s2)).toBe(false);
		});

		it('should return false for different font size', () => {
			const s1 = AppearanceSettings.create(createValidData()).value;
			const s2 = AppearanceSettings.create({ ...createValidData(), fontSize: 'large' }).value;
			expect(s1.equals(s2)).toBe(false);
		});
	});
});
