import type { PageServerLoad } from './$types';
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';

export const load: PageServerLoad = async ({ fetch, cookies }) => {
	const client = createUrqlClient(fetch, undefined, undefined, serializeCookies(cookies));

	// Query to check Intuit connection status
	const query = `
		query GetIntuitConnection {
			intuit {
				connection {
					isConnected
					companyName
					lastSyncAt
					realmId
				}
			}
		}
	`;

	try {
		const result = await client.query(query, {}).toPromise();

		if (result.error) {
			console.error('Failed to fetch Intuit connection:', result.error);
			return {
				intuitConnected: false,
				intuitCompanyName: null,
				intuitLastSync: null,
				error: 'Failed to load integration status'
			};
		}

		const connection = result.data?.intuit?.connection;

		return {
			intuitConnected: connection?.isConnected || false,
			intuitCompanyName: connection?.companyName,
			intuitLastSync: connection?.lastSyncAt,
			intuitRealmId: connection?.realmId
		};
	} catch (error) {
		console.error('Error loading integrations page:', error);
		return {
			intuitConnected: false,
			intuitCompanyName: null,
			intuitLastSync: null,
			error: 'Failed to load integration status'
		};
	}
};
