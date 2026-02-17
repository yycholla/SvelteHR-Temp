// src/adapters/graphql/GraphQLUserSettingsAdapter.ts
import { gql } from '@urql/core';
import { Result } from '$domain/Result';
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
import type { UserSettingsError } from '$domain/UserSettings';
import type { UserSettingsRepository } from '$services/ports/UserSettingsRepository';
import type { GraphQLPort } from '$services/ports/GraphQLPort';

/**
 * GraphQL schema response shape for notification preferences
 */
interface GraphQLNotificationPreferences {
	email: boolean;
	push: boolean;
	sms: boolean;
	leaveReminders: boolean;
	performanceUpdates: boolean;
	systemAlerts: boolean;
	teamUpdates: boolean;
}

/**
 * GraphQL schema response shape for privacy settings
 */
interface GraphQLPrivacySettings {
	profileVisibility: string;
	showOnlineStatus: boolean;
	allowDirectMessages: boolean;
	dataSharing: boolean;
	analyticsOptOut: boolean;
}

/**
 * GraphQL schema response shape for appearance settings
 */
interface GraphQLAppearanceSettings {
	darkMode: boolean;
	fontSize: string;
	colorScheme: string;
	sidebarCollapsed: boolean;
}

/**
 * GraphQL schema response shape for user settings
 */
interface GraphQLUserSettings {
	userId: string;
	timezone: string;
	locale: string;
	notifications: GraphQLNotificationPreferences;
	privacy: GraphQLPrivacySettings;
	appearance: GraphQLAppearanceSettings;
	updatedAt: string;
}

/**
 * GraphQLUserSettingsAdapter implements UserSettingsRepository port for GraphQL backend.
 *
 * Responsibilities:
 * - Translate between GraphQL API and domain entities
 * - Handle GraphQL errors and map to domain errors
 * - Resilient error handling (return null for invalid data, don't throw)
 *
 * @example
 * ```typescript
 * const adapter = new GraphQLUserSettingsAdapter(graphqlPort);
 * const result = await adapter.findByUserId('user-uuid');
 * if (result.isOk) {
 *   console.log(result.value); // UserSettings | null
 * }
 * ```
 */
export class GraphQLUserSettingsAdapter implements UserSettingsRepository {
	constructor(private readonly graphql: GraphQLPort) {}

	async findByUserId(userId: string): Promise<Result<UserSettings | null, UserSettingsError>> {
		const query = gql`
			query GetUserSettings($userId: UUID!) {
				userSettings(userId: $userId) {
					userId
					timezone
					locale
					notifications {
						email
						push
						sms
						leaveReminders
						performanceUpdates
						systemAlerts
						teamUpdates
					}
					privacy {
						profileVisibility
						showOnlineStatus
						allowDirectMessages
						dataSharing
						analyticsOptOut
					}
					appearance {
						darkMode
						fontSize
						colorScheme
						sidebarCollapsed
					}
					updatedAt
				}
			}
		`;

		try {
			const result = await this.graphql.query<{ userSettings: GraphQLUserSettings | null }>(query, {
				userId
			});

			if (!result?.userSettings) {
				return Result.ok(null);
			}

			const entity = this.mapToEntity(result.userSettings);
			return Result.ok(entity);
		} catch {
			return Result.ok(null);
		}
	}

	async upsert(settings: UserSettings): Promise<Result<UserSettings, UserSettingsError>> {
		const mutation = gql`
			mutation UpsertUserSettings($input: UpsertUserSettingsInput!) {
				upsertUserSettings(input: $input) {
					userId
					timezone
					locale
					notifications {
						email
						push
						sms
						leaveReminders
						performanceUpdates
						systemAlerts
						teamUpdates
					}
					privacy {
						profileVisibility
						showOnlineStatus
						allowDirectMessages
						dataSharing
						analyticsOptOut
					}
					appearance {
						darkMode
						fontSize
						colorScheme
						sidebarCollapsed
					}
					updatedAt
				}
			}
		`;

		try {
			const input = this.entityToInput(settings);

			const result = await this.graphql.mutation<{
				upsertUserSettings: GraphQLUserSettings;
			}>(mutation, { input });

			if (!result?.upsertUserSettings) {
				return Result.error(new InvalidUserSettingsError('Failed to upsert user settings'));
			}

			const entity = this.mapToEntity(result.upsertUserSettings);
			if (!entity) {
				return Result.error(
					new InvalidUserSettingsError('Invalid user settings data returned from upsert')
				);
			}

			return Result.ok(entity);
		} catch (error) {
			return Result.error(
				new InvalidUserSettingsError(
					`Failed to upsert user settings: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async updateTimezone(
		userId: string,
		timezone: Timezone
	): Promise<Result<UserSettings, UserSettingsError>> {
		const mutation = gql`
			mutation UpdateUserTimezone($userId: UUID!, $timezone: String!) {
				updateUserTimezone(userId: $userId, timezone: $timezone) {
					userId
					timezone
					locale
					notifications {
						email
						push
						sms
						leaveReminders
						performanceUpdates
						systemAlerts
						teamUpdates
					}
					privacy {
						profileVisibility
						showOnlineStatus
						allowDirectMessages
						dataSharing
						analyticsOptOut
					}
					appearance {
						darkMode
						fontSize
						colorScheme
						sidebarCollapsed
					}
					updatedAt
				}
			}
		`;

		try {
			const result = await this.graphql.mutation<{
				updateUserTimezone: GraphQLUserSettings;
			}>(mutation, { userId, timezone: timezone.value });

			if (!result?.updateUserTimezone) {
				return Result.error(new UserSettingsNotFoundError(userId));
			}

			const entity = this.mapToEntity(result.updateUserTimezone);
			if (!entity) {
				return Result.error(
					new InvalidUserSettingsError('Invalid user settings data returned from updateTimezone')
				);
			}

			return Result.ok(entity);
		} catch (error) {
			return Result.error(
				new InvalidUserSettingsError(
					`Failed to update timezone: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async updateNotifications(
		userId: string,
		prefs: NotificationPreferences
	): Promise<Result<UserSettings, UserSettingsError>> {
		const mutation = gql`
			mutation UpdateUserNotifications($userId: UUID!, $input: NotificationPreferencesInput!) {
				updateUserNotifications(userId: $userId, input: $input) {
					userId
					timezone
					locale
					notifications {
						email
						push
						sms
						leaveReminders
						performanceUpdates
						systemAlerts
						teamUpdates
					}
					privacy {
						profileVisibility
						showOnlineStatus
						allowDirectMessages
						dataSharing
						analyticsOptOut
					}
					appearance {
						darkMode
						fontSize
						colorScheme
						sidebarCollapsed
					}
					updatedAt
				}
			}
		`;

		try {
			const input = {
				email: prefs.email,
				push: prefs.push,
				sms: prefs.sms,
				leaveReminders: prefs.leaveReminders,
				performanceUpdates: prefs.performanceUpdates,
				systemAlerts: prefs.systemAlerts,
				teamUpdates: prefs.teamUpdates
			};

			const result = await this.graphql.mutation<{
				updateUserNotifications: GraphQLUserSettings;
			}>(mutation, { userId, input });

			if (!result?.updateUserNotifications) {
				return Result.error(new UserSettingsNotFoundError(userId));
			}

			const entity = this.mapToEntity(result.updateUserNotifications);
			if (!entity) {
				return Result.error(
					new InvalidUserSettingsError(
						'Invalid user settings data returned from updateNotifications'
					)
				);
			}

			return Result.ok(entity);
		} catch (error) {
			return Result.error(
				new InvalidUserSettingsError(
					`Failed to update notifications: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async updatePrivacy(
		userId: string,
		settings: PrivacySettings
	): Promise<Result<UserSettings, UserSettingsError>> {
		const mutation = gql`
			mutation UpdateUserPrivacy($userId: UUID!, $input: PrivacySettingsInput!) {
				updateUserPrivacy(userId: $userId, input: $input) {
					userId
					timezone
					locale
					notifications {
						email
						push
						sms
						leaveReminders
						performanceUpdates
						systemAlerts
						teamUpdates
					}
					privacy {
						profileVisibility
						showOnlineStatus
						allowDirectMessages
						dataSharing
						analyticsOptOut
					}
					appearance {
						darkMode
						fontSize
						colorScheme
						sidebarCollapsed
					}
					updatedAt
				}
			}
		`;

		try {
			const input = {
				profileVisibility: settings.visibility.value,
				showOnlineStatus: settings.showOnlineStatus,
				allowDirectMessages: settings.allowDirectMessages,
				dataSharing: settings.dataSharing,
				analyticsOptOut: settings.analyticsOptOut
			};

			const result = await this.graphql.mutation<{
				updateUserPrivacy: GraphQLUserSettings;
			}>(mutation, { userId, input });

			if (!result?.updateUserPrivacy) {
				return Result.error(new UserSettingsNotFoundError(userId));
			}

			const entity = this.mapToEntity(result.updateUserPrivacy);
			if (!entity) {
				return Result.error(
					new InvalidUserSettingsError('Invalid user settings data returned from updatePrivacy')
				);
			}

			return Result.ok(entity);
		} catch (error) {
			return Result.error(
				new InvalidUserSettingsError(
					`Failed to update privacy: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async updateAppearance(
		userId: string,
		settings: AppearanceSettings
	): Promise<Result<UserSettings, UserSettingsError>> {
		const mutation = gql`
			mutation UpdateUserAppearance($userId: UUID!, $input: AppearanceSettingsInput!) {
				updateUserAppearance(userId: $userId, input: $input) {
					userId
					timezone
					locale
					notifications {
						email
						push
						sms
						leaveReminders
						performanceUpdates
						systemAlerts
						teamUpdates
					}
					privacy {
						profileVisibility
						showOnlineStatus
						allowDirectMessages
						dataSharing
						analyticsOptOut
					}
					appearance {
						darkMode
						fontSize
						colorScheme
						sidebarCollapsed
					}
					updatedAt
				}
			}
		`;

		try {
			const input = {
				darkMode: settings.darkMode,
				fontSize: settings.fontSize.value,
				colorScheme: settings.colorScheme.value,
				sidebarCollapsed: settings.sidebarCollapsed
			};

			const result = await this.graphql.mutation<{
				updateUserAppearance: GraphQLUserSettings;
			}>(mutation, { userId, input });

			if (!result?.updateUserAppearance) {
				return Result.error(new UserSettingsNotFoundError(userId));
			}

			const entity = this.mapToEntity(result.updateUserAppearance);
			if (!entity) {
				return Result.error(
					new InvalidUserSettingsError('Invalid user settings data returned from updateAppearance')
				);
			}

			return Result.ok(entity);
		} catch (error) {
			return Result.error(
				new InvalidUserSettingsError(
					`Failed to update appearance: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	/**
	 * Map GraphQL user settings data to domain UserSettings entity.
	 * @private
	 * @returns UserSettings entity or null if data is invalid (resilient error handling)
	 */
	private mapToEntity(data: GraphQLUserSettings): UserSettings | null {
		try {
			const timezoneResult = Timezone.create(data.timezone);
			if (timezoneResult.isError) return null;

			const localeResult = Locale.create(data.locale);
			if (localeResult.isError) return null;

			const notificationsResult = NotificationPreferences.create({
				email: data.notifications.email,
				push: data.notifications.push,
				sms: data.notifications.sms,
				leaveReminders: data.notifications.leaveReminders,
				performanceUpdates: data.notifications.performanceUpdates,
				systemAlerts: data.notifications.systemAlerts,
				teamUpdates: data.notifications.teamUpdates
			});
			if (notificationsResult.isError) return null;

			const privacyResult = PrivacySettings.create({
				visibility: data.privacy.profileVisibility,
				showOnlineStatus: data.privacy.showOnlineStatus,
				allowDirectMessages: data.privacy.allowDirectMessages,
				dataSharing: data.privacy.dataSharing,
				analyticsOptOut: data.privacy.analyticsOptOut
			});
			if (privacyResult.isError) return null;

			const appearanceResult = AppearanceSettings.create({
				darkMode: data.appearance.darkMode,
				fontSize: data.appearance.fontSize,
				colorScheme: data.appearance.colorScheme,
				sidebarCollapsed: data.appearance.sidebarCollapsed
			});
			if (appearanceResult.isError) return null;

			const updatedAt = new Date(data.updatedAt);
			if (isNaN(updatedAt.getTime())) return null;

			const settingsResult = UserSettings.create({
				userId: data.userId,
				timezone: timezoneResult.value,
				locale: localeResult.value,
				notifications: notificationsResult.value,
				privacy: privacyResult.value,
				appearance: appearanceResult.value,
				updatedAt
			});

			if (settingsResult.isError) return null;

			return settingsResult.value;
		} catch {
			return null; // Resilient - return null for invalid data
		}
	}

	/**
	 * Convert a UserSettings entity to a GraphQL input object.
	 * @private
	 */
	private entityToInput(settings: UserSettings): Record<string, unknown> {
		return {
			userId: settings.userId,
			timezone: settings.timezone.value,
			locale: settings.locale.value,
			notifications: {
				email: settings.notifications.email,
				push: settings.notifications.push,
				sms: settings.notifications.sms,
				leaveReminders: settings.notifications.leaveReminders,
				performanceUpdates: settings.notifications.performanceUpdates,
				systemAlerts: settings.notifications.systemAlerts,
				teamUpdates: settings.notifications.teamUpdates
			},
			privacy: {
				profileVisibility: settings.privacy.visibility.value,
				showOnlineStatus: settings.privacy.showOnlineStatus,
				allowDirectMessages: settings.privacy.allowDirectMessages,
				dataSharing: settings.privacy.dataSharing,
				analyticsOptOut: settings.privacy.analyticsOptOut
			},
			appearance: {
				darkMode: settings.appearance.darkMode,
				fontSize: settings.appearance.fontSize.value,
				colorScheme: settings.appearance.colorScheme.value,
				sidebarCollapsed: settings.appearance.sidebarCollapsed
			}
		};
	}
}
