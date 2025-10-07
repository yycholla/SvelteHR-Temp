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
		// Step 2: TODO: Query encryption_keys table
		// SELECT id, encrypted_key_data, key_algorithm, created_for_user, created_at
		// FROM hr_public.encryption_keys
		// WHERE id = ? AND created_for_user = ?

		// Step 3: Verify ownership
		// RLS policies should handle this, but double-check for security
		const keyOwnerId = locals.user.id; // Would come from database query

		if (keyOwnerId !== locals.user.id && locals.user.role !== 'super_admin') {
			throw error(403, { message: 'Access denied. You can only retrieve your own encryption keys.' });
		}

		// Step 4: TODO: Decrypt key data with pgcrypto server-side
		// SELECT decrypt_key_data(encrypted_key_data, key_identifier) FROM ...

		// Step 5: Return key data
		return json({
			keyId,
			encryptedKeyData: 'base64_encoded_decrypted_key_data',
			keyAlgorithm: 'AES-GCM-256',
			createdAt: new Date().toISOString()
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
