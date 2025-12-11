import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { GraphQLClient } from '$lib/server/graphql-client';
import { requireAuth } from '$lib/server/rbac-utils';
import {
	CREATE_CONTENT_MUTATION,
	DELETE_CONTENT_MUTATION,
	UPDATE_CONTENT_MUTATION
} from '$lib/graphql/training-operations';
import { logger } from '$lib/utils/logger';

export const load: PageServerLoad = async (event) => {
	requireAuth(event, { requiredRoles: ['Admin', 'HR Manager'] });

	const { id } = event.params;
	const client = GraphQLClient.fromCookies(event.cookies);

	const query = `
        query GetTrainingContents($id: UUID!) {
            trainingContents(trainingId: $id) {
                id
                title
                type
                data
                sequenceOrder
            }
            training(id: $id) {
                id
                title
            }
        }
    `;

	try {
		const response = await client.query(query, { id });

		if (response.errors) {
			logger.error('GraphQL errors loading training content:', undefined, { errors: response.errors });
			throw error(500, {
				message: `Failed to load training: ${response.errors[0]?.message || 'Unknown error'}`
			});
		}

		return {
			contents: response.data?.trainingContents || [],
			training: response.data?.training
		};
	} catch (err) {
		// Re-throw SvelteKit errors (they have proper HTTP status handling)
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		logger.error('Error loading training content page:', err as Error);
		throw error(500, {
			message: 'Failed to load training content'
		});
	}
};

export const actions: Actions = {
	create: async ({ request, cookies, params }) => {
		const data = await request.formData();
		const trainingId = params.id;
		const title = data.get('title')?.toString();
		const type = data.get('type')?.toString();
		const contentData = data.get('data')?.toString();
		const sequenceOrder = parseInt(data.get('sequenceOrder')?.toString() || '0');

		if (!title || !type || !contentData) {
			return fail(400, { error: 'Missing required fields' });
		}

		const client = GraphQLClient.fromCookies(cookies);

		const variables = {
			input: {
				trainingId,
				title,
				type,
				data: contentData,
				sequenceOrder
			}
		};

		try {
			const response = await client.mutation(CREATE_CONTENT_MUTATION, variables);
			if (response.errors) {
				return fail(500, { error: 'Failed to create content' });
			}
		} catch (err) {
			return fail(500, { error: 'Internal server error' });
		}

		return { success: true };
	},

	update: async ({ request, cookies }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();
		const title = data.get('title')?.toString();
		const type = data.get('type')?.toString();
		const contentData = data.get('data')?.toString();

		if (!id || !title || !type || !contentData) {
			return fail(400, { error: 'Missing required fields' });
		}

		const client = GraphQLClient.fromCookies(cookies);

		const variables = {
			id,
			input: {
				title,
				type,
				data: contentData
			}
		};

		try {
			const response = await client.mutation(UPDATE_CONTENT_MUTATION, variables);
			if (response.errors) {
				return fail(500, { error: 'Failed to update content' });
			}
		} catch (err) {
			return fail(500, { error: 'Internal server error' });
		}

		return { success: true };
	},

	delete: async ({ request, cookies }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();

		if (!id) return fail(400, { error: 'Missing ID' });

		const client = GraphQLClient.fromCookies(cookies);

		try {
			await client.mutation(DELETE_CONTENT_MUTATION, { id });
		} catch (err) {
			return fail(500, { error: 'Failed to delete content' });
		}

		return { success: true };
	}
};
