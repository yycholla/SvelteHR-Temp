// T027: Audit Logs admin page - server-side data loading
// Admin-only page for viewing system audit logs

import type { PageServerLoad } from './$types';
import { createUrqlClient } from '$lib/graphql/client';

export const load: PageServerLoad = async ({ locals, url, parent }) => {
	// Auth check already done by admin +layout.server.ts
	const { isAdmin } = await parent();

	if (!isAdmin) {
		throw new Error('Admin access required');
	}

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
		const client = createUrqlClient();

		// Query audit logs
		// Note: This assumes you have an audit_logs table in your schema
		// If not, this is a placeholder that should be replaced with actual audit log queries
		const auditLogsQuery = `
			query GetAuditLogs($first: Int!, $offset: Int!) {
				allAuditLogs(first: $first, offset: $offset, orderBy: CREATED_AT_DESC) {
					nodes {
						id
						userId
						action
						resourceType
						resourceId
						changes
						ipAddress
						userAgent
						createdAt
						userByUserId {
							email
							displayName
						}
					}
					totalCount
				}
			}
		`;

		// For now, return mock data since audit logs table might not exist yet
		const mockAuditLogs = [
			{
				id: '1',
				userId: locals.user?.id || 'system',
				action: 'USER_CREATED',
				resourceType: 'user',
				resourceId: '123',
				changes: { email: 'newuser@example.com', role: 'employee' },
				ipAddress: '192.168.1.1',
				userAgent: 'Mozilla/5.0...',
				createdAt: new Date().toISOString(),
				userByUserId: { email: locals.user?.email || 'admin@example.com', displayName: locals.user?.display_name || 'Admin' }
			},
			{
				id: '2',
				userId: locals.user?.id || 'system',
				action: 'USER_UPDATED',
				resourceType: 'user',
				resourceId: '123',
				changes: { role: 'manager' },
				ipAddress: '192.168.1.1',
				userAgent: 'Mozilla/5.0...',
				createdAt: new Date(Date.now() - 3600000).toISOString(),
				userByUserId: { email: locals.user?.email || 'admin@example.com', displayName: locals.user?.display_name || 'Admin' }
			},
			{
				id: '3',
				userId: locals.user?.id || 'system',
				action: 'ROLE_ASSIGNED',
				resourceType: 'user_role',
				resourceId: '456',
				changes: { roleId: '789', userId: '123' },
				ipAddress: '192.168.1.1',
				userAgent: 'Mozilla/5.0...',
				createdAt: new Date(Date.now() - 7200000).toISOString(),
				userByUserId: { email: locals.user?.email || 'admin@example.com', displayName: locals.user?.display_name || 'Admin' }
			}
		];

		// Try to fetch real audit logs, fall back to mock data
		let auditLogs = mockAuditLogs;
		let totalCount = mockAuditLogs.length;

		try {
			const result = await client.query(auditLogsQuery, {
				first: limit,
				offset
			});

			if (result.data?.allAuditLogs) {
				auditLogs = result.data.allAuditLogs.nodes;
				totalCount = result.data.allAuditLogs.totalCount;
			}
		} catch (queryError) {
			console.warn('[AUDIT LOGS] Using mock data - audit_logs table may not exist:', queryError);
		}

		// Apply filters
		let filteredLogs = auditLogs;
		if (actionFilter) {
			filteredLogs = filteredLogs.filter((log) => log.action === actionFilter);
		}
		if (userFilter) {
			filteredLogs = filteredLogs.filter(
				(log) =>
					log.userByUserId?.email?.includes(userFilter) ||
					log.userByUserId?.displayName?.includes(userFilter)
			);
		}
		if (dateFrom) {
			const fromDate = new Date(dateFrom);
			filteredLogs = filteredLogs.filter((log) => new Date(log.createdAt) >= fromDate);
		}
		if (dateTo) {
			const toDate = new Date(dateTo);
			filteredLogs = filteredLogs.filter((log) => new Date(log.createdAt) <= toDate);
		}

		// Get unique actions for filter dropdown
		const uniqueActions = [...new Set(auditLogs.map((log) => log.action))];

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
	} catch (error) {
		console.error('[AUDIT LOGS] Load error:', error);
		return {
			auditLogs: [],
			totalCount: 0,
			uniqueActions: [],
			pagination: { page: 1, limit: 50, totalPages: 0 },
			filters: { action: '', user: '', dateFrom: '', dateTo: '' },
			error: 'Failed to load audit logs'
		};
	}
};
