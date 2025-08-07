import type { RequestEvent } from '@sveltejs/kit';
import { dev } from '$app/environment';

export interface Context {
	event: RequestEvent;
	token?: string;
	userId?: string;
}

export async function createContext(event: RequestEvent): Promise<Context> {
	// Use authentication data from hooks if available
	const token = event.locals.token;
	const userId = event.locals.user?.id;
	
	// Clear any NextAuth or incompatible session cookies
	const nextAuthToken = event.cookies.get('next-auth.session-token');
	if (nextAuthToken) {
		// Clear NextAuth cookies that don't belong to this app
		event.cookies.delete('next-auth.session-token', { path: '/' });
		event.cookies.delete('next-auth.callback-url', { path: '/' });
		event.cookies.delete('next-auth.csrf-token', { path: '/' });
	}

	return {
		event,
		token,
		userId,
	};
}