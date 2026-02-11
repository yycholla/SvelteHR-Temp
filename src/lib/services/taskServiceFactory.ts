// src/lib/services/taskServiceFactory.ts
import type { RequestEvent } from '@sveltejs/kit';
import { TaskService } from '$services/TaskService';
import { GraphQLTaskAdapter } from '$adapters/graphql/GraphQLTaskAdapter';
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';

export function createTaskService(event: RequestEvent): TaskService {
	const client = createUrqlClient(
		event.fetch,
		undefined,
		undefined,
		serializeCookies(event.cookies)
	);

	const adapter = new GraphQLTaskAdapter(client);
	return new TaskService(adapter);
}
