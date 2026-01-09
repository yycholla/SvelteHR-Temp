import { createUrqlClient, serializeCookies } from '$lib/graphql/client';
import type { PageServerLoad } from './$types';

const ROLLBACK_REQUESTS_QUERY = `
	query GetRollbackRequests($status: RollbackStatus, $limit: Int) {
		rollbackRequests(status: $status, limit: $limit) {
			id
			entityType
			entityId
			requestedBy
			reason
			status
			approvedBy
			processedAt
			createdAt
		}
	}
`;

export const load: PageServerLoad = async ({ fetch, cookies, depends, url }) => {
	depends('app:rollback-requests');

	const status = url.searchParams.get('status');
	const limit = parseInt(url.searchParams.get('limit') || '30');

	const client = createUrqlClient(fetch, undefined, undefined, serializeCookies(cookies));

	try {
		const result = await client
			.query(ROLLBACK_REQUESTS_QUERY, {
				status: status || null,
				limit
			})
			.toPromise();

		if (result.error) {
			console.error('Failed to fetch rollback requests:', result.error);
			return {
				requests: [],
				error: 'Failed to load rollback requests',
				statistics: null as any,
				selectedRequest: null as any
			};
		}

		return {
			requests: result.data?.rollbackRequests || [],
			filters: { status, limit },
			statistics: null as any,
			selectedRequest: null as any
		};
	} catch (error) {
		console.error('Error loading rollback requests:', error);
		return {
			requests: [],
			error: 'Failed to load rollback requests',
			statistics: null as any,
			selectedRequest: null as any
		};
	}
};
