import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, cookies, fetch }) => {
	const code = url.searchParams.get('code');

	console.log('Callback server load - URL:', url.href);
	console.log('Auth code:', code);

	if (!code) {
		console.error('No code in callback URL');
		throw redirect(302, '/login?error=no_code');
	}

	try {
		// Get the PKCE verifier from the cookie
		const verifier = cookies.get('gel-pkce-verifier');

		console.log('PKCE verifier cookie:', verifier ? 'found' : 'not found');
		console.log('All cookies:', Object.keys(cookies.getAll()));

		if (!verifier) {
			console.error('PKCE verifier cookie not found');
			throw redirect(302, '/login?error=no_verifier');
		}

		// Exchange code and verifier for auth token
		const tokenUrl = `http://localhost:5656/db/main/ext/auth/token?code=${code}&verifier=${verifier}`;

		console.log('Attempting token exchange with URL:', tokenUrl);

		const response = await fetch(tokenUrl, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json'
			}
		});

		console.log('Token exchange response status:', response.status);

		if (!response.ok) {
			const errorText = await response.text();
			console.error('Token exchange failed:', response.status, errorText);
			throw redirect(302, `/login?error=token_exchange_failed&status=${response.status}`);
		}

		const tokenData = await response.json();

		if (!tokenData.auth_token) {
			console.error('No auth token in response:', tokenData);
			throw redirect(302, '/login?error=no_auth_token');
		}

		// Set the GelDB auth token in a secure cookie
		cookies.set('gel-auth-token', tokenData.auth_token, {
			path: '/',
			httpOnly: true,
			secure: false, // Set to true in production with HTTPS
			sameSite: 'lax',
			maxAge: 24 * 60 * 60 // 24 hours
		});

		// Clear the PKCE verifier cookie
		cookies.delete('gel-pkce-verifier', { path: '/' });

		// Redirect to the home page
		throw redirect(302, '/home');
	} catch (error) {
		if (error instanceof Response) {
			// Re-throw redirect responses
			throw error;
		}

		console.error('Auth callback error:', error);
		throw redirect(302, '/login?error=callback_failed');
	}
};
