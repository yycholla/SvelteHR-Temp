import { logger } from '$lib/utils/logger';
// Storage upload API endpoint (Feature 024)
// POST /api/storage/upload - Upload encrypted file data

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { setJWTClaims, transaction } from '$lib/server/db';
import { requireAuth, AccessTier } from '$lib/server/rbac-utils';

export const POST: RequestHandler = async (event) => {
	const { request } = event;

	// Step 1: Validate authentication
	requireAuth(event, { minTier: AccessTier.SELF });

	// After permission check, re-destructure locals with guaranteed user
	const { locals } = event;

	try {
		// Step 2: Parse request body
		const body = await request.json();
		const { encryptedData, metadata, iv } = body;

		if (!encryptedData || !metadata) {
			error(400, { message: 'Missing required fields: encryptedData, metadata' });
		}

		// Step 3: Generate storage path
		const storagePath = `${locals.user.id}/${crypto.randomUUID()}`;

		// Convert base64 to bytea
		const encryptedBuffer = Buffer.from(encryptedData, 'base64');

		// Prepend IV to encrypted data (standard practice for AES-GCM)
		let fileDataBuffer: Buffer;
		if (iv && Array.isArray(iv)) {
			const ivBuffer = Buffer.from(iv);
			// Format: [IV (12 bytes)] [Encrypted Data]
			fileDataBuffer = Buffer.concat([ivBuffer, encryptedBuffer]);
		} else {
			// Fallback: just store encrypted data without IV prefix
			fileDataBuffer = encryptedBuffer;
		}

		// Step 4: Store encrypted data in PostgreSQL BYTEA using transaction with JWT claims
		await transaction(async (client) => {
			// Set JWT claims for RLS policy enforcement
			await setJWTClaims(client, locals.user.id, locals.user.role || 'employee');

			// Create dedicated table for file storage if it doesn't exist
			await client.query(
				`CREATE TABLE IF NOT EXISTS hr_public.encrypted_file_storage (
					storage_path TEXT PRIMARY KEY,
					encrypted_data BYTEA NOT NULL,
					filename VARCHAR(255) NOT NULL,
					file_type VARCHAR(50) NOT NULL,
					file_size INTEGER NOT NULL,
					uploaded_by UUID NOT NULL REFERENCES hr_public.users(id),
					uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
				)`
			);

			// Insert encrypted file data
			await client.query(
				`INSERT INTO hr_public.encrypted_file_storage (
					storage_path, encrypted_data, filename, file_type, file_size, uploaded_by
				) VALUES ($1, $2, $3, $4, $5, $6)`,
				[
					storagePath,
					fileDataBuffer,
					metadata.filename,
					metadata.fileType,
					metadata.fileSizeBytes,
					locals.user.id
				]
			);
		});

		logger.info(`File stored at: ${storagePath}, size: ${metadata.fileSizeBytes} bytes`);

		// Step 5: Return storage result
		return json(
			{
				storagePath,
				bytesStored: metadata.fileSizeBytes
			},
			{ status: 201 }
		);
	} catch (err) {
		logger.error('File storage error:', err as Error);

		if (err && typeof err === 'object' && 'status' in err) {
			throw err; // Re-throw SvelteKit errors
		}

		error(500, { message: 'Internal server error during file storage' });
	}
};
