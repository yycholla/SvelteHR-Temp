import { logger } from '$lib/utils/logger';
// Storage retrieve API endpoint (Feature 024)
// GET /api/storage/retrieve?path=... - Retrieve encrypted file data

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/rbac-utils';

export const GET: RequestHandler = async (event) => {
	const { url } = event;

	// Step 1: Validate authentication
	requireAuth(event, {
		requiredPermissions: [
			'documents:read',
			'documents:read:self',
			'documents:read:team',
			'documents:read:all'
		]
	});

	// After permission check, re-destructure locals with guaranteed user
	const { locals } = event;

	try {
		// Step 2: Get storage path from query param
		const storagePath = url.searchParams.get('path');

		if (!storagePath) {
			throw error(400, { message: 'Missing required parameter: path' });
		}

		// Step 3: Retrieve encrypted data from PostgreSQL
		const { transaction, setJWTClaims } = await import('$lib/server/db');

		const result = await transaction(async (client) => {
			// Set JWT claims for RLS
			await setJWTClaims(client, locals.user.id, locals.user.role || 'employee');

			// Query encrypted file storage
			const queryResult = await client.query(
				`SELECT encrypted_data, filename, file_type, file_size, uploaded_by
				 FROM hr_public.encrypted_file_storage
				 WHERE storage_path = $1`,
				[storagePath]
			);

			if (queryResult.rows.length === 0) {
				return null;
			}

			const row = queryResult.rows[0];

			// Verify ownership or admin access
			if (
				row.uploaded_by !== locals.user.id &&
				locals.user.role !== 'super_admin' &&
				locals.user.role !== 'admin'
			) {
				throw error(403, { message: 'Access denied to this file' });
			}

			return row;
		});

		if (!result) {
			throw error(404, { message: 'File not found' });
		}

		// Convert BYTEA to base64
		const encryptedData = result.encrypted_data.toString('base64');

		return json({
			encryptedData,
			metadata: {
				filename: result.filename,
				fileType: result.file_type,
				fileSize: result.file_size
			}
		});
	} catch (err) {
		logger.error('File retrieval error:', err as Error);

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		error(500, { message: 'Internal server error during file retrieval' });
	}
};
