// T026: System Settings admin page - server-side data loading
// Admin-only page for managing system-wide configuration

import type { PageServerLoad } from './$types';
import { createUrqlClient } from '$lib/graphql/client';

export const load: PageServerLoad = async ({ locals, parent }) => {
	// Auth check already done by admin +layout.server.ts
	const { isAdmin } = await parent();

	if (!isAdmin) {
		throw new Error('Admin access required');
	}

	try {
		const client = createUrqlClient();

		// Query system settings
		// Note: This is a placeholder - actual system settings would depend on your schema
		const settingsQuery = `
			query GetSystemSettings {
				allDepartments {
					totalCount
				}
				allUsers {
					totalCount
				}
				allRoles {
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
				totalDepartments: result.data?.allDepartments?.totalCount || 0,
				totalUsers: result.data?.allUsers?.totalCount || 0,
				totalRoles: result.data?.allRoles?.totalCount || 0
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
