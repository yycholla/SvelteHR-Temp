// src/routes/dashboard/audit-log/+page.server.ts
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, cookies, locals }) => {
	// TODO: Add GET_INITIAL_AUDIT_LOGS query in Task 4
	return {
		initialLogs: [],
		user: locals.user
	};
};
