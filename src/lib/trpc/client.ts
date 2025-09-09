import { createTRPCClient, httpLink } from '@trpc/client';
import type { AppRouter } from './router';
import { dev } from '$app/environment';

// Initialize the tRPC client
export const trpc = createTRPCClient<AppRouter>({
	links: [
		httpLink({
			url: dev ? 'http://localhost:5173/api/trpc' : '/api/trpc',
			// Add fetch configuration for SvelteKit
			fetch: (url, options) => {
				return fetch(url, {
					...options,
					credentials: 'include' // Include cookies for JWT
				});
			}
		})
	]
});

// Export the client type for use in components
export type TRPCClient = typeof trpc;
