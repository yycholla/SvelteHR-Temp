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
					roles
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
		const uniqueRoles = [...new Set(users.flatMap((u: any) => u.roles || []).filter(Boolean))];

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
		// Return default settings structure even on error to prevent undefined errors
		return {
			settings: {
				general: {
					systemName: 'SvelteHR',
					systemEmail: 'admin@example.com',
					timezone: 'UTC',
					dateFormat: 'YYYY-MM-DD',
					language: 'en'
				},
				authentication: {
					sessionTimeout: 3600,
					passwordMinLength: 8,
					maxLoginAttempts: 5,
					requireUppercase: true,
					requireNumbers: true,
					requireSpecialChars: false
				},
				notifications: {
					emailEnabled: false,
					slackEnabled: false,
					webhooksEnabled: false,
					notifyOnUserCreate: false,
					notifyOnRoleChange: false
				},
				security: {
					enforceHttps: true,
					allowApiAccess: true,
					rateLimitEnabled: true,
					maxRequestsPerMinute: 100,
					ipWhitelist: '',
					corsOrigins: ''
				},
				developer: {
					show_debug_info: false,
					show_performance_metrics: false,
					log_level: 'info'
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
