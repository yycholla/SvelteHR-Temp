// Document download API endpoint (Feature 024)
// GET /api/documents/[id]/download - Download document (with decryption if encrypted)

import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { retrieveAndDecryptFile } from '$lib/server/encryption';

export const GET: RequestHandler = async ({ params, locals }) => {
	// Step 1: Validate authentication
	if (!locals.user) {
		throw error(401, { message: 'Authentication required' });
	}

	const documentId = params.id;
	const userId = locals.user.id;
	const userRole = locals.user.role || 'employee';

	try {
		// Step 2: Retrieve document and check RBAC access
		const { transaction, setJWTClaims } = await import('$lib/server/db');

		const { document, canAccess } = await transaction(async (client) => {
			// Set JWT claims for RLS
			await setJWTClaims(client, userId, userRole);

			// Query document with RLS policy enforcement
			const docResult = await client.query(
				`SELECT id, title, mime_type, file_size, file_path,
				        deleted_at, uploaded_by, is_encrypted
				 FROM hr_public.documents
				 WHERE id = $1`,
				[documentId]
			);

			if (docResult.rows.length === 0) {
				return { document: null, canAccess: false };
			}

			const doc = docResult.rows[0];

			// Check if deleted
			if (doc.deleted_at && userRole !== 'super_admin') {
				return { document: null, canAccess: false };
			}

			// Check access permissions
			let hasAccess = false;
			if (userRole === 'super_admin' || userRole === 'admin') {
				hasAccess = true;
			} else if (doc.uploaded_by === userId) {
				hasAccess = true; // User can download their own uploads
			} else {
				// Check document assignments
				const assignmentResult = await client.query(
					`SELECT EXISTS (
						SELECT 1 FROM hr_public.document_assignments
						WHERE document_id = $1 AND user_id = $2
						  AND deleted_at IS NULL
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
			// Log denied access
			console.log(`Access denied for user ${userId} to document ${documentId}`);
			throw error(403, { message: 'Access denied. You do not have permission to download this document.' });
		}

		// Step 4: Retrieve and decrypt file if encrypted
		let fileData: Buffer;

		if (document.is_encrypted) {
			// Retrieve encrypted file and decrypt it
			const { transaction: fileTransaction } = await import('$lib/server/db');

			fileData = await fileTransaction(async (client) => {
				return await retrieveAndDecryptFile(client, documentId);
			});

			console.log(`Encrypted document ${documentId} decrypted for user ${userId}`);
		} else {
			// For non-encrypted files, read from file system
			// TODO: Implement file system or S3 retrieval
			// For now, return error for non-encrypted files
			throw error(501, { message: 'Non-encrypted file download not yet implemented' });
		}

		// Step 5: Log successful download
		// TODO: INSERT INTO document_access_logs (
		//   document_id, user_id, access_type, access_timestamp,
		//   ip_address, user_agent, access_outcome
		// ) VALUES (?, ?, 'download', NOW(), ?, ?, 'success')

		console.log(`Document ${documentId} downloaded by user ${userId}`);

		// Step 6: Stream decrypted file to client
		return new Response(fileData, {
			status: 200,
			headers: {
				'Content-Type': document.mime_type,
				'Content-Disposition': `attachment; filename="${document.title}"`,
				'Content-Length': fileData.length.toString(),
				'X-Document-ID': documentId,
				'X-Original-Filename': document.title
			}
		});

	} catch (err) {
		console.error('Document download error:', err);

		// Log failed download attempt
		// TODO: INSERT INTO document_access_logs with access_outcome = 'denied'

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, { message: 'Internal server error during document download' });
	}
};
