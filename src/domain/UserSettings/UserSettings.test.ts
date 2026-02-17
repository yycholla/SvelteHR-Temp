// src/domain/UserSettings/UserSettings.test.ts
import { describe, it, expect } from 'vitest';
import { UserSettings } from './UserSettings';
import { Timezone } from './value-objects/Timezone';
import { Locale } from './value-objects/Locale';
import { NotificationPreferences } from './value-objects/NotificationPreferences';
import { PrivacySettings } from './value-objects/PrivacySettings';
import { AppearanceSettings } from './value-objects/AppearanceSettings';
import { InvalidUserSettingsError, UserSettingsError } from './errors/UserSettingsErrors';

const VALID_USER_ID = '123e4567-e89b-12d3-a456-426614174000';

function createValidDomainObjects() {
	const timezone = Timezone.create('America/New_York').value;
	const locale = Locale.create('en-US').value;
	const notifications = NotificationPreferences.create({
		email: true,
		push: false,
		sms: false,
		leaveReminders: true,
		performanceUpdates: true,
		systemAlerts: true,
		teamUpdates: false
	}).value;
	const privacy = PrivacySettings.create({
		visibility: 'team',
		showOnlineStatus: true,
		allowDirectMessages: true,
		dataSharing: false,
		analyticsOptOut: true
	}).value;
	const appearance = AppearanceSettings.create({
		darkMode: false,
		fontSize: 'medium',
		colorScheme: 'blue',
		sidebarCollapsed: false
	}).value;

	return { timezone, locale, notifications, privacy, appearance };
}

function createValidUserSettings(overrides: Partial<{ userId: string; updatedAt: Date }> = {}) {
	const { timezone, locale, notifications, privacy, appearance } = createValidDomainObjects();
	return UserSettings.create({
		userId: overrides.userId ?? VALID_USER_ID,
		timezone,
		locale,
		notifications,
		privacy,
		appearance,
		updatedAt: overrides.updatedAt ?? new Date('2025-01-01T00:00:00.000Z')
	});
}

describe('UserSettings', () => {
	describe('create', () => {
		it('should create valid user settings', () => {
			const result = createValidUserSettings();
			expect(result.isOk).toBe(true);
		});

		it('should reject invalid userId (not a UUID)', () => {
			const result = createValidUserSettings({ userId: 'not-a-uuid' });
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidUserSettingsError);
		});

		it('should reject empty userId', () => {
			const result = createValidUserSettings({ userId: '' });
			expect(result.isError).toBe(true);
		});

		it('should reject invalid updatedAt date', () => {
			const { timezone, locale, notifications, privacy, appearance } = createValidDomainObjects();
			const result = UserSettings.create({
				userId: VALID_USER_ID,
				timezone,
				locale,
				notifications,
				privacy,
				appearance,
				updatedAt: new Date('invalid-date')
			});
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidUserSettingsError);
		});

		it('should reject non-Date updatedAt', () => {
			const { timezone, locale, notifications, privacy, appearance } = createValidDomainObjects();
			const result = UserSettings.create({
				userId: VALID_USER_ID,
				timezone,
				locale,
				notifications,
				privacy,
				appearance,
				updatedAt: 'not-a-date' as unknown as Date
			});
			expect(result.isError).toBe(true);
		});

		it('should include userId in error message for invalid UUID', () => {
			const result = createValidUserSettings({ userId: 'bad-id' });
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('userId');
		});

		it('should make a defensive copy of updatedAt', () => {
			const date = new Date('2025-06-15T12:00:00.000Z');
			const { timezone, locale, notifications, privacy, appearance } = createValidDomainObjects();
			const result = UserSettings.create({
				userId: VALID_USER_ID,
				timezone,
				locale,
				notifications,
				privacy,
				appearance,
				updatedAt: date
			});

			const originalTime = date.getTime();

			// Mutate original date
			date.setFullYear(2000);

			// Settings should not be affected - should still be original time
			expect(result.value.updatedAt.getTime()).toBe(originalTime);
		});
	});

	describe('getters', () => {
		it('should correctly return userId', () => {
			const settings = createValidUserSettings().value;
			expect(settings.userId).toBe(VALID_USER_ID);
		});

		it('should correctly return timezone', () => {
			const settings = createValidUserSettings().value;
			expect(settings.timezone.value).toBe('America/New_York');
		});

		it('should correctly return locale', () => {
			const settings = createValidUserSettings().value;
			expect(settings.locale.value).toBe('en-US');
		});

		it('should correctly return notifications', () => {
			const settings = createValidUserSettings().value;
			expect(settings.notifications.email).toBe(true);
		});

		it('should correctly return privacy', () => {
			const settings = createValidUserSettings().value;
			expect(settings.privacy.visibility.value).toBe('team');
		});

		it('should correctly return appearance', () => {
			const settings = createValidUserSettings().value;
			expect(settings.appearance.darkMode).toBe(false);
		});

		it('should return a defensive copy of updatedAt', () => {
			const settings = createValidUserSettings().value;
			const date1 = settings.updatedAt;
			const date2 = settings.updatedAt;
			expect(date1).not.toBe(date2); // different references
			expect(date1.getTime()).toBe(date2.getTime()); // same time
		});
	});

	describe('updateTimezone', () => {
		it('should return a new instance with the timezone updated', () => {
			const settings = createValidUserSettings().value;
			const newTz = Timezone.create('Europe/London').value;
			const updated = settings.updateTimezone(newTz);
			expect(updated.timezone.value).toBe('Europe/London');
			expect(settings.timezone.value).toBe('America/New_York'); // original unchanged
		});

		it('should update updatedAt when changing timezone', () => {
			const settings = createValidUserSettings({
				updatedAt: new Date('2020-01-01T00:00:00.000Z')
			}).value;
			const newTz = Timezone.create('UTC').value;
			const updated = settings.updateTimezone(newTz);
			expect(updated.updatedAt.getTime()).toBeGreaterThan(settings.updatedAt.getTime());
		});

		it('should not change other fields', () => {
			const settings = createValidUserSettings().value;
			const newTz = Timezone.create('UTC').value;
			const updated = settings.updateTimezone(newTz);
			expect(updated.locale.value).toBe(settings.locale.value);
			expect(updated.userId).toBe(settings.userId);
		});
	});

	describe('updateNotifications', () => {
		it('should return a new instance with notifications updated', () => {
			const settings = createValidUserSettings().value;
			const newNotifs = NotificationPreferences.create({
				email: false,
				push: true,
				sms: true,
				leaveReminders: false,
				performanceUpdates: false,
				systemAlerts: false,
				teamUpdates: true
			}).value;
			const updated = settings.updateNotifications(newNotifs);
			expect(updated.notifications.email).toBe(false);
			expect(updated.notifications.push).toBe(true);
			expect(settings.notifications.email).toBe(true); // original unchanged
		});
	});

	describe('updatePrivacy', () => {
		it('should return a new instance with privacy updated', () => {
			const settings = createValidUserSettings().value;
			const newPrivacy = PrivacySettings.create({
				visibility: 'private',
				showOnlineStatus: false,
				allowDirectMessages: false,
				dataSharing: false,
				analyticsOptOut: true
			}).value;
			const updated = settings.updatePrivacy(newPrivacy);
			expect(updated.privacy.visibility.value).toBe('private');
			expect(settings.privacy.visibility.value).toBe('team'); // original unchanged
		});
	});

	describe('updateAppearance', () => {
		it('should return a new instance with appearance updated', () => {
			const settings = createValidUserSettings().value;
			const newAppearance = AppearanceSettings.create({
				darkMode: true,
				fontSize: 'large',
				colorScheme: 'purple',
				sidebarCollapsed: true
			}).value;
			const updated = settings.updateAppearance(newAppearance);
			expect(updated.appearance.darkMode).toBe(true);
			expect(updated.appearance.fontSize.value).toBe('large');
			expect(settings.appearance.darkMode).toBe(false); // original unchanged
		});
	});

	describe('error hierarchy', () => {
		it('should throw UserSettingsError subclass on invalid data', () => {
			const result = createValidUserSettings({ userId: 'bad-id' });
			expect(result.error).toBeInstanceOf(UserSettingsError);
			expect(result.error).toBeInstanceOf(InvalidUserSettingsError);
		});
	});
});
