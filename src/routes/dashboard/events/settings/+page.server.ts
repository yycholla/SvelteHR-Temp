/**
 * Notification Settings Page Server Load
 * Feature: 027-we-need-to - Task T062
 * Purpose: Load user's event notification preferences from backend
 */

import type { PageServerLoad, Actions } from './$types';
import { error, redirect, fail } from '@sveltejs/kit';

// TODO: Implement once GraphQL operations are defined and token handling is fixed
// import { createUrqlClient } from '$lib/graphql/client';
// import { GET_NOTIFICATION_PREFERENCES, UPDATE_NOTIFICATION_PREFERENCES } from '$lib/graphql/events-operations';
// import type { EventNotificationPreferences } from '$lib/graphql/events-operations';

export const load: PageServerLoad = async ({ locals, url }) => {
	// Check authentication
	if (!locals.user) {
		redirect(303, `/login?redirectTo=${url.pathname}`);
	}

	// TODO: Implement notification preferences loading
	console.warn('[EventSettings] Notification preferences temporarily disabled - returning defaults');

	return {
		user: locals.user,
		preferences: {
			emailNotifications: true,
			pushNotifications: false,
			reminderDefaults: {
				enabled: true,
				minutesBefore: 15
			},
			commentMentions: true,
			waitlistPromotions: true,
			eventUpdates: true
		}
	};
};

export const actions = {
	/**
	 * Update notification preferences
	 */
	updatePreferences: async ({ locals }) => {
		if (!locals.user) {
			error(401, 'Unauthorized');
		}

		// TODO: Implement notification preferences update
		console.warn('[EventSettings] Notification preferences update temporarily disabled');

		return { success: true };
	}
} satisfies Actions;
