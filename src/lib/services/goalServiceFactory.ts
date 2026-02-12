/**
 * Goal Service Factory
 *
 * Creates GoalService instances with GraphQL adapter wired in.
 * Manages dependency injection for the Goals module.
 */

import type { RequestEvent } from '@sveltejs/kit';
import { GoalService } from '$services/GoalService';
import { GraphQLGoalAdapter } from '$adapters/graphql/GraphQLGoalAdapter';
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';

/**
 * Create a GoalService instance for the current request
 *
 * Wires together:
 * - URQL client with authentication cookies
 * - GraphQL adapter (implements GoalRepository port)
 * - GoalService (business logic layer)
 *
 * @param event - SvelteKit RequestEvent with cookies and fetch
 * @returns Configured GoalService instance
 *
 * @example
 * ```typescript
 * // In +page.server.ts:
 * export const load: PageServerLoad = async (event) => {
 *   const goalService = createGoalService(event);
 *
 *   const result = await goalService.getGoalById(event.params.id);
 *
 *   if (result.isError) {
 *     if (result.error.code === 'GOAL_NOT_FOUND') {
 *       throw error(404, 'Goal not found');
 *     }
 *     throw error(500, result.error.message);
 *   }
 *
 *   return { goal: result.value };
 * };
 * ```
 */
export function createGoalService(event: RequestEvent): GoalService {
	const client = createUrqlClient(
		event.fetch,
		undefined,
		undefined,
		serializeCookies(event.cookies)
	);

	const adapter = new GraphQLGoalAdapter(client);
	return new GoalService(adapter);
}
