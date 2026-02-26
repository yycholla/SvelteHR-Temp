import { logger } from '$lib/utils/logger';
/**
 * Bulk Rollback Page - Server Load
 * Feature: 020-we-need-to (Comprehensive Audit Logging with Rollback)
 * Task: T046
 *
 * Server-side data loading for bulk rollback operations (super_admin only).
 */

import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { GraphQLClient } from '$lib/server/graphql-client';
import { ensureBackendReady } from '$lib/server/backend-init';
import { requireAuth, AccessTier } from '$lib/server/rbac-utils';

export const load: PageServerLoad = async (event) => {
	const { url, cookies } = event;

	// Check authentication and permissions (bulk rollback requires admin access)
	requireAuth(event, { minTier: AccessTier.ALL });

	// After permission check, re-destructure locals with guaranteed user
	const { locals } = event;

	try {
		// Check backend services are ready before proceeding
		const backendReady = await ensureBackendReady();

		if (!backendReady) {
			logger.warn('Backend not ready for bulk rollback page');
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

		// Load rollbackable activity logs from database
		const logsQuery = `
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

		const logsData = await graphqlClient.query(logsQuery, { limit: 1000 });
		let availableLogs = logsData.data?.activityLogs || [];

		// Sort by createdAt DESC (client-side since Rust schema doesn't support orderBy)
		availableLogs = availableLogs.sort(
			(a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
		);

		// Filter out rollback logs (client-side filtering)
		availableLogs = availableLogs.filter((log: any) => !log.isRollback);

		// Client-side filtering for resourceType
		if (resourceType) {
			availableLogs = availableLogs.filter((log: any) => log.resourceType === resourceType);
		}

		// Client-side filtering for action
		if (action) {
			availableLogs = availableLogs.filter((log: any) => log.action === action);
		}

		// Client-side filtering for date range
		if (dateFrom || dateTo) {
			availableLogs = availableLogs.filter((log: any) => {
				const logDate = new Date(log.createdAt);
				if (dateFrom && logDate < new Date(dateFrom)) return false;
				if (dateTo && logDate > new Date(dateTo)) return false;
				return true;
			});
		}

		// NOTE: bulkRollbackBatches query doesn't exist yet in Rust GraphQL schema
		const recentBatches: any[] = [];

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

		const formattedBatches: any[] = [];

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
		logger.error('[BulkRollbackPage] Error loading bulk rollback page:', err as Error);

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		error(500, {
			message: 'Failed to load bulk rollback page'
		});
	}
};

export const actions: Actions = {
	createBatch: async (event) => {
		const { request, cookies } = event;

		// Check authentication and permissions
		requireAuth(event, { minTier: AccessTier.ALL });

		// After permission check, re-destructure locals with guaranteed user
		const { locals } = event;

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
						id
						requestedBy
						totalItems
						processedItems
						status
						createdAt
					}
				}
			`;

			const batchData = await graphqlClient.query(createBatchMutation, {
				input: {
					requestedBy: locals.user.id,
					totalItems: logIds.length
				}
			});

			const batch = batchData.data?.createBulkRollbackBatch;

			if (!batch) {
				return { success: false, error: 'Failed to create batch' };
			}

			return {
				success: true,
				batchId: batch.id
			};
		} catch (err) {
			logger.error('[BulkRollbackPage] Error creating batch:', err as Error);
			return {
				success: false,
				error: err instanceof Error ? err.message : 'Failed to create batch'
			};
		}
	}
};
