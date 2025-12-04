import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { GraphQLClient } from '$lib/server/graphql-client';
import { requireAuth } from '$lib/server/rbac-utils';
import { CREATE_ONBOARDING_MODULE_MUTATION } from '$lib/graphql/onboarding-operations';

export const load: PageServerLoad = async (event) => {
	requireAuth(event, { requiredRoles: ['Admin', 'HR Manager'] });
	return {
		meta: {
			title: 'Create Onboarding Module'
		}
	};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const formData = await request.formData();
		const title = formData.get('title')?.toString().trim();
		const description = formData.get('description')?.toString().trim();
		const category = formData.get('category')?.toString().trim();
		const isActive = formData.get('isActive') === 'on';
		const tagsJson = formData.get('tags')?.toString();

		let tags: string[] = [];
		try {
			if (tagsJson) {
				tags = JSON.parse(tagsJson);
			}
		} catch (e) {
			console.error('Failed to parse tags:', e);
		}

		if (!title) {
			return fail(400, {
				error: 'Title is required',
				values: { title, description, category, isActive }
			});
		}

		const client = GraphQLClient.fromCookies(cookies);

		const variables = {
			input: {
				title,
				description: description || null,
				category: category || null,
				isActive,
				tags: tags.length > 0 ? tags : null
			}
		};

		try {
			const response = await client.mutation(CREATE_ONBOARDING_MODULE_MUTATION, variables);

			if (response.errors) {
				console.error('Onboarding module creation errors:', response.errors);
				return fail(500, {
					error: response.errors[0].message,
					values: { title, description, category, isActive }
				});
			}

			const newModuleId = response.data?.onboarding?.createOnboardingModule?.id;

			if (newModuleId) {
				// Redirect to the content builder for this new module
				throw redirect(303, `/dashboard/admin/onboarding/${newModuleId}/content`);
			}
		} catch (err) {
			// Re-throw redirects (these are successful responses, not errors)
			if (err && typeof err === 'object' && 'status' in err) {
				throw err;
			}

			console.error('Onboarding module creation error:', err);
			return fail(500, {
				error: 'Internal server error',
				values: { title, description, category, isActive }
			});
		}

		throw redirect(303, '/dashboard/admin/onboarding');
	}
};
