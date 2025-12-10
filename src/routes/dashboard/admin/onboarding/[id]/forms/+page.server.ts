import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { urqlClient } from '$lib/api/urql-client';
import { GET_ONBOARDING_MODULE_QUERY } from '$lib/graphql/onboarding-operations';
import {
	CREATE_ONBOARDING_FORM,
	DELETE_ONBOARDING_FORM,
	GET_FORMS_BY_MODULE,
	REORDER_ONBOARDING_FORMS,
	UPDATE_ONBOARDING_FORM
} from '$lib/graphql/form-operations';

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

export const load: PageServerLoad = async ({ params, locals }) => {
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

	// Fetch the module and its forms
	const [moduleResult, formsResult] = await Promise.all([
		urqlClient.query(GET_ONBOARDING_MODULE_QUERY, { id: moduleId }),
		urqlClient.query(GET_FORMS_BY_MODULE, { onboardingModuleId: moduleId })
	]);

	if (moduleResult.error) {
		console.error('Error fetching module:', moduleResult.error);
		throw error(500, 'Failed to load onboarding module');
	}

	if (!moduleResult.data?.onboardingModule) {
		throw error(404, 'Onboarding module not found');
	}

	if (formsResult.error) {
		console.error('Error fetching forms:', formsResult.error);
		throw error(500, 'Failed to load forms');
	}

	return {
		module: moduleResult.data.onboardingModule as OnboardingModule,
		forms: formsResult.data?.onboardingFormsByModule || [],
		user
	};
};

export const actions: Actions = {
	// Create a new form
	createForm: async ({ request, params, locals }) => {
		const { user } = locals;
		if (!user) {
			throw error(401, 'Unauthorized');
		}

		const formData = await request.formData();
		const title = formData.get('title') as string;
		const description = formData.get('description') as string | null;
		const isRequired = formData.get('isRequired') === 'true';

		// Get current forms count to set sequence order
		const formsResult = await urqlClient.query(GET_FORMS_BY_MODULE, {
			onboardingModuleId: params.id
		});
		const sequenceOrder = formsResult.data?.onboardingFormsByModule?.length || 0;

		const input = {
			onboardingModuleId: params.id,
			title,
			description,
			sequenceOrder,
			isRequired
		};

		const result = await urqlClient.mutation(CREATE_ONBOARDING_FORM, { input });

		if (result.error) {
			console.error('Error creating form:', result.error);
			return { success: false, error: 'Failed to create form' };
		}

		return {
			success: true,
			form: result.data.createOnboardingForm,
			formId: result.data.createOnboardingForm.id
		};
	},

	// Update a form
	updateForm: async ({ request, locals }) => {
		const { user } = locals;
		if (!user) {
			throw error(401, 'Unauthorized');
		}

		const formData = await request.formData();
		const id = formData.get('id') as string;
		const input: any = {};

		if (formData.has('title')) input.title = formData.get('title');
		if (formData.has('description')) input.description = formData.get('description');
		if (formData.has('isRequired')) input.isRequired = formData.get('isRequired') === 'true';

		const result = await urqlClient.mutation(UPDATE_ONBOARDING_FORM, { id, input });

		if (result.error) {
			console.error('Error updating form:', result.error);
			return { success: false, error: 'Failed to update form' };
		}

		return { success: true, form: result.data.updateOnboardingForm };
	},

	// Delete a form
	deleteForm: async ({ request, locals }) => {
		const { user } = locals;
		if (!user) {
			throw error(401, 'Unauthorized');
		}

		const formData = await request.formData();
		const id = formData.get('id') as string;

		const result = await urqlClient.mutation(DELETE_ONBOARDING_FORM, { id });

		if (result.error) {
			console.error('Error deleting form:', result.error);
			return { success: false, error: 'Failed to delete form' };
		}

		return { success: true };
	},

	// Reorder forms
	reorderForms: async ({ request, params, locals }) => {
		const { user } = locals;
		if (!user) {
			throw error(401, 'Unauthorized');
		}

		const formData = await request.formData();
		const formIds = JSON.parse(formData.get('formIds') as string);

		const result = await urqlClient.mutation(REORDER_ONBOARDING_FORMS, {
			onboardingModuleId: params.id,
			formIds
		});

		if (result.error) {
			console.error('Error reordering forms:', result.error);
			return { success: false, error: 'Failed to reorder forms' };
		}

		return { success: true };
	}
};
