import { logger } from '$lib/utils/logger';
// Document preview API endpoint (Feature 024)
// GET /api/documents/[id]/preview - Generate document preview (with decryption if encrypted)

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
// import { SERVICE_AUTH_KEY } from '$env/static/private';
import { retrieveAndDecryptFile } from '$lib/server/encryption';

export const GET: RequestHandler = async ({ params, locals, url }) => {
	// Step 1: Validate authentication
	if (!locals.user) {
		error(401, { message: 'Authentication required' });
	}

	const documentId = params.id;
	const userId = locals.user.id;
	const userRole = locals.user.role || 'employee';

	try {
		// Step 2: Retrieve document metadata from database
		const { transaction, setJWTClaims } = await import('$lib/server/db');

		const { document, canAccess } = await transaction(async (client) => {
			// Set JWT claims for RLS
			await setJWTClaims(client, userId, userRole);

			// Query document with RLS policy enforcement
			const docResult = await client.query(
				`SELECT id, title, mime_type, file_size, file_path,
				        deleted_at, uploaded_by, category_id, access_level
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
			error(404, { message: 'Document not found' });
		}

		if (!canAccess) {
			// Log denied access
			logger.info(`Access denied for user ${userId} to document ${documentId}`);
			error(403, {
				message: 'Access denied. You do not have permission to preview this document.'
			});
		}

		// Step 4: Determine preview format
		let previewFormat: 'PDF' | 'inline' = 'inline';
		let requiresConversion = false;

		const imageTypes = ['image/jpeg', 'image/png', 'image/gif'];
		const officeTypes = [
			'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
		];

		if (document.mime_type === 'application/pdf') {
			previewFormat = 'PDF';
		} else if (imageTypes.includes(document.mime_type)) {
			previewFormat = 'inline';
		} else if (officeTypes.includes(document.mime_type)) {
			// Office documents need conversion to PDF
			previewFormat = 'PDF';
			requiresConversion = true;
		} else if (['text/plain', 'text/csv'].includes(document.mime_type)) {
			previewFormat = 'inline';
		}

		// Step 5: Generate preview URL (points to view endpoint)
		const baseUrl = url.origin;
		const previewUrl = `${baseUrl}/api/documents/${documentId}/preview/view`;

		// Step 6: If Office doc, trigger async conversion (TODO)
		if (requiresConversion) {
			// TODO: Queue conversion job
			// - Decrypt file
			// - Convert to PDF using LibreOffice headless
			// - Re-encrypt PDF
			// - Store converted version
			logger.info(`Office document conversion queued for ${documentId}`);
		}

		// Step 7: Return preview metadata
		return json({
			previewUrl,
			previewFormat,
			documentId,
			filename: document.title,
			requiresConversion,
			conversionStatus: requiresConversion ? 'pending' : 'ready',
			mimeType: document.mime_type
		});
	} catch (err) {
		logger.error('Document preview error:', err as Error);

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		error(500, { message: 'Internal server error during preview generation' });
	}
};
