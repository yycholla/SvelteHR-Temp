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

		// Build filter for rollback requests query using Rust GraphQL schema
		let filterCondition: any = {};

		if (status) {
			filterCondition.status = { equalTo: status };
		}

		// Non-super_admin users can only see their own requests
		if (!canReview) {
			filterCondition.requestedBy = { equalTo: locals.user.id };
		} else if (requesterId) {
			// Super_admin can filter by specific requester
			filterCondition.requestedBy = { equalTo: requesterId };
		}

		// Load rollback requests from database
		// NOTE: Using Rust GraphQL schema (filter pattern, direct arrays, no orderBy)
		const requestsQuery = `
			query GetRollbackRequests(
				$filter: RollbackRequestFilter!
				$limit: Int!
				$offset: Int!
			) {
				rollbackRequests(
					filter: $filter
					limit: $limit
					offset: $offset
				) {
					id
					activityLogId
					requestedBy
					requestedAt
					reason
					status
					reviewedBy
					reviewedAt
					reviewReason
					requester {
						id
						displayName
						email
					}
					reviewer {
						id
						displayName
					}
					activityLog {
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
				rollbackRequestsCount(filter: $filter)
			}
		`;

		const requestsData = await graphqlClient.query(requestsQuery, {
			filter: filterCondition,
			limit: pageSize,
			offset
		});

		let allRequests = requestsData.data?.rollbackRequests || [];
		const totalCount = requestsData.data?.rollbackRequestsCount || 0;

		// Sort by requestedAt DESC (client-side since Rust schema doesn't support orderBy)
		allRequests = allRequests.sort((a: any, b: any) =>
			new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
		);

		// Map requests to expected format
		const formattedRequests = allRequests.map((req: any) => ({
			id: req.id,
			activityLogId: req.activityLogId,
			activityLog: req.activityLog
				? {
						id: req.activityLog.id,
						action: req.activityLog.action,
						resourceType: req.activityLog.resourceType,
						resourceId: req.activityLog.resourceId,
						details: req.activityLog.details,
						beforeSnapshot: req.activityLog.beforeSnapshot,
						afterSnapshot: req.activityLog.afterSnapshot,
						createdAt: req.activityLog.createdAt
					}
				: null,
			requestedBy: req.requestedBy,
			requester: req.requester
				? {
						id: req.requester.id,
						name: req.requester.displayName,
						email: req.requester.email
					}
				: null,
			requestedAt: req.requestedAt,
			reason: req.reason,
			status: req.status,
			reviewedBy: req.reviewedBy,
			reviewer: req.reviewer
				? {
						id: req.reviewer.id,
						name: req.reviewer.displayName
					}
				: null,
			reviewedAt: req.reviewedAt,
			reviewReason: req.reviewReason
		}));

		// Calculate statistics for super_admin
		let statistics = null;
		if (canReview) {
			// NOTE: Using Rust GraphQL schema - must make separate count queries
			const statsQuery = `
				query GetRollbackRequestStats(
					$pendingFilter: RollbackRequestFilter!
					$approvedFilter: RollbackRequestFilter!
					$rejectedFilter: RollbackRequestFilter!
				) {
					totalCount: rollbackRequestsCount
					pendingCount: rollbackRequestsCount(filter: $pendingFilter)
					approvedCount: rollbackRequestsCount(filter: $approvedFilter)
					rejectedCount: rollbackRequestsCount(filter: $rejectedFilter)
				}
			`;

			const statsData = await graphqlClient.query(statsQuery, {
				pendingFilter: { status: { equalTo: 'pending' } },
				approvedFilter: { status: { equalTo: 'approved' } },
				rejectedFilter: { status: { equalTo: 'rejected' } }
			});

			statistics = {
				totalCount: statsData.data?.totalCount || 0,
				pendingCount: statsData.data?.pendingCount || 0,
				approvedCount: statsData.data?.approvedCount || 0,
				rejectedCount: statsData.data?.rejectedCount || 0
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
