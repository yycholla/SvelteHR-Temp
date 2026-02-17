// src/domain/UserSettings/errors/UserSettingsErrors.ts

/**
 * Base error class for all UserSettings domain errors.
 */
export class UserSettingsError extends Error {
	constructor(
		message: string,
		public readonly code: string
	) {
		super(message);
		this.name = 'UserSettingsError';
	}
}

/**
 * Error thrown when settings are not found for a given user.
 */
export class UserSettingsNotFoundError extends UserSettingsError {
	constructor(userId: string) {
		super(`Settings not found for user: ${userId}`, 'USER_SETTINGS_NOT_FOUND');
		this.name = 'UserSettingsNotFoundError';
	}
}

/**
 * Error thrown when user settings data is invalid.
 */
export class InvalidUserSettingsError extends UserSettingsError {
	constructor(message: string) {
		super(message, 'INVALID_USER_SETTINGS');
		this.name = 'InvalidUserSettingsError';
	}
}
