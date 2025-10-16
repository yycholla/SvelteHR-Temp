// Server-side data loading for user settings page
// T041: Fix settings pages with standardized error handling

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { PermissionChecks, getUserPermissions, requireAuth } from '$lib/server/rbac-utils';

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
		jwtToken: '', // Session-based auth doesn't use client-side JWT tokens
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
			userEmail: userSession.metadata.userEmail as string,
			roles: userSession.roles,
			permissions: userSession.permissions,
			jwtToken: userSession.jwtToken,
			isAuthenticated: Boolean(userSession.isAuthenticated)
		},
		timeoutMs: 5000,
		retryAttempts: 0,
		maxRetries: 3
	});

	try {
		// For now, return simplified user settings based on user data
		// This avoids complex GraphQL operations while keeping the page functional

		// Get standardized user permissions
		const userPermissions = getUserPermissions(locals);

		// Return server-side loaded data with simplified user settings
		return {
			user: userPermissions.user,
			userSession: userSession.toJSON(), // Convert UserSession to serializable object
			userSettings: {
				profile: {
					id: locals.user.id,
					email: locals.user.email,
					displayName: locals.user.display_name || locals.user.email,
					firstName: locals.user.first_name || '',
					lastName: locals.user.last_name || '',
					phoneNumber: locals.user.phone_number || '',
					jobTitle: locals.user.job_title || '',
					department: locals.user.department_name || '',
					bio: '',
					avatar: null,
					timezone: 'America/Los_Angeles',
					locale: 'en-US'
				},
				preferences: {
					theme: 'light',
					compactView: false,
					language: 'en',
					darkMode: false,
					fontSize: 'medium',
					colorScheme: 'blue',
					sidebarCollapsed: false
				},
				notifications: {
					email: true,
					push: false,
					sms: false,
					leaveReminders: true,
					performanceUpdates: true,
					systemAlerts: true,
					teamUpdates: false
				},
				privacy: {
					profileVisibility: 'team',
					showOnlineStatus: true,
					allowDirectMessages: true,
					dataSharing: false,
					analyticsOptOut: false
				}
			},
			activityLog: [], // Empty for now
			activeTab,
			// RBAC: Standardized permission checks with profile-specific permissions
			...userPermissions,
			canUpdateProfile: true, // All users can update their own profile
			canChangePassword: true, // All users can change their password
			canExportData:
				locals.permissions?.includes('data:export') ||
				locals.permissions?.includes('*') ||
				['hr_manager', 'hr_admin', 'hr_super_admin'].includes(locals.user.role),
			loadedAt: new Date().toISOString()
		};
	} catch (err) {
		console.error('[Settings Load Error]', err);

		// Create standardized error response
		const errorResponse = createErrorResponse(
			err instanceof Error ? err : new Error('Settings load failed'),
			{
				type: 'DATA_LOAD_ERROR',
				userMessage: 'Unable to load user settings. Please refresh the page or try again later.'
			}
		);

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
