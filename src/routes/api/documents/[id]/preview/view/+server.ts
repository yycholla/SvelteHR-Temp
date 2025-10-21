// Document preview view endpoint (Feature 024)
// GET /api/documents/[id]/preview/view - Serve document content for preview
// This endpoint serves the document content inline for preview in the browser

import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { transaction, setJWTClaims } from '$lib/server/db';

export const GET: RequestHandler = async ({ params, locals, url }) => {
	// Step 1: Validate authentication
	if (!locals.user) {
		throw error(401, { message: 'Authentication required' });
	}

	const documentId = params.id;
	const userId = locals.user.id;
	const userRole = locals.user.role || 'employee';
	const previewToken = url.searchParams.get('token');

	try {
		// Step 2: Retrieve document metadata and check access
		const { document, canAccess } = await transaction(async (client) => {
			// Set JWT claims for RLS
			await setJWTClaims(client, userId, userRole);

			// Query document with RLS policy enforcement
			const docResult = await client.query(
				`SELECT id, filename, file_type, file_size_bytes, storage_path,
				        is_deleted, uploaded_by, category, sensitivity_level,
				        encryption_key_id, metadata_tags
				 FROM hr_public.documents
				 WHERE id = $1 AND is_deleted = FALSE`,
				[documentId]
			);

			if (docResult.rows.length === 0) {
				return { document: null, canAccess: false };
			}

			const doc = docResult.rows[0];

			// Check access permissions
			let hasAccess = false;
			if (userRole === 'super_admin' || userRole === 'admin') {
				hasAccess = true;
			} else if (doc.uploaded_by === userId) {
				hasAccess = true; // User can view their own uploads
			} else {
				// Check document assignments
				const assignmentResult = await client.query(
					`SELECT EXISTS (
						SELECT 1 FROM hr_public.document_assignments
						WHERE document_id = $1 AND employee_id = $2
					) as assigned`,
					[documentId, userId]
				);
				hasAccess = assignmentResult.rows[0]?.assigned || false;
			}

			return { document: doc, canAccess: hasAccess };
		});

		if (!document) {
			throw error(404, { message: 'Document not found' });
		}

		if (!canAccess) {
			console.log(`Preview access denied for user ${userId} to document ${documentId}`);
			throw error(403, { message: 'Access denied. You do not have permission to preview this document.' });
		}

		// Step 3: Validate preview token (if token-based access is required)
		// TODO: In production, validate the preview token against a cache/database
		// For now, we rely on session authentication only
		if (previewToken) {
			console.log(`Preview token validation: ${previewToken}`);
			// TODO: Validate token expiration and association with document
		}

		// Step 4: Retrieve encrypted file from storage
		const encryptedFileResult = await transaction(async (client) => {
			await setJWTClaims(client, userId, userRole);

			const storageResult = await client.query(
				`SELECT encrypted_data
				 FROM hr_public.encrypted_file_storage
				 WHERE storage_path = $1`,
				[document.storage_path]
			);

			if (storageResult.rows.length === 0) {
				return null;
			}

			return storageResult.rows[0].encrypted_data;
		});

		if (!encryptedFileResult) {
			throw error(404, { message: 'Encrypted file not found in storage' });
		}

		// Step 5: Retrieve encryption key
		const encryptionKeyResult = await transaction(async (client) => {
			await setJWTClaims(client, userId, userRole);

			const keyResult = await client.query(
				`SELECT hr_public.decrypt_key_data(encrypted_key_data, key_identifier) as decrypted_key_raw
				 FROM hr_public.encryption_keys
				 WHERE id = $1 AND is_active = TRUE`,
				[document.encryption_key_id]
			);

			if (keyResult.rows.length === 0) {
				return null;
			}

			return keyResult.rows[0].decrypted_key_raw;
		});

		if (!encryptionKeyResult) {
			throw error(500, { message: 'Encryption key not found or inactive' });
		}

		// Step 6: Decrypt the file using Node.js crypto
		const crypto = await import('crypto');

		const encryptedDataBuffer = Buffer.from(encryptedFileResult);

		// The key is returned as a Buffer (BYTEA from PostgreSQL)
		let key: Buffer;

		// Check if the result is a Buffer or needs conversion
		if (Buffer.isBuffer(encryptionKeyResult)) {
			key = encryptionKeyResult;
		} else if (typeof encryptionKeyResult === 'string') {
			// If it's a string, it might be base64-encoded
			key = Buffer.from(encryptionKeyResult, 'base64');
		} else {
			// Unknown format
			key = Buffer.from(encryptionKeyResult);
		}

		console.log(`Key type: ${typeof encryptionKeyResult}, isBuffer: ${Buffer.isBuffer(encryptionKeyResult)}, length: ${key.length}`);

		// Validate key length
		if (key.length !== 32) {
			// Try decoding from base64 if it's 44 bytes (likely base64-encoded)
			if (key.length === 44 || key.length === 43) {
				const base64Key = key.toString('utf8');
				key = Buffer.from(base64Key, 'base64');
				console.log(`Decoded key from base64, new length: ${key.length}`);
			}

			if (key.length !== 32) {
				throw error(500, {
					message: `Invalid encryption key length: ${key.length} bytes (expected 32 bytes for AES-256)`
				});
			}
		}

		// Extract IV and decrypt
		// Format for NEW uploads: [IV (12 bytes)] [Ciphertext + Auth Tag]
		// Format for OLD uploads: [Ciphertext + Auth Tag], IV in metadata
		const IV_LENGTH = 12;
		const AUTH_TAG_LENGTH = 16;

		let decryptedData: Buffer;

		// Parse metadata tags to check for IV
		const metadataTags = typeof document.metadata_tags === 'string'
			? JSON.parse(document.metadata_tags)
			: document.metadata_tags;

		console.log(`Encrypted data length: ${encryptedDataBuffer.length}, has metadata IV: ${!!metadataTags?.iv}`);

		// Check if IV is in metadata
		if (metadataTags?.iv && Array.isArray(metadataTags.iv)) {
			const iv = Buffer.from(metadataTags.iv);

			console.log(`Using IV from metadata, IV length: ${iv.length}, encrypted buffer length: ${encryptedDataBuffer.length}`);

			// Check if IV is ALSO prepended to the encrypted data (new format)
			// Compare first 12 bytes of encrypted data with metadata IV
			const isPrependedIV = encryptedDataBuffer.length >= IV_LENGTH &&
				encryptedDataBuffer.slice(0, IV_LENGTH).equals(iv);

			let authTag: Buffer;
			let ciphertext: Buffer;

			if (isPrependedIV) {
				// NEW FORMAT: IV in metadata AND prepended to data
				// Format: [IV (12 bytes)][Ciphertext][Auth Tag (16 bytes)]
				console.log('Detected prepended IV matching metadata IV - using new format');
				authTag = encryptedDataBuffer.slice(-AUTH_TAG_LENGTH);
				ciphertext = encryptedDataBuffer.slice(IV_LENGTH, -AUTH_TAG_LENGTH);
			} else {
				// OLD FORMAT: IV only in metadata, not prepended
				// Format: [Ciphertext][Auth Tag (16 bytes)]
				console.log('IV only in metadata - using old format');
				authTag = encryptedDataBuffer.slice(-AUTH_TAG_LENGTH);
				ciphertext = encryptedDataBuffer.slice(0, -AUTH_TAG_LENGTH);
			}

			console.log(`IV: ${iv.toString('hex').substring(0, 24)}...`);
			console.log(`Auth tag (first 8 bytes): ${authTag.slice(0, 8).toString('hex')}`);
			console.log(`Ciphertext length: ${ciphertext.length}, first 16 bytes: ${ciphertext.slice(0, 16).toString('hex')}`);
			console.log(`Key (first 8 bytes): ${key.slice(0, 8).toString('hex')}`);

			try {
				const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
				decipher.setAuthTag(authTag);

				decryptedData = Buffer.concat([
					decipher.update(ciphertext),
					decipher.final()
				]);

				console.log(`Document ${documentId} decrypted using IV from metadata - ${decryptedData.length} bytes`);
			} catch (decryptError) {
				console.error('Decryption failed:', decryptError);
				throw error(500, {
					message: `Decryption failed: ${decryptError instanceof Error ? decryptError.message : 'Unknown error'}. IV length: ${iv.length}, Ciphertext: ${ciphertext.length}, Auth tag: ${authTag.length}`
				});
			}
		} else if (encryptedDataBuffer.length >= IV_LENGTH + AUTH_TAG_LENGTH) {
			// NEW FORMAT: IV prepended to encrypted data
			const iv = encryptedDataBuffer.slice(0, IV_LENGTH);
			const authTag = encryptedDataBuffer.slice(-AUTH_TAG_LENGTH);
			const ciphertext = encryptedDataBuffer.slice(IV_LENGTH, -AUTH_TAG_LENGTH);

			console.log(`Using prepended IV, IV length: ${iv.length}, Ciphertext: ${ciphertext.length}, Auth tag: ${authTag.length}`);

			try {
				const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
				decipher.setAuthTag(authTag);

				decryptedData = Buffer.concat([
					decipher.update(ciphertext),
					decipher.final()
				]);

				console.log(`Document ${documentId} decrypted using prepended IV - ${decryptedData.length} bytes`);
			} catch (decryptError) {
				console.error('Decryption failed:', decryptError);
				throw error(500, {
					message: `Decryption failed: ${decryptError instanceof Error ? decryptError.message : 'Unknown error'}`
				});
			}
		} else {
			throw error(500, {
				message: `Invalid encrypted data format: ${encryptedDataBuffer.length} bytes, no IV in metadata`
			});
		}

		// Step 7: Log preview access
		await transaction(async (client) => {
			await setJWTClaims(client, userId, userRole);
			await client.query(
				`INSERT INTO hr_public.document_access_logs (
					document_id, user_id, access_type, access_outcome, user_agent
				) VALUES ($1, $2, $3, $4, $5)`,
				[
					documentId,
					userId,
					'view',
					'success',
					`Preview: ${document.filename}`
				]
			);
		});

		console.log(`Document ${documentId} previewed by user ${userId} - decrypted ${decryptedData.length} bytes`);

		// Step 8: Determine content type for inline display
		const contentType = getContentType(document.file_type);

		// Step 9: Serve decrypted file content inline (not as download)
		return new Response(decryptedData, {
			status: 200,
			headers: {
				'Content-Type': contentType,
				'Content-Disposition': `inline; filename="${document.filename}"`,
				'Content-Length': decryptedData.length.toString(),
				'X-Document-ID': documentId,
				'X-File-Type': document.file_type,
				'Cache-Control': 'private, max-age=900', // Cache for 15 minutes
				// Allow iframe embedding for preview modal
				'X-Frame-Options': 'SAMEORIGIN',
				'Content-Security-Policy': "frame-ancestors 'self'"
			}
		});

	} catch (err) {
		console.error('Document preview view error:', err);

		// Log failed preview attempt
		try {
			await transaction(async (client) => {
				await setJWTClaims(client, userId, userRole);
				await client.query(
					`INSERT INTO hr_public.document_access_logs (
						document_id, user_id, access_type, access_outcome, user_agent
					) VALUES ($1, $2, $3, $4, $5)`,
					[
						documentId,
						userId,
						'view',
						'denied',
						`Preview failed: ${err instanceof Error ? err.message : 'Unknown error'}`
					]
				);
			});
		} catch (logError) {
			console.error('Failed to log preview error:', logError);
		}

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, { message: 'Internal server error during preview' });
	}
};

/**
 * Get appropriate MIME type for file type
 */
function getContentType(fileType: string): string {
	const mimeTypes: Record<string, string> = {
		'PDF': 'application/pdf',
		'JPEG': 'image/jpeg',
		'PNG': 'image/png',
		'GIF': 'image/gif',
		'TXT': 'text/plain; charset=utf-8',
		'CSV': 'text/csv; charset=utf-8',
		'DOCX': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		'XLSX': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
	};

	return mimeTypes[fileType] || 'application/octet-stream';
}
