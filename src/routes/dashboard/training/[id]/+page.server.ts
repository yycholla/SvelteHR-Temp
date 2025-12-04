import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { GraphQLClient } from '$lib/server/graphql-client';
import { requireAuth } from '$lib/server/rbac-utils';
import {
	GET_TRAINING_DETAILS_QUERY,
	UPDATE_PROGRESS_MUTATION
} from '$lib/graphql/training-operations';

export const load: PageServerLoad = async (event) => {
	requireAuth(event, {});

	const { id } = event.params;
	const client = GraphQLClient.fromCookies(event.cookies);

	const response = await client.query(GET_TRAINING_DETAILS_QUERY, { id });

	if (!response.data?.training) {
		// Handle not found
	}

	return {
		training: response.data?.training,
		contents: response.data?.trainingContents || [],
		progress: response.data?.myTrainingProgress || []
	};
};

export const actions: Actions = {
	completeContent: async ({ request, cookies }) => {
		const data = await request.formData();
		const contentId = data.get('contentId')?.toString();

		if (!contentId) return fail(400, { error: 'Missing content ID' });

		const client = GraphQLClient.fromCookies(cookies);

		const variables = {
			contentId,
			input: {
				status: 'COMPLETED'
			}
		};

		try {
			const response = await client.mutation(UPDATE_PROGRESS_MUTATION, variables);
			if (response.errors) {
				return fail(500, { error: 'Failed to update progress' });
			}
		} catch (err) {
			return fail(500, { error: 'Internal server error' });
		}

		return { success: true };
	}
};
