import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';

export const POST: RequestHandler = async ({ cookies, fetch }) => {
	const client = createUrqlClient(fetch, undefined, undefined, serializeCookies(cookies));

	const mutation = `
		mutation DisconnectIntuit {
			intuit {
				disconnect {
					success
					error
				}
			}
		}
	`;

	try {
		const result = await client.mutation(mutation, {}).toPromise();

		if (result.error) {
			console.error('GraphQL error disconnecting from Intuit:', result.error);
			throw error(500, 'Failed to disconnect from QuickBooks');
		}

		const disconnectResult = result.data?.intuit?.disconnect;

		if (!disconnectResult?.success) {
			const errorMsg = disconnectResult?.error || 'Unknown error';
			throw error(500, errorMsg);
		}

		return json({ success: true });
	} catch (err) {
		if (err instanceof Response) {
			throw err;
		}
		console.error('Error disconnecting from Intuit:', err);
		throw error(500, 'Failed to disconnect from QuickBooks');
	}
};
