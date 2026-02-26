// Server-side data loading for user settings page
// T041: Fix settings pages with standardized error handling

import type { PageServerLoad } from './$types';
import { getUserPermissions, requireAuth } from '$lib/server/rbac-utils';
import { createSettingsOperations } from '$lib/graphql/settings-operations';
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';
import { logger } from '$lib/utils/logger';
import type { ActivityLogItem } from './types';

export const load: PageServerLoad = async (event) => {
	const { cookies, url } = event;

	// RBAC: Settings pages are accessible to all authenticated users (profile management)
	requireAuth(event);

	// After permission check, re-destructure locals with guaranteed user
	const { locals } = event;

	// Import required models
	const { createDataRequest } = await import('$lib/models/data-request');
	const { createUserSession } = await import('$lib/models/user-session');

	// Create user session from server locals
	const userSession = createUserSession({
		userId: locals.user.id,
		// jwtToken is optional for session-based authentication
		roles: [locals.user.role || 'employee'],
		permissions: locals.permissions || [],
		expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes from now
		metadata: {
			userEmail: locals.user.email,
			displayName: locals.user.display_name || locals.user.email
		}
	});

	// Extract tab parameter from URL
	const activeTab = url.searchParams.get('tab') || 'general';

	// Create data request for settings data
	const dataRequest = createDataRequest({
		operationName: 'GetUserSettings',
		variables: {
			userId: userSession.userId,
			activeTab
		},
		userCredentials: {
			userId: userSession.userId,
			roles: userSession.roles,
			permissions: userSession.permissions,
			// jwtToken omitted for session-based auth
			isAuthenticated: Boolean(userSession.isAuthenticated),
			expiresAt: userSession.expiresAt
		},
		timeoutMs: 5000
	});

	// Default settings to return if GraphQL fails
	const defaultUserSettings = {
		profile: {
			id: locals.user.id,
			email: locals.user.email || '',
			displayName: locals.user.display_name || locals.user.email || '',
			firstName: '',
			lastName: '',
			phone: null,
			jobTitle: null,
			departmentId: null,
			managerId: null,
			department: null,
			manager: null,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		},
		preferences: {
			theme: 'light' as const,
			language: 'en',
			timezone: 'America/Los_Angeles',
			dateFormat: 'MM/dd/yyyy',
			timeFormat: '12h' as const,
			compactView: false,
			sidebarCollapsed: false,
			fontSize: 'medium' as const,
			colorScheme: 'blue'
		},
		notificationPreferences: {
			email: true,
			push: false,
			sms: false,
			leaveReminders: true,
			performanceUpdates: true,
			systemAlerts: true,
			teamUpdates: false,
			eventReminders: true,
			taskReminders: true
		},
		privacyPreferences: {
			profileVisibility: 'team' as const,
			showOnlineStatus: true,
			allowDirectMessages: true,
			dataSharing: false,
			analyticsOptOut: false
		}
	};

	let userSettings = defaultUserSettings;

	try {
		// Create GraphQL client for server-side operations
		const graphqlClient = createUrqlClient(fetch, undefined, undefined, serializeCookies(cookies));

		// Create settings operations instance
		const settingsOps = createSettingsOperations(graphqlClient);

		// Fetch user settings from GraphQL backend - catch failures gracefully
		userSettings = await settingsOps.getUserSettings({
			userCredentials: {
				userId: userSession.userId,
				roles: userSession.roles,
				permissions: userSession.permissions,
				isAuthenticated: Boolean(userSession.isAuthenticated),
				expiresAt: userSession.expiresAt
			}
		});
	} catch (settingsErr) {
		logger.warn('[Settings] GraphQL settings fetch failed, using defaults', {
			error: settingsErr instanceof Error ? settingsErr.message : String(settingsErr)
		});
		// userSettings already set to defaults above
	}

	try {
		// TODO: Fetch activity log from activity-logs operations
		// getUserActivityLog was removed from SettingsOperations during migration
		// Activity logs should be fetched from ActivityLogsOperations instead
		const activityLog: ActivityLogItem[] = [];

		// Get standardized user permissions
		const userPermissions = getUserPermissions(locals);

		// Return server-side loaded data with GraphQL-fetched settings
		return {
			userSession: userSession.toJSON(), // Convert UserSession to serializable object
			userSettings,
			activityLog,
			activeTab,
			// RBAC: Standardized permission checks with profile-specific permissions (includes user property)
			...userPermissions,
			canUpdateProfile: true, // All users can update their own profile
			canChangePassword: true, // All users can change their password
			canExportData:
				locals.permissions?.includes('data:export') ||
				locals.permissions?.includes('*') ||
				(locals.user.role &&
					['hr_manager', 'hr_admin', 'hr_super_admin'].includes(locals.user.role)),
			loadedAt: new Date().toISOString()
		};
	} catch (err) {
		logger.error('[Settings Load Error]', err as Error);

		// Re-throw redirects and SvelteKit errors
		if (err && typeof err === 'object' && ('status' in err || 'location' in err)) {
			throw err;
		}

		// Return safe defaults instead of crashing
		const userPermissions = getUserPermissions(locals);
		return {
			userSession: userSession.toJSON(),
			userSettings: defaultUserSettings,
			activityLog: [] as ActivityLogItem[],
			activeTab,
			...userPermissions,
			canUpdateProfile: true,
			canChangePassword: true,
			canExportData: false,
			loadedAt: new Date().toISOString()
		};
	}
};
