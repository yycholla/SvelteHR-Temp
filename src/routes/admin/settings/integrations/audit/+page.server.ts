import { createUrqlClient, serializeCookies } from '$lib/graphql/client';
import type { PageServerLoad } from './$types';

const AUDIT_LOGS_QUERY = `
	query GetAuditLogs(
		$filters: AuditLogFiltersInput
		$limit: Int
		$offset: Int
	) {
		audit {
			auditLogs(filters: $filters, limit: $limit, offset: $offset) {
				total
				logs {
					id
					eventType
					eventCategory
					entityType
					entityId
					userId
					userEmail
					action
					description
					oldValues
					newValues
					changesSummary
					ipAddress
					syncDirection
					syncJobId
					source
					status
					errorMessage
					createdAt
				}
			}
		}
	}
`;

export const load: PageServerLoad = async ({ fetch, cookies, depends, url }) => {
	depends('app:audit-trail');

	// Get filter parameters from URL
	const eventCategory = url.searchParams.get('category');
	const entityType = url.searchParams.get('entityType');
	const page = parseInt(url.searchParams.get('page') || '1');
	const limit = 20;
	const offset = (page - 1) * limit;

	const client = createUrqlClient(fetch, undefined, undefined, serializeCookies(cookies));

	// Build filters object
	const filters: any = {};
	if (eventCategory) filters.event_category = eventCategory;
	if (entityType) filters.entity_type = entityType;

	try {
		const result = await client
			.query(AUDIT_LOGS_QUERY, {
				filters: Object.keys(filters).length > 0 ? filters : null,
				limit,
				offset
			})
			.toPromise();

		if (result.error) {
			console.error('Failed to fetch audit logs:', result.error);
			return {
				logs: [],
				total: 0,
				page,
				limit,
				error: 'Failed to load audit logs'
			};
		}

		const auditResult = result.data?.audit?.auditLogs;

		return {
			logs: auditResult?.logs || [],
			total: auditResult?.total || 0,
			page,
			limit,
			filters: { eventCategory, entityType }
		};
	} catch (error) {
		console.error('Error loading audit logs:', error);
		return {
			logs: [],
			total: 0,
			page,
			limit,
			error: 'Failed to load audit logs'
		};
	}
};
