// Encryption key management API endpoint (Feature 024)
// POST /api/encryption/keys - Register new encryption key
// GET /api/encryption/keys - List user's encryption keys

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { encryptionKeySchema } from '$lib/schemas/encryptionSchemas';
import { transaction, setJWTClaims } from '$lib/server/db';

// POST - Register new encryption key
export const POST: RequestHandler = async ({ request, locals }) => {
	// Step 1: Validate authentication
	if (!locals.user) {
		throw error(401, { message: 'Authentication required' });
	}

	try {
		// Step 2: Parse request body
		const body = await request.json();

		// Step 3: Validate with Zod schema
		const validatedData = encryptionKeySchema.parse(body);

		// Step 4: Generate key ID and store in database with pgcrypto encryption
		const keyId = crypto.randomUUID();

		// Convert base64 to bytea for storage
		const keyDataBuffer = Buffer.from(validatedData.encryptedKeyData, 'base64');

		// Use transaction with JWT claims for RLS policies
		const result = await transaction(async (client) => {
			// Set JWT claims for RLS policy enforcement
			await setJWTClaims(client, locals.user.id, locals.user.role || 'employee');

			return await client.query(
				`INSERT INTO hr_public.encryption_keys (
					id, key_identifier, encrypted_key_data, key_algorithm, created_for_user
				) VALUES ($1, $2, hr_public.encrypt_key_data($3, $4), $5, $6)
				RETURNING id, created_at`,
				[
					keyId,
					validatedData.keyIdentifier,
					keyDataBuffer,
					validatedData.keyIdentifier,
					validatedData.keyAlgorithm,
					locals.user.id
				]
			);
		});

		const createdAt = result.rows[0].created_at;

		console.log(`Encryption key registered: ${keyId} for user ${locals.user.id}`);

		// Step 5: Return success response
		return json({
			keyId,
			createdAt: createdAt.toISOString()
		}, { status: 201 });

	} catch (err) {
		console.error('Encryption key registration error:', err);
		console.error('Error details:', {
			name: err?.name,
			message: err?.message,
			stack: err?.stack,
			code: err?.code
		});

		if (err && typeof err === 'object' && 'issues' in err) {
			throw error(400, { message: 'Invalid key data', errors: err });
		}

		throw error(500, {
			message: 'Internal server error during key registration',
			details: err?.message || 'Unknown error'
		});
	}
};

// GET - List user's encryption keys
export const GET: RequestHandler = async ({ url, locals }) => {
	// Step 1: Validate authentication
	if (!locals.user) {
		throw error(401, { message: 'Authentication required' });
	}

	try {
		// Step 2: Check for key identifier query param
		const keyIdentifier = url.searchParams.get('identifier');

		// Use transaction with JWT claims for RLS policies
		const result = await transaction(async (client) => {
			// Set JWT claims for RLS policy enforcement
			await setJWTClaims(client, locals.user.id, locals.user.role || 'employee');

			if (keyIdentifier) {
				// Return specific key by identifier
				return await client.query(
					`SELECT
						id as "keyId",
						encode(hr_public.decrypt_key_data(encrypted_key_data, key_identifier), 'base64') as "encryptedKeyData",
						key_algorithm as "keyAlgorithm",
						created_at as "createdAt"
					FROM hr_public.encryption_keys
					WHERE key_identifier = $1 AND created_for_user = $2 AND is_active = TRUE`,
					[keyIdentifier, locals.user.id]
				);
			}

			// Return all keys for user
			return await client.query(
				`SELECT
					id as "keyId",
					key_identifier as "keyIdentifier",
					key_algorithm as "keyAlgorithm",
					created_at as "createdAt",
					is_active as "isActive"
				FROM hr_public.encryption_keys
				WHERE created_for_user = $1
				ORDER BY created_at DESC`,
				[locals.user.id]
			);
		});

		if (keyIdentifier && result.rows.length === 0) {
			throw error(404, { message: 'Encryption key not found' });
		}

		return json(keyIdentifier ? result.rows[0] : result.rows);

	} catch (err) {
		console.error('Encryption key retrieval error:', err);
		throw error(500, { message: 'Internal server error during key retrieval' });
	}
};
