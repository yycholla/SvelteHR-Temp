import type { RequestEvent } from '@sveltejs/kit';
import { PerformanceReviewService } from '$services/PerformanceReviewService';
import { GraphQLPerformanceReviewAdapter } from '$adapters/graphql/GraphQLPerformanceReviewAdapter';
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';

export function createPerformanceReviewService(event: RequestEvent): PerformanceReviewService {
	const client = createUrqlClient(
		event.fetch,
		undefined,
		undefined,
		serializeCookies(event.cookies)
	);

	const adapter = new GraphQLPerformanceReviewAdapter(client);
	return new PerformanceReviewService(adapter);
}
