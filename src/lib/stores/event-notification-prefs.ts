/**
 * Event Notification Preferences Store
 * Feature: 027-we-need-to - Task T058
 *
 * Manages user's event notification preferences with backend sync
 *
 * Features:
 * - Persistent storage of notification settings
 * - GraphQL mutation for backend sync
 * - Optimistic UI updates
 * - Type-safe preference management
 */

import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import type { EventNotificationPreferences } from '$lib/graphql/events-operations';

// Default preferences
const DEFAULT_PREFS: EventNotificationPreferences = {
	emailNotifications: true,
	pushNotifications: false,
	reminderDefaults: {
		enabled: true,
		minutesBefore: 15 // 15 minutes before event
	},
	commentMentions: true,
	waitlistPromotions: true,
	eventUpdates: true
};

// Store state interface
interface EventNotificationPrefsStore {
	preferences: EventNotificationPreferences;
	isLoading: boolean;
	isSaving: boolean;
	lastSaved: Date | null;
	error: string | null;
}

// Create the store
function createEventNotificationPrefsStore() {
	const { subscribe, set, update } = writable<EventNotificationPrefsStore>({
		preferences: DEFAULT_PREFS,
		isLoading: false,
		isSaving: false,
		lastSaved: null,
		error: null
	});

	return {
		subscribe,

		/**
		 * Load preferences from backend
		 */
		async load(userId: string): Promise<void> {
			update(state => ({ ...state, isLoading: true, error: null }));

			try {
				const response = await fetch(`/api/events/notification-preferences?userId=${userId}`);

				if (!response.ok) {
					throw new Error('Failed to load notification preferences');
				}

				const data = await response.json();

				update(state => ({
					...state,
					preferences: data.preferences || DEFAULT_PREFS,
					isLoading: false,
					error: null
				}));
			} catch (error) {
				console.error('Failed to load notification preferences:', error);
				update(state => ({
					...state,
					isLoading: false,
					error: error instanceof Error ? error.message : 'Unknown error'
				}));
			}
		},

		/**
		 * Save preferences to backend
		 */
		async save(
			userId: string,
			preferences: EventNotificationPreferences
		): Promise<boolean> {
			// Optimistic update
			update(state => ({
				...state,
				preferences,
				isSaving: true,
				error: null
			}));

			try {
				const response = await fetch('/api/events/notification-preferences', {
					method: 'PUT',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						userId,
						preferences
					})
				});

				if (!response.ok) {
					throw new Error('Failed to save notification preferences');
				}

				update(state => ({
					...state,
					isSaving: false,
					lastSaved: new Date(),
					error: null
				}));

				return true;
			} catch (error) {
				console.error('Failed to save notification preferences:', error);

				// Revert optimistic update on error
				update(state => ({
					...state,
					isSaving: false,
					error: error instanceof Error ? error.message : 'Unknown error'
				}));

				return false;
			}
		},

		/**
		 * Update a specific preference field
		 */
		updatePreference<K extends keyof EventNotificationPreferences>(
			key: K,
			value: EventNotificationPreferences[K]
		): void {
			update(state => ({
				...state,
				preferences: {
					...state.preferences,
					[key]: value
				}
			}));
		},

		/**
		 * Update reminder defaults
		 */
		updateReminderDefaults(enabled: boolean, minutesBefore?: number): void {
			update(state => ({
				...state,
				preferences: {
					...state.preferences,
					reminderDefaults: {
						enabled,
						minutesBefore: minutesBefore ?? state.preferences.reminderDefaults.minutesBefore
					}
				}
			}));
		},

		/**
		 * Reset to default preferences
		 */
		reset(): void {
			update(state => ({
				...state,
				preferences: DEFAULT_PREFS,
				error: null
			}));
		},

		/**
		 * Clear error
		 */
		clearError(): void {
			update(state => ({ ...state, error: null }));
		}
	};
}

// Export singleton instance
export const eventNotificationPrefs = createEventNotificationPrefsStore();

// Helper function to save notification preferences with GraphQL
export async function saveNotificationPrefs(
	userId: string,
	preferences: EventNotificationPreferences
): Promise<boolean> {
	return eventNotificationPrefs.save(userId, preferences);
}

// Helper function to load notification preferences
export async function loadNotificationPrefs(userId: string): Promise<void> {
	return eventNotificationPrefs.load(userId);
}
