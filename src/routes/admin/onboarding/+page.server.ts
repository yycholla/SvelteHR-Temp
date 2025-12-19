import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { logger } from '$lib/utils/logger';
import { GraphQLClient } from '$lib/server/graphql-client';
import { requireAuth } from '$lib/server/rbac-utils';
import {
	DELETE_ONBOARDING_MODULE_MUTATION,
	GET_ALL_ONBOARDING_ASSIGNMENTS_QUERY,
	GET_ONBOARDING_MODULES_QUERY
} from '$lib/graphql/onboarding-operations';

export const load: PageServerLoad = async (event) => {
	requireAuth(event, { requiredRoles: ['Admin', 'HR Manager'] });

	const client = GraphQLClient.fromCookies(event.cookies);

	// Fetch all onboarding modules
	const modulesResponse = await client.query(GET_ONBOARDING_MODULES_QUERY);

	// Fetch all assignments to count them per module
	const assignmentsResponse = await client.query(GET_ALL_ONBOARDING_ASSIGNMENTS_QUERY);

	const modules = modulesResponse.data?.onboardingModules || [];
	const allAssignments = assignmentsResponse.data?.allOnboardingAssignments || [];

	// Group assignments by module ID and add count to each module
	const modulesWithAssignments = modules.map((module: any) => {
		const assignments = allAssignments.filter((a: any) => a.onboardingModuleId === module.id);
		return {
			...module,
			assignmentCount: assignments.length,
			assignments: assignments.slice(0, 3) // First 3 for preview
		};
	});

	return {
		modules: modulesWithAssignments
	};
};

export const actions: Actions = {
	delete: async ({ request, cookies }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();

		if (!id) {
			return fail(400, { error: 'Onboarding module ID is required' });
		}

		const client = GraphQLClient.fromCookies(cookies);

		try {
			const response = await client.mutation(DELETE_ONBOARDING_MODULE_MUTATION, { id });

			if (response.errors) {
				return fail(500, { error: 'Failed to delete onboarding module' });
			}

			return { success: true };
		} catch (err) {
			logger.error('Delete onboarding module error:', err as Error);
			return fail(500, { error: 'Internal server error' });
		}
	}
};
