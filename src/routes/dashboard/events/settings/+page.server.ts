/**
 * Notification Settings Page Server Load
 * Feature: 027-we-need-to - Task T062
 * Purpose: Load user's event notification preferences from backend
 * Refactored: Phase 2 - Using Phase 1 Foundation utilities
 */

import type { Actions, PageServerLoad } from './$types';
import { logger } from '$lib/utils/logger';
import { RBACDataLoader } from '$lib/server/route-loaders';

// TODO: Implement once GraphQL operations are defined
// import { GET_NOTIFICATION_PREFERENCES, UPDATE_NOTIFICATION_PREFERENCES } from '$lib/graphql/events-operations';
// import type { EventNotificationPreferences } from '$lib/graphql/events-operations';

export const load: PageServerLoad = async (event) => {
	const loader = new RBACDataLoader(event, [
		'events:read',
		'events:read:self',
		'events:read:team',
		'events:read:all'
	]);

	return loader.loadWithClient(async (client) => {
		// TODO: Implement notification preferences loading
		// const preferences = await client.query(
		//   GET_NOTIFICATION_PREFERENCES,
		//   { userId: loader.getUserId() },
		//   { operationName: 'GetNotificationPreferences', dataPath: 'preferences' }
		// );

		logger.warn('[EventSettings] Notification preferences temporarily disabled - returning defaults');

		return {
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
	});
};

export const actions = {
	/**
	 * Update notification preferences
	 */
	updatePreferences: async (event) => {
		const loader = new RBACDataLoader(event, [
			'events:write',
			'events:write:self',
			'events:write:team',
			'events:write:all'
		]);

		// TODO: Implement notification preferences update
		// const { request } = event;
		// const formData = await request.formData();
		// await client.mutate(
		//   UPDATE_NOTIFICATION_PREFERENCES,
		//   { userId: loader.getUserId(), preferences: {...} },
		//   { operationName: 'UpdateNotificationPreferences' }
		// );

		logger.warn('[EventSettings] Notification preferences update temporarily disabled');

		return { success: true };
	}
} satisfies Actions;
