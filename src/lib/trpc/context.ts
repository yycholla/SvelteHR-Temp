import type { RequestEvent } from '@sveltejs/kit';
import { dev } from '$app/environment';

export interface Context {
	event: RequestEvent;
	token?: string;
	userId?: string;
}

export async function createContext(event: RequestEvent): Promise<Context> {
	// Clear any NextAuth or incompatible session cookies
	const nextAuthToken = event.cookies.get('next-auth.session-token');
	if (nextAuthToken) {
		// Clear NextAuth cookies that don't belong to this app
		event.cookies.delete('next-auth.session-token', { path: '/' });
		event.cookies.delete('next-auth.callback-url', { path: '/' });
		event.cookies.delete('next-auth.csrf-token', { path: '/' });
	}
	
	// Extract JWT token from cookies
	const token = event.cookies.get('auth-token');
	
	// Parse user ID from token if available
	let userId: string | undefined;
	if (token) {
		try {
			// Validate token format first (should have 3 parts separated by dots)
			const parts = token.split('.');
			if (parts.length !== 3) {
				throw new Error('Invalid token format');
			}
			
			// Attempt to decode the payload
			// Note: This is simplified - in production use a proper JWT library
			const payload = JSON.parse(atob(parts[1]));
			
			// Validate payload has expected fields
			if (typeof payload === 'object' && payload !== null) {
				userId = payload.userId || payload.sub;
			}
		} catch (error) {
			// Invalid token, clear it
			console.warn('Invalid auth token detected, clearing cookie:', error);
			event.cookies.delete('auth-token', { 
				path: '/', 
				secure: !dev,
				httpOnly: true,
				sameSite: 'strict'
			});
			// Reset token to undefined since it was invalid
			return {
				event,
				token: undefined,
				userId: undefined,
			};
		}
	}

	return {
		event,
		token,
		userId,
	};
}