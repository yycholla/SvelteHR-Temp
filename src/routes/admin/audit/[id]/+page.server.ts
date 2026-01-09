import type { PageServerLoad } from './$types';
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';
import { PermissionChecks } from '$lib/server/rbac-utils';
import { error } from '@sveltejs/kit';
import { logger } from '$lib/utils/logger';

export const load: PageServerLoad = async (event) => {
	const { locals, params, cookies } = event;
	const { id } = params;

	// Check authentication and permissions
	PermissionChecks.adminRead(event);

	try {
		const cookieHeader = serializeCookies(cookies);
		const client = createUrqlClient(undefined, undefined, undefined, cookieHeader);

		const query = `
            query GetActivityLog($id: UUID!) {
                activityLog(id: $id) {
                    id
                    userId
                    action
                    resourceType
                    resourceId
                    details
                    beforeSnapshot
                    afterSnapshot
                    ipAddress
                    userAgent
                    createdAt
                    isRollback
                    rolledBackLogId
                    user {
                        id
                        email
                        displayName
                    }
                }
            }
        `;

		const response = await client.query(query, { id }).toPromise();

		if (response.error) {
			logger.error('[AUDIT LOG DETAIL] GraphQL Error:', response.error);
			throw error(500, 'Failed to load audit log details');
		}

		if (!response.data?.activityLog) {
			throw error(404, 'Audit log not found');
		}

		return {
			activityLog: response.data.activityLog
		};
	} catch (err: any) {
		logger.error('[AUDIT LOG DETAIL] Load error:', err as Error);
		if (err.status) throw err;
		throw error(500, 'Failed to load audit log details');
	}
};
