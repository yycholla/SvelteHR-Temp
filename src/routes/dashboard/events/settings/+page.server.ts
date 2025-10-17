/**
 * Notification Settings Page Server Load
 * Feature: 027-we-need-to - Task T062
 * Purpose: Load user's event notification preferences from backend
 */

import type { PageServerLoad, Actions } from './$types';
import { error, redirect, fail } from '@sveltejs/kit';
import { createUrqlClient } from '$lib/graphql/client';
import { GET_NOTIFICATION_PREFERENCES, UPDATE_NOTIFICATION_PREFERENCES } from '$lib/graphql/events-operations';
import type { EventNotificationPreferences } from '$lib/graphql/events-operations';

export const load: PageServerLoad = async ({ locals, url, cookies }) => {
	// Check authentication
	if (!locals.user) {
		throw redirect(303, `/login?redirectTo=${url.pathname}`);
	}

	// Token retrieval removed - session auth handled by server hooks
	if (!token) {
		throw redirect(303, `/login?redirectTo=${url.pathname}`);
	}

	try {
		// Initialize GraphQL client
		const urqlClient = createUrqlClient(undefined, token);

		// Fetch user's notification preferences
		const result = await urqlClient
			.query(GET_NOTIFICATION_PREFERENCES, { userId: locals.user.id })
			.toPromise();

		if (result.error) {
			console.error('Failed to load notification preferences:', result.error);
			throw error(500, 'Failed to load notification preferences');
		}

		// Extract preferences or use defaults
		// NOTE: Using Rust GraphQL schema - direct access (no userById wrapper)
		const preferences: EventNotificationPreferences = result.data?.user?.eventNotificationPreferences || {
			emailNotifications: true,
			pushNotifications: false,
			reminderDefaults: {
				enabled: true,
				minutesBefore: 15
			},
			commentMentions: true,
			waitlistPromotions: true,
			eventUpdates: true
		};

		return {
			user: locals.user,
			preferences
		};
	} catch (err) {
		console.error('Error loading notification settings:', err);
		throw error(500, 'Failed to load notification settings');
	}
};

export const actions = {
	/**
	 * Update notification preferences
	 */
	updatePreferences: async ({ request, locals, cookies }) => {
		if (!locals.user) {
			throw error(401, 'Unauthorized');
		}

		// Token retrieval removed - session auth handled by server hooks
		if (!token) {
			throw error(401, 'Unauthorized');
		}

		try {
			const formData = await request.formData();

			// Parse preferences from form data
			const preferences: EventNotificationPreferences = {
				emailNotifications: formData.get('emailNotifications') === 'true',
				pushNotifications: formData.get('pushNotifications') === 'true',
				reminderDefaults: {
					enabled: formData.get('reminderEnabled') === 'true',
					minutesBefore: parseInt(formData.get('minutesBefore') as string) || 15
				},
				commentMentions: formData.get('commentMentions') === 'true',
				waitlistPromotions: formData.get('waitlistPromotions') === 'true',
				eventUpdates: formData.get('eventUpdates') === 'true'
			};

			// Initialize GraphQL client
			const urqlClient = createUrqlClient(undefined, token);

			// Update preferences via GraphQL mutation
			const result = await urqlClient
				.mutation(UPDATE_NOTIFICATION_PREFERENCES, {
					input: {
						id: locals.user.id,
						userPatch: {
							eventNotificationPreferences: preferences
						}
					}
				})
				.toPromise();

			if (result.error) {
				console.error('Failed to update notification preferences:', result.error);
				return fail(500, { error: 'Failed to save preferences' });
			}

			return { success: true };
		} catch (err) {
			console.error('Error updating notification preferences:', err);
			return fail(500, { error: 'Failed to save preferences' });
		}
	}
} satisfies Actions;
