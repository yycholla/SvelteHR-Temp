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

		// Query system settings
		// Note: This is a placeholder - actual system settings would depend on your schema
		const settingsQuery = `
			query GetSystemSettings {
				departmentsCount
				allUsers {
					totalCount
				}
				allUserRoleAssignments {
					totalCount
				}
			}
		`;

		const result = await client.query(settingsQuery, {});

		// Mock settings data - replace with actual settings from database
		const settings = {
			general: {
				systemName: 'SvelteHR',
				systemEmail: 'admin@sveltehr.com',
				timezone: 'UTC',
				dateFormat: 'YYYY-MM-DD',
				language: 'en'
			},
			authentication: {
				sessionTimeout: 3600,
				passwordMinLength: 8,
				requireUppercase: true,
				requireNumbers: true,
				requireSpecialChars: true,
				maxLoginAttempts: 5
			},
			notifications: {
				emailEnabled: true,
				slackEnabled: false,
				webhooksEnabled: false,
				notifyOnUserCreate: true,
				notifyOnRoleChange: true
			},
			security: {
				enforceHttps: true,
				allowApiAccess: true,
				ipWhitelist: '',
				corsOrigins: '*',
				rateLimitEnabled: true,
				maxRequestsPerMinute: 60
			},
			stats: {
				totalDepartments: result.data?.departmentsCount || 0,
				totalUsers: result.data?.allUsers?.totalCount || 0,
				totalRoles: result.data?.allUserRoleAssignments?.totalCount || 0
			}
		};

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
