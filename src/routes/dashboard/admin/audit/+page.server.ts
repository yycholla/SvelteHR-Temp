// T027: Audit Logs admin page - server-side data loading
// Admin-only page for viewing system audit logs

import type { PageServerLoad } from './$types';
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';

export const load: PageServerLoad = async ({ locals, url, parent, cookies }) => {
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
		const cookieHeader = serializeCookies(cookies);
		const client = createUrqlClient(undefined, undefined, undefined, cookieHeader);

		// Query audit logs
		// Note: Audit logging not implemented - audit_logs table missing from schema
		// const auditLogsQuery = `
		// 	query GetAuditLogs($first: Int!, $offset: Int!) {
		// 		allAuditLogs(first: $first, offset: $offset, orderBy: CREATED_AT_DESC) {
		// 			nodes {
		// 				id
		// 				userId
		// 				action
		// 				resourceType
		// 				resourceId
		// 				changes
		// 				ipAddress
		// 				userAgent
		// 				createdAt
		// 				userByUserId {
		// 					email
		// 					displayName
		// 				}
		// 			}
		// 			totalCount
		// 		}
		// 	}
		// `;

		// Audit logging functionality is not implemented yet
		// The audit_logs table doesn't exist in the current database schema

		// Audit logging table doesn't exist in current schema
		// Return empty data until audit_logs table is implemented
		let auditLogs = [];
		let totalCount = 0;

		console.log('[AUDIT LOGS] Audit logging not implemented - audit_logs table missing from schema');

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
			},
			message: 'Audit logging is not implemented yet. The audit_logs table needs to be added to the database schema.'
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
