import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import type { RequestHandler } from './$types';
import { appRouter } from '$lib/trpc/router';
import { createContext } from '$lib/trpc/context';

const handler: RequestHandler = async (event) => {
	const response = await fetchRequestHandler({
		endpoint: '/api/trpc',
		req: event.request,
		router: appRouter,
		createContext: () => createContext(event),
		onError: ({ error, path }) => {
			console.error(`❌ tRPC failed on ${path}:`, error);
		}
	});

	return response;
};

export const GET = handler;
export const POST = handler;
