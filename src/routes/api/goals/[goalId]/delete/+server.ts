import { logger } from '$lib/utils/logger';
// API endpoint for deleting employee goals
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { GraphQLClient } from '$lib/server/graphql-client';

export const DELETE: RequestHandler = async ({ params, cookies, locals }) => {
	logger.info('[Goal Delete API] START', { userId: locals.user?.id, goalId: params.goalId });

	// Check authentication
	if (!locals.user) {
		logger.error('[Goal Delete API] Unauthorized - no user');
		return json({ message: 'Unauthorized' }, { status: 401 });
	}

	const { goalId } = params;

	if (!goalId) {
		return json({ message: 'Goal ID is required' }, { status: 400 });
	}

	try {
		// Create GraphQL client with authentication
		logger.info('[Goal Delete API] Creating GraphQL client');
		const graphqlClient = GraphQLClient.fromCookies(cookies);

		// Delete goal mutation (returns boolean)
		const mutation = `
			mutation DeleteEmployeeGoal($id: UUID!) {
				deleteEmployeeGoal(id: $id)
			}
		`;

		const variables = {
			id: goalId
		};

		logger.info('[Goal Delete API] Sending mutation with variables', {
			variables: JSON.stringify(variables, null, 2)
		});

		const result = await graphqlClient.mutation(mutation, variables);

		logger.info('[Goal Delete API] GraphQL result', { result: JSON.stringify(result, null, 2) });

		if (result.errors) {
			logger.error('[Goal Delete API] GraphQL errors', new Error('GraphQL errors'), {
				errors: JSON.stringify(result.errors, null, 2)
			});
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

		const deleted = result.data?.deleteEmployeeGoal;

		if (deleted === undefined || deleted === null) {
			logger.error('[Goal Delete API] No data returned from mutation');
			return json({ message: 'No data returned from goal deletion' }, { status: 500 });
		}

		if (!deleted) {
			logger.error('[Goal Delete API] Goal not found or already deleted');
			return json({ message: 'Goal not found' }, { status: 404 });
		}

		logger.info('[Goal Delete API] Successfully deleted goal');
		return json({ success: true, message: 'Goal deleted successfully' }, { status: 200 });
	} catch (error) {
		logger.error('[Goal Delete API] Catch block error', error as Error);
		logger.error('[Goal Delete API] Error stack', new Error('Stack trace'), {
			stack: error instanceof Error ? error.stack : 'No stack'
		});
		return json(
			{
				message: error instanceof Error ? error.message : 'Failed to delete goal',
				details: error instanceof Error ? error.stack : String(error)
			},
			{ status: 500 }
		);
	}
};
