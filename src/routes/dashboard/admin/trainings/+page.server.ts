import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { logger } from '$lib/utils/logger';
import { GraphQLClient } from '$lib/server/graphql-client';
import { requireAuth } from '$lib/server/rbac-utils';
import { DELETE_TRAINING_MUTATION } from '$lib/graphql/training-operations';

export const load: PageServerLoad = async (event) => {
	requireAuth(event, { requiredRoles: ['Admin', 'HR Manager'] });

	const client = GraphQLClient.fromCookies(event.cookies);

	const query = `
        query GetTrainings {
            trainings {
                id
                title
                description
                startDate
                endDate
                isActive
            }
        }
    `;

	// Fetch all assignments to count them per training
	const assignmentsQuery = `
        query GetAllTrainingAssignments {
            allTrainingAssignments {
                id
                trainingId
                userId
                user {
                    id
                    displayName
                    email
                }
            }
        }
    `;

	const response = await client.query(query);
	const assignmentsResponse = await client.query(assignmentsQuery);

	const trainings = response.data?.trainings || [];
	const allAssignments = assignmentsResponse.data?.allTrainingAssignments || [];

	// Group assignments by training ID and add count to each training
	const trainingsWithAssignments = trainings.map((training: any) => {
		const assignments = allAssignments.filter((a: any) => a.trainingId === training.id);
		return {
			...training,
			assignmentCount: assignments.length,
			assignments: assignments.slice(0, 3) // First 3 for preview
		};
	});

	return {
		trainings: trainingsWithAssignments
	};
};

export const actions: Actions = {
	delete: async ({ request, cookies }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();

		if (!id) {
			return fail(400, { error: 'Training ID is required' });
		}

		const client = GraphQLClient.fromCookies(cookies);

		try {
			const response = await client.mutation(DELETE_TRAINING_MUTATION, { id });

			if (response.errors) {
				return fail(500, { error: 'Failed to delete training' });
			}

			return { success: true };
		} catch (err) {
			logger.error('Delete training error:', err as Error);
			return fail(500, { error: 'Internal server error' });
		}
	}
};
