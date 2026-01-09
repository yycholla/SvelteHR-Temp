import type { PageServerLoad } from './$types';
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';
import { GET_FIELD_MAPPINGS } from '$lib/graphql/operations/field-mapping';

export const load: PageServerLoad = async ({ fetch, cookies, url }) => {
	const client = createUrqlClient(fetch, undefined, undefined, serializeCookies(cookies));
	const entityType = url.searchParams.get('entityType') || undefined;

	try {
		const result = await client
			.query(GET_FIELD_MAPPINGS, { entityType })
			.toPromise();

		if (result.error) {
			console.error('Error fetching field mappings:', result.error);
			return {
				mappings: [],
				total: 0,
				error: 'Failed to load field mappings'
			};
		}

		const data = result.data?.field_mapping?.get_field_mappings;

		return {
			mappings: data?.mappings || [],
			total: data?.total || 0
		};
	} catch (e) {
		console.error('Exception loading field mappings:', e);
		return {
			mappings: [],
			total: 0,
			error: 'An error occurred while loading field mappings'
		};
	}
};
