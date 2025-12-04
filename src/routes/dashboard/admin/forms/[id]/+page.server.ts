import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { urqlClient } from '$lib/api/urql-client';
import {
	GET_ONBOARDING_FORM,
	GET_FORM_BLOCKS,
	CREATE_FORM_BLOCK,
	UPDATE_FORM_BLOCK,
	DELETE_FORM_BLOCK,
	REORDER_FORM_BLOCKS,
	UPDATE_ONBOARDING_FORM,
	type OnboardingForm,
	type OnboardingFormBlock
} from '$lib/graphql/form-operations';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { user } = locals;

	if (!user) {
		throw redirect(303, '/login');
	}

	// Check admin permissions
	const isAdmin = user.roles?.some((role: any) => role.name === 'Admin');
	if (!isAdmin) {
		throw error(403, 'Access denied. Admin permissions required.');
	}

	const formId = params.id;

	// Fetch the form with its blocks
	const result = await urqlClient.query(GET_ONBOARDING_FORM, { id: formId });

	if (result.error) {
		console.error('Error fetching form:', result.error);
		throw error(500, 'Failed to load form');
	}

	if (!result.data?.onboardingForm) {
		throw error(404, 'Form not found');
	}

	const form: OnboardingForm = result.data.onboardingForm;

	return {
		form,
		user
	};
};

export const actions: Actions = {
	// Create a new block
	createBlock: async ({ request, locals }) => {
		const { user } = locals;
		if (!user) {
			throw error(401, 'Unauthorized');
		}

		const formData = await request.formData();
		const input = {
			onboardingFormId: formData.get('onboardingFormId') as string,
			type: formData.get('type') as any,
			title: formData.get('title') as string | null,
			sequenceOrder: parseInt(formData.get('sequenceOrder') as string),
			textContent: formData.get('textContent') as string | null,
			documentUrl: formData.get('documentUrl') as string | null,
			formTemplateId: formData.get('formTemplateId') as string | null,
			fileUploadRequirements: formData.get('fileUploadRequirements')
				? JSON.parse(formData.get('fileUploadRequirements') as string)
				: null,
			signatureRequirements: formData.get('signatureRequirements')
				? JSON.parse(formData.get('signatureRequirements') as string)
				: null,
			checkboxItems: formData.get('checkboxItems')
				? JSON.parse(formData.get('checkboxItems') as string)
				: null
		};

		const result = await urqlClient.mutation(CREATE_FORM_BLOCK, { input });

		if (result.error) {
			console.error('Error creating block:', result.error);
			throw error(500, 'Failed to create block');
		}

		return { success: true, block: result.data.createFormBlock };
	},

	// Update a block
	updateBlock: async ({ request, locals }) => {
		const { user } = locals;
		if (!user) {
			throw error(401, 'Unauthorized');
		}

		const formData = await request.formData();
		const id = formData.get('id') as string;
		const input: any = {};

		if (formData.has('title')) input.title = formData.get('title');
		if (formData.has('sequenceOrder'))
			input.sequenceOrder = parseInt(formData.get('sequenceOrder') as string);
		if (formData.has('textContent')) input.textContent = formData.get('textContent');
		if (formData.has('documentUrl')) input.documentUrl = formData.get('documentUrl');
		if (formData.has('formTemplateId')) input.formTemplateId = formData.get('formTemplateId');
		if (formData.has('fileUploadRequirements'))
			input.fileUploadRequirements = JSON.parse(
				formData.get('fileUploadRequirements') as string
			);
		if (formData.has('signatureRequirements'))
			input.signatureRequirements = JSON.parse(formData.get('signatureRequirements') as string);
		if (formData.has('checkboxItems'))
			input.checkboxItems = JSON.parse(formData.get('checkboxItems') as string);

		const result = await urqlClient.mutation(UPDATE_FORM_BLOCK, { id, input });

		if (result.error) {
			console.error('Error updating block:', result.error);
			throw error(500, 'Failed to update block');
		}

		return { success: true, block: result.data.updateFormBlock };
	},

	// Delete a block
	deleteBlock: async ({ request, locals }) => {
		const { user } = locals;
		if (!user) {
			throw error(401, 'Unauthorized');
		}

		const formData = await request.formData();
		const id = formData.get('id') as string;

		const result = await urqlClient.mutation(DELETE_FORM_BLOCK, { id });

		if (result.error) {
			console.error('Error deleting block:', result.error);
			throw error(500, 'Failed to delete block');
		}

		return { success: true };
	},

	// Reorder blocks
	reorderBlocks: async ({ request, locals }) => {
		const { user } = locals;
		if (!user) {
			throw error(401, 'Unauthorized');
		}

		const formData = await request.formData();
		const onboardingFormId = formData.get('onboardingFormId') as string;
		const blockIds = JSON.parse(formData.get('blockIds') as string);

		const result = await urqlClient.mutation(REORDER_FORM_BLOCKS, {
			onboardingFormId,
			blockIds
		});

		if (result.error) {
			console.error('Error reordering blocks:', result.error);
			throw error(500, 'Failed to reorder blocks');
		}

		return { success: true };
	},

	// Update form metadata
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
		if (formData.has('isRequired'))
			input.isRequired = formData.get('isRequired') === 'true';

		const result = await urqlClient.mutation(UPDATE_ONBOARDING_FORM, { id, input });

		if (result.error) {
			console.error('Error updating form:', result.error);
			throw error(500, 'Failed to update form');
		}

		return { success: true, form: result.data.updateOnboardingForm };
	}
};
