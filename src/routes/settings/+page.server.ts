// Server-side data loading for user settings page
// T041: Fix settings pages with standardized error handling

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { PermissionChecks, getUserPermissions, requireAuth } from '$lib/server/rbac-utils';
import { createSettingsOperations, getUserActivityLog } from '$lib/graphql/settings-operations';

export const load: PageServerLoad = async (event) => {
	const { locals, cookies, url } = event;

	// RBAC: Settings pages are accessible to all authenticated users (profile management)
	requireAuth(event);

	// Import required models for standardized error handling
	const { createDataRequest } = await import('$lib/models/data-request');
	const { createErrorResponse } = await import('$lib/models/error-response');
	const { createUserSession } = await import('$lib/models/user-session');

	// Create user session from server locals
	const userSession = createUserSession({
		userId: locals.user.id,
		userEmail: locals.user.email,
		displayName: locals.user.display_name || locals.user.email,
		role: locals.user.role || 'employee',
		permissions: locals.permissions || [],
		accessToken: cookies.get('hr_token') || '',
		tokenExpiry: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
		isValid: true
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
			userEmail: userSession.userEmail,
			role: userSession.role,
			accessToken: userSession.accessToken
		},
		timeoutMs: 5000,
		retryAttempts: 0,
		maxRetries: 3
	});

	try {
		// Create settings operations instance
		const settingsOps = createSettingsOperations(null); // We'll pass the GraphQL client reference

		// Load user settings data using standardized operations
		const userSettings = await settingsOps.getUserSettings({
			userId: userSession.userId,
			userCredentials: {
				userId: userSession.userId,
				userEmail: userSession.userEmail,
				role: userSession.role,
				accessToken: userSession.accessToken
			}
		});

		// Load user activity log for security tab
		const activityLog = await getUserActivityLog({
			userId: userSession.userId,
			limit: 10,
			userCredentials: {
				userId: userSession.userId,
				userEmail: userSession.userEmail,
				role: userSession.role,
				accessToken: userSession.accessToken
			}
		});

		// Return server-side loaded data
		return {
			user: locals.user,
			userSession,
			userSettings: {
				profile: {
					id: userSettings.id,
					email: userSettings.email,
					displayName: userSettings.displayName,
					firstName: userSettings.firstName,
					lastName: userSettings.lastName,
					phoneNumber: userSettings.phoneNumber,
					jobTitle: userSettings.jobTitle,
					department: userSettings.department,
					bio: userSettings.profile?.bio || '',
					avatar: userSettings.profile?.avatar || null,
					timezone: userSettings.profile?.timezone || 'America/Los_Angeles',
					locale: userSettings.profile?.locale || 'en-US'
				},
				preferences: {
					theme: userSettings.preferences?.theme || 'light',
					compactView: userSettings.preferences?.compactView || false,
					language: userSettings.preferences?.language || 'en',
					darkMode: userSettings.preferences?.appearance?.darkMode || false,
					fontSize: userSettings.preferences?.appearance?.fontSize || 'medium',
					colorScheme: userSettings.preferences?.appearance?.colorScheme || 'blue',
					sidebarCollapsed: userSettings.preferences?.appearance?.sidebarCollapsed || false
				},
				notifications: {
					email: userSettings.preferences?.notifications?.email ?? true,
					push: userSettings.preferences?.notifications?.push ?? false,
					sms: userSettings.preferences?.notifications?.sms ?? false,
					leaveReminders: userSettings.preferences?.notifications?.leaveReminders ?? true,
					performanceUpdates: userSettings.preferences?.notifications?.performanceUpdates ?? true,
					systemAlerts: userSettings.preferences?.notifications?.systemAlerts ?? true,
					teamUpdates: userSettings.preferences?.notifications?.teamUpdates ?? false
				},
				privacy: {
					profileVisibility: userSettings.preferences?.privacy?.profileVisibility || 'team',
					showOnlineStatus: userSettings.preferences?.privacy?.showOnlineStatus ?? true,
					allowDirectMessages: userSettings.preferences?.privacy?.allowDirectMessages ?? true,
					dataSharing: userSettings.preferences?.privacy?.dataSharing ?? false,
					analyticsOptOut: userSettings.preferences?.privacy?.analyticsOptOut ?? false
				}
			},
			activityLog: activityLog || [],
			activeTab,
			// RBAC: Standardized permission checks with profile-specific permissions
			...getUserPermissions(locals),
			canUpdateProfile: true, // All users can update their own profile
			canChangePassword: true, // All users can change their password
			canExportData: locals.permissions?.includes('data:export') ||
						   locals.permissions?.includes('*') ||
						   ['hr_manager', 'hr_admin', 'hr_super_admin'].includes(locals.user.role),
			loadedAt: new Date().toISOString()
		};
	} catch (err) {
		console.error('[Settings Load Error]', err);

		// Create standardized error response
		const errorResponse = createErrorResponse(err instanceof Error ? err : new Error('Settings load failed'), {
			type: 'DATA_LOAD_ERROR',
			userMessage: 'Unable to load user settings. Please refresh the page or try again later.'
		});

		// Log error details for debugging
		console.error('[Settings Error Details]', {
			userId: locals.user?.id,
			userRole: locals.user?.role,
			activeTab,
			error: errorResponse
		});

		// Throw SvelteKit error with user-friendly message
		throw error(500, {
			message: 'Settings temporarily unavailable',
			details: errorResponse.userMessage
		});
	}
};