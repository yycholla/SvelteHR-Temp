import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createGraphQLClient } from '$lib/server/graphql/unified-client';
import { GET_ONBOARDING_MODULE_QUERY } from '$lib/graphql/onboarding-operations';
import {
	CREATE_ONBOARDING_FORM,
	DELETE_ONBOARDING_FORM,
	GET_FORMS_BY_MODULE,
	REORDER_ONBOARDING_FORMS,
	UPDATE_ONBOARDING_FORM,
	type OnboardingForm
} from '$lib/graphql/form-operations';
import { logger } from '$lib/utils/logger';

interface OnboardingModule {
	id: string;
	title: string;
	description: string;
	isActive: boolean;
	category: string;
	tags: string[];
	authorId: string;
	createdAt: string;
	updatedAt: string;
}

export const load: PageServerLoad = async (event) => {
	const { params, locals } = event;
	const { user } = locals;

	if (!user) {
		throw redirect(303, '/login');
	}

	// Check admin permissions
	const isAdmin = user.role === 'Admin';
	if (!isAdmin) {
		throw error(403, 'Access denied. Admin permissions required.');
	}

	const moduleId = params.id;
	const graphqlClient = createGraphQLClient(event);

	try {
		// Fetch the module and its forms
		const [moduleResult, formsResult] = await Promise.all([
			graphqlClient.query<{ onboardingModule?: OnboardingModule | null }>(
				GET_ONBOARDING_MODULE_QUERY,
				{ id: moduleId }
			),
			graphqlClient.query<{ onboardingFormsByModule?: OnboardingForm[] }>(GET_FORMS_BY_MODULE, {
				onboardingModuleId: moduleId
			})
		]);

		if (!moduleResult?.onboardingModule) {
			throw error(404, 'Onboarding module not found');
		}

		return {
			module: moduleResult.onboardingModule,
			forms: formsResult?.onboardingFormsByModule || [],
			user
		};
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		logger.error('Error loading onboarding forms', err as Error);
		throw error(500, 'Failed to load onboarding forms');
	}
};

export const actions: Actions = {
	// Create a new form
	createForm: async (event) => {
		const { request, params, locals } = event;
		const { user } = locals;
		if (!user) {
			throw error(401, 'Unauthorized');
		}

		const formData = await request.formData();
		const title = formData.get('title') as string;
		const description = formData.get('description') as string | null;
		const isRequired = formData.get('isRequired') === 'true';

		try {
			const graphqlClient = createGraphQLClient(event);

			// Get current forms count to set sequence order
			const formsResult = await graphqlClient.query<{ onboardingFormsByModule?: unknown[] }>(
				GET_FORMS_BY_MODULE,
				{
					onboardingModuleId: params.id
				}
			);
			const sequenceOrder = formsResult?.onboardingFormsByModule?.length || 0;

			const input = {
				onboardingModuleId: params.id,
				title,
				description,
				sequenceOrder,
				isRequired
			};

			const result = await graphqlClient.mutate<{
				createOnboardingForm: { id: string };
			}>(CREATE_ONBOARDING_FORM, { input });

			return {
				success: true,
				form: result.createOnboardingForm,
				formId: result.createOnboardingForm.id
			};
		} catch (err) {
			logger.error('Error creating form', err as Error);
			return { success: false, error: 'Failed to create form' };
		}
	},

	// Update a form
	updateForm: async (event) => {
		const { request, locals } = event;
		const { user } = locals;
		if (!user) {
			throw error(401, 'Unauthorized');
		}

		const formData = await request.formData();
		const id = formData.get('id') as string;
		const input: Record<string, unknown> = {};

		if (formData.has('title')) input.title = formData.get('title');
		if (formData.has('description')) input.description = formData.get('description');
		if (formData.has('isRequired')) input.isRequired = formData.get('isRequired') === 'true';

		try {
			const graphqlClient = createGraphQLClient(event);
			const result = await graphqlClient.mutate<{ updateOnboardingForm: unknown }>(
				UPDATE_ONBOARDING_FORM,
				{ id, input }
			);
			return { success: true, form: result.updateOnboardingForm };
		} catch (err) {
			logger.error('Error updating form', err as Error);
			return { success: false, error: 'Failed to update form' };
		}
	},

	// Delete a form
	deleteForm: async (event) => {
		const { request, locals } = event;
		const { user } = locals;
		if (!user) {
			throw error(401, 'Unauthorized');
		}

		const formData = await request.formData();
		const id = formData.get('id') as string;

		try {
			const graphqlClient = createGraphQLClient(event);
			await graphqlClient.mutate(DELETE_ONBOARDING_FORM, { id });
		} catch (err) {
			logger.error('Error deleting form', err as Error);
			return { success: false, error: 'Failed to delete form' };
		}

		return { success: true };
	},

	// Reorder forms
	reorderForms: async (event) => {
		const { request, params, locals } = event;
		const { user } = locals;
		if (!user) {
			throw error(401, 'Unauthorized');
		}

		const formData = await request.formData();
		const formIds = JSON.parse(formData.get('formIds') as string);

		try {
			const graphqlClient = createGraphQLClient(event);
			await graphqlClient.mutate(REORDER_ONBOARDING_FORMS, {
				onboardingModuleId: params.id,
				formIds
			});
		} catch (err) {
			logger.error('Error reordering forms', err as Error);
			return { success: false, error: 'Failed to reorder forms' };
		}

		return { success: true };
	}
};
