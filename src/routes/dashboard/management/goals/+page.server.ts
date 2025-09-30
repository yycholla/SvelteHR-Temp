// Goals & OKRs Management Page - Server-Side Data Loading
// Simplified implementation with proper data structure

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async (event) => {
	const { locals, url } = event;

	// Verify user is authenticated
	if (!locals.user?.id) {
		throw error(401, 'Authentication required');
	}

	// Check if user has manager or admin role
	const hasManagerAccess = locals.roles?.includes('admin') || locals.roles?.includes('manager');
	if (!hasManagerAccess) {
		throw error(403, 'Manager or Admin role required');
	}

	// Extract search parameters for filtering
	const searchTerm = url.searchParams.get('search') || '';
	const statusFilter = url.searchParams.get('status') || 'all';
	const typeFilter = url.searchParams.get('type') || '';
	const priorityFilter = url.searchParams.get('priority') || '';

	// Return proper data structure for the goals page
	// TODO: Replace with real GraphQL queries when goals operations are implemented
	return {
		user: {
			id: locals.user.id,
			email: locals.user.email || '',
			displayName: locals.user.display_name || 'User',
			role: locals.user.role || 'employee'
		},
		userSession: {
			userId: locals.user.id,
			userEmail: locals.user.email || '',
			role: locals.user.role || 'employee',
			accessToken: '' // Would be JWT token in real implementation
		},
		teamGoals: [], // Would be fetched from PostGraphile
		totalGoals: 0,
		goalsAnalytics: {
			summary: {
				totalGoals: 0,
				activeGoals: 0,
				completedGoals: 0,
				overdueGoals: 0
			},
			progress: {
				averageProgress: 0,
				onTrackGoals: 0,
				atRiskGoals: 0,
				behindGoals: 0
			},
			byType: {
				okr: 0,
				kpi: 0,
				milestone: 0,
				objective: 0
			}
		},
		filters: {
			searchTerm,
			statusFilter,
			typeFilter,
			priorityFilter
		},
		permissions: locals.permissions || [],
		canCreateGoals: hasManagerAccess,
		canEditGoals: hasManagerAccess,
		canViewAllGoals: locals.roles?.includes('admin') || false,
		loadedAt: new Date().toISOString()
	};
};
