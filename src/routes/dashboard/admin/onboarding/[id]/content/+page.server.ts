import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { GraphQLClient } from '$lib/server/graphql-client';
import { requireAuth } from '$lib/server/rbac-utils';
import {
	CREATE_CONTENT_BLOCK_MUTATION,
	DELETE_CONTENT_BLOCK_MUTATION,
	UPDATE_CONTENT_BLOCK_MUTATION
} from '$lib/graphql/onboarding-operations';

export const load: PageServerLoad = async (event) => {
	console.log('[ONBOARDING CONTENT EDITOR SERVER] Load function called', {
		moduleId: event.params.id,
		url: event.url.href,
		pathname: event.url.pathname,
		timestamp: new Date().toISOString()
	});

	requireAuth(event, { requiredRoles: ['Admin', 'HR Manager'] });

	const { id } = event.params;
	const client = GraphQLClient.fromCookies(event.cookies);

	const query = `
		query GetOnboardingContentBlocks($id: UUID!) {
			onboardingContentBlocks(onboardingModuleId: $id) {
				id
				onboardingModuleId
				title
				type
				sequenceOrder
				isRequired
				textContent
				documentUrl
				formTemplateId
				fileUploadRequirements
				signatureRequirements
			}
			onboardingModule(id: $id) {
				id
				title
			}
			formTemplates {
				id
				name
				description
				category
				version
				isActive
			}
		}
	`;

	try {
		const response = await client.query(query, { id });

		if (response.errors) {
			console.error('GraphQL errors loading onboarding content:', response.errors);
			throw error(500, {
				message: `Failed to load onboarding module: ${response.errors[0]?.message || 'Unknown error'}`
			});
		}

		if (!response.data?.onboardingModule) {
			throw error(404, { message: 'Onboarding module not found' });
		}

		return {
			contents: response.data?.onboardingContentBlocks || [],
			module: response.data.onboardingModule,
			formTemplates: response.data?.formTemplates || []
		};
	} catch (err) {
		// Re-throw SvelteKit errors (they have proper HTTP status handling)
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('Error loading onboarding content page:', err);
		throw error(500, {
			message: 'Failed to load onboarding content'
		});
	}
};

export const actions: Actions = {
	create: async ({ request, cookies, params }) => {
		const data = await request.formData();
		const onboardingModuleId = params.id;
		const title = data.get('title')?.toString();
		const contentType = data.get('contentType')?.toString();
		const sequenceOrder = parseInt(data.get('sequenceOrder')?.toString() || '0');
		const isRequired = data.get('isRequired') === 'true';
		const formTemplateId = data.get('formTemplateId')?.toString();

		if (!title || !contentType) {
			return fail(400, { error: 'Missing required fields' });
		}

		const client = GraphQLClient.fromCookies(cookies);

		const variables = {
			input: {
				onboardingModuleId,
				title,
				type: contentType,
				sequenceOrder,
				isRequired,
				...(formTemplateId && { formTemplateId })
			}
		};

		try {
			const response = await client.mutation(CREATE_CONTENT_BLOCK_MUTATION, variables);
			if (response.errors) {
				return fail(500, { error: 'Failed to create content block' });
			}

			const createdBlock = response.data?.onboarding?.createContentBlock;
			return { success: true, block: createdBlock };
		} catch (err) {
			return fail(500, { error: 'Internal server error' });
		}
	},

	update: async ({ request, cookies }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();
		const title = data.get('title')?.toString();

		if (!id || !title) {
			return fail(400, { error: 'Missing required fields' });
		}

		const client = GraphQLClient.fromCookies(cookies);

		const variables = {
			id,
			input: {
				title
			}
		};

		try {
			const response = await client.mutation(UPDATE_CONTENT_BLOCK_MUTATION, variables);
			if (response.errors) {
				return fail(500, { error: 'Failed to update content block' });
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
			await client.mutation(DELETE_CONTENT_BLOCK_MUTATION, { id });
		} catch (err) {
			return fail(500, { error: 'Failed to delete content block' });
		}

		return { success: true };
	}
};
