/**
 * Rollback Requests Page - Server Load
 * Feature: 020-we-need-to (Comprehensive Audit Logging with Rollback)
 * Task: T045
 * Created: 2025-10-02
 *
 * Server-side data loading for rollback requests page with RBAC filtering.
 */

import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { locals, url } = event;

	// RBAC: Authentication required
	if (!locals.user) {
		throw redirect(303, `/login?redirectTo=${encodeURIComponent(url.pathname)}`);
	}

	try {
		const userRole = locals.user.role || 'employee';

		// Only super_admin can review requests; others can view their own
		const canReview = userRole === 'super_admin';

		// Parse URL query parameters for filtering and pagination
		const page = parseInt(url.searchParams.get('page') || '1', 10);
		const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10);

		const status = url.searchParams.get('status') || null;
		const requesterId = url.searchParams.get('requesterId') || null;

		// TODO: Replace with actual API calls to MountainHR backend
		// Backend endpoints needed:
		// - GET /api/v2/rollback-requests?page={page}&limit={pageSize}&status={status}
		//   For non-super_admin: automatically filter by requester_id={userId}
		//   For super_admin: allow optional requester_id filter
		// - GET /api/v2/rollback-requests/statistics (super_admin only)

		// Placeholder statistics for reviewers
		const statistics = canReview
			? {
					totalCount: 0,
					pendingCount: 0,
					approvedCount: 0,
					rejectedCount: 0
				}
			: null;

		return {
			requests: [], // TODO: Fetch from backend
			totalCount: 0,
			page,
			pageSize,
			filters: {
				status,
				requesterId
			},
			statistics,
			canReview,
			userRole,
			userId: locals.user.id
		};
	} catch (err) {
		console.error('[RollbackRequestsPage] Error loading rollback requests:', err);

		if (err && typeof err === 'object' && 'status' in err) {
			throw err; // Re-throw SvelteKit errors
		}

		throw error(500, {
			message: 'Failed to load rollback requests'
		});
	}
};
