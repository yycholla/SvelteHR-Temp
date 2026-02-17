// src/domain/UserSettings/UserSettings.ts
import { Result } from '$domain/Result';
import { InvalidUserSettingsError, UserSettingsError } from './errors/UserSettingsErrors';
import { Timezone } from './value-objects/Timezone';
import { Locale } from './value-objects/Locale';
import { NotificationPreferences } from './value-objects/NotificationPreferences';
import { PrivacySettings } from './value-objects/PrivacySettings';
import { AppearanceSettings } from './value-objects/AppearanceSettings';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface UserSettingsCreateData {
	userId: string;
	timezone: Timezone;
	locale: Locale;
	notifications: NotificationPreferences;
	privacy: PrivacySettings;
	appearance: AppearanceSettings;
	updatedAt: Date;
}

/**
 * Aggregate root for user settings.
 *
 * Encapsulates all preferences for a user: timezone, locale,
 * notification preferences, privacy settings, and appearance settings.
 *
 * Immutable - mutation methods return new instances.
 *
 * @example
 * ```typescript
 * const result = UserSettings.create({
 *   userId: 'uuid-here',
 *   timezone: timezoneVO,
 *   locale: localeVO,
 *   notifications: notifPrefs,
 *   privacy: privacySettings,
 *   appearance: appearanceSettings,
 *   updatedAt: new Date()
 * });
 * if (result.isOk) {
 *   const updated = result.value.updateTimezone(newTimezone);
 * }
 * ```
 */
export class UserSettings {
	private constructor(
		private readonly _userId: string,
		private readonly _timezone: Timezone,
		private readonly _locale: Locale,
		private readonly _notifications: NotificationPreferences,
		private readonly _privacy: PrivacySettings,
		private readonly _appearance: AppearanceSettings,
		private readonly _updatedAt: Date
	) {}

	/**
	 * Create a UserSettings aggregate root.
	 * @param data - UserSettings creation data
	 * @returns Result containing UserSettings or UserSettingsError
	 */
	static create(data: UserSettingsCreateData): Result<UserSettings, UserSettingsError> {
		if (!UUID_REGEX.test(data.userId)) {
			return Result.error(
				new InvalidUserSettingsError(`Invalid userId: "${data.userId}". Must be a valid UUID`)
			);
		}

		if (!(data.updatedAt instanceof Date) || isNaN(data.updatedAt.getTime())) {
			return Result.error(new InvalidUserSettingsError('updatedAt must be a valid Date'));
		}

		return Result.ok(
			new UserSettings(
				data.userId,
				data.timezone,
				data.locale,
				data.notifications,
				data.privacy,
				data.appearance,
				new Date(data.updatedAt.getTime()) // defensive copy
			)
		);
	}

	/** The user ID this settings object belongs to */
	get userId(): string {
		return this._userId;
	}

	/** The user's timezone preference */
	get timezone(): Timezone {
		return this._timezone;
	}

	/** The user's locale preference */
	get locale(): Locale {
		return this._locale;
	}

	/** The user's notification preferences */
	get notifications(): NotificationPreferences {
		return this._notifications;
	}

	/** The user's privacy settings */
	get privacy(): PrivacySettings {
		return this._privacy;
	}

	/** The user's appearance settings */
	get appearance(): AppearanceSettings {
		return this._appearance;
	}

	/** When these settings were last updated (defensive copy) */
	get updatedAt(): Date {
		return new Date(this._updatedAt.getTime());
	}

	/**
	 * Returns a new UserSettings instance with the timezone updated.
	 */
	updateTimezone(timezone: Timezone): UserSettings {
		return new UserSettings(
			this._userId,
			timezone,
			this._locale,
			this._notifications,
			this._privacy,
			this._appearance,
			new Date()
		);
	}

	/**
	 * Returns a new UserSettings instance with the locale updated.
	 */
	updateLocale(locale: Locale): UserSettings {
		return new UserSettings(
			this._userId,
			this._timezone,
			locale,
			this._notifications,
			this._privacy,
			this._appearance,
			new Date()
		);
	}

	/**
	 * Returns a new UserSettings instance with the notification preferences updated.
	 */
	updateNotifications(notifications: NotificationPreferences): UserSettings {
		return new UserSettings(
			this._userId,
			this._timezone,
			this._locale,
			notifications,
			this._privacy,
			this._appearance,
			new Date()
		);
	}

	/**
	 * Returns a new UserSettings instance with the privacy settings updated.
	 */
	updatePrivacy(privacy: PrivacySettings): UserSettings {
		return new UserSettings(
			this._userId,
			this._timezone,
			this._locale,
			this._notifications,
			privacy,
			this._appearance,
			new Date()
		);
	}

	/**
	 * Returns a new UserSettings instance with the appearance settings updated.
	 */
	updateAppearance(appearance: AppearanceSettings): UserSettings {
		return new UserSettings(
			this._userId,
			this._timezone,
			this._locale,
			this._notifications,
			this._privacy,
			appearance,
			new Date()
		);
	}
}
