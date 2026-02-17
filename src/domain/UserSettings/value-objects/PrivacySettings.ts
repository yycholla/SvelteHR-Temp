// src/domain/UserSettings/value-objects/PrivacySettings.ts
import { Result } from '$domain/Result';
import { InvalidUserSettingsError } from '../errors/UserSettingsErrors';
import { ProfileVisibility } from './ProfileVisibility';

export interface PrivacySettingsData {
	visibility: string;
	showOnlineStatus: boolean;
	allowDirectMessages: boolean;
	dataSharing: boolean;
	analyticsOptOut: boolean;
}

/**
 * Value object representing user privacy settings.
 *
 * Immutable - mutation methods return new instances.
 *
 * @example
 * ```typescript
 * const result = PrivacySettings.create({
 *   visibility: 'team',
 *   showOnlineStatus: true,
 *   allowDirectMessages: true,
 *   dataSharing: false,
 *   analyticsOptOut: true
 * });
 * ```
 */
export class PrivacySettings {
	private constructor(
		private readonly _visibility: ProfileVisibility,
		private readonly _showOnlineStatus: boolean,
		private readonly _allowDirectMessages: boolean,
		private readonly _dataSharing: boolean,
		private readonly _analyticsOptOut: boolean
	) {}

	/**
	 * Create a PrivacySettings value object.
	 * @param data - Privacy settings data
	 * @returns Result containing PrivacySettings or InvalidUserSettingsError
	 */
	static create(data: PrivacySettingsData): Result<PrivacySettings, InvalidUserSettingsError> {
		const visibilityResult = ProfileVisibility.create(data.visibility);
		if (visibilityResult.isError) {
			return Result.error(visibilityResult.error);
		}

		const booleanFields: Array<keyof Omit<PrivacySettingsData, 'visibility'>> = [
			'showOnlineStatus', 'allowDirectMessages', 'dataSharing', 'analyticsOptOut'
		];

		for (const field of booleanFields) {
			if (typeof data[field] !== 'boolean') {
				return Result.error(
					new InvalidUserSettingsError(`Privacy setting "${field}" must be a boolean`)
				);
			}
		}

		return Result.ok(
			new PrivacySettings(
				visibilityResult.value,
				data.showOnlineStatus,
				data.allowDirectMessages,
				data.dataSharing,
				data.analyticsOptOut
			)
		);
	}

	/** Profile visibility level */
	get visibility(): ProfileVisibility {
		return this._visibility;
	}

	/** Whether to show online status to others */
	get showOnlineStatus(): boolean {
		return this._showOnlineStatus;
	}

	/** Whether to allow direct messages */
	get allowDirectMessages(): boolean {
		return this._allowDirectMessages;
	}

	/** Whether to allow data sharing */
	get dataSharing(): boolean {
		return this._dataSharing;
	}

	/** Whether to opt out of analytics */
	get analyticsOptOut(): boolean {
		return this._analyticsOptOut;
	}

	/**
	 * Returns a new instance with the visibility updated.
	 */
	withVisibility(visibility: ProfileVisibility): PrivacySettings {
		return new PrivacySettings(
			visibility,
			this._showOnlineStatus,
			this._allowDirectMessages,
			this._dataSharing,
			this._analyticsOptOut
		);
	}

	equals(other: PrivacySettings): boolean {
		return (
			this._visibility.equals(other._visibility) &&
			this._showOnlineStatus === other._showOnlineStatus &&
			this._allowDirectMessages === other._allowDirectMessages &&
			this._dataSharing === other._dataSharing &&
			this._analyticsOptOut === other._analyticsOptOut
		);
	}
}
