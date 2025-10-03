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
import { GraphQLClient } from '$lib/server/graphql-client';
import { ensureBackendReady } from '$lib/server/backend-init';

export const load: PageServerLoad = async (event) => {
	const { locals, url, cookies } = event;

	// RBAC: Authentication required
	if (!locals.user) {
		throw redirect(303, `/login?redirectTo=${encodeURIComponent(url.pathname)}`);
	}

	try {
		// Check backend services are ready before proceeding
		const backendReady = await ensureBackendReady();

		if (!backendReady) {
			console.warn('Backend not ready for rollback requests page');
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

		// Only super_admin can review requests; others can view their own
		const canReview = userRole === 'super_admin';

		// Parse URL query parameters for filtering and pagination
		const page = parseInt(url.searchParams.get('page') || '1', 10);
		const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10);
		const offset = (page - 1) * pageSize;

		const status = url.searchParams.get('status') || null;
		const requesterId = url.searchParams.get('requesterId') || null;

		// Create GraphQL client with authentication
		const graphqlClient = GraphQLClient.fromCookies(cookies);

		// Build condition for rollback requests query
		const condition: any = {};

		if (status) {
			condition.status = status;
		}

		// Non-super_admin users can only see their own requests
		if (!canReview) {
			condition.requestedBy = locals.user.id;
		} else if (requesterId) {
			// Super_admin can filter by specific requester
			condition.requestedBy = requesterId;
		}

		// Load rollback requests from database
		const requestsQuery = `
			query GetRollbackRequests(
				$condition: RollbackRequestCondition
				$limit: Int!
				$offset: Int!
			) {
				allRollbackRequests(
					condition: $condition
					orderBy: [REQUESTED_AT_DESC]
					first: $limit
					offset: $offset
				) {
					totalCount
					nodes {
						id
						activityLogId
						requestedBy
						requestedAt
						reason
						status
						reviewedBy
						reviewedAt
						reviewReason
						userByRequestedBy {
							id
							firstName
							lastName
							email
						}
						userByReviewedBy {
							id
							firstName
							lastName
						}
						activityLogByActivityLogId {
							id
							action
							resourceType
							resourceId
							details
							beforeSnapshot
							afterSnapshot
							createdAt
						}
					}
				}
			}
		`;

		const requestsData = await graphqlClient.query(requestsQuery, {
			condition,
			limit: pageSize,
			offset
		});

		const allRequests = requestsData.data?.allRollbackRequests?.nodes || [];
		const totalCount = requestsData.data?.allRollbackRequests?.totalCount || 0;

		// Map requests to expected format
		const formattedRequests = allRequests.map((req: any) => ({
			id: req.id,
			activityLogId: req.activityLogId,
			activityLog: req.activityLogByActivityLogId
				? {
						id: req.activityLogByActivityLogId.id,
						action: req.activityLogByActivityLogId.action,
						resourceType: req.activityLogByActivityLogId.resourceType,
						resourceId: req.activityLogByActivityLogId.resourceId,
						details: req.activityLogByActivityLogId.details,
					beforeSnapshot: req.activityLogByActivityLogId.beforeSnapshot,
					afterSnapshot: req.activityLogByActivityLogId.afterSnapshot,
						createdAt: req.activityLogByActivityLogId.createdAt
					}
				: null,
			requestedBy: req.requestedBy,
			requester: req.userByRequestedBy
				? {
						id: req.userByRequestedBy.id,
						name: `${req.userByRequestedBy.firstName} ${req.userByRequestedBy.lastName}`,
						email: req.userByRequestedBy.email
					}
				: null,
			requestedAt: req.requestedAt,
			reason: req.reason,
			status: req.status,
			reviewedBy: req.reviewedBy,
			reviewer: req.userByReviewedBy
				? {
						id: req.userByReviewedBy.id,
						name: `${req.userByReviewedBy.firstName} ${req.userByReviewedBy.lastName}`
					}
				: null,
			reviewedAt: req.reviewedAt,
			reviewReason: req.reviewReason
		}));

		// Calculate statistics for super_admin
		let statistics = null;
		if (canReview) {
			const statsQuery = `
				query GetRollbackRequestStats {
					allRollbackRequests {
						totalCount
					}
					pendingRequests: allRollbackRequests(condition: { status: "pending" }) {
						totalCount
					}
					approvedRequests: allRollbackRequests(condition: { status: "approved" }) {
						totalCount
					}
					rejectedRequests: allRollbackRequests(condition: { status: "rejected" }) {
						totalCount
					}
				}
			`;

			const statsData = await graphqlClient.query(statsQuery);

			statistics = {
				totalCount: statsData.data?.allRollbackRequests?.totalCount || 0,
				pendingCount: statsData.data?.pendingRequests?.totalCount || 0,
				approvedCount: statsData.data?.approvedRequests?.totalCount || 0,
				rejectedCount: statsData.data?.rejectedRequests?.totalCount || 0
			};
		}

		return {
			requests: formattedRequests,
			totalCount,
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
