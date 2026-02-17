// src/services/ports/UserSettingsRepository.ts
import type { Result } from '$domain/Result';
import type { UserSettings } from '$domain/UserSettings';
import type { UserSettingsError } from '$domain/UserSettings';
import type { Timezone, NotificationPreferences, PrivacySettings, AppearanceSettings } from '$domain/UserSettings';

/**
 * Port interface for user settings data access.
 * Implementations should be in the adapters layer.
 */
export interface UserSettingsRepository {
	/**
	 * Find user settings by user ID.
	 * Returns null if no settings exist for the user.
	 */
	findByUserId(userId: string): Promise<Result<UserSettings | null, UserSettingsError>>;

	/**
	 * Create or update user settings (upsert).
	 */
	upsert(settings: UserSettings): Promise<Result<UserSettings, UserSettingsError>>;

	/**
	 * Update the timezone for a user's settings.
	 */
	updateTimezone(userId: string, timezone: Timezone): Promise<Result<UserSettings, UserSettingsError>>;

	/**
	 * Update the notification preferences for a user.
	 */
	updateNotifications(
		userId: string,
		prefs: NotificationPreferences
	): Promise<Result<UserSettings, UserSettingsError>>;

	/**
	 * Update the privacy settings for a user.
	 */
	updatePrivacy(
		userId: string,
		settings: PrivacySettings
	): Promise<Result<UserSettings, UserSettingsError>>;

	/**
	 * Update the appearance settings for a user.
	 */
	updateAppearance(
		userId: string,
		settings: AppearanceSettings
	): Promise<Result<UserSettings, UserSettingsError>>;
}
