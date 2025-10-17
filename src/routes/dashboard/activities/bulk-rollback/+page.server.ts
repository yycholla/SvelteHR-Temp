/**
 * Bulk Rollback Page - Server Load
 * Feature: 020-we-need-to (Comprehensive Audit Logging with Rollback)
 * Task: T046
 * Created: 2025-10-02
 *
 * Server-side data loading for bulk rollback operations (super_admin only).
 */

import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { GraphQLClient } from '$lib/server/graphql-client';
import { ensureBackendReady } from '$lib/server/backend-init';

export const load: PageServerLoad = async (event) => {
	const { locals, url, cookies } = event;

	// RBAC: Only super_admin can access bulk rollback
	if (!locals.user) {
		throw redirect(303, `/login?redirectTo=${encodeURIComponent(url.pathname)}`);
	}

	const userPermissions = locals.permissions || [];
	const isSuperAdmin = userPermissions.includes('*') || userPermissions.includes('admin:super');

	if (!isSuperAdmin) {
		throw error(403, {
			message: 'Access denied. Only super_admin can perform bulk rollback operations.'
		});
	}

	try {
		// Check backend services are ready before proceeding
		const backendReady = await ensureBackendReady();

		if (!backendReady) {
			console.warn('Backend not ready for bulk rollback page');
			return {
				availableLogs: [],
				recentBatches: [],
				resourceTypes: [],
				filters: {
					dateFrom: null,
					dateTo: null,
					resourceType: null,
					action: null
				},
				userId: locals.user.id,
				error: {
					message: 'Backend services are initializing. Please try again in a moment.',
					retryable: true
				}
			};
		}

		// Parse filters for log selection
		const dateFrom = url.searchParams.get('dateFrom') || null;
		const dateTo = url.searchParams.get('dateTo') || null;
		const resourceType = url.searchParams.get('resourceType') || null;
		const action = url.searchParams.get('action') || null;

		// Create GraphQL client with authentication
		const graphqlClient = GraphQLClient.fromCookies(cookies);

		// Build filter for activity logs query using Rust GraphQL schema
		let filterCondition: any = null;

		if (resourceType || action) {
			filterCondition = {};
			if (resourceType) {
				filterCondition.resourceType = { equalTo: resourceType };
			}
			if (action) {
				filterCondition.action = { equalTo: action };
			}
		}

		// Load rollbackable activity logs from database (max 100)
		// NOTE: Using Rust GraphQL schema (filter pattern, direct arrays)
		// orderBy not supported - will sort client-side
		const logsQuery = filterCondition
			? `
			query GetRollbackableLogs($filter: ActivityLogFilter!, $limit: Int!) {
				activityLogs(filter: $filter, limit: $limit) {
					id
					employeeId
					action
					resourceType
					resourceId
					details
					beforeSnapshot
					afterSnapshot
					isRollback
					createdAt
					employee {
						id
						displayName
						email
					}
				}
			}
		`
			: `
			query GetRollbackableLogs($limit: Int!) {
				activityLogs(limit: $limit) {
					id
					employeeId
					action
					resourceType
					resourceId
					details
					beforeSnapshot
					afterSnapshot
					isRollback
					createdAt
					employee {
						id
						displayName
						email
					}
				}
			}
		`;

		const logsData = await graphqlClient.query(logsQuery,
			filterCondition
				? { filter: filterCondition, limit: 100 }
				: { limit: 100 }
		);
		let availableLogs = logsData.data?.activityLogs || [];

		// Sort by createdAt DESC (client-side since Rust schema doesn't support orderBy)
		availableLogs = availableLogs.sort((a: any, b: any) =>
			new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
		);

		// Filter out rollback logs (client-side filtering since isRollback not in ActivityLogCondition)
		availableLogs = availableLogs.filter((log: any) => !log.isRollback);

		// Filter by date range if provided (client-side filtering)
		if (dateFrom || dateTo) {
			availableLogs = availableLogs.filter((log: any) => {
				const logDate = new Date(log.createdAt);
				if (dateFrom && logDate < new Date(dateFrom)) return false;
				if (dateTo && logDate > new Date(dateTo)) return false;
				return true;
			});
		}

		// Load recent bulk rollback batches
		// NOTE: Using Rust GraphQL schema (direct arrays, no orderBy)
		const batchesQuery = `
			query GetRecentBulkRollbackBatches($limit: Int!) {
				bulkRollbackBatches(limit: $limit) {
					id
					initiatedBy
					activityLogIds
					startedAt
					completedAt
					status
					totalCount
					processedCount
					successfulCount
					failedCount
					failureDetails
				}
			}
		`;

		const batchesData = await graphqlClient.query(batchesQuery, {
			limit: 100
		});

		let recentBatches = batchesData.data?.bulkRollbackBatches || [];

		// Sort by ID DESC (client-side since Rust schema doesn't support orderBy)
		recentBatches = recentBatches.sort((a: any, b: any) => b.id - a.id);

		// Filter to user's batches (client-side since initiatedBy not in condition)
		recentBatches = recentBatches.filter((batch: any) => batch.initiatedBy === locals.user.id);

		// Limit to 10 most recent
		recentBatches = recentBatches.slice(0, 10);

		// Get unique resource types from available logs
		const uniqueResourceTypes = [...new Set(availableLogs.map((log: any) => log.resourceType))];

		// Map logs to expected format
		const formattedLogs = availableLogs.map((log: any) => ({
			id: log.id,
			employeeId: log.employeeId,
			employee: log.employee
				? {
						id: log.employee.id,
						name: log.employee.displayName,
						email: log.employee.email
					}
				: null,
			action: log.action,
			resourceType: log.resourceType,
			resourceId: log.resourceId,
			details: log.details,
			beforeSnapshot: log.beforeSnapshot,
			afterSnapshot: log.afterSnapshot,
			createdAt: log.createdAt
		}));

		// Map batches to expected format
		const formattedBatches = recentBatches.map((batch: any) => ({
			id: batch.id,
			initiatedBy: batch.initiatedBy,
			activityLogIds: batch.activityLogIds,
			startedAt: batch.startedAt,
			completedAt: batch.completedAt,
			status: batch.status,
			totalCount: batch.totalCount,
			processedCount: batch.processedCount,
			successfulCount: batch.successfulCount,
			failedCount: batch.failedCount,
			failureDetails: batch.failureDetails
		}));

		return {
			availableLogs: formattedLogs,
			recentBatches: formattedBatches,
			resourceTypes: uniqueResourceTypes,
			filters: {
				dateFrom,
				dateTo,
				resourceType,
				action
			},
			userId: locals.user.id
		};
	} catch (err) {
		console.error('[BulkRollbackPage] Error loading bulk rollback page:', err);

		if (err && typeof err === 'object' && 'status' in err) {
			throw err; // Re-throw SvelteKit errors
		}

		throw error(500, {
			message: 'Failed to load bulk rollback page'
		});
	}
};

export const actions: Actions = {
	createBatch: async ({ request, locals, cookies }) => {
		if (!locals.user) {
			return { success: false, error: 'Not authenticated' };
		}

		if (locals.user.role !== 'super_admin') {
			return { success: false, error: 'Access denied' };
		}

		try {
			const formData = await request.formData();
			const logIds = JSON.parse(formData.get('logIds') as string);
			const reason = formData.get('reason') as string;

			if (!logIds || logIds.length === 0) {
				return { success: false, error: 'No logs selected' };
			}

			if (logIds.length > 100) {
				return { success: false, error: 'Maximum 100 logs per batch' };
			}

			if (!reason || reason.length < 10) {
				return { success: false, error: 'Reason must be at least 10 characters' };
			}

			// Create GraphQL client with authentication
			const graphqlClient = GraphQLClient.fromCookies(cookies);

			// Create bulk rollback batch mutation
			const createBatchMutation = `
				mutation CreateBulkRollbackBatch($input: CreateBulkRollbackBatchInput!) {
					createBulkRollbackBatch(input: $input) {
						bulkRollbackBatch {
							id
							initiatedBy
							activityLogIds
							startedAt
							status
							totalCount
						}
					}
				}
			`;

			const batchData = await graphqlClient.query(createBatchMutation, {
				input: {
					initiatedBy: locals.user.id,
					activityLogIds: logIds,
					totalCount: logIds.length,
					status: 'queued'
				}
			});

			const batch = batchData.data?.createBulkRollbackBatch?.bulkRollbackBatch;

			if (!batch) {
				return { success: false, error: 'Failed to create batch' };
			}

			return {
				success: true,
				batchId: batch.id
			};
		} catch (err) {
			console.error('[BulkRollbackPage] Error creating batch:', err);
			return {
				success: false,
				error: err instanceof Error ? err.message : 'Failed to create batch'
			};
		}
	}
};
