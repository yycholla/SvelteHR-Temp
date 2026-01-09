import type { PageServerLoad } from './$types';
import { GraphQLClient } from '$lib/server/graphql-client';
import { requireAuth } from '$lib/server/rbac-utils';
import { GET_MY_TRAININGS_QUERY } from '$lib/graphql/training-operations';

export const load: PageServerLoad = async (event) => {
	requireAuth(event, {}); // Any authenticated user

	const client = GraphQLClient.fromCookies(event.cookies);

	const response = await client.query(GET_MY_TRAININGS_QUERY);

	return {
		trainings: response.data?.myTrainings || []
	};
};
