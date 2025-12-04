// API endpoint for deleting employee goals
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { GraphQLClient } from '$lib/server/graphql-client';

export const DELETE: RequestHandler = async ({ params, cookies, locals }) => {
	console.log('[Goal Delete API] START - User:', locals.user?.id, 'Goal:', params.goalId);

	// Check authentication
	if (!locals.user) {
		console.error('[Goal Delete API] Unauthorized - no user');
		return json({ message: 'Unauthorized' }, { status: 401 });
	}

	const { goalId } = params;

	if (!goalId) {
		return json({ message: 'Goal ID is required' }, { status: 400 });
	}

	try {
		// Create GraphQL client with authentication
		console.log('[Goal Delete API] Creating GraphQL client');
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

		console.log(
			'[Goal Delete API] Sending mutation with variables:',
			JSON.stringify(variables, null, 2)
		);

		const result = await graphqlClient.mutation(mutation, variables);

		console.log('[Goal Delete API] GraphQL result:', JSON.stringify(result, null, 2));

		if (result.errors) {
			console.error('[Goal Delete API] GraphQL errors:', JSON.stringify(result.errors, null, 2));
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
			console.error('[Goal Delete API] No data returned from mutation');
			return json({ message: 'No data returned from goal deletion' }, { status: 500 });
		}

		if (!deleted) {
			console.error('[Goal Delete API] Goal not found or already deleted');
			return json({ message: 'Goal not found' }, { status: 404 });
		}

		console.log('[Goal Delete API] Successfully deleted goal');
		return json({ success: true, message: 'Goal deleted successfully' }, { status: 200 });
	} catch (error) {
		console.error('[Goal Delete API] Catch block error:', error);
		console.error(
			'[Goal Delete API] Error stack:',
			error instanceof Error ? error.stack : 'No stack'
		);
		return json(
			{
				message: error instanceof Error ? error.message : 'Failed to delete goal',
				details: error instanceof Error ? error.stack : String(error)
			},
			{ status: 500 }
		);
	}
};
