import { logger } from '$lib/utils/logger';
// API Route: Get developer debug settings
// Returns the developer settings category for system_admin users

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { GraphQLClient } from '$lib/server/graphql-client';

export const GET: RequestHandler = async ({ cookies }) => {
	try {
		// Create GraphQL client from cookies
		const client = GraphQLClient.fromCookies(cookies);

		// Query developer settings
		const query = `
			query GetDeveloperSettings {
				systemSettingsByCategory(category: "developer") {
					id
					category
					settings
					updatedAt
				}
			}
		`;

		const result = await client.query(query, {});

		// Parse settings
		let settings = {
			show_debug_info: false,
			show_performance_metrics: false,
			log_level: 'info'
		};

		if (result.data?.systemSettingsByCategory) {
			const parsed =
				typeof result.data.systemSettingsByCategory.settings === 'string'
					? JSON.parse(result.data.systemSettingsByCategory.settings)
					: result.data.systemSettingsByCategory.settings;
			settings = { ...settings, ...parsed };
		}

		return json({ settings });
	} catch (err: any) {
		logger.error('[DEBUG SETTINGS] Error:', err as Error);

		// Return default settings on error
		return json({
			settings: {
				show_debug_info: false,
				show_performance_metrics: false,
				log_level: 'info'
			}
		});
	}
};
