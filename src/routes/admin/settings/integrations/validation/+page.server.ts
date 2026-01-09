import type { PageServerLoad } from './$types';
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';
import { GET_VALIDATION_ERRORS } from '$lib/graphql/validation/operations';

export const load: PageServerLoad = async ({ fetch, cookies }) => {
	// Create authenticated GraphQL client
	const client = createUrqlClient(fetch, undefined, undefined, serializeCookies(cookies));

	// Fetch unresolved validation errors for employees
	const result = await client
		.query(GET_VALIDATION_ERRORS, {
			entityType: 'Employee',
			includeResolved: false
		})
		.toPromise();

	if (result.error) {
		console.error('Failed to fetch validation errors:', result.error);
		return {
			validationErrors: []
		};
	}

	return {
		validationErrors: result.data?.validation?.validationFailures || []
	};
};
