// src/services/UserSettingsService.ts
import { Result } from '$domain/Result';
import {
	UserSettings,
	Timezone,
	NotificationPreferences,
	PrivacySettings,
	AppearanceSettings,
	UserSettingsNotFoundError
} from '$domain/UserSettings';
import type { UserSettingsError } from '$domain/UserSettings';
import type { UserSettingsRepository } from './ports/UserSettingsRepository';

/**
 * Service for user settings business operations.
 *
 * Orchestrates user settings CRUD operations and business rules,
 * delegating data access to the UserSettingsRepository port.
 *
 * @example
 * ```typescript
 * const service = createUserSettingsService(event);
 * const result = await service.getByUserId('user-uuid');
 * if (result.isOk) {
 *   console.log(result.value); // UserSettings | null
 * }
 * ```
 */
export class UserSettingsService {
	constructor(private readonly repository: UserSettingsRepository) {}

	/**
	 * Get user settings by user ID.
	 * Returns null in the Result if no settings exist for the user.
	 */
	async getByUserId(userId: string): Promise<Result<UserSettings | null, UserSettingsError>> {
		try {
			return await this.repository.findByUserId(userId);
		} catch (error) {
			return Result.error(new UserSettingsNotFoundError(userId));
		}
	}

	/**
	 * Update the timezone for a user.
	 * Creates settings if they don't exist yet (via upsert if needed).
	 */
	async updateTimezone(
		userId: string,
		timezoneValue: string
	): Promise<Result<UserSettings, UserSettingsError>> {
		try {
			const timezoneResult = Timezone.create(timezoneValue);
			if (timezoneResult.isError) {
				return Result.error(timezoneResult.error);
			}

			return await this.repository.updateTimezone(userId, timezoneResult.value);
		} catch (error) {
			return Result.error(new UserSettingsNotFoundError(userId));
		}
	}

	/**
	 * Update notification preferences for a user.
	 */
	async updateNotifications(
		userId: string,
		prefsData: {
			email: boolean;
			push: boolean;
			sms: boolean;
			leaveReminders: boolean;
			performanceUpdates: boolean;
			systemAlerts: boolean;
			teamUpdates: boolean;
		}
	): Promise<Result<UserSettings, UserSettingsError>> {
		try {
			const prefsResult = NotificationPreferences.create(prefsData);
			if (prefsResult.isError) {
				return Result.error(prefsResult.error);
			}

			return await this.repository.updateNotifications(userId, prefsResult.value);
		} catch (error) {
			return Result.error(new UserSettingsNotFoundError(userId));
		}
	}

	/**
	 * Update privacy settings for a user.
	 */
	async updatePrivacy(
		userId: string,
		privacyData: {
			visibility: string;
			showOnlineStatus: boolean;
			allowDirectMessages: boolean;
			dataSharing: boolean;
			analyticsOptOut: boolean;
		}
	): Promise<Result<UserSettings, UserSettingsError>> {
		try {
			const privacyResult = PrivacySettings.create(privacyData);
			if (privacyResult.isError) {
				return Result.error(privacyResult.error);
			}

			return await this.repository.updatePrivacy(userId, privacyResult.value);
		} catch (error) {
			return Result.error(new UserSettingsNotFoundError(userId));
		}
	}

	/**
	 * Update appearance settings for a user.
	 */
	async updateAppearance(
		userId: string,
		appearanceData: {
			darkMode: boolean;
			fontSize: string;
			colorScheme: string;
			sidebarCollapsed: boolean;
		}
	): Promise<Result<UserSettings, UserSettingsError>> {
		try {
			const appearanceResult = AppearanceSettings.create(appearanceData);
			if (appearanceResult.isError) {
				return Result.error(appearanceResult.error);
			}

			return await this.repository.updateAppearance(userId, appearanceResult.value);
		} catch (error) {
			return Result.error(new UserSettingsNotFoundError(userId));
		}
	}

	/**
	 * Create or update user settings.
	 */
	async upsert(settings: UserSettings): Promise<Result<UserSettings, UserSettingsError>> {
		try {
			return await this.repository.upsert(settings);
		} catch (error) {
			return Result.error(new UserSettingsNotFoundError(settings.userId));
		}
	}
}
