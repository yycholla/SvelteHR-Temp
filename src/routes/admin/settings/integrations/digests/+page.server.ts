import type { PageServerLoad } from './$types';
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';
import { EMAIL_DIGESTS_QUERY } from '$lib/graphql/digest-operations';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ fetch, cookies }) => {
	const client = createUrqlClient(fetch, undefined, undefined, serializeCookies(cookies));

	// Fetch all email digests
	const digestsResult = await client.query(EMAIL_DIGESTS_QUERY, {}).toPromise();

	if (digestsResult.error) {
		console.error('Failed to fetch email digests:', digestsResult.error);
		throw error(500, 'Failed to load email digests');
	}

	return {
		digests: digestsResult.data?.emailDigests || []
	};
};
