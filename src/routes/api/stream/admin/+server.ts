import type { RequestHandler } from './$types';
import { StreamingService, STREAMING_CONFIGS } from '$lib/services/streaming';

export const GET: RequestHandler = async ({ cookies }) => {
	return StreamingService.createStreamingEndpoint(
		STREAMING_CONFIGS.admin,
		cookies
	);
};