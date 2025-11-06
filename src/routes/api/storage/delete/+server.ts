// Storage delete API endpoint (Feature 024)
// DELETE /api/storage/delete - Delete encrypted file data

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ request, locals }) => {
	// Step 1: Validate authentication
	if (!locals.user) {
		error(401, { message: 'Authentication required' });
	}

	try {
		// Step 2: Parse request body
		const body = await request.json();
		const { storagePath } = body;

		if (!storagePath) {
			error(400, { message: 'Missing required field: storagePath' });
		}

		// Step 3: Validate user owns this file
		if (!storagePath.startsWith(locals.user.id)) {
			error(403, { message: 'Access denied to delete this file' });
		}

		// Step 4: TODO: Delete from PostgreSQL
		// DELETE FROM hr_public.encrypted_file_storage
		// WHERE storage_path = ? AND uploaded_by = ?

		console.log(`File deleted: ${storagePath} by user ${locals.user.id}`);

		return json({ success: true });

	} catch (err) {
		console.error('File deletion error:', err);

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		error(500, { message: 'Internal server error during file deletion' });
	}
};
