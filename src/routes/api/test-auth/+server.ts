// DEPRECATED: This endpoint generated JWT tokens for testing
// Session-based authentication no longer requires JWT tokens
// Use the session-based login endpoint at /api/auth/login instead
import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';

export const POST: RequestHandler = async () => {
	throw error(410, {
		message: 'This endpoint has been deprecated',
		details: 'Session-based authentication is now used. Please use /api/auth/login instead.'
	});
};
