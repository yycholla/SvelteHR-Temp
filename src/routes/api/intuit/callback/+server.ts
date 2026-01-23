import type { RequestHandler } from './$types';
import { redirect, error } from '@sveltejs/kit';
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';

export const GET: RequestHandler = async ({ url, cookies, fetch }) => {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const realmId = url.searchParams.get('realmId');
	const errorParam = url.searchParams.get('error');

	// Check for OAuth errors
	if (errorParam) {
		console.error('OAuth error:', errorParam);
		throw redirect(302, '/admin/settings/integrations?error=oauth_denied');
	}

	// Validate parameters
	if (!code || !realmId) {
		throw error(400, 'Missing authorization code or realm ID');
	}

	// Validate CSRF state
	const savedState = cookies.get('intuit_oauth_state');
	if (!savedState || savedState !== state) {
		throw error(400, 'Invalid OAuth state - possible CSRF attack');
	}

	// Clear state cookie
	cookies.delete('intuit_oauth_state', { path: '/' });

	// Exchange code for tokens via GraphQL mutation
	const client = createUrqlClient(fetch, undefined, undefined, serializeCookies(cookies));
	const mutation = `
		mutation ConnectIntuit($code: String!, $realmId: String!) {
			intuit {
				connect(code: $code, realmId: $realmId) {
					success
					companyName
					error
				}
			}
		}
	`;

	try {
		const result = await client.mutation(mutation, { code, realmId }).toPromise();

		if (result.error) {
			console.error('GraphQL error connecting to Intuit:', result.error);
			throw redirect(302, '/admin/settings/integrations?error=connection_failed');
		}

		const connectResult = result.data?.intuit?.connect;

		if (!connectResult?.success) {
			const errorMsg = connectResult?.error || 'Unknown error';
			console.error('Failed to connect to Intuit:', errorMsg);
			throw redirect(302, `/admin/settings/integrations?error=${encodeURIComponent(errorMsg)}`);
		}

		// Success! Redirect to integrations page
		throw redirect(302, '/admin/settings/integrations?connected=true');
	} catch (err) {
		// Re-throw redirects (success or error redirects)
		if (err instanceof Response) {
			throw err;
		}
		// Only log actual unexpected errors
		if (err && typeof err === 'object' && 'location' in err) {
			throw err; // SvelteKit redirect object
		}
		console.error('Unexpected error in OAuth callback:', err);
		throw redirect(302, '/admin/settings/integrations?error=callback_failed');
	}
};
