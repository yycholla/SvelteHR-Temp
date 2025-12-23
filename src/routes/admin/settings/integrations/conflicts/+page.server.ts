import { createUrqlClient, serializeCookies } from '$lib/graphql/client';
import type { PageServerLoad } from './$types';

const GET_CONFLICTS = `
	query GetConflicts {
		intuit {
			conflicts {
				entityType
				entityId
				quickbooksId
				description
				employeeName
				employeeEmail
				localModifiedAt
				remoteModifiedAt
				lastSyncedAt
			}
		}
	}
`;

export const load: PageServerLoad = async ({ fetch, cookies }) => {
	const client = createUrqlClient(fetch, undefined, undefined, serializeCookies(cookies));

	const result = await client.query(GET_CONFLICTS, {}).toPromise();

	if (result.error) {
		console.error('GraphQL error:', result.error);
		return {
			conflicts: []
		};
	}

	return {
		conflicts: result.data?.intuit?.conflicts ?? []
	};
};
