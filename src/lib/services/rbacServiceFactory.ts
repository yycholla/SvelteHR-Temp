// src/lib/services/rbacServiceFactory.ts
import type { RequestEvent } from '@sveltejs/kit';
import { RBACService } from '$services/RBACService';
import { GraphQLRoleAdapter } from '$adapters/graphql/GraphQLRoleAdapter';
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';

export function createRBACService(event: RequestEvent): RBACService {
	const client = createUrqlClient(
		event.fetch,
		undefined,
		undefined,
		serializeCookies(event.cookies)
	);

	const adapter = new GraphQLRoleAdapter(client);
	return new RBACService(adapter);
}
