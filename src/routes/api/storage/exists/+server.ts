// Storage exists check API endpoint (Feature 024)
// GET /api/storage/exists?path=... - Check if storage path exists

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	// Step 1: Validate authentication
	if (!locals.user) {
		throw error(401, { message: 'Authentication required' });
	}

	try {
		// Step 2: Get storage path from query param
		const storagePath = url.searchParams.get('path');

		if (!storagePath) {
			throw error(400, { message: 'Missing required parameter: path' });
		}

		// Step 3: Validate user owns this file
		if (!storagePath.startsWith(locals.user.id)) {
			return json({ exists: false });
		}

		// Step 4: TODO: Check existence in PostgreSQL
		// SELECT EXISTS(
		//   SELECT 1 FROM hr_public.encrypted_file_storage
		//   WHERE storage_path = ? AND uploaded_by = ?
		// )

		// For now, return false (file doesn't exist in mock)
		return json({ exists: false });

	} catch (err) {
		console.error('File exists check error:', err);

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, { message: 'Internal server error during file check' });
	}
};
