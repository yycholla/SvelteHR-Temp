// Storage statistics API endpoint (Feature 024)
// GET /api/storage/stats - Get storage statistics

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	// Step 1: Validate authentication
	if (!locals.user) {
		error(401, { message: 'Authentication required' });
	}

	try {
		// Step 2: TODO: Get statistics from PostgreSQL
		// SELECT
		//   COUNT(*) as total_files,
		//   COALESCE(SUM(file_size), 0) as total_bytes,
		//   COUNT(*) FILTER (WHERE uploaded_by = ?) as user_files,
		//   COALESCE(SUM(file_size) FILTER (WHERE uploaded_by = ?), 0) as user_bytes
		// FROM hr_public.encrypted_file_storage

		// For now, return mock statistics
		return json({
			totalFiles: 0,
			totalBytes: 0,
			userFiles: 0,
			userBytes: 0
		});
	} catch (err) {
		console.error('Storage stats error:', err);

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		error(500, { message: 'Internal server error getting storage stats' });
	}
};
