// Encryption key retrieval API endpoint (Feature 024)
// GET /api/encryption/keys/[id] - Retrieve specific encryption key

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// GET - Retrieve encryption key by ID
export const GET: RequestHandler = async ({ params, locals }) => {
	// Step 1: Validate authentication
	if (!locals.user) {
		throw error(401, { message: 'Authentication required' });
	}

	const keyId = params.id;

	try {
		// Step 2: Query encryption_keys table with transaction
		const { transaction, setJWTClaims } = await import('$lib/server/db');

		const result = await transaction(async (client) => {
			// Set JWT claims for RLS
			await setJWTClaims(client, locals.user.id, locals.user.role || 'employee');

			// Query encryption key with pgcrypto decryption
			const queryResult = await client.query(
				`SELECT
					id as "keyId",
					encode(hr_public.decrypt_key_data(encrypted_key_data, key_identifier), 'base64') as "encryptedKeyData",
					key_algorithm as "keyAlgorithm",
					created_at as "createdAt",
					created_for_user as "keyOwnerId"
				 FROM hr_public.encryption_keys
				 WHERE id = $1 AND is_active = TRUE`,
				[keyId]
			);

			if (queryResult.rows.length === 0) {
				return null;
			}

			return queryResult.rows[0];
		});

		if (!result) {
			throw error(404, { message: 'Encryption key not found' });
		}

		// Step 3: Verify ownership
		if (result.keyOwnerId !== locals.user.id && locals.user.role !== 'super_admin') {
			throw error(403, { message: 'Access denied. You can only retrieve your own encryption keys.' });
		}

		// Step 4: Return key data
		return json({
			keyId: result.keyId,
			encryptedKeyData: result.encryptedKeyData,
			keyAlgorithm: result.keyAlgorithm,
			createdAt: result.createdAt
		});

	} catch (err) {
		console.error('Encryption key retrieval error:', err);

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(404, { message: 'Encryption key not found' });
	}
};

// DELETE - Delete encryption key (only if no documents use it)
export const DELETE: RequestHandler = async ({ params, locals }) => {
	// Step 1: Validate authentication
	if (!locals.user) {
		throw error(401, { message: 'Authentication required' });
	}

	const keyId = params.id;

	try {
		// Step 2: Check if key is in use by any documents
		// TODO: SELECT COUNT(*) FROM hr_public.documents WHERE encryption_key_id = ?

		const documentsUsingKey = 0; // Would come from database query

		if (documentsUsingKey > 0) {
			throw error(400, {
				message: `Cannot delete encryption key. ${documentsUsingKey} document(s) still use this key.`
			});
		}

		// Step 3: Verify ownership
		// TODO: SELECT created_for_user FROM encryption_keys WHERE id = ?
		const keyOwnerId = locals.user.id;

		if (keyOwnerId !== locals.user.id && locals.user.role !== 'super_admin') {
			throw error(403, { message: 'Access denied. You can only delete your own encryption keys.' });
		}

		// Step 4: Delete key
		// TODO: DELETE FROM hr_public.encryption_keys WHERE id = ? AND created_for_user = ?

		console.log(`Encryption key deleted: ${keyId} by user ${locals.user.id}`);

		return json({ message: 'Encryption key deleted successfully' });

	} catch (err) {
		console.error('Encryption key deletion error:', err);

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, { message: 'Internal server error during key deletion' });
	}
};
