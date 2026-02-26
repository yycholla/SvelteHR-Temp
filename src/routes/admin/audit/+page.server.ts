// T027: Audit Logs admin page - server-side data loading
// Admin-only page for viewing system audit logs

import type { PageServerLoad } from './$types';
import { logger } from '$lib/utils/logger';
import { RBACDataLoader } from '$lib/server/route-loaders';
import { QueryParamExtractor, ClientSideFilter } from '$lib/server/route-helpers';

interface ActivityLogRecord {
	id: string;
	action: string;
	createdAt: string;
	user?: {
		email?: string | null;
		displayName?: string | null;
	} | null;
}

export const load: PageServerLoad = async (event) => {
	// Initialize RBAC loader with required permissions
	const loader = new RBACDataLoader(event, ['admin:read', 'admin:read:all']);

	return loader.loadWithClient(async (client) => {
		const { url } = event;

		// Extract parameters
		const params = new QueryParamExtractor(url);
		const { page, limit, offset } = params.getPagination(50);
		const actionFilter = params.getString('action');
		const userFilter = params.getString('user');
		const dateFrom = params.getString('dateFrom');
		const dateTo = params.getString('dateTo');

		try {
			// Check if userFilter is a valid UUID to pass to backend
			const userId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
				userFilter
			)
				? userFilter
				: null;

			// Query activity logs
			const query = `
				query GetActivityLogs($userId: UUID, $limit: Int, $offset: Int) {
					activityLogs(userId: $userId, limit: $limit, offset: $offset) {
						id
						userId
						action
						resourceType
						resourceId
						details
						changes: afterSnapshot
						ipAddress
						userAgent
						createdAt
						user {
							email
							displayName
						}
					}
					activityLogsCount(userId: $userId)
				}
			`;

			const response = await client.query(query, {
				userId,
				limit,
				offset
			});

			const logs: ActivityLogRecord[] = response?.activityLogs || [];
			const totalCount = response?.activityLogsCount || 0;

			// Map logs to the format expected by the UI
			const mappedLogs = logs.map((log) => ({
				...log,
				userByUserId: log.user
			}));

			// Use ClientSideFilter for local filtering
			const logFilter = new ClientSideFilter(mappedLogs);

			if (actionFilter) {
				logFilter.where('action', actionFilter);
			}

			if (dateFrom || dateTo) {
				const start = dateFrom ? new Date(dateFrom) : null;
				const end = dateTo ? new Date(dateTo) : null;
				// Add one day to end date to include it fully
				if (end) {
					end.setDate(end.getDate() + 1);
				}
				logFilter.dateRange('createdAt', start, end);
			}

			const filteredLogs = logFilter.get();

			// Get unique actions for filter dropdown (from current page)
			const uniqueActions = [...new Set(mappedLogs.map((log) => log.action))];

			return {
				auditLogs: filteredLogs,
				totalCount,
				uniqueActions,
				pagination: {
					page,
					limit,
					totalPages: Math.ceil(totalCount / limit)
				},
				filters: {
					action: actionFilter,
					user: userFilter,
					dateFrom,
					dateTo
				}
			};
		} catch (error: unknown) {
			logger.error('[AUDIT LOGS] Load error:', error as Error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			return {
				auditLogs: [],
				totalCount: 0,
				uniqueActions: [],
				pagination: { page: 1, limit: 50, totalPages: 0 },
				filters: { action: '', user: '', dateFrom: '', dateTo: '' },
				error: `Failed to load audit logs: ${errorMessage}`
			};
		}
	});
};
