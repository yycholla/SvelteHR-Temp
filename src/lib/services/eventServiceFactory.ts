import type { RequestEvent } from '@sveltejs/kit';
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';
import { GraphQLEventAdapter } from '$adapters/graphql/GraphQLEventAdapter';
import { EventService } from '$services/EventService';

export function createEventService(event: RequestEvent): EventService {
	const client = createUrqlClient(
		event.fetch,
		event.locals.accessToken,
		undefined,
		serializeCookies(event.cookies)
	);
	const adapter = new GraphQLEventAdapter(client);
	return new EventService(adapter);
}
