import { gql } from '@urql/svelte';

/**
 * GraphQL Queries for Settings
 *
 * Updated for Rust backend (async-graphql) schema
 * Note: System settings queries may need backend implementation
 */

/**
 * Query: Get current user profile and settings
 * Backend: Uses me from Rust GraphQL schema
 */
export const GET_USER_SETTINGS = gql`
	query GetUserSettings {
		me {
			id
			email
			displayName
			firstName
			lastName
			phone
			jobTitle
			department {
				id
				name
			}
			createdAt
			updatedAt
		}
	}
`;

/**
 * Query: Get user profile (alias for consistency)
 * Backend: Uses me from Rust GraphQL schema
 */
export const GET_USER_PROFILE = gql`
	query GetUserProfile {
		me {
			id
			email
			displayName
			firstName
			lastName
			fullName
			phone
			jobTitle
			departmentId
			managerId
			hireDate
			isActive
			status
			department {
				id
				name
				description
			}
			manager {
				id
				fullName
				displayName
			}
			createdAt
			updatedAt
		}
	}
`;

// =============================================================================
// SYSTEM SETTINGS QUERIES - MAY NEED BACKEND IMPLEMENTATION
// =============================================================================

/**
 * Note: The following queries may not exist in the current Rust backend
 * They are commented out and marked for future implementation or should use
 * client-side storage for user preferences
 */

/*
export const GET_SYSTEM_SETTINGS = gql`
	query GetSystemSettings {
		systemSettings {
			id
			category
			key
			value
			description
			createdAt
			updatedAt
		}
	}
`;

export const GET_SYSTEM_SETTINGS_BY_CATEGORY = gql`
	query GetSystemSettingsByCategory($category: String!) {
		systemSettingsByCategory(category: $category) {
			id
			category
			key
			value
			description
			createdAt
			updatedAt
		}
	}
`;

export const GET_USER_PREFERENCES = gql`
	query GetUserPreferences($userId: UUID!) {
		userPreferences(userId: $userId) {
			id
			userId
			theme
			language
			timezone
			dateFormat
			timeFormat
			notifications
			privacy
			createdAt
			updatedAt
		}
	}
`;
*/

// =============================================================================
// CLIENT-SIDE HELPER FUNCTIONS & TYPES
// =============================================================================

/**
 * User settings interface
 */
export interface UserSettings {
	id: string;
	email: string;
	displayName: string;
	firstName: string;
	lastName: string;
	fullName?: string;
	phone: string | null;
	jobTitle: string | null;
	departmentId: string | null;
	managerId: string | null;
	department: {
		id: string;
		name: string;
		description?: string | null;
	} | null;
	manager: {
		id: string;
		fullName: string;
		displayName: string;
	} | null;
	createdAt: string;
	updatedAt: string;
}

/**
 * User preferences interface (client-side storage)
 */
export interface UserPreferences {
	theme: 'light' | 'dark' | 'system';
	language: string;
	timezone: string;
	dateFormat: string;
	timeFormat: '12h' | '24h';
	compactView: boolean;
	sidebarCollapsed: boolean;
	fontSize: 'small' | 'medium' | 'large';
	colorScheme: string;
}

/**
 * Notification preferences interface (client-side storage)
 */
export interface NotificationPreferences {
	email: boolean;
	push: boolean;
	sms: boolean;
	leaveReminders: boolean;
	performanceUpdates: boolean;
	systemAlerts: boolean;
	teamUpdates: boolean;
	eventReminders: boolean;
	taskReminders: boolean;
}

/**
 * Privacy preferences interface (client-side storage)
 */
export interface PrivacyPreferences {
	profileVisibility: 'public' | 'team' | 'private';
	showOnlineStatus: boolean;
	allowDirectMessages: boolean;
	dataSharing: boolean;
	analyticsOptOut: boolean;
}

/**
 * Default user preferences
 */
export const DEFAULT_USER_PREFERENCES: UserPreferences = {
	theme: 'light',
	language: 'en',
	timezone: 'America/Los_Angeles',
	dateFormat: 'MM/dd/yyyy',
	timeFormat: '12h',
	compactView: false,
	sidebarCollapsed: false,
	fontSize: 'medium',
	colorScheme: 'blue'
};

/**
 * Default notification preferences
 */
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
	email: true,
	push: false,
	sms: false,
	leaveReminders: true,
	performanceUpdates: true,
	systemAlerts: true,
	teamUpdates: false,
	eventReminders: true,
	taskReminders: true
};

/**
 * Default privacy preferences
 */
export const DEFAULT_PRIVACY_PREFERENCES: PrivacyPreferences = {
	profileVisibility: 'team',
	showOnlineStatus: true,
	allowDirectMessages: true,
	dataSharing: false,
	analyticsOptOut: false
};

/**
 * Local storage keys for client-side preferences
 */
export const STORAGE_KEYS = {
	USER_PREFERENCES: 'hr_user_preferences',
	NOTIFICATION_PREFERENCES: 'hr_notification_preferences',
	PRIVACY_PREFERENCES: 'hr_privacy_preferences'
} as const;

/**
 * Load user preferences from local storage
 */
export function loadUserPreferences(userId: string): UserPreferences {
	if (typeof window === 'undefined') return DEFAULT_USER_PREFERENCES;

	try {
		const stored = localStorage.getItem(`${STORAGE_KEYS.USER_PREFERENCES}_${userId}`);
		if (stored) {
			return { ...DEFAULT_USER_PREFERENCES, ...JSON.parse(stored) };
		}
	} catch (error) {
		console.error('Failed to load user preferences:', error);
	}
	return DEFAULT_USER_PREFERENCES;
}

/**
 * Save user preferences to local storage
 */
export function saveUserPreferences(userId: string, preferences: Partial<UserPreferences>): void {
	if (typeof window === 'undefined') return;

	try {
		const current = loadUserPreferences(userId);
		const updated = { ...current, ...preferences };
		localStorage.setItem(`${STORAGE_KEYS.USER_PREFERENCES}_${userId}`, JSON.stringify(updated));
	} catch (error) {
		console.error('Failed to save user preferences:', error);
	}
}

/**
 * Load notification preferences from local storage
 */
export function loadNotificationPreferences(userId: string): NotificationPreferences {
	if (typeof window === 'undefined') return DEFAULT_NOTIFICATION_PREFERENCES;

	try {
		const stored = localStorage.getItem(`${STORAGE_KEYS.NOTIFICATION_PREFERENCES}_${userId}`);
		if (stored) {
			return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...JSON.parse(stored) };
		}
	} catch (error) {
		console.error('Failed to load notification preferences:', error);
	}
	return DEFAULT_NOTIFICATION_PREFERENCES;
}

/**
 * Save notification preferences to local storage
 */
export function saveNotificationPreferences(
	userId: string,
	preferences: Partial<NotificationPreferences>
): void {
	if (typeof window === 'undefined') return;

	try {
		const current = loadNotificationPreferences(userId);
		const updated = { ...current, ...preferences };
		localStorage.setItem(
			`${STORAGE_KEYS.NOTIFICATION_PREFERENCES}_${userId}`,
			JSON.stringify(updated)
		);
	} catch (error) {
		console.error('Failed to save notification preferences:', error);
	}
}

/**
 * Load privacy preferences from local storage
 */
export function loadPrivacyPreferences(userId: string): PrivacyPreferences {
	if (typeof window === 'undefined') return DEFAULT_PRIVACY_PREFERENCES;

	try {
		const stored = localStorage.getItem(`${STORAGE_KEYS.PRIVACY_PREFERENCES}_${userId}`);
		if (stored) {
			return { ...DEFAULT_PRIVACY_PREFERENCES, ...JSON.parse(stored) };
		}
	} catch (error) {
		console.error('Failed to load privacy preferences:', error);
	}
	return DEFAULT_PRIVACY_PREFERENCES;
}

/**
 * Save privacy preferences to local storage
 */
export function savePrivacyPreferences(
	userId: string,
	preferences: Partial<PrivacyPreferences>
): void {
	if (typeof window === 'undefined') return;

	try {
		const current = loadPrivacyPreferences(userId);
		const updated = { ...current, ...preferences };
		localStorage.setItem(`${STORAGE_KEYS.PRIVACY_PREFERENCES}_${userId}`, JSON.stringify(updated));
	} catch (error) {
		console.error('Failed to save privacy preferences:', error);
	}
}

/**
 * Clear all user preferences from local storage
 */
export function clearUserPreferences(userId: string): void {
	if (typeof window === 'undefined') return;

	try {
		localStorage.removeItem(`${STORAGE_KEYS.USER_PREFERENCES}_${userId}`);
		localStorage.removeItem(`${STORAGE_KEYS.NOTIFICATION_PREFERENCES}_${userId}`);
		localStorage.removeItem(`${STORAGE_KEYS.PRIVACY_PREFERENCES}_${userId}`);
	} catch (error) {
		console.error('Failed to clear user preferences:', error);
	}
}
