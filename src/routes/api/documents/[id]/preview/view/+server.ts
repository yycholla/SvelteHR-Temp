// Document preview view endpoint (Feature 024)
// GET /api/documents/[id]/preview/view - Serve document content for preview
// This endpoint serves the document content inline for preview in the browser

import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { transaction, setJWTClaims } from '$lib/server/db';
import { retrieveAndDecryptFile } from '$lib/server/encryption';

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
				`SELECT id, title, mime_type, file_size, file_path,
				        deleted_at, uploaded_by, is_encrypted
				 FROM hr_public.documents
				 WHERE id = $1 AND deleted_at IS NULL`,
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

		// Step 4: Retrieve and decrypt file if encrypted
		let decryptedData: Buffer;

		if (document.is_encrypted) {
			// Retrieve encrypted file and decrypt it
			decryptedData = await transaction(async (client) => {
				return await retrieveAndDecryptFile(client, documentId);
			});

			console.log(`Encrypted document ${documentId} decrypted for preview - ${decryptedData.length} bytes`);
		} else {
			// For non-encrypted files, read from file system
			// TODO: Implement file system or S3 retrieval
			throw error(501, { message: 'Non-encrypted file preview not yet implemented' });
		}

		// Step 5: Log preview access
		await transaction(async (client) => {
			await setJWTClaims(client, userId, userRole);
			await client.query(
				`INSERT INTO hr_public.document_access_logs (
					document_id, user_id, access_type
				) VALUES ($1, $2, $3)`,
				[
					documentId,
					userId,
					'view'
				]
			);
		});

		console.log(`Document ${documentId} previewed by user ${userId} - decrypted ${decryptedData.length} bytes`);

		// Step 6: Serve decrypted file content inline (not as download)
		return new Response(decryptedData, {
			status: 200,
			headers: {
				'Content-Type': document.mime_type,
				'Content-Disposition': `inline; filename="${document.title}"`,
				'Content-Length': decryptedData.length.toString(),
				'X-Document-ID': documentId,
				'X-File-Type': document.mime_type,
				'Cache-Control': 'private, max-age=900', // Cache for 15 minutes
				// Allow iframe embedding for preview modal
				'X-Frame-Options': 'SAMEORIGIN',
				'Content-Security-Policy': "frame-ancestors 'self'"
			}
		});

	} catch (err) {
		console.error('Document preview view error:', err);

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, { message: 'Internal server error during preview' });
	}
};
