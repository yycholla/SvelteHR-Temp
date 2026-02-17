// src/domain/UserSettings/value-objects/NotificationPreferences.ts
import { Result } from '$domain/Result';
import { InvalidUserSettingsError } from '../errors/UserSettingsErrors';

export interface NotificationPreferencesData {
	email: boolean;
	push: boolean;
	sms: boolean;
	leaveReminders: boolean;
	performanceUpdates: boolean;
	systemAlerts: boolean;
	teamUpdates: boolean;
}

/**
 * Value object representing user notification preferences.
 *
 * Immutable - mutation methods return new instances.
 *
 * @example
 * ```typescript
 * const result = NotificationPreferences.create({
 *   email: true, push: false, sms: false,
 *   leaveReminders: true, performanceUpdates: true,
 *   systemAlerts: true, teamUpdates: false
 * });
 * if (result.isOk) {
 *   const updated = result.value.withEmailEnabled(false);
 * }
 * ```
 */
export class NotificationPreferences {
	private constructor(
		private readonly _email: boolean,
		private readonly _push: boolean,
		private readonly _sms: boolean,
		private readonly _leaveReminders: boolean,
		private readonly _performanceUpdates: boolean,
		private readonly _systemAlerts: boolean,
		private readonly _teamUpdates: boolean
	) {}

	/**
	 * Create a NotificationPreferences value object.
	 * @param data - Notification preferences data
	 * @returns Result containing NotificationPreferences or InvalidUserSettingsError
	 */
	static create(data: NotificationPreferencesData): Result<NotificationPreferences, InvalidUserSettingsError> {
		const fields: Array<keyof NotificationPreferencesData> = [
			'email', 'push', 'sms', 'leaveReminders', 'performanceUpdates', 'systemAlerts', 'teamUpdates'
		];

		for (const field of fields) {
			if (typeof data[field] !== 'boolean') {
				return Result.error(
					new InvalidUserSettingsError(`Notification preference "${field}" must be a boolean`)
				);
			}
		}

		return Result.ok(
			new NotificationPreferences(
				data.email,
				data.push,
				data.sms,
				data.leaveReminders,
				data.performanceUpdates,
				data.systemAlerts,
				data.teamUpdates
			)
		);
	}

	/** Email notifications enabled */
	get email(): boolean {
		return this._email;
	}

	/** Push notifications enabled */
	get push(): boolean {
		return this._push;
	}

	/** SMS notifications enabled */
	get sms(): boolean {
		return this._sms;
	}

	/** Leave reminder notifications enabled */
	get leaveReminders(): boolean {
		return this._leaveReminders;
	}

	/** Performance update notifications enabled */
	get performanceUpdates(): boolean {
		return this._performanceUpdates;
	}

	/** System alert notifications enabled */
	get systemAlerts(): boolean {
		return this._systemAlerts;
	}

	/** Team update notifications enabled */
	get teamUpdates(): boolean {
		return this._teamUpdates;
	}

	/**
	 * Returns a new instance with the email preference updated.
	 */
	withEmailEnabled(enabled: boolean): NotificationPreferences {
		return new NotificationPreferences(
			enabled,
			this._push,
			this._sms,
			this._leaveReminders,
			this._performanceUpdates,
			this._systemAlerts,
			this._teamUpdates
		);
	}

	/**
	 * Returns a new instance with the push preference updated.
	 */
	withPushEnabled(enabled: boolean): NotificationPreferences {
		return new NotificationPreferences(
			this._email,
			enabled,
			this._sms,
			this._leaveReminders,
			this._performanceUpdates,
			this._systemAlerts,
			this._teamUpdates
		);
	}

	/**
	 * Returns a new instance with the sms preference updated.
	 */
	withSmsEnabled(enabled: boolean): NotificationPreferences {
		return new NotificationPreferences(
			this._email,
			this._push,
			enabled,
			this._leaveReminders,
			this._performanceUpdates,
			this._systemAlerts,
			this._teamUpdates
		);
	}

	equals(other: NotificationPreferences): boolean {
		return (
			this._email === other._email &&
			this._push === other._push &&
			this._sms === other._sms &&
			this._leaveReminders === other._leaveReminders &&
			this._performanceUpdates === other._performanceUpdates &&
			this._systemAlerts === other._systemAlerts &&
			this._teamUpdates === other._teamUpdates
		);
	}
}
