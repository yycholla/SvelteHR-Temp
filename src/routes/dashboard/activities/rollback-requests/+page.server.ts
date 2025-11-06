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
		redirect(303, `/login?redirectTo=${encodeURIComponent(url.pathname)}`);
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

		// Load rollback requests from database
		// NOTE: Using Rust GraphQL schema - fetch all and filter client-side
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

		const requestsData = await graphqlClient.query(requestsQuery, {
			limit: 1000
		});

		let allRequests = requestsData.data?.rollbackRequests || [];

		// Sort by createdAt DESC (client-side since Rust schema doesn't support orderBy)
		allRequests = allRequests.sort((a: any, b: any) =>
			new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
		);

		// Client-side filtering for status
		if (status) {
			allRequests = allRequests.filter((req: any) => req.status === status);
		}

		// Client-side filtering for requestedBy (RBAC)
		// Non-super_admin users can only see their own requests
		if (!canReview) {
			allRequests = allRequests.filter((req: any) => req.requestedBy === locals.user.id);
		} else if (requesterId) {
			// Super_admin can filter by specific requester
			allRequests = allRequests.filter((req: any) => req.requestedBy === requesterId);
		}

		// Use array length for total count
		const totalCount = allRequests.length;

		// Map requests to expected format (mapping new schema to UI expectations)
		const formattedRequests = allRequests.map((req: any) => ({
			id: req.id,
			entityType: req.entityType,
			entityId: req.entityId,
			// Map for backward compatibility with UI
			activityLogId: req.entityId, // Assuming UI expects this field
			requestedBy: req.requestedBy,
			requester: req.requester
				? {
						id: req.requester.id,
						name: req.requester.displayName,
						email: req.requester.email
					}
				: null,
			requestedAt: req.createdAt, // Map createdAt to requestedAt for UI
			reason: req.reason,
			status: req.status,
			reviewedBy: req.approvedBy, // Map approvedBy to reviewedBy for UI
			reviewer: req.reviewer
				? {
						id: req.reviewer.id,
						name: req.reviewer.displayName
					}
				: null,
			reviewedAt: req.processedAt, // Map processedAt to reviewedAt for UI
			reviewReason: null, // This field no longer exists in database
			createdAt: req.createdAt
		}));

		// Calculate statistics for super_admin from filtered data
		let statistics = null;
		if (canReview) {
			// Client-side statistics calculation from all requests
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

		error(500, {
        			message: 'Failed to load rollback requests'
        		});
	}
};
