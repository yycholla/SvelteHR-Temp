// src/domain/UserSettings/value-objects/PrivacySettings.test.ts
import { describe, it, expect } from 'vitest';
import { PrivacySettings } from './PrivacySettings';
import { ProfileVisibility } from './ProfileVisibility';
import { InvalidUserSettingsError } from '../errors/UserSettingsErrors';

function createValidData() {
	return {
		visibility: 'team',
		showOnlineStatus: true,
		allowDirectMessages: true,
		dataSharing: false,
		analyticsOptOut: true
	};
}

describe('PrivacySettings', () => {
	describe('create', () => {
		it('should create valid privacy settings', () => {
			const result = PrivacySettings.create(createValidData());
			expect(result.isOk).toBe(true);
		});

		it('should create privacy settings with all valid visibility options', () => {
			const visibilities = ['public', 'team', 'managers', 'private'];
			for (const visibility of visibilities) {
				const result = PrivacySettings.create({ ...createValidData(), visibility });
				expect(result.isOk).toBe(true);
			}
		});

		it('should reject invalid visibility', () => {
			const result = PrivacySettings.create({ ...createValidData(), visibility: 'everyone' });
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidUserSettingsError);
		});

		it('should reject non-boolean showOnlineStatus', () => {
			const data = { ...createValidData(), showOnlineStatus: 'yes' as unknown as boolean };
			const result = PrivacySettings.create(data);
			expect(result.isError).toBe(true);
		});

		it('should reject non-boolean allowDirectMessages', () => {
			const data = { ...createValidData(), allowDirectMessages: 1 as unknown as boolean };
			const result = PrivacySettings.create(data);
			expect(result.isError).toBe(true);
		});

		it('should reject non-boolean dataSharing', () => {
			const data = { ...createValidData(), dataSharing: null as unknown as boolean };
			const result = PrivacySettings.create(data);
			expect(result.isError).toBe(true);
		});

		it('should reject non-boolean analyticsOptOut', () => {
			const data = { ...createValidData(), analyticsOptOut: undefined as unknown as boolean };
			const result = PrivacySettings.create(data);
			expect(result.isError).toBe(true);
		});

		it('should include field name in error message for boolean validation', () => {
			const data = { ...createValidData(), dataSharing: 'false' as unknown as boolean };
			const result = PrivacySettings.create(data);
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('dataSharing');
		});
	});

	describe('getters', () => {
		it('should correctly return all field values', () => {
			const settings = PrivacySettings.create(createValidData()).value;
			expect(settings.visibility.value).toBe('team');
			expect(settings.showOnlineStatus).toBe(true);
			expect(settings.allowDirectMessages).toBe(true);
			expect(settings.dataSharing).toBe(false);
			expect(settings.analyticsOptOut).toBe(true);
		});

		it('should return ProfileVisibility instance for visibility', () => {
			const settings = PrivacySettings.create(createValidData()).value;
			expect(settings.visibility).toBeInstanceOf(ProfileVisibility);
		});
	});

	describe('withVisibility', () => {
		it('should return a new instance with visibility updated', () => {
			const settings = PrivacySettings.create(createValidData()).value;
			const newVisibility = ProfileVisibility.create('private').value;
			const updated = settings.withVisibility(newVisibility);
			expect(updated.visibility.value).toBe('private');
			expect(settings.visibility.value).toBe('team'); // original unchanged
		});

		it('should not change other fields', () => {
			const settings = PrivacySettings.create(createValidData()).value;
			const newVisibility = ProfileVisibility.create('public').value;
			const updated = settings.withVisibility(newVisibility);
			expect(updated.showOnlineStatus).toBe(settings.showOnlineStatus);
			expect(updated.allowDirectMessages).toBe(settings.allowDirectMessages);
		});
	});

	describe('equals', () => {
		it('should return true for equal settings', () => {
			const s1 = PrivacySettings.create(createValidData()).value;
			const s2 = PrivacySettings.create(createValidData()).value;
			expect(s1.equals(s2)).toBe(true);
		});

		it('should return false for different visibility', () => {
			const s1 = PrivacySettings.create(createValidData()).value;
			const s2 = PrivacySettings.create({ ...createValidData(), visibility: 'public' }).value;
			expect(s1.equals(s2)).toBe(false);
		});

		it('should return false for different showOnlineStatus', () => {
			const s1 = PrivacySettings.create(createValidData()).value;
			const s2 = PrivacySettings.create({ ...createValidData(), showOnlineStatus: false }).value;
			expect(s1.equals(s2)).toBe(false);
		});
	});
});
