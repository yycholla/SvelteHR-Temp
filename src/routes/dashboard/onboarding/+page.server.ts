import type { PageServerLoad } from './$types';
import { GraphQLClient } from '$lib/server/graphql-client';
import { requireAuth } from '$lib/server/rbac-utils';
import { GET_MY_ONBOARDING_ASSIGNMENTS_QUERY } from '$lib/graphql/onboarding-operations';

export const load: PageServerLoad = async (event) => {
	requireAuth(event, {}); // Any authenticated user

	const client = GraphQLClient.fromCookies(event.cookies);

	const response = await client.query(GET_MY_ONBOARDING_ASSIGNMENTS_QUERY);

	const assignments = response.data?.myOnboardingAssignments || [];

	// Calculate completion status for each assignment
	const assignmentsWithStatus = assignments.map((assignment: any) => {
		const isCompleted = !!assignment.completedAt;
		const isOverdue =
			!isCompleted && assignment.dueDate && new Date(assignment.dueDate) < new Date();

		return {
			...assignment,
			isCompleted,
			isOverdue,
			statusLabel: isCompleted ? 'Completed' : isOverdue ? 'Overdue' : 'In Progress'
		};
	});

	return {
		assignments: assignmentsWithStatus
	};
};
