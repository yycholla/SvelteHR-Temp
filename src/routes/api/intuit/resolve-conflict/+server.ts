import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';

const RESOLVE_CONFLICT_MUTATION = `
	mutation ResolveConflict($entityType: EntityTypeInput!, $entityId: String!, $resolution: ConflictResolutionInput!) {
		intuit {
			resolveConflict(entityType: $entityType, entityId: $entityId, resolution: $resolution) {
				success
				errorMessage
				entityType
				entityId
			}
		}
	}
`;

export const POST: RequestHandler = async ({ request, fetch, cookies }) => {
	try {
		const body = await request.json();
		const { entityType, entityId, resolution } = body;

		// Validate inputs
		if (!entityType || !entityId || !resolution) {
			return json({
				success: false,
				error: 'Missing required fields: entityType, entityId, or resolution'
			}, { status: 400 });
		}

		// Convert frontend format to backend GraphQL enum format
		// Frontend sends: "Employee" or "Department" -> Backend expects: "EMPLOYEE" or "DEPARTMENT"
		const backendEntityType = entityType.toUpperCase();

		// Frontend sends: "KEEP_LOCAL" or "KEEP_REMOTE" -> These are already correct
		if (resolution !== 'KEEP_LOCAL' && resolution !== 'KEEP_REMOTE') {
			return json({
				success: false,
				error: `Invalid resolution value: ${resolution}. Expected KEEP_LOCAL or KEEP_REMOTE`
			}, { status: 400 });
		}

		// Create GraphQL client
		const client = createUrqlClient(fetch, undefined, undefined, serializeCookies(cookies));

		// Execute mutation
		const result = await client.mutation(RESOLVE_CONFLICT_MUTATION, {
			entityType: backendEntityType,
			entityId,
			resolution
		}).toPromise();

		if (result.error) {
			console.error('GraphQL error:', result.error);
			return json({
				success: false,
				error: result.error.message
			}, { status: 500 });
		}

		const resolveResult = result.data?.intuit?.resolveConflict;

		if (!resolveResult) {
			return json({
				success: false,
				error: 'No result returned from mutation'
			}, { status: 500 });
		}

		if (!resolveResult.success) {
			return json({
				success: false,
				error: resolveResult.errorMessage || 'Unknown error occurred'
			}, { status: 400 });
		}

		return json({
			success: true,
			entityType: resolveResult.entityType,
			entityId: resolveResult.entityId
		});

	} catch (error) {
		console.error('Error resolving conflict:', error);
		return json({
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 });
	}
};
