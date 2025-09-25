// Server-side data loading for teams management page
// T037: Fix teams management pages with standardized error handling

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { PermissionChecks, getUserPermissions } from '$lib/server/rbac-utils';
import { createTeamManagementOperations } from '$lib/graphql/team-management-operations';

export const load: PageServerLoad = async (event) => {
	const { locals, cookies, url } = event;

	// RBAC: Check teams management permissions
	PermissionChecks.teamRead(event);

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

	// Extract search parameters from URL
	const searchTerm = url.searchParams.get('search') || '';
	const sizeFilter = url.searchParams.get('size') || '';
	const headFilter = url.searchParams.get('head') || '';
	const parentFilter = url.searchParams.get('parent') || '';
	const viewMode = url.searchParams.get('view') || 'table';
	const page = parseInt(url.searchParams.get('page') || '1', 10);
	const limit = parseInt(url.searchParams.get('limit') || '20', 10);

	// Create data request for teams data
	const dataRequest = createDataRequest({
		operationName: 'GetTeamsManagement',
		variables: {
			searchTerm,
			sizeFilter,
			headFilter,
			parentFilter,
			page,
			limit,
			includeHierarchy: viewMode === 'hierarchy'
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
		// Create team management operations instance
		const teamOps = createTeamManagementOperations(null); // We'll pass the GraphQL client reference

		// Load teams data using standardized operations
		const teamsData = await teamOps.getTeamOverview({
			departmentId: parentFilter || undefined,
			userCredentials: {
				userId: userSession.userId,
				userEmail: userSession.userEmail,
				role: userSession.role,
				accessToken: userSession.accessToken
			}
		});

		// Return server-side loaded data
		// Get standardized user permissions
		const userPermissions = getUserPermissions(locals);

		return {
			user: userPermissions.user,
			userSession,
			teams: teamsData.teams || [],
			totalTeams: teamsData.totalCount || 0,
			hierarchy: teamsData.hierarchy || [],
			teamStats: teamsData.stats || {
				totalTeams: 0,
				totalEmployees: 0,
				averageTeamSize: 0,
				teamsWithHeads: 0
			},
			filters: {
				searchTerm,
				sizeFilter,
				headFilter,
				parentFilter,
				viewMode,
				page,
				limit
			},
			// RBAC: Standardized permission checks
			...userPermissions,
			loadedAt: new Date().toISOString()
		};
	} catch (err) {
		console.error('[Teams Management Load Error]', err);

		// Create standardized error response
		const errorResponse = createErrorResponse(err instanceof Error ? err : new Error('Teams management load failed'), {
			type: 'DATA_LOAD_ERROR',
			userMessage: 'Unable to load teams management data. Please refresh the page or try again later.'
		});

		// Log error details for debugging
		console.error('[Teams Management Error Details]', {
			userId: locals.user?.id,
			userRole: locals.user?.role,
			searchTerm,
			sizeFilter,
			headFilter,
			parentFilter,
			error: errorResponse
		});

		// Throw SvelteKit error with user-friendly message
		throw error(500, {
			message: 'Teams management temporarily unavailable',
			details: errorResponse.userMessage
		});
	}
};