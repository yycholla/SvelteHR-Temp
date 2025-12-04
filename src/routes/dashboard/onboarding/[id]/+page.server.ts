import type { PageServerLoad, Actions } from './$types';
import { error } from '@sveltejs/kit';
import { GraphQLClient } from '$lib/server/graphql-client';
import { requireAuth } from '$lib/server/rbac-utils';
import { urqlClient } from '$lib/api/urql-client';
import {
	GET_ONBOARDING_MODULE
} from '$lib/graphql/onboarding-operations';
import {
	GET_FORMS_BY_MODULE,
	SAVE_FORM_PROGRESS,
	COMPLETE_FORM
} from '$lib/graphql/form-operations';

export const load: PageServerLoad = async (event) => {
	requireAuth(event, {});

	const { id } = event.params;
	const { user } = event.locals;

	if (!user) {
		throw error(401, 'Unauthorized');
	}

	try {
		// Fetch onboarding module
		const moduleResult = await urqlClient.query(GET_ONBOARDING_MODULE, { id });

		if (moduleResult.error) {
			console.error('Error fetching module:', moduleResult.error);
			throw error(500, 'Failed to load onboarding module');
		}

		const module = moduleResult.data?.onboardingModule;
		if (!module) {
			throw error(404, 'Onboarding module not found');
		}

		// Fetch forms for this module with their blocks
		const formsResult = await urqlClient.query(GET_FORMS_BY_MODULE, {
			onboardingModuleId: id
		});

		if (formsResult.error) {
			console.error('Error fetching forms:', formsResult.error);
			throw error(500, 'Failed to load forms');
		}

		const forms = formsResult.data?.onboardingFormsByModule || [];

		// Fetch blocks for each form
		const formsWithBlocks = await Promise.all(
			forms.map(async (form: any) => {
				const blocksQuery = `
					query GetFormBlocks($onboardingFormId: UUID!) {
						formBlocks(onboardingFormId: $onboardingFormId) {
							id
							onboardingFormId
							title
							type
							sequenceOrder
							textContent
							documentUrl
							formTemplateId
							fileUploadRequirements
							signatureRequirements
							checkboxItems
						}
					}
				`;

				const client = GraphQLClient.fromCookies(event.cookies);
				const blocksResponse = await client.query(blocksQuery, {
					onboardingFormId: form.id
				});

				const blocks = blocksResponse.data?.formBlocks || [];
				blocks.sort((a: any, b: any) => a.sequenceOrder - b.sequenceOrder);

				// Fetch form progress for current user
				const progressQuery = `
					query GetFormProgress($userId: UUID!, $onboardingFormId: UUID!) {
						formProgress(userId: $userId, onboardingFormId: $onboardingFormId) {
							id
							status
							formData
							startedAt
							completedAt
						}
					}
				`;

				const progressResponse = await client.query(progressQuery, {
					userId: user.id,
					onboardingFormId: form.id
				});

				const progress = progressResponse.data?.formProgress;

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
		const formTemplatesQuery = `
			query GetFormTemplates {
				formTemplates {
					id
					name
					description
					category
					version
					isActive
					fields
				}
			}
		`;

		const client = GraphQLClient.fromCookies(event.cookies);
		const formTemplatesResponse = await client.query(formTemplatesQuery);
		const formTemplates = formTemplatesResponse.data?.formTemplates || [];
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
		console.error('Error loading onboarding module:', err);
		throw error(500, 'Failed to load onboarding module');
	}
};

export const actions: Actions = {
	// Save form progress
	saveProgress: async ({ request, locals }) => {
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

		const result = await urqlClient.mutation(SAVE_FORM_PROGRESS, { input });

		if (result.error) {
			console.error('Error saving progress:', result.error);
			return { success: false, error: 'Failed to save progress' };
		}

		return { success: true };
	},

	// Complete form
	completeForm: async ({ request, locals }) => {
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

		const result = await urqlClient.mutation(COMPLETE_FORM, { input });

		if (result.error) {
			console.error('Error completing form:', result.error);
			return { success: false, error: 'Failed to complete form' };
		}

		return { success: true };
	}
};
