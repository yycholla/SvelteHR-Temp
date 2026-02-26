import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createGraphQLClient } from '$lib/server/graphql/unified-client';
import {
	CREATE_FORM_BLOCK,
	DELETE_FORM_BLOCK,
	GET_ONBOARDING_FORM,
	type OnboardingForm,
	REORDER_FORM_BLOCKS,
	UPDATE_FORM_BLOCK,
	UPDATE_ONBOARDING_FORM
} from '$lib/graphql/form-operations';
import { logger } from '$lib/utils/logger';

export const load: PageServerLoad = async (event) => {
	const { params, locals } = event;
	const { user } = locals;

	if (!user) {
		throw redirect(303, '/login');
	}

	// Check admin permissions
	const isAdmin = user.role?.toLowerCase() === 'admin' || (user.roles || []).some((r: string) => ['admin', 'super_admin', 'hr_manager'].includes(r.toLowerCase()));
	if (!isAdmin) {
		throw error(403, 'Access denied. Admin permissions required.');
	}

	const formId = params.id;
	const graphqlClient = createGraphQLClient(event);

	try {
		const result = await graphqlClient.query<{ onboardingForm?: OnboardingForm | null }>(
			GET_ONBOARDING_FORM,
			{ id: formId }
		);

		if (!result?.onboardingForm) {
			throw error(404, 'Form not found');
		}

		const form: OnboardingForm = result.onboardingForm;

		return {
			form,
			user
		};
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		logger.error('Error fetching form', err as Error);
		throw error(500, 'Failed to load form');
	}
};

export const actions: Actions = {
	createBlock: async (event) => {
		const { request, locals } = event;
		const { user } = locals;
		if (!user) {
			throw error(401, 'Unauthorized');
		}

		const formData = await request.formData();
		const input = {
			onboardingFormId: formData.get('onboardingFormId') as string,
			type: formData.get('type') as string,
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

		try {
			const graphqlClient = createGraphQLClient(event);
			const result = await graphqlClient.mutate<{ createFormBlock: unknown }>(CREATE_FORM_BLOCK, { input });
			return { success: true, block: result.createFormBlock };
		} catch (err) {
			logger.error('Error creating block', err as Error);
			throw error(500, 'Failed to create block');
		}
	},

	updateBlock: async (event) => {
		const { request, locals } = event;
		const { user } = locals;
		if (!user) {
			throw error(401, 'Unauthorized');
		}

		const formData = await request.formData();
		const id = formData.get('id') as string;
		const input: Record<string, unknown> = {};

		if (formData.has('title')) input.title = formData.get('title');
		if (formData.has('sequenceOrder')) input.sequenceOrder = parseInt(formData.get('sequenceOrder') as string);
		if (formData.has('textContent')) input.textContent = formData.get('textContent');
		if (formData.has('documentUrl')) input.documentUrl = formData.get('documentUrl');
		if (formData.has('formTemplateId')) input.formTemplateId = formData.get('formTemplateId');
		if (formData.has('fileUploadRequirements')) input.fileUploadRequirements = JSON.parse(formData.get('fileUploadRequirements') as string);
		if (formData.has('signatureRequirements')) input.signatureRequirements = JSON.parse(formData.get('signatureRequirements') as string);
		if (formData.has('checkboxItems')) input.checkboxItems = JSON.parse(formData.get('checkboxItems') as string);

		try {
			const graphqlClient = createGraphQLClient(event);
			const result = await graphqlClient.mutate<{ updateFormBlock: unknown }>(UPDATE_FORM_BLOCK, { id, input });
			return { success: true, block: result.updateFormBlock };
		} catch (err) {
			logger.error('Error updating block', err as Error);
			throw error(500, 'Failed to update block');
		}
	},

	deleteBlock: async (event) => {
		const { request, locals } = event;
		const { user } = locals;
		if (!user) {
			throw error(401, 'Unauthorized');
		}

		const formData = await request.formData();
		const id = formData.get('id') as string;

		try {
			const graphqlClient = createGraphQLClient(event);
			await graphqlClient.mutate(DELETE_FORM_BLOCK, { id });
		} catch (err) {
			logger.error('Error deleting block', err as Error);
			throw error(500, 'Failed to delete block');
		}

		return { success: true };
	},

	reorderBlocks: async (event) => {
		const { request, locals } = event;
		const { user } = locals;
		if (!user) {
			throw error(401, 'Unauthorized');
		}

		const formData = await request.formData();
		const onboardingFormId = formData.get('onboardingFormId') as string;
		const blockIds = JSON.parse(formData.get('blockIds') as string);

		try {
			const graphqlClient = createGraphQLClient(event);
			await graphqlClient.mutate(REORDER_FORM_BLOCKS, { onboardingFormId, blockIds });
		} catch (err) {
			logger.error('Error reordering blocks', err as Error);
			throw error(500, 'Failed to reorder blocks');
		}

		return { success: true };
	},

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
			const result = await graphqlClient.mutate<{ updateOnboardingForm: unknown }>(UPDATE_ONBOARDING_FORM, { id, input });
			return { success: true, form: result.updateOnboardingForm };
		} catch (err) {
			logger.error('Error updating form', err as Error);
			throw error(500, 'Failed to update form');
		}
	}
};
