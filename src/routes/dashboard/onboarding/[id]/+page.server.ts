import type { Actions, PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/rbac-utils';
import { createGraphQLClient } from '$lib/server/graphql/unified-client';
import { createOnboardingService } from '$lib/server/services';
import { GET_FORM_TEMPLATES_QUERY } from '$lib/graphql/onboarding-operations';
import {
	COMPLETE_FORM,
	GET_FORM_BLOCKS,
	GET_FORMS_BY_MODULE,
	GET_FORM_PROGRESS,
	SAVE_FORM_PROGRESS
} from '$lib/graphql/form-operations';
import { logger } from '$lib/utils/logger';

export const load: PageServerLoad = async (event) => {
	requireAuth(event, {});

	const { id } = event.params;
	const { user } = event.locals;

	if (!user) {
		throw error(401, 'Unauthorized');
	}

	try {
		const onboardingService = createOnboardingService(event);
		const graphqlClient = createGraphQLClient(event);

		// Fetch onboarding module through service layer
		const moduleResult = await onboardingService.getModuleById(id);
		if (moduleResult.isError) {
			if (moduleResult.error.code === 'ONBOARDING_MODULE_NOT_FOUND') {
				throw error(404, 'Onboarding module not found');
			}

			logger.error('Error fetching module', moduleResult.error);
			throw error(500, 'Failed to load onboarding module');
		}

		const moduleEntity = moduleResult.value;
		const module = {
			id: moduleEntity.id,
			title: moduleEntity.title.value,
			description: moduleEntity.description,
			isActive: moduleEntity.isActive,
			category: moduleEntity.category.value,
			tags: [...moduleEntity.tags],
			authorId: moduleEntity.authorId
		};

		// Fetch forms for this module with their blocks
		const formsResult = await graphqlClient.query<{
			onboardingFormsByModule?: Array<{
				id: string;
				title: string;
				description?: string | null;
				sequenceOrder: number;
				isRequired: boolean;
			}>;
		}>(GET_FORMS_BY_MODULE, { onboardingModuleId: id });

		const forms = formsResult?.onboardingFormsByModule || [];

		// Fetch blocks for each form
		const formsWithBlocks = await Promise.all(
			forms.map(async (form: any) => {
				const blocksData = await graphqlClient.query<{ formBlocks?: any[] }>(GET_FORM_BLOCKS, {
					onboardingFormId: form.id
				});

				const blocks = blocksData?.formBlocks || [];
				blocks.sort((a: any, b: any) => a.sequenceOrder - b.sequenceOrder);

				// Fetch form progress for current user
				const progressData = await graphqlClient.query<{ formProgress?: any | null }>(
					GET_FORM_PROGRESS,
					{
						userId: user.id,
						onboardingFormId: form.id
					}
				);

				const progress = progressData?.formProgress;

				return {
					...form,
					blocks,
					progress: progress || null,
					isCompleted: progress?.status === 'COMPLETED',
					isInProgress: progress?.status === 'IN_PROGRESS'
				};
			})
		);

		// Sort forms by sequence order
		formsWithBlocks.sort((a, b) => a.sequenceOrder - b.sequenceOrder);

		// Calculate progress
		const totalForms = forms.length;
		const completedForms = formsWithBlocks.filter((f: any) => f.isCompleted).length;

		// Fetch form templates
		const formTemplatesData = await graphqlClient.query<{ formTemplates?: any[] }>(
			GET_FORM_TEMPLATES_QUERY,
			{}
		);
		const formTemplates = formTemplatesData?.formTemplates || [];
		const formTemplatesMap = new Map(formTemplates.map((t: any) => [t.id, t]));

		return {
			module,
			forms: formsWithBlocks,
			formTemplates: formTemplatesMap,
			totalForms,
			completedForms,
			user
		};
	} catch (err) {
		logger.error('Error loading onboarding module:', err as Error);
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		throw error(500, 'Failed to load onboarding module');
	}
};

export const actions: Actions = {
	// Save form progress
	saveProgress: async (event) => {
		const { request, locals } = event;
		const { user } = locals;
		if (!user) {
			throw error(401, 'Unauthorized');
		}

		const formData = await request.formData();
		const onboardingFormId = formData.get('onboardingFormId') as string;
		const status = formData.get('status') as string;
		const formDataJson = formData.get('formData') as string;

		const input = {
			userId: user.id,
			onboardingFormId,
			status: status as any,
			formData: formDataJson ? JSON.parse(formDataJson) : null
		};

		try {
			const graphqlClient = createGraphQLClient(event);
			await graphqlClient.mutate(SAVE_FORM_PROGRESS, { input });
		} catch (err) {
			logger.error('Error saving progress', err as Error);
			return { success: false, error: 'Failed to save progress' };
		}

		return { success: true };
	},

	// Complete form
	completeForm: async (event) => {
		const { request, locals } = event;
		const { user } = locals;
		if (!user) {
			throw error(401, 'Unauthorized');
		}

		const formData = await request.formData();
		const onboardingFormId = formData.get('onboardingFormId') as string;
		const formDataJson = formData.get('formData') as string;

		const input = {
			onboardingFormId,
			formData: formDataJson ? JSON.parse(formDataJson) : {}
		};

		try {
			const graphqlClient = createGraphQLClient(event);
			await graphqlClient.mutate(COMPLETE_FORM, { input });
		} catch (err) {
			logger.error('Error completing form', err as Error);
			return { success: false, error: 'Failed to complete form' };
		}

		return { success: true };
	}
};
