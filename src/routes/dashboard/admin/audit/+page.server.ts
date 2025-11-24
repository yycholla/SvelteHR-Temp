// T027: Audit Logs admin page - server-side data loading
// Admin-only page for viewing system audit logs

import type { PageServerLoad } from './$types';
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';
import { PermissionChecks } from '$lib/server/rbac-utils';

export const load: PageServerLoad = async (event) => {
	const { locals, url, cookies } = event;

	// Check authentication and permissions
	PermissionChecks.adminRead(event);

	// Get pagination parameters
	const page = parseInt(url.searchParams.get('page') || '1');
	const limit = parseInt(url.searchParams.get('limit') || '50');
	const offset = (page - 1) * limit;

	// Get filter parameters
	const actionFilter = url.searchParams.get('action') || '';
	const userFilter = url.searchParams.get('user') || '';
	const dateFrom = url.searchParams.get('dateFrom') || '';
	const dateTo = url.searchParams.get('dateTo') || '';

	try {
		const cookieHeader = serializeCookies(cookies);
		const client = createUrqlClient(undefined, undefined, undefined, cookieHeader);

		// Check if userFilter is a valid UUID to pass to backend
		const userId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userFilter) 
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
		}).toPromise();

		if (response.error) {
			console.error('[AUDIT LOGS] GraphQL Error:', response.error);
			throw new Error(response.error.message);
		}

		const logs = response.data?.activityLogs || [];
		const totalCount = response.data?.activityLogsCount || 0;

		// Map logs to the format expected by the UI
		const mappedLogs = logs.map((log: any) => ({
			...log,
			userByUserId: log.user,
			// changes is already an object or null from GraphQL JSON scalar
		}));

		// Filter results locally if needed (for search queries that backend doesn't support yet)
		// e.g. text search for action or resource type
		let filteredLogs = mappedLogs;
		
		// Note: Backend handles pagination, so we only filter the current page's results
		// Ideally, backend should support all these filters
		
		if (actionFilter) {
			filteredLogs = filteredLogs.filter((log: any) => log.action === actionFilter);
		}
		
		// We don't filter by user name here because that would empty the page if the user 
		// isn't on the current page. We rely on the UUID filter for precise user filtering.
		
		if (dateFrom) {
			const fromDate = new Date(dateFrom);
			filteredLogs = filteredLogs.filter((log: any) => new Date(log.createdAt) >= fromDate);
		}
		
		if (dateTo) {
			const toDate = new Date(dateTo);
			// Add one day to include the end date fully
			const toDateObj = new Date(dateTo);
			toDateObj.setDate(toDateObj.getDate() + 1);
			filteredLogs = filteredLogs.filter((log: any) => new Date(log.createdAt) < toDateObj);
		}

		// Get unique actions for filter dropdown (from current page)
		const uniqueActions = [...new Set(mappedLogs.map((log: any) => log.action))];

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
			},
		};
	} catch (error: any) {
		console.error('[AUDIT LOGS] Load error:', error);
		return {
			auditLogs: [],
			totalCount: 0,
			uniqueActions: [],
			pagination: { page: 1, limit: 50, totalPages: 0 },
			filters: { action: '', user: '', dateFrom: '', dateTo: '' },
			error: `Failed to load audit logs: ${error.message || 'Unknown error'}`
		};
	}
};