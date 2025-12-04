// API endpoint for updating employee goals
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { GraphQLClient } from '$lib/server/graphql-client';

export const PATCH: RequestHandler = async ({ request, params, cookies, locals }) => {
	console.log('[Goal Update API] START - User:', locals.user?.id, 'Goal:', params.goalId);

	// Check authentication
	if (!locals.user) {
		console.error('[Goal Update API] Unauthorized - no user');
		return json({ message: 'Unauthorized' }, { status: 401 });
	}

	const { goalId } = params;

	if (!goalId) {
		return json({ message: 'Goal ID is required' }, { status: 400 });
	}

	try {
		const body = await request.json();
		console.log('[Goal Update API] Request body:', JSON.stringify(body, null, 2));

		const { title, description, targetDate, status, progressPercentage } = body;

		// Create GraphQL client with authentication
		console.log('[Goal Update API] Creating GraphQL client');
		const graphqlClient = GraphQLClient.fromCookies(cookies);

		// Update goal mutation
		const mutation = `
			mutation UpdateEmployeeGoal($id: UUID!, $input: UpdateEmployeeGoalInput!) {
				updateEmployeeGoal(id: $id, input: $input) {
					id
					employeeId
					goalTitle
					goalDescription
					targetDate
					status
					progressPercentage
					createdAt
					updatedAt
				}
			}
		`;

		const variables = {
			id: goalId,
			input: {
				title: title || null,
				description: description || null,
				targetDate: targetDate || null,
				status: status || null,
				progressPercentage: progressPercentage !== undefined ? progressPercentage : null
			}
		};

		console.log(
			'[Goal Update API] Sending mutation with variables:',
			JSON.stringify(variables, null, 2)
		);

		const result = await graphqlClient.mutation(mutation, variables);

		console.log('[Goal Update API] GraphQL result:', JSON.stringify(result, null, 2));

		if (result.errors) {
			console.error('[Goal Update API] GraphQL errors:', JSON.stringify(result.errors, null, 2));
			const errorMessage = result.errors.map((e: any) => e.message).join('; ');
			return json(
				{
					message: `GraphQL error: ${errorMessage}`,
					errors: result.errors,
					variables
				},
				{ status: 500 }
			);
		}

		if (!result.data?.updateEmployeeGoal) {
			console.error('[Goal Update API] No data returned from mutation');
			return json({ message: 'No data returned from goal update' }, { status: 500 });
		}

		console.log('[Goal Update API] Successfully updated goal:', result.data.updateEmployeeGoal);
		return json({ goal: result.data.updateEmployeeGoal }, { status: 200 });
	} catch (error) {
		console.error('[Goal Update API] Catch block error:', error);
		console.error(
			'[Goal Update API] Error stack:',
			error instanceof Error ? error.stack : 'No stack'
		);
		return json(
			{
				message: error instanceof Error ? error.message : 'Failed to update goal',
				details: error instanceof Error ? error.stack : String(error)
			},
			{ status: 500 }
		);
	}
};
