import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Placeholder for missing installHook.js.map source map
 * This prevents 404 errors in browser dev tools
 */

export const GET: RequestHandler = async () => {
	// Return empty source map to prevent 404 errors
	return json(
		{
			version: 3,
			sources: [],
			names: [],
			mappings: '',
			file: 'installHook.js'
		},
		{
			headers: {
				'Content-Type': 'application/json'
			}
		}
	);
};
