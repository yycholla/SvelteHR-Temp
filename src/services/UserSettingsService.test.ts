// src/services/UserSettingsService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserSettingsService } from './UserSettingsService';
import {
	UserSettings,
	Timezone,
	Locale,
	NotificationPreferences,
	PrivacySettings,
	AppearanceSettings,
	UserSettingsNotFoundError,
	InvalidUserSettingsError
} from '$domain/UserSettings';
import type { UserSettingsRepository } from './ports/UserSettingsRepository';
import { Result } from '$domain/Result';
import type { UserSettingsError } from '$domain/UserSettings';

const VALID_USER_ID = '123e4567-e89b-12d3-a456-426614174000';

function createValidDomainObjects() {
	return {
		timezone: Timezone.create('America/New_York').value,
		locale: Locale.create('en-US').value,
		notifications: NotificationPreferences.create({
			email: true,
			push: false,
			sms: false,
			leaveReminders: true,
			performanceUpdates: true,
			systemAlerts: true,
			teamUpdates: false
		}).value,
		privacy: PrivacySettings.create({
			visibility: 'team',
			showOnlineStatus: true,
			allowDirectMessages: true,
			dataSharing: false,
			analyticsOptOut: true
		}).value,
		appearance: AppearanceSettings.create({
			darkMode: false,
			fontSize: 'medium',
			colorScheme: 'blue',
			sidebarCollapsed: false
		}).value
	};
}

function createMockUserSettings(): UserSettings {
	const { timezone, locale, notifications, privacy, appearance } = createValidDomainObjects();
	return UserSettings.create({
		userId: VALID_USER_ID,
		timezone,
		locale,
		notifications,
		privacy,
		appearance,
		updatedAt: new Date('2025-06-15T12:00:00.000Z')
	}).value;
}

class MockUserSettingsRepository implements UserSettingsRepository {
	private mockData: UserSettings | null = null;
	private shouldThrow = false;
	private mockError: UserSettingsError | null = null;

	setMockData(data: UserSettings | null) {
		this.mockData = data;
		this.shouldThrow = false;
		this.mockError = null;
	}

	setShouldThrow(shouldThrow: boolean) {
		this.shouldThrow = shouldThrow;
	}

	setMockError(error: UserSettingsError) {
		this.mockError = error;
		this.shouldThrow = false;
	}

	async findByUserId(_userId: string): Promise<Result<UserSettings | null, UserSettingsError>> {
		if (this.shouldThrow) throw new Error('Repository error');
		if (this.mockError) return Result.error(this.mockError);
		return Result.ok(this.mockData);
	}

	async upsert(settings: UserSettings): Promise<Result<UserSettings, UserSettingsError>> {
		if (this.shouldThrow) throw new Error('Repository error');
		if (this.mockError) return Result.error(this.mockError);
		return Result.ok(settings);
	}

	async updateTimezone(_userId: string, timezone: Timezone): Promise<Result<UserSettings, UserSettingsError>> {
		if (this.shouldThrow) throw new Error('Repository error');
		if (this.mockError) return Result.error(this.mockError);
		if (!this.mockData) return Result.error(new UserSettingsNotFoundError(_userId));
		return Result.ok(this.mockData.updateTimezone(timezone));
	}

	async updateNotifications(_userId: string, prefs: NotificationPreferences): Promise<Result<UserSettings, UserSettingsError>> {
		if (this.shouldThrow) throw new Error('Repository error');
		if (this.mockError) return Result.error(this.mockError);
		if (!this.mockData) return Result.error(new UserSettingsNotFoundError(_userId));
		return Result.ok(this.mockData.updateNotifications(prefs));
	}

	async updatePrivacy(_userId: string, settings: PrivacySettings): Promise<Result<UserSettings, UserSettingsError>> {
		if (this.shouldThrow) throw new Error('Repository error');
		if (this.mockError) return Result.error(this.mockError);
		if (!this.mockData) return Result.error(new UserSettingsNotFoundError(_userId));
		return Result.ok(this.mockData.updatePrivacy(settings));
	}

	async updateAppearance(_userId: string, settings: AppearanceSettings): Promise<Result<UserSettings, UserSettingsError>> {
		if (this.shouldThrow) throw new Error('Repository error');
		if (this.mockError) return Result.error(this.mockError);
		if (!this.mockData) return Result.error(new UserSettingsNotFoundError(_userId));
		return Result.ok(this.mockData.updateAppearance(settings));
	}
}

describe('UserSettingsService', () => {
	let service: UserSettingsService;
	let mockRepository: MockUserSettingsRepository;

	beforeEach(() => {
		mockRepository = new MockUserSettingsRepository();
		service = new UserSettingsService(mockRepository);
	});

	describe('getByUserId', () => {
		it('should return user settings when found', async () => {
			const settings = createMockUserSettings();
			mockRepository.setMockData(settings);

			const result = await service.getByUserId(VALID_USER_ID);

			expect(result.isOk).toBe(true);
			expect(result.value).toBeInstanceOf(UserSettings);
		});

		it('should return null when no settings found', async () => {
			mockRepository.setMockData(null);

			const result = await service.getByUserId(VALID_USER_ID);

			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});

		it('should return error when repository throws', async () => {
			mockRepository.setShouldThrow(true);

			const result = await service.getByUserId(VALID_USER_ID);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(UserSettingsNotFoundError);
		});

		it('should propagate repository errors', async () => {
			mockRepository.setMockError(new UserSettingsNotFoundError(VALID_USER_ID));

			const result = await service.getByUserId(VALID_USER_ID);

			expect(result.isError).toBe(true);
		});
	});

	describe('updateTimezone', () => {
		it('should update timezone successfully', async () => {
			const settings = createMockUserSettings();
			mockRepository.setMockData(settings);

			const result = await service.updateTimezone(VALID_USER_ID, 'Europe/London');

			expect(result.isOk).toBe(true);
			expect(result.value.timezone.value).toBe('Europe/London');
		});

		it('should reject invalid timezone', async () => {
			const result = await service.updateTimezone(VALID_USER_ID, '');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidUserSettingsError);
		});

		it('should return error when repository throws', async () => {
			mockRepository.setShouldThrow(true);

			const result = await service.updateTimezone(VALID_USER_ID, 'UTC');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(UserSettingsNotFoundError);
		});

		it('should accept valid timezone strings', async () => {
			const settings = createMockUserSettings();
			mockRepository.setMockData(settings);

			const result = await service.updateTimezone(VALID_USER_ID, 'Asia/Tokyo');

			expect(result.isOk).toBe(true);
		});
	});

	describe('updateNotifications', () => {
		it('should update notifications successfully', async () => {
			const settings = createMockUserSettings();
			mockRepository.setMockData(settings);

			const result = await service.updateNotifications(VALID_USER_ID, {
				email: false,
				push: true,
				sms: true,
				leaveReminders: false,
				performanceUpdates: false,
				systemAlerts: true,
				teamUpdates: true
			});

			expect(result.isOk).toBe(true);
			expect(result.value.notifications.email).toBe(false);
			expect(result.value.notifications.push).toBe(true);
		});

		it('should reject invalid notification data', async () => {
			const result = await service.updateNotifications(VALID_USER_ID, {
				email: 'yes' as unknown as boolean,
				push: true,
				sms: false,
				leaveReminders: true,
				performanceUpdates: true,
				systemAlerts: true,
				teamUpdates: false
			});

			expect(result.isError).toBe(true);
		});

		it('should return error when repository throws', async () => {
			mockRepository.setShouldThrow(true);

			const result = await service.updateNotifications(VALID_USER_ID, {
				email: true,
				push: false,
				sms: false,
				leaveReminders: true,
				performanceUpdates: true,
				systemAlerts: true,
				teamUpdates: false
			});

			expect(result.isError).toBe(true);
		});
	});

	describe('updatePrivacy', () => {
		it('should update privacy settings successfully', async () => {
			const settings = createMockUserSettings();
			mockRepository.setMockData(settings);

			const result = await service.updatePrivacy(VALID_USER_ID, {
				visibility: 'private',
				showOnlineStatus: false,
				allowDirectMessages: false,
				dataSharing: false,
				analyticsOptOut: true
			});

			expect(result.isOk).toBe(true);
			expect(result.value.privacy.visibility.value).toBe('private');
		});

		it('should reject invalid visibility', async () => {
			const result = await service.updatePrivacy(VALID_USER_ID, {
				visibility: 'everyone',
				showOnlineStatus: true,
				allowDirectMessages: true,
				dataSharing: false,
				analyticsOptOut: false
			});

			expect(result.isError).toBe(true);
		});

		it('should return error when repository throws', async () => {
			mockRepository.setShouldThrow(true);

			const result = await service.updatePrivacy(VALID_USER_ID, {
				visibility: 'team',
				showOnlineStatus: true,
				allowDirectMessages: true,
				dataSharing: false,
				analyticsOptOut: false
			});

			expect(result.isError).toBe(true);
		});
	});

	describe('updateAppearance', () => {
		it('should update appearance settings successfully', async () => {
			const settings = createMockUserSettings();
			mockRepository.setMockData(settings);

			const result = await service.updateAppearance(VALID_USER_ID, {
				darkMode: true,
				fontSize: 'large',
				colorScheme: 'purple',
				sidebarCollapsed: true
			});

			expect(result.isOk).toBe(true);
			expect(result.value.appearance.darkMode).toBe(true);
			expect(result.value.appearance.fontSize.value).toBe('large');
		});

		it('should reject invalid fontSize', async () => {
			const result = await service.updateAppearance(VALID_USER_ID, {
				darkMode: false,
				fontSize: 'huge',
				colorScheme: 'blue',
				sidebarCollapsed: false
			});

			expect(result.isError).toBe(true);
		});

		it('should reject invalid colorScheme', async () => {
			const result = await service.updateAppearance(VALID_USER_ID, {
				darkMode: false,
				fontSize: 'medium',
				colorScheme: 'red',
				sidebarCollapsed: false
			});

			expect(result.isError).toBe(true);
		});

		it('should return error when repository throws', async () => {
			mockRepository.setShouldThrow(true);

			const result = await service.updateAppearance(VALID_USER_ID, {
				darkMode: false,
				fontSize: 'medium',
				colorScheme: 'blue',
				sidebarCollapsed: false
			});

			expect(result.isError).toBe(true);
		});
	});

	describe('upsert', () => {
		it('should upsert user settings successfully', async () => {
			const settings = createMockUserSettings();

			const result = await service.upsert(settings);

			expect(result.isOk).toBe(true);
			expect(result.value).toBeInstanceOf(UserSettings);
		});

		it('should return error when repository throws', async () => {
			const settings = createMockUserSettings();
			mockRepository.setShouldThrow(true);

			const result = await service.upsert(settings);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(UserSettingsNotFoundError);
		});

		it('should return same settings data after upsert', async () => {
			const settings = createMockUserSettings();

			const result = await service.upsert(settings);

			expect(result.isOk).toBe(true);
			expect(result.value.userId).toBe(VALID_USER_ID);
			expect(result.value.timezone.value).toBe('America/New_York');
		});
	});
});
