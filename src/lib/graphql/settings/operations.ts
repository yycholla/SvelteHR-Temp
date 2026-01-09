import type { Client } from '@urql/core';
import type { UserCredentials } from '$lib/models/data-request';
import { createDataRequest } from '$lib/models/data-request';
import { createErrorResponse } from '$lib/models/error-response';
import {
	GET_USER_SETTINGS,
	GET_USER_PROFILE,
	loadUserPreferences,
	saveUserPreferences,
	loadNotificationPreferences,
	saveNotificationPreferences,
	loadPrivacyPreferences,
	savePrivacyPreferences,
	clearUserPreferences,
	type UserSettings,
	type UserPreferences,
	type NotificationPreferences,
	type PrivacyPreferences
} from './queries';
import { UPDATE_USER_PROFILE } from './mutations';

/**
 * Settings Operations with Hybrid Storage Strategy
 *
 * Updated for Rust backend (async-graphql) schema
 *
 * Strategy:
 * - User Profile Data: Fetched from Rust backend via GraphQL `me` query
 * - User Preferences: Stored in browser localStorage (theme, timezone, display settings)
 * - Notification Preferences: Stored in browser localStorage
 * - Privacy Preferences: Stored in browser localStorage
 *
 * This approach provides:
 * - Instant preference updates without network latency
 * - No backend changes required for preferences
 * - Profile data remains server-authoritative
 */
export class SettingsOperations {
	private client: Client;

	constructor(client: Client) {
		this.client = client;
	}

	/**
	 * Get user settings (profile + preferences)
	 * Backend: Uses me from Rust GraphQL schema
	 * Preferences: Loaded from localStorage
	 */
	async getUserSettings(params: {
		userCredentials: UserCredentials;
	}): Promise<{
		profile: UserSettings;
		preferences: UserPreferences;
		notificationPreferences: NotificationPreferences;
		privacyPreferences: PrivacyPreferences;
	}> {
		const dataRequest = createDataRequest({
			operationName: 'GetUserSettings',
			variables: {},
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			// Server-side query using toPromise()
			const result = await this.client.query(GET_USER_SETTINGS, dataRequest.variables).toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to load settings. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data || !result.data.me) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No settings data returned. Please try again.'
				});
			}

			const profile = result.data.me;
			const userId = profile.id;

			// Load preferences from localStorage
			const preferences = loadUserPreferences(userId);
			const notificationPreferences = loadNotificationPreferences(userId);
			const privacyPreferences = loadPrivacyPreferences(userId);

			return {
				profile,
				preferences,
				notificationPreferences,
				privacyPreferences
			};
		} catch (error: any) {
			if (error.userMessage) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to load settings. Please try again.'
			});
		}
	}

	/**
	 * Get user profile only
	 * Backend: Uses me from Rust GraphQL schema
	 */
	async getUserProfile(params: {
		userCredentials: UserCredentials;
	}): Promise<UserSettings> {
		const dataRequest = createDataRequest({
			operationName: 'GetUserProfile',
			variables: {},
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			// Server-side query using toPromise()
			const result = await this.client.query(GET_USER_PROFILE, dataRequest.variables).toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to load profile. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data || !result.data.me) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No profile data returned. Please try again.'
				});
			}

			return result.data.me;
		} catch (error: any) {
			if (error.userMessage) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to load profile. Please try again.'
			});
		}
	}

	/**
	 * Update user profile
	 * Backend: Uses updateUser from Rust GraphQL schema
	 */
	async updateUserProfile(params: {
		id: string;
		input: {
			email?: string;
			displayName?: string;
			firstName?: string;
			lastName?: string;
			phone?: string;
			jobTitle?: string;
			departmentId?: string;
			managerId?: string;
			hireDate?: string;
			isActive?: boolean;
			status?: string;
		};
		userCredentials: UserCredentials;
	}): Promise<UserSettings> {
		const dataRequest = createDataRequest({
			operationName: 'UpdateUserProfile',
			variables: {
				id: params.id,
				input: params.input
			},
			userCredentials: params.userCredentials,
			timeoutMs: 8000
		});

		try {
			// Server-side mutation using toPromise()
			const result = await this.client
				.mutation(UPDATE_USER_PROFILE, dataRequest.variables)
				.toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to update profile. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No profile data returned. Please try again.'
				});
			}

			return result.data.updateUser;
		} catch (error: any) {
			if (error.userMessage) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to update profile. Please try again.'
			});
		}
	}

	/**
	 * Update user preferences (client-side)
	 * Uses localStorage - no backend call
	 */
	async updateUserPreferences(params: {
		userId: string;
		preferences: Partial<UserPreferences>;
	}): Promise<UserPreferences> {
		try {
			saveUserPreferences(params.userId, params.preferences);
			return loadUserPreferences(params.userId);
		} catch (error) {
			throw createErrorResponse(error as Error, {
				type: 'validation',
				userMessage: 'Failed to update preferences. Please try again.'
			});
		}
	}

	/**
	 * Update notification preferences (client-side)
	 * Uses localStorage - no backend call
	 */
	async updateNotificationPreferences(params: {
		userId: string;
		preferences: Partial<NotificationPreferences>;
	}): Promise<NotificationPreferences> {
		try {
			saveNotificationPreferences(params.userId, params.preferences);
			return loadNotificationPreferences(params.userId);
		} catch (error) {
			throw createErrorResponse(error as Error, {
				type: 'validation',
				userMessage: 'Failed to update notification preferences. Please try again.'
			});
		}
	}

	/**
	 * Update privacy preferences (client-side)
	 * Uses localStorage - no backend call
	 */
	async updatePrivacyPreferences(params: {
		userId: string;
		preferences: Partial<PrivacyPreferences>;
	}): Promise<PrivacyPreferences> {
		try {
			savePrivacyPreferences(params.userId, params.preferences);
			return loadPrivacyPreferences(params.userId);
		} catch (error) {
			throw createErrorResponse(error as Error, {
				type: 'validation',
				userMessage: 'Failed to update privacy preferences. Please try again.'
			});
		}
	}

	/**
	 * Load user preferences (client-side)
	 * Uses localStorage - no backend call
	 */
	getUserPreferences(userId: string): UserPreferences {
		return loadUserPreferences(userId);
	}

	/**
	 * Load notification preferences (client-side)
	 * Uses localStorage - no backend call
	 */
	getNotificationPreferences(userId: string): NotificationPreferences {
		return loadNotificationPreferences(userId);
	}

	/**
	 * Load privacy preferences (client-side)
	 * Uses localStorage - no backend call
	 */
	getPrivacyPreferences(userId: string): PrivacyPreferences {
		return loadPrivacyPreferences(userId);
	}

	/**
	 * Clear all user preferences (client-side)
	 * Uses localStorage - no backend call
	 */
	clearAllPreferences(userId: string): void {
		clearUserPreferences(userId);
	}

	/**
	 * Reset preferences to defaults (client-side)
	 * Uses localStorage - no backend call
	 */
	async resetPreferencesToDefaults(userId: string): Promise<{
		preferences: UserPreferences;
		notificationPreferences: NotificationPreferences;
		privacyPreferences: PrivacyPreferences;
	}> {
		try {
			clearUserPreferences(userId);

			return {
				preferences: loadUserPreferences(userId),
				notificationPreferences: loadNotificationPreferences(userId),
				privacyPreferences: loadPrivacyPreferences(userId)
			};
		} catch (error) {
			throw createErrorResponse(error as Error, {
				type: 'validation',
				userMessage: 'Failed to reset preferences. Please try again.'
			});
		}
	}
}

/**
 * Factory function to create SettingsOperations instance
 */
export function createSettingsOperations(client: Client): SettingsOperations {
	return new SettingsOperations(client);
}
