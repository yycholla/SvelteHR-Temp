// Audit log page server-side loader (Feature 024)
// Fixed: Replaced direct SQL queries with GraphQL activityLogs query

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireAuth, AccessTier } from '$lib/server/rbac-utils';
import { GraphQLClient } from '$lib/server/graphql-client';
import { logger } from '$lib/utils/logger';

export const load: PageServerLoad = async (event) => {
	const { url, cookies } = event;

	requireAuth(event, { minTier: AccessTier.ALL });

	const { locals } = event;

	const userPermissions = locals.permissions || [];
	const userRoles = locals.roles || [];

	logger.info('[DOCUMENT AUDIT ACCESS GRANTED]', {
		userId: locals.user.id,
		userEmail: locals.user.email,
		timestamp: new Date().toISOString()
	});

	const isSystemAdmin =
		userRoles.includes('system_admin') ||
		userPermissions.includes('*') ||
		userPermissions.includes('*:*');

	try {
		const page = parseInt(url.searchParams.get('page') || '1');
		const limit = parseInt(url.searchParams.get('limit') || '50');
		const documentId = url.searchParams.get('documentId') || null;
		const filterUserId = url.searchParams.get('userId') || null;
		const accessType = url.searchParams.get('accessType') || null;
		const dateFrom = url.searchParams.get('dateFrom') || null;
		const dateTo = url.searchParams.get('dateTo') || null;

		const client = GraphQLClient.fromCookies(cookies);

		const activityLogsQuery = `
			query GetActivityLogs {
				activityLogs {
					id
					userId
					action
					resourceType
					resourceId
					details
					createdAt
				}
			}
		`;

		const response = await client.query(activityLogsQuery, {});

		if (response.errors && response.errors.length > 0) {
			logger.warn('[Admin Audit] GraphQL errors fetching activity logs', {
				errors: response.errors.map((e: any) => e.message)
			});
		}

		const rawLogs = response.data?.activityLogs || [];

		let filteredLogs = rawLogs;

		if (documentId) {
			filteredLogs = filteredLogs.filter((log: any) => log.resourceId === documentId);
		}
		if (filterUserId) {
			filteredLogs = filteredLogs.filter((log: any) => log.userId === filterUserId);
		}
		if (accessType) {
			filteredLogs = filteredLogs.filter((log: any) => log.action === accessType);
		}
		if (dateFrom) {
			const fromDate = new Date(dateFrom);
			filteredLogs = filteredLogs.filter(
				(log: any) => new Date(log.createdAt) >= fromDate
			);
		}
		if (dateTo) {
			const endDate = new Date(dateTo);
			endDate.setHours(23, 59, 59, 999);
			filteredLogs = filteredLogs.filter(
				(log: any) => new Date(log.createdAt) <= endDate
			);
		}

		const totalCount = filteredLogs.length;

		const offset = (page - 1) * limit;
		const paginatedLogs = filteredLogs.slice(offset, offset + limit);

		const accessLogs = paginatedLogs.map((log: any) => ({
			id: log.id,
			document_id: log.resourceId || null,
			user_id: log.userId,
			access_type: log.action,
			accessed_at: log.createdAt,
			ip_address: null,
			user_email: null,
			first_name: null,
			last_name: null,
			document_title: null,
			document_type: null
		}));

		return {
			accessLogs,
			totalCount,
			page,
			limit,
			filters: {
				documentId,
				userId: filterUserId,
				accessType,
				dateFrom,
				dateTo
			},
			user: locals.user,
			userPermissions,
			userRoles,
			isSystemAdmin
		};
	} catch (err) {
		logger.error('Audit log load error:', err as Error);

		if (err && typeof err === 'object' && ('status' in err || 'location' in err)) {
			throw err;
		}

		error(500, {
			message: 'Failed to load audit logs. Please try again later.'
		});
	}
};
