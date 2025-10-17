// T026: System Settings admin page - server-side data loading
// Admin-only page for managing system-wide configuration

import type { PageServerLoad } from './$types';
import { GraphQLClient } from '$lib/server/graphql-client';
import { ensureBackendReady } from '$lib/server/backend-init';

export const load: PageServerLoad = async ({ locals, parent, cookies }) => {
	// Auth check already done by admin +layout.server.ts
	const { isAdmin } = await parent();

	if (!isAdmin) {
		throw new Error('Admin access required');
	}

	try {
		// Ensure backend is ready before proceeding
		await ensureBackendReady();

		const client = GraphQLClient.fromCookies(cookies);

		// Query actual system settings from database
		// NOTE: Using Rust GraphQL schema (direct arrays, no .nodes wrapper)
		const settingsQuery = `
			query GetSystemSettings($limit: Int!) {
				systemSettings(limit: $limit) {
					id
					category
					settings
					updatedBy
					createdAt
					updatedAt
				}
				departments(limit: $limit) {
					id
					name
				}
				users(limit: $limit) {
					id
					role
				}
			}
		`;

		const result = await client.query(settingsQuery, { limit: 1000 });

		// Parse settings from database (JSONB format)
		const settingsData = result.data?.systemSettings || [];

		// Convert array of settings to object by category
		const departments = result.data?.departments || [];
		const users = result.data?.users || [];

		// Calculate unique roles from users
		const uniqueRoles = [...new Set(users.map((u: any) => u.role).filter(Boolean))];

		const settings: any = {
			general: {},
			authentication: {},
			notifications: {},
			security: {},
			developer: {},
			stats: {
				totalDepartments: departments.length,
				totalUsers: users.length,
				totalRoles: uniqueRoles.length
			}
		};

		// Parse JSON settings for each category
		for (const setting of settingsData) {
			try {
				const parsed = typeof setting.settings === 'string'
					? JSON.parse(setting.settings)
					: setting.settings;
				settings[setting.category] = parsed;
			} catch (parseError) {
				console.error(`[ADMIN SETTINGS] Failed to parse ${setting.category}:`, parseError);
				// Keep empty object for this category
			}
		}

		return {
			settings
		};
	} catch (error) {
		console.error('[ADMIN SETTINGS] Load error:', error);
		return {
			settings: null,
			error: 'Failed to load system settings'
		};
	}
};
