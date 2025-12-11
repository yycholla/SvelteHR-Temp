import { logger } from '$lib/utils/logger';
// API endpoint for creating employee goals
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { GraphQLClient } from '$lib/server/graphql-client';

export const POST: RequestHandler = async ({ request, cookies, locals }) => {
	logger.info('[Goal Create API] START - User:', locals.user?.id);

	// Check authentication
	if (!locals.user) {
		logger.error('[Goal Create API] Unauthorized - no user');
		return json({ message: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await request.json();
		logger.info('[Goal Create API] Request body:', JSON.stringify(body, null, 2));

		const { employeeId, title, description, targetDate, status, progressPercentage } = body;

		// Validate required fields
		if (!employeeId || !title) {
			logger.error('[Goal Create API] Validation failed - missing required fields');
			return json({ message: 'Employee ID and title are required' }, { status: 400 });
		}

		// Create GraphQL client with authentication
		logger.info('[Goal Create API] Creating GraphQL client');
		const graphqlClient = GraphQLClient.fromCookies(cookies);

		// Create goal mutation
		const mutation = `
			mutation CreateEmployeeGoal($input: CreateEmployeeGoalInput!) {
				createEmployeeGoal(input: $input) {
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
			input: {
				employeeId,
				title,
				description: description || null,
				targetDate: targetDate || null,
				status: status || null,
				progressPercentage: progressPercentage || null
			}
		};

		logger.info(
			'[Goal Create API] Sending mutation with variables:',
			JSON.stringify(variables, null, 2)
		);

		const result = await graphqlClient.mutation(mutation, variables);

		logger.info('[Goal Create API] GraphQL result:', JSON.stringify(result, null, 2));

		if (result.errors) {
			logger.error('[Goal Create API] GraphQL errors:', JSON.stringify(result.errors, null, 2));
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

		if (!result.data?.createEmployeeGoal) {
			logger.error('[Goal Create API] No data returned from mutation');
			return json({ message: 'No data returned from goal creation' }, { status: 500 });
		}

		logger.info('[Goal Create API] Successfully created goal:', result.data.createEmployeeGoal);
		return json({ goal: result.data.createEmployeeGoal }, { status: 201 });
	} catch (error) {
		logger.error('[Goal Create API] Catch block error:', error as Error);
		logger.error(
			'[Goal Create API] Error stack:',
			error instanceof Error ? error.stack : 'No stack'
		);
		return json(
			{
				message: error instanceof Error ? error.message : 'Failed to create goal',
				details: error instanceof Error ? error.stack : String(error)
			},
			{ status: 500 }
		);
	}
};
