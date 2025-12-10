// DEPRECATED: This endpoint generated JWT tokens for testing
// Session-based authentication no longer requires JWT tokens
// Use the session-based login endpoint at /api/auth/login instead
import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';

export const POST: RequestHandler = async () => {
	error(
		410,
		'This endpoint has been deprecated. Session-based authentication is now used. Please use /api/auth/login instead.'
	);
};
