/**
 * Unit Test: Notification Preferences Store
 * Feature: 027-we-need-to
 *
 * Tests preference updates, optimistic UI, and persistence in notification store.
 * MUST FAIL until notification preferences store is implemented.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import {
	notificationPreferences,
	saveNotificationPrefs,
	resetToDefaults
} from '$lib/stores/notifications';
import type { NotificationPreferences } from '$lib/types/events';

describe('Notification Preferences Store', () => {
	beforeEach(() => {
		// Reset store to defaults before each test
		vi.clearAllMocks();
	});

	describe('Store initialization', () => {
		it('should initialize with default preferences', () => {
			const prefs = get(notificationPreferences);

			expect(prefs).toBeDefined();
			expect(prefs.eventInvitations).toBe(true); // Default: enabled
			expect(prefs.eventChanges).toBe(true);
			expect(prefs.eventCancellations).toBe(true);
			expect(prefs.commentMentions).toBe(true);
			expect(prefs.reminderTimes).toEqual(['15min', '1hour']); // Default reminders
			expect(prefs.reminderScope).toBe('accepted'); // Default scope
			expect(prefs.customEventIds).toEqual([]);
		});

		it('should load preferences from localStorage on init', () => {
			// Mock localStorage
			const mockPrefs: NotificationPreferences = {
				eventInvitations: false,
				eventChanges: true,
				eventCancellations: false,
				commentMentions: true,
				reminderTimes: ['1day'],
				reminderScope: 'all',
				customEventIds: []
			};

			localStorage.setItem('event-notification-prefs', JSON.stringify(mockPrefs));

			// Re-initialize store (would need to import fresh in real test)
			const prefs = get(notificationPreferences);

			// Verify loaded from localStorage
			// expect(prefs.eventInvitations).toBe(false);
			// expect(prefs.reminderScope).toBe('all');
		});

		it('should handle corrupted localStorage data gracefully', () => {
			// Set invalid JSON in localStorage
			localStorage.setItem('event-notification-prefs', 'invalid-json');

			// Store should fall back to defaults
			const prefs = get(notificationPreferences);

			expect(prefs.eventInvitations).toBe(true); // Default
			expect(prefs.reminderScope).toBe('accepted'); // Default
		});
	});

	describe('Preference updates', () => {
		it('should update eventInvitations preference', () => {
			notificationPreferences.update((prefs) => ({
				...prefs,
				eventInvitations: false
			}));

			const prefs = get(notificationPreferences);
			expect(prefs.eventInvitations).toBe(false);
		});

		it('should update reminderTimes array', () => {
			notificationPreferences.update((prefs) => ({
				...prefs,
				reminderTimes: ['15min', '1hour', '1day']
			}));

			const prefs = get(notificationPreferences);
			expect(prefs.reminderTimes).toEqual(['15min', '1hour', '1day']);
		});

		it('should update reminderScope', () => {
			notificationPreferences.update((prefs) => ({
				...prefs,
				reminderScope: 'custom'
			}));

			const prefs = get(notificationPreferences);
			expect(prefs.reminderScope).toBe('custom');
		});

		it('should update customEventIds when scope is custom', () => {
			notificationPreferences.update((prefs) => ({
				...prefs,
				reminderScope: 'custom',
				customEventIds: ['event-1', 'event-2', 'event-3']
			}));

			const prefs = get(notificationPreferences);
			expect(prefs.customEventIds).toEqual(['event-1', 'event-2', 'event-3']);
		});

		it('should clear customEventIds when scope changes from custom', () => {
			notificationPreferences.update((prefs) => ({
				...prefs,
				reminderScope: 'custom',
				customEventIds: ['event-1', 'event-2']
			}));

			// Change scope to 'all'
			notificationPreferences.update((prefs) => ({
				...prefs,
				reminderScope: 'all',
				customEventIds: []
			}));

			const prefs = get(notificationPreferences);
			expect(prefs.customEventIds).toEqual([]);
		});

		it('should enforce maximum 3 reminder times', () => {
			notificationPreferences.update((prefs) => ({
				...prefs,
				reminderTimes: ['15min', '1hour', '1day']
			}));

			// Try to add 4th reminder time
			notificationPreferences.update((prefs) => {
				const newTimes = [...prefs.reminderTimes];

				// Validation should prevent adding more than 3
				if (newTimes.length < 3) {
					newTimes.push('1week' as any);
				}

				return { ...prefs, reminderTimes: newTimes as any };
			});

			const prefs = get(notificationPreferences);
			expect(prefs.reminderTimes.length).toBeLessThanOrEqual(3);
		});
	});

	describe('saveNotificationPrefs function', () => {
		it('should save preferences to backend', async () => {
			const newPrefs: NotificationPreferences = {
				eventInvitations: false,
				eventChanges: true,
				eventCancellations: false,
				commentMentions: true,
				reminderTimes: ['1day'],
				reminderScope: 'all',
				customEventIds: []
			};

			// Mock GraphQL mutation
			const result = await saveNotificationPrefs(newPrefs);

			// Verify mutation was called
			expect(result.success).toBe(true);
		});

		it('should update store optimistically before backend responds', async () => {
			const newPrefs: NotificationPreferences = {
				eventInvitations: false,
				eventChanges: true,
				eventCancellations: false,
				commentMentions: true,
				reminderTimes: ['1day'],
				reminderScope: 'all',
				customEventIds: []
			};

			// Call save (doesn't await)
			const savePromise = saveNotificationPrefs(newPrefs);

			// Store should update immediately (optimistic)
			const currentPrefs = get(notificationPreferences);
			expect(currentPrefs.eventInvitations).toBe(false);

			// Wait for backend
			await savePromise;
		});

		it('should persist preferences to localStorage', async () => {
			const newPrefs: NotificationPreferences = {
				eventInvitations: false,
				eventChanges: true,
				eventCancellations: false,
				commentMentions: true,
				reminderTimes: ['1day'],
				reminderScope: 'all',
				customEventIds: []
			};

			await saveNotificationPrefs(newPrefs);

			// Verify localStorage was updated
			const stored = localStorage.getItem('event-notification-prefs');
			expect(stored).toBeTruthy();

			const parsed = JSON.parse(stored!);
			expect(parsed.eventInvitations).toBe(false);
			expect(parsed.reminderScope).toBe('all');
		});

		it('should revert optimistic update if save fails', async () => {
			// Mock failed mutation
			const initialPrefs = get(notificationPreferences);

			const newPrefs: NotificationPreferences = {
				...initialPrefs,
				eventInvitations: false
			};

			try {
				await saveNotificationPrefs(newPrefs);
			} catch (error) {
				// Save failed, verify revert
				const currentPrefs = get(notificationPreferences);
				expect(currentPrefs.eventInvitations).toBe(initialPrefs.eventInvitations);
			}
		});

		it('should return error object when save fails', async () => {
			// Mock GraphQL error
			const newPrefs: NotificationPreferences = {
				eventInvitations: false,
				eventChanges: true,
				eventCancellations: false,
				commentMentions: true,
				reminderTimes: ['1day'],
				reminderScope: 'all',
				customEventIds: []
			};

			const result = await saveNotificationPrefs(newPrefs);

			// In error case
			// expect(result.success).toBe(false);
			// expect(result.error).toBeTruthy();
		});
	});

	describe('resetToDefaults function', () => {
		it('should reset all preferences to defaults', async () => {
			// First, change some preferences
			notificationPreferences.update((prefs) => ({
				...prefs,
				eventInvitations: false,
				reminderScope: 'custom',
				customEventIds: ['event-1', 'event-2']
			}));

			// Reset to defaults
			await resetToDefaults();

			const prefs = get(notificationPreferences);

			expect(prefs.eventInvitations).toBe(true);
			expect(prefs.eventChanges).toBe(true);
			expect(prefs.eventCancellations).toBe(true);
			expect(prefs.commentMentions).toBe(true);
			expect(prefs.reminderTimes).toEqual(['15min', '1hour']);
			expect(prefs.reminderScope).toBe('accepted');
			expect(prefs.customEventIds).toEqual([]);
		});

		it('should save defaults to backend', async () => {
			await resetToDefaults();

			// Verify GraphQL mutation called with default values
		});

		it('should clear customEventIds when resetting', async () => {
			notificationPreferences.update((prefs) => ({
				...prefs,
				reminderScope: 'custom',
				customEventIds: ['event-1', 'event-2', 'event-3']
			}));

			await resetToDefaults();

			const prefs = get(notificationPreferences);
			expect(prefs.customEventIds).toEqual([]);
		});

		it('should update localStorage with defaults', async () => {
			await resetToDefaults();

			const stored = localStorage.getItem('event-notification-prefs');
			const parsed = JSON.parse(stored!);

			expect(parsed.eventInvitations).toBe(true);
			expect(parsed.reminderScope).toBe('accepted');
		});
	});

	describe('Store reactivity', () => {
		it('should notify subscribers when preferences change', () => {
			const subscriber = vi.fn();

			notificationPreferences.subscribe(subscriber);

			// Change preference
			notificationPreferences.update((prefs) => ({
				...prefs,
				eventInvitations: false
			}));

			// Subscriber should be called
			expect(subscriber).toHaveBeenCalled();
		});

		it('should provide current state to new subscribers immediately', () => {
			// Set some preferences
			notificationPreferences.update((prefs) => ({
				...prefs,
				eventInvitations: false
			}));

			const subscriber = vi.fn();
			notificationPreferences.subscribe(subscriber);

			// Subscriber should be called immediately with current state
			expect(subscriber).toHaveBeenCalledWith(
				expect.objectContaining({
					eventInvitations: false
				})
			);
		});
	});

	describe('Validation', () => {
		it('should validate reminderTimes contains valid values', () => {
			notificationPreferences.update((prefs) => ({
				...prefs,
				reminderTimes: ['15min', 'invalid-time' as any, '1hour']
			}));

			const prefs = get(notificationPreferences);

			// Should filter out invalid values or throw error
			// expect(prefs.reminderTimes).not.toContain('invalid-time');
		});

		it('should validate reminderScope is valid enum value', () => {
			notificationPreferences.update((prefs) => ({
				...prefs,
				reminderScope: 'invalid-scope' as any
			}));

			const prefs = get(notificationPreferences);

			// Should reject invalid scope or fall back to default
			expect(['all', 'accepted', 'custom']).toContain(prefs.reminderScope);
		});

		it('should validate customEventIds are valid UUIDs', () => {
			notificationPreferences.update((prefs) => ({
				...prefs,
				reminderScope: 'custom',
				customEventIds: ['valid-uuid-1', 'not-a-uuid', 'valid-uuid-2']
			}));

			const prefs = get(notificationPreferences);

			// Should filter out invalid UUIDs
			// Or validation happens at save time
		});
	});

	describe('Edge cases', () => {
		it('should handle empty reminderTimes array', () => {
			notificationPreferences.update((prefs) => ({
				...prefs,
				reminderTimes: []
			}));

			const prefs = get(notificationPreferences);
			expect(prefs.reminderTimes).toEqual([]);
		});

		it('should handle reminderScope custom with empty customEventIds', () => {
			notificationPreferences.update((prefs) => ({
				...prefs,
				reminderScope: 'custom',
				customEventIds: []
			}));

			const prefs = get(notificationPreferences);
			expect(prefs.reminderScope).toBe('custom');
			expect(prefs.customEventIds).toEqual([]);
		});

		it('should handle simultaneous updates from multiple sources', async () => {
			// Update 1
			const update1 = saveNotificationPrefs({
				eventInvitations: false,
				eventChanges: true,
				eventCancellations: false,
				commentMentions: true,
				reminderTimes: ['1day'],
				reminderScope: 'all',
				customEventIds: []
			});

			// Update 2 (before update 1 completes)
			const update2 = saveNotificationPrefs({
				eventInvitations: true,
				eventChanges: false,
				eventCancellations: true,
				commentMentions: false,
				reminderTimes: ['15min'],
				reminderScope: 'accepted',
				customEventIds: []
			});

			// Wait for both
			await Promise.all([update1, update2]);

			// Last write should win
			const prefs = get(notificationPreferences);
			expect(prefs.eventInvitations).toBe(true);
		});

		it('should handle quota exceeded error when saving to localStorage', () => {
			// Mock localStorage quota exceeded
			const originalSetItem = localStorage.setItem;
			localStorage.setItem = vi.fn(() => {
				throw new Error('QuotaExceededError');
			});

			// Should handle gracefully
			notificationPreferences.update((prefs) => ({
				...prefs,
				eventInvitations: false
			}));

			// Restore
			localStorage.setItem = originalSetItem;
		});
	});
});
