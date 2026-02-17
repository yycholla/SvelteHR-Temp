// src/adapters/graphql/GraphQLUserSettingsAdapter.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { GraphQLUserSettingsAdapter } from './GraphQLUserSettingsAdapter';
import {
	UserSettings,
	Timezone,
	Locale,
	NotificationPreferences,
	PrivacySettings,
	AppearanceSettings,
	UserSettingsNotFoundError
} from '$domain/UserSettings';
import type { GraphQLPort } from '$services/ports/GraphQLPort';

const VALID_USER_ID = '123e4567-e89b-12d3-a456-426614174000';

/**
 * Mock GraphQLPort for testing
 */
class MockGraphQLPort implements GraphQLPort {
	private mockData: Record<string, unknown> = {};
	private shouldThrow = false;

	setMockData(data: Record<string, unknown>) {
		this.mockData = data;
		this.shouldThrow = false;
	}

	setShouldThrow(shouldThrow: boolean) {
		this.shouldThrow = shouldThrow;
	}

	async query<T>(_operation: string, _variables?: unknown): Promise<T> {
		if (this.shouldThrow) {
			throw new Error('GraphQL query failed');
		}
		return this.mockData as T;
	}

	async mutation<T>(_operation: string, _variables?: unknown): Promise<T> {
		if (this.shouldThrow) {
			throw new Error('GraphQL mutation failed');
		}
		return this.mockData as T;
	}
}

/**
 * Helper to create valid GraphQL user settings data
 */
function createGraphQLSettings(
	overrides: Partial<{
		userId: string;
		timezone: string;
		locale: string;
		notifications: Partial<{
			email: boolean;
			push: boolean;
			sms: boolean;
			leaveReminders: boolean;
			performanceUpdates: boolean;
			systemAlerts: boolean;
			teamUpdates: boolean;
		}>;
		privacy: Partial<{
			profileVisibility: string;
			showOnlineStatus: boolean;
			allowDirectMessages: boolean;
			dataSharing: boolean;
			analyticsOptOut: boolean;
		}>;
		appearance: Partial<{
			darkMode: boolean;
			fontSize: string;
			colorScheme: string;
			sidebarCollapsed: boolean;
		}>;
		updatedAt: string;
	}> = {}
) {
	return {
		userId: overrides.userId ?? VALID_USER_ID,
		timezone: overrides.timezone ?? 'America/New_York',
		locale: overrides.locale ?? 'en-US',
		notifications: {
			email: true,
			push: false,
			sms: false,
			leaveReminders: true,
			performanceUpdates: true,
			systemAlerts: true,
			teamUpdates: false,
			...overrides.notifications
		},
		privacy: {
			profileVisibility: 'team',
			showOnlineStatus: true,
			allowDirectMessages: true,
			dataSharing: false,
			analyticsOptOut: true,
			...overrides.privacy
		},
		appearance: {
			darkMode: false,
			fontSize: 'medium',
			colorScheme: 'blue',
			sidebarCollapsed: false,
			...overrides.appearance
		},
		updatedAt: overrides.updatedAt ?? '2025-06-15T12:00:00.000Z'
	};
}

function createMockDomainSettings(): UserSettings {
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

describe('GraphQLUserSettingsAdapter', () => {
	let adapter: GraphQLUserSettingsAdapter;
	let mockGraphQL: MockGraphQLPort;

	beforeEach(() => {
		mockGraphQL = new MockGraphQLPort();
		adapter = new GraphQLUserSettingsAdapter(mockGraphQL);
	});

	describe('findByUserId', () => {
		it('should return user settings when found', async () => {
			const graphqlData = createGraphQLSettings();
			mockGraphQL.setMockData({ userSettings: graphqlData });

			const result = await adapter.findByUserId(VALID_USER_ID);

			expect(result.isOk).toBe(true);
			expect(result.value).toBeInstanceOf(UserSettings);
			expect(result.value?.userId).toBe(VALID_USER_ID);
		});

		it('should return null when settings not found', async () => {
			mockGraphQL.setMockData({ userSettings: null });

			const result = await adapter.findByUserId(VALID_USER_ID);

			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});

		it('should map all fields correctly', async () => {
			const graphqlData = createGraphQLSettings({
				timezone: 'Europe/London',
				locale: 'en-GB',
				notifications: { email: false, push: true },
				privacy: { profileVisibility: 'private' },
				appearance: { darkMode: true, fontSize: 'large', colorScheme: 'purple' }
			});
			mockGraphQL.setMockData({ userSettings: graphqlData });

			const result = await adapter.findByUserId(VALID_USER_ID);

			expect(result.isOk).toBe(true);
			expect(result.value?.timezone.value).toBe('Europe/London');
			expect(result.value?.locale.value).toBe('en-GB');
			expect(result.value?.notifications.email).toBe(false);
			expect(result.value?.notifications.push).toBe(true);
			expect(result.value?.privacy.visibility.value).toBe('private');
			expect(result.value?.appearance.darkMode).toBe(true);
			expect(result.value?.appearance.fontSize.value).toBe('large');
		});

		it('should return null for invalid timezone data', async () => {
			const graphqlData = createGraphQLSettings({ timezone: '' });
			mockGraphQL.setMockData({ userSettings: graphqlData });

			const result = await adapter.findByUserId(VALID_USER_ID);

			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});

		it('should return null for invalid locale data', async () => {
			const graphqlData = createGraphQLSettings({ locale: 'invalid-locale' });
			mockGraphQL.setMockData({ userSettings: graphqlData });

			const result = await adapter.findByUserId(VALID_USER_ID);

			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});

		it('should return null for invalid profile visibility', async () => {
			const graphqlData = createGraphQLSettings({
				privacy: {
					profileVisibility: 'everyone',
					showOnlineStatus: true,
					allowDirectMessages: true,
					dataSharing: false,
					analyticsOptOut: false
				}
			});
			mockGraphQL.setMockData({ userSettings: graphqlData });

			const result = await adapter.findByUserId(VALID_USER_ID);

			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});

		it('should return null for invalid font size', async () => {
			const graphqlData = createGraphQLSettings({
				appearance: {
					darkMode: false,
					fontSize: 'huge',
					colorScheme: 'blue',
					sidebarCollapsed: false
				}
			});
			mockGraphQL.setMockData({ userSettings: graphqlData });

			const result = await adapter.findByUserId(VALID_USER_ID);

			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});

		it('should return null for invalid color scheme', async () => {
			const graphqlData = createGraphQLSettings({
				appearance: {
					darkMode: false,
					fontSize: 'medium',
					colorScheme: 'red',
					sidebarCollapsed: false
				}
			});
			mockGraphQL.setMockData({ userSettings: graphqlData });

			const result = await adapter.findByUserId(VALID_USER_ID);

			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});

		it('should return null for invalid updatedAt date', async () => {
			const graphqlData = createGraphQLSettings({ updatedAt: 'not-a-date' });
			mockGraphQL.setMockData({ userSettings: graphqlData });

			const result = await adapter.findByUserId(VALID_USER_ID);

			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});

		it('should handle GraphQL query errors gracefully', async () => {
			mockGraphQL.setShouldThrow(true);

			const result = await adapter.findByUserId(VALID_USER_ID);

			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});
	});

	describe('upsert', () => {
		it('should upsert user settings successfully', async () => {
			const graphqlData = createGraphQLSettings();
			mockGraphQL.setMockData({ upsertUserSettings: graphqlData });

			const settings = createMockDomainSettings();
			const result = await adapter.upsert(settings);

			expect(result.isOk).toBe(true);
			expect(result.value).toBeInstanceOf(UserSettings);
		});

		it('should return error when upsert returns null', async () => {
			mockGraphQL.setMockData({ upsertUserSettings: null });

			const settings = createMockDomainSettings();
			const result = await adapter.upsert(settings);

			expect(result.isError).toBe(true);
		});

		it('should handle GraphQL mutation errors', async () => {
			mockGraphQL.setShouldThrow(true);

			const settings = createMockDomainSettings();
			const result = await adapter.upsert(settings);

			expect(result.isError).toBe(true);
		});

		it('should return error when returned data is invalid', async () => {
			const invalidData = createGraphQLSettings({ timezone: '' });
			mockGraphQL.setMockData({ upsertUserSettings: invalidData });

			const settings = createMockDomainSettings();
			const result = await adapter.upsert(settings);

			expect(result.isError).toBe(true);
		});
	});

	describe('updateTimezone', () => {
		it('should update timezone successfully', async () => {
			const graphqlData = createGraphQLSettings({ timezone: 'Europe/London' });
			mockGraphQL.setMockData({ updateUserTimezone: graphqlData });

			const timezone = Timezone.create('Europe/London').value;
			const result = await adapter.updateTimezone(VALID_USER_ID, timezone);

			expect(result.isOk).toBe(true);
			expect(result.value.timezone.value).toBe('Europe/London');
		});

		it('should return error when update returns null', async () => {
			mockGraphQL.setMockData({ updateUserTimezone: null });

			const timezone = Timezone.create('UTC').value;
			const result = await adapter.updateTimezone(VALID_USER_ID, timezone);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(UserSettingsNotFoundError);
		});

		it('should handle GraphQL mutation errors', async () => {
			mockGraphQL.setShouldThrow(true);

			const timezone = Timezone.create('UTC').value;
			const result = await adapter.updateTimezone(VALID_USER_ID, timezone);

			expect(result.isError).toBe(true);
		});
	});

	describe('updateNotifications', () => {
		it('should update notifications successfully', async () => {
			const graphqlData = createGraphQLSettings({
				notifications: {
					email: false,
					push: true,
					sms: true,
					leaveReminders: false,
					performanceUpdates: false,
					systemAlerts: true,
					teamUpdates: true
				}
			});
			mockGraphQL.setMockData({ updateUserNotifications: graphqlData });

			const prefs = NotificationPreferences.create({
				email: false,
				push: true,
				sms: true,
				leaveReminders: false,
				performanceUpdates: false,
				systemAlerts: true,
				teamUpdates: true
			}).value;
			const result = await adapter.updateNotifications(VALID_USER_ID, prefs);

			expect(result.isOk).toBe(true);
			expect(result.value.notifications.email).toBe(false);
		});

		it('should return error when update returns null', async () => {
			mockGraphQL.setMockData({ updateUserNotifications: null });

			const prefs = NotificationPreferences.create({
				email: true,
				push: false,
				sms: false,
				leaveReminders: true,
				performanceUpdates: true,
				systemAlerts: true,
				teamUpdates: false
			}).value;
			const result = await adapter.updateNotifications(VALID_USER_ID, prefs);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(UserSettingsNotFoundError);
		});

		it('should handle GraphQL mutation errors', async () => {
			mockGraphQL.setShouldThrow(true);

			const prefs = NotificationPreferences.create({
				email: true,
				push: false,
				sms: false,
				leaveReminders: true,
				performanceUpdates: true,
				systemAlerts: true,
				teamUpdates: false
			}).value;
			const result = await adapter.updateNotifications(VALID_USER_ID, prefs);

			expect(result.isError).toBe(true);
		});
	});

	describe('updatePrivacy', () => {
		it('should update privacy settings successfully', async () => {
			const graphqlData = createGraphQLSettings({
				privacy: {
					profileVisibility: 'private',
					showOnlineStatus: false,
					allowDirectMessages: false,
					dataSharing: false,
					analyticsOptOut: true
				}
			});
			mockGraphQL.setMockData({ updateUserPrivacy: graphqlData });

			const privacy = PrivacySettings.create({
				visibility: 'private',
				showOnlineStatus: false,
				allowDirectMessages: false,
				dataSharing: false,
				analyticsOptOut: true
			}).value;
			const result = await adapter.updatePrivacy(VALID_USER_ID, privacy);

			expect(result.isOk).toBe(true);
			expect(result.value.privacy.visibility.value).toBe('private');
		});

		it('should return error when update returns null', async () => {
			mockGraphQL.setMockData({ updateUserPrivacy: null });

			const privacy = PrivacySettings.create({
				visibility: 'team',
				showOnlineStatus: true,
				allowDirectMessages: true,
				dataSharing: false,
				analyticsOptOut: false
			}).value;
			const result = await adapter.updatePrivacy(VALID_USER_ID, privacy);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(UserSettingsNotFoundError);
		});

		it('should handle GraphQL mutation errors', async () => {
			mockGraphQL.setShouldThrow(true);

			const privacy = PrivacySettings.create({
				visibility: 'public',
				showOnlineStatus: true,
				allowDirectMessages: true,
				dataSharing: true,
				analyticsOptOut: false
			}).value;
			const result = await adapter.updatePrivacy(VALID_USER_ID, privacy);

			expect(result.isError).toBe(true);
		});
	});

	describe('updateAppearance', () => {
		it('should update appearance settings successfully', async () => {
			const graphqlData = createGraphQLSettings({
				appearance: {
					darkMode: true,
					fontSize: 'large',
					colorScheme: 'purple',
					sidebarCollapsed: true
				}
			});
			mockGraphQL.setMockData({ updateUserAppearance: graphqlData });

			const appearance = AppearanceSettings.create({
				darkMode: true,
				fontSize: 'large',
				colorScheme: 'purple',
				sidebarCollapsed: true
			}).value;
			const result = await adapter.updateAppearance(VALID_USER_ID, appearance);

			expect(result.isOk).toBe(true);
			expect(result.value.appearance.darkMode).toBe(true);
			expect(result.value.appearance.colorScheme.value).toBe('purple');
		});

		it('should return error when update returns null', async () => {
			mockGraphQL.setMockData({ updateUserAppearance: null });

			const appearance = AppearanceSettings.create({
				darkMode: false,
				fontSize: 'medium',
				colorScheme: 'blue',
				sidebarCollapsed: false
			}).value;
			const result = await adapter.updateAppearance(VALID_USER_ID, appearance);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(UserSettingsNotFoundError);
		});

		it('should handle GraphQL mutation errors', async () => {
			mockGraphQL.setShouldThrow(true);

			const appearance = AppearanceSettings.create({
				darkMode: false,
				fontSize: 'medium',
				colorScheme: 'blue',
				sidebarCollapsed: false
			}).value;
			const result = await adapter.updateAppearance(VALID_USER_ID, appearance);

			expect(result.isError).toBe(true);
		});
	});

	describe('mapToEntity (via findByUserId)', () => {
		it('should handle missing notifications fields', async () => {
			const data = createGraphQLSettings();
			// @ts-expect-error testing invalid data
			data.notifications = null;
			mockGraphQL.setMockData({ userSettings: data });

			const result = await adapter.findByUserId(VALID_USER_ID);

			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});

		it('should handle missing privacy fields', async () => {
			const data = createGraphQLSettings();
			// @ts-expect-error testing invalid data
			data.privacy = null;
			mockGraphQL.setMockData({ userSettings: data });

			const result = await adapter.findByUserId(VALID_USER_ID);

			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});

		it('should handle missing appearance fields', async () => {
			const data = createGraphQLSettings();
			// @ts-expect-error testing invalid data
			data.appearance = null;
			mockGraphQL.setMockData({ userSettings: data });

			const result = await adapter.findByUserId(VALID_USER_ID);

			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});

		it('should handle invalid userId (not a UUID)', async () => {
			const graphqlData = createGraphQLSettings({ userId: 'not-a-uuid' });
			mockGraphQL.setMockData({ userSettings: graphqlData });

			const result = await adapter.findByUserId('not-a-uuid');

			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});

		it('should correctly map all visibility options', async () => {
			const visibilities = ['public', 'team', 'managers', 'private'];
			for (const visibility of visibilities) {
				const graphqlData = createGraphQLSettings({
					privacy: {
						profileVisibility: visibility,
						showOnlineStatus: true,
						allowDirectMessages: true,
						dataSharing: false,
						analyticsOptOut: false
					}
				});
				mockGraphQL.setMockData({ userSettings: graphqlData });

				const result = await adapter.findByUserId(VALID_USER_ID);

				expect(result.isOk).toBe(true);
				expect(result.value?.privacy.visibility.value).toBe(visibility);
			}
		});
	});
});
