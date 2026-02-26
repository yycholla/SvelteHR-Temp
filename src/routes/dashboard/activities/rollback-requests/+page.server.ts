/**
 * Rollback Requests Page - Server Load
 * Feature: 020-we-need-to (Comprehensive Audit Logging with Rollback)
 * Task: T045
 *
 * Server-side data loading for rollback requests page with RBAC filtering.
 */

import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { GraphQLClient } from '$lib/server/graphql-client';
import { ensureBackendReady } from '$lib/server/backend-init';
import { requireAuth, AccessTier } from '$lib/server/rbac-utils';
import { logger } from '$lib/utils/logger';

export const load: PageServerLoad = async (event) => {
	const { url, cookies } = event;

	// Check authentication and permissions
	requireAuth(event, { minTier: AccessTier.ALL });

	// After permission check, re-destructure locals with guaranteed user
	const { locals } = event;

	try {
		// Check backend services are ready before proceeding
		const backendReady = await ensureBackendReady();

		if (!backendReady) {
			logger.warn('Backend not ready for rollback requests page');
			return {
				requests: [],
				totalCount: 0,
				page: 1,
				pageSize: 20,
				filters: { status: null, requesterId: null },
				statistics: null,
				canReview: false,
				userRole: locals.user.role || 'employee',
				userId: locals.user.id,
				error: {
					message: 'Backend services are initializing. Please try again in a moment.',
					retryable: true
				}
			};
		}

		const userRole = locals.user.role || 'employee';
		const canReview = userRole === 'super_admin';

		const page = parseInt(url.searchParams.get('page') || '1', 10);
		const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10);
		const offset = (page - 1) * pageSize;

		const status = url.searchParams.get('status') || null;
		const requesterId = url.searchParams.get('requesterId') || null;

		const graphqlClient = GraphQLClient.fromCookies(cookies);

		const requestsQuery = `
			query GetRollbackRequests($limit: Int!) {
				rollbackRequests(limit: $limit) {
					id
					entityType
					entityId
					requestedBy
					reason
					status
					approvedBy
					processedAt
					createdAt
					requester {
						id
						displayName
						email
					}
					reviewer {
						id
						displayName
					}
				}
			}
		`;

		const requestsData = await graphqlClient.query(requestsQuery, { limit: 1000 });
		let allRequests = requestsData.data?.rollbackRequests || [];

		allRequests = allRequests.sort(
			(a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
		);

		if (status) {
			allRequests = allRequests.filter((req: any) => req.status === status);
		}

		if (!canReview) {
			allRequests = allRequests.filter((req: any) => req.requestedBy === locals.user.id);
		} else if (requesterId) {
			allRequests = allRequests.filter((req: any) => req.requestedBy === requesterId);
		}

		const totalCount = allRequests.length;

		const formattedRequests = allRequests.map((req: any) => ({
			id: req.id,
			entityType: req.entityType,
			entityId: req.entityId,
			activityLogId: req.entityId,
			requestedBy: req.requestedBy,
			requester: req.requester
				? { id: req.requester.id, name: req.requester.displayName, email: req.requester.email }
				: null,
			requestedAt: req.createdAt,
			reason: req.reason,
			status: req.status,
			reviewedBy: req.approvedBy,
			reviewer: req.reviewer
				? { id: req.reviewer.id, name: req.reviewer.displayName }
				: null,
			reviewedAt: req.processedAt,
			reviewReason: null,
			createdAt: req.createdAt
		}));

		let statistics = null;
		if (canReview) {
			const allRequestsForStats = requestsData.data?.rollbackRequests || [];
			statistics = {
				totalCount: allRequestsForStats.length,
				pendingCount: allRequestsForStats.filter((req: any) => req.status === 'pending').length,
				approvedCount: allRequestsForStats.filter((req: any) => req.status === 'approved').length,
				rejectedCount: allRequestsForStats.filter((req: any) => req.status === 'rejected').length
			};
		}

		return {
			requests: formattedRequests,
			totalCount,
			page,
			pageSize,
			filters: { status, requesterId },
			statistics,
			canReview,
			userRole,
			userId: locals.user.id
		};
	} catch (err) {
		logger.error('[RollbackRequestsPage] Error loading rollback requests:', err as Error);

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		error(500, { message: 'Failed to load rollback requests' });
	}
};
