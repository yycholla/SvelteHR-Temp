// API Route: Update system settings via GraphQL mutation
// Server-side handler for system settings updates

import { json, error as svelteError } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { GraphQLClient } from '$lib/server/graphql-client';

// Map UI categories to database categories
const categoryMapping: Record<string, string> = {
	general: 'application',
	authentication: 'authentication',
	security: 'security',
	developer: 'logging',
	notifications: 'notifications'
};

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const { category, settings } = await request.json();

		// Validate input
		if (!category || !settings) {
			throw svelteError(400, 'Missing category or settings');
		}

		// Validate category
		const validCategories = ['general', 'authentication', 'notifications', 'security', 'developer'];
		if (!validCategories.includes(category)) {
			throw svelteError(400, `Invalid category: ${category}`);
		}

		// Map UI category to database category
		const dbCategory = categoryMapping[category] || category;

		// Create GraphQL client from cookies
		const client = GraphQLClient.fromCookies(cookies);

		// Convert settings object to JSON string for GraphQL
		const settingsJson = JSON.stringify(settings);

		// Execute GraphQL mutation
		const mutation = `
			mutation UpdateSystemSettings($input: UpdateSystemSettingsInput!) {
				updateSystemSettings(input: $input) {
					id
					category
					settings
					updatedBy
					updatedAt
				}
			}
		`;

		const result = await client.query(mutation, {
			input: {
				category: dbCategory,
				settings: settingsJson
			}
		});

		// Check for GraphQL errors
		if (result.errors) {
			console.error('[SETTINGS UPDATE] GraphQL errors:', result.errors);
			throw svelteError(500, result.errors[0]?.message || 'Failed to update settings');
		}

		// Return success
		return json({
			success: true,
			settings: result.data?.updateSystemSettings
		});
	} catch (err: any) {
		console.error('[SETTINGS UPDATE] Error:', err);

		// If it's already a SvelteKit error, re-throw it
		if (err.status) {
			throw err;
		}

		// Otherwise, create a 500 error
		throw svelteError(500, err.message || 'Failed to update settings');
	}
};
