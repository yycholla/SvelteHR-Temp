// src/routes/dashboard/audit-log/+page.server.ts
import type { PageServerLoad } from './$types';
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';
import { GET_INITIAL_AUDIT_LOGS } from './_components/ActivityFeed/activityFeed.graphql';

export const load: PageServerLoad = async ({ fetch, cookies, locals }) => {
	const client = createUrqlClient(fetch, undefined, undefined, serializeCookies(cookies));

	const result = await client
		.query(GET_INITIAL_AUDIT_LOGS, {
			limit: 50
		})
		.toPromise();

	return {
		initialLogs: result.data?.auditLogs ?? [],
		user: locals.user
	};
};
