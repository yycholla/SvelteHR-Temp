import type { RequestHandler } from './$types';
import { redirect } from '@sveltejs/kit';
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';

export const GET: RequestHandler = async ({ cookies, fetch }) => {
	const client = createUrqlClient(fetch, undefined, undefined, serializeCookies(cookies));

	// Get authorization URL from backend
	const query = `
		query GetIntuitAuthUrl {
			intuit {
				authorizationUrl {
					url
					state
				}
			}
		}
	`;

	const result = await client.query(query, {}).toPromise();

	if (result.error) {
		console.error('Failed to get Intuit authorization URL:', result.error);
		redirect(302, '/admin/settings/integrations?error=auth_url_failed');
	}

	const authData = result.data?.intuit?.authorizationUrl;

	if (!authData?.url) {
		redirect(302, '/admin/settings/integrations?error=no_auth_url');
	}

	// Store CSRF state in session/cookie for validation
	cookies.set('intuit_oauth_state', authData.state, {
		path: '/',
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		maxAge: 600 // 10 minutes
	});

	// Redirect to Intuit OAuth page
	redirect(302, authData.url);
};
