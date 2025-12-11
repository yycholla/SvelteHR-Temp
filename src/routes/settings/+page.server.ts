// Server-side data loading for user settings page
// T041: Fix settings pages with standardized error handling

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getUserPermissions, requireAuth } from '$lib/server/rbac-utils';
import { createSettingsOperations } from '$lib/graphql/settings-operations';
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';
import { logger } from '$lib/utils/logger';

export const load: PageServerLoad = async (event) => {
	const { cookies, url } = event;

	// RBAC: Settings pages are accessible to all authenticated users (profile management)
	requireAuth(event);

	// After permission check, re-destructure locals with guaranteed user
	const { locals } = event;

	// Import required models for standardized error handling
	const { createDataRequest } = await import('$lib/models/data-request');
	const { createErrorResponse } = await import('$lib/models/error-response');
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

	try {
		// Create GraphQL client for server-side operations
		const graphqlClient = createUrqlClient(fetch, undefined, undefined, serializeCookies(cookies));

		// Create settings operations instance
		const settingsOps = createSettingsOperations(graphqlClient);

		// Fetch user settings from GraphQL backend
		const userSettings = await settingsOps.getUserSettings({
			userId: userSession.userId,
			userCredentials: {
				userId: userSession.userId,
				roles: userSession.roles,
				permissions: userSession.permissions,
				isAuthenticated: Boolean(userSession.isAuthenticated),
				expiresAt: userSession.expiresAt
			}
		});

		// Fetch activity log
		const activityLog = await settingsOps.getUserActivityLog({
			userId: userSession.userId,
			userCredentials: {
				userId: userSession.userId,
				roles: userSession.roles,
				permissions: userSession.permissions,
				isAuthenticated: Boolean(userSession.isAuthenticated),
				expiresAt: userSession.expiresAt
			}
		});

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

		// Create standardized error response
		const errorResponse = createErrorResponse(
			err instanceof Error ? err : new Error('Settings load failed'),
			{
				type: 'DATA_LOAD_ERROR',
				userMessage: 'Unable to load user settings. Please refresh the page or try again later.'
			}
		);

		// Log error details for debugging
		logger.error('[Settings Error Details]', {
			userId: locals.user?.id,
			userRole: locals.user?.role,
			activeTab,
			error: errorResponse
		});

		// Throw SvelteKit error with user-friendly message
		error(500, 'Settings temporarily unavailable');
	}
};
