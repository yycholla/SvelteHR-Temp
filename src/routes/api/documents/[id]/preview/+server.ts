// Document preview API endpoint (Feature 024)
// GET /api/documents/[id]/preview - Generate document preview URL

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals, url }) => {
	// Step 1: Validate authentication
	if (!locals.user) {
		throw error(401, { message: 'Authentication required' });
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
				`SELECT id, filename, file_type, file_size_bytes, storage_path,
				        is_deleted, uploaded_by, category, sensitivity_level
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
			// Log denied access
			console.log(`Access denied for user ${userId} to document ${documentId}`);
			throw error(403, { message: 'Access denied. You do not have permission to preview this document.' });
		}

		// Step 4: Determine preview format
		let previewFormat: 'PDF' | 'inline' = 'inline';
		let requiresConversion = false;

		const imageTypes = ['JPEG', 'PNG', 'GIF'];
		const officeTypes = ['DOCX', 'XLSX'];

		if (document.file_type === 'PDF') {
			previewFormat = 'PDF';
		} else if (imageTypes.includes(document.file_type)) {
			previewFormat = 'inline';
		} else if (officeTypes.includes(document.file_type)) {
			// Office documents need conversion to PDF
			previewFormat = 'PDF';
			requiresConversion = true;
		} else if (['TXT', 'CSV'].includes(document.file_type)) {
			previewFormat = 'inline';
		}

		// Step 5: Generate signed preview URL with expiration
		// In production, this would create a signed JWT or temporary token
		const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
		const previewToken = crypto.randomUUID(); // Simplified - would be signed JWT

		// TODO: Store preview token in cache/database with expiration
		// INSERT INTO preview_tokens (token, document_id, user_id, expires_at)
		// VALUES (?, ?, ?, ?)

		const baseUrl = url.origin;
		const previewUrl = `${baseUrl}/api/documents/${documentId}/preview/view?token=${previewToken}`;

		// Step 6: If Office doc, trigger async conversion (TODO)
		if (requiresConversion) {
			// TODO: Queue conversion job
			// - Decrypt file
			// - Convert to PDF using LibreOffice headless
			// - Re-encrypt PDF
			// - Store converted version
			// - Update preview URL when ready
			console.log(`Office document conversion queued for ${documentId}`);
		}

		// Step 7: Log preview access
		// TODO: INSERT INTO document_access_logs
		console.log(`Document ${documentId} preview generated for user ${userId}`);

		// Step 8: Return preview metadata
		return json({
			previewUrl,
			expiresAt: expiresAt.toISOString(),
			previewFormat,
			documentId,
			filename: document.filename,
			requiresConversion,
			conversionStatus: requiresConversion ? 'pending' : 'ready'
		});

	} catch (err) {
		console.error('Document preview error:', err);

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, { message: 'Internal server error during preview generation' });
	}
};
