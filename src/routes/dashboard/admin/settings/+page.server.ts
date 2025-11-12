// T026: System Settings admin page - server-side data loading
// Admin-only page for managing system-wide configuration

import type { PageServerLoad } from './$types';
import { GraphQLClient } from '$lib/server/graphql-client';
import { PermissionChecks } from '$lib/server/rbac-utils';
import { ensureBackendReady } from '$lib/server/backend-init';

export const load: PageServerLoad = async (event) => {
	const { locals, cookies } = event;

	// Check authentication and permissions
	PermissionChecks.adminRead(event);

	try {
		// Ensure backend is ready before proceeding
		await ensureBackendReady();

		const client = GraphQLClient.fromCookies(cookies);

		// Query actual system settings from database
		// NOTE: Using Rust GraphQL schema (direct arrays, no .nodes wrapper)
		const settingsQuery = `
			query GetSystemSettings($limit: Int!) {
				systemSettings {
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
					roles {
						id
						name
					}
				}
			}
		`;

		const result = await client.query(settingsQuery, { limit: 1000 });

		// Parse settings from database (JSONB format)
		const settingsData = result.data?.systemSettings || [];

		// Convert array of settings to object by category
		const departments = result.data?.departments || [];
		const users = result.data?.users || [];

		// Calculate unique roles from users (flatten roles arrays)
		const uniqueRoles = [...new Set(users.flatMap((u: any) => (u.roles || []).map((r: any) => r.name)).filter(Boolean))];

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
		// Map database categories to UI categories
		const categoryMapping: Record<string, string> = {
			application: 'general',
			authentication: 'authentication',
			security: 'security',
			logging: 'developer',
			notifications: 'notifications'
		};

		for (const setting of settingsData) {
			try {
				const parsed = typeof setting.settings === 'string'
					? JSON.parse(setting.settings)
					: setting.settings;

				const uiCategory = categoryMapping[setting.category] || setting.category;
				settings[uiCategory] = parsed;
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
		// Return default settings structure even on error to prevent undefined errors
		return {
			settings: {
				general: {
					systemName: 'MoncuraHR',
					systemTimezone: 'UTC'
				},
				authentication: {
					sessionTimeoutMinutes: 60,
					minPasswordLength: 12,
					maxLoginAttempts: 5,
					requireMfa: false,
					passwordExpirationEnabled: false,
					passwordExpirationDays: 90
				},
				notifications: {
					emailChannels: [],
					webhookChannels: []
				},
				security: {
					httpsEnforced: false,
					cspPolicy: null,
					xFrameOptions: true,
					hstEnabled: false,
					corsOrigins: []
				},
				developer: {
					logLevelFrontend: 'INFO',
					logLevelBackend: 'INFO'
				},
				stats: {
					totalDepartments: 0,
					totalUsers: 0,
					totalRoles: 0
				}
			},
			error: 'Failed to load system settings'
		};
	}
};
