// Document management endpoints (Feature 024)
// DELETE /api/documents/[id] - Soft delete a document

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { transaction, setJWTClaims } from '$lib/server/db';

export const DELETE: RequestHandler = async ({ params, locals, request }) => {
	// Step 1: Validate authentication
	if (!locals.user) {
		throw error(401, { message: 'Authentication required' });
	}

	const documentId = params.id;
	const userId = locals.user.id;
	const userRole = locals.user.role || 'employee';

	// Step 2: Check if user has delete permissions
	if (userRole !== 'super_admin' && userRole !== 'admin') {
		throw error(403, {
			message: 'Insufficient permissions. Only administrators can delete documents.'
		});
	}

	try {
		console.log(`[DELETE] Starting delete for document ${documentId} by user ${userId} (${userRole})`);

		// Step 3: Perform soft delete and log the action
		const result = await transaction(async (client) => {
			// Set JWT claims for RLS
			await setJWTClaims(client, userId, userRole);
			console.log(`[DELETE] JWT claims set for user ${userId}`);

			// Check if document exists
			const checkResult = await client.query(
				`SELECT id, filename, is_deleted FROM hr_public.documents WHERE id = $1`,
				[documentId]
			);
			console.log(`[DELETE] Document query result: ${checkResult.rows.length} rows`);

			if (checkResult.rows.length === 0) {
				console.log(`[DELETE] Document not found: ${documentId}`);
				return { success: false, error: 'Document not found' };
			}

			const document = checkResult.rows[0];
			console.log(`[DELETE] Document found: ${document.filename}, is_deleted: ${document.is_deleted}`);

			if (document.is_deleted) {
				console.log(`[DELETE] Document already deleted: ${documentId}`);
				return { success: false, error: 'Document is already deleted' };
			}

			// Soft delete the document
			console.log(`[DELETE] Performing soft delete on document ${documentId}`);
			await client.query(
				`UPDATE hr_public.documents
				 SET is_deleted = true
				 WHERE id = $1`,
				[documentId]
			);
			console.log(`[DELETE] Document marked as deleted`);

			// Log the deletion in access logs
			const clientIp =
				request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
				request.headers.get('x-real-ip')?.trim() ||
				null; // Use NULL for inet type when IP is unknown
			const userAgent = request.headers.get('user-agent') || null;

			console.log(`[DELETE] Logging access: ip=${clientIp}, ua=${userAgent}`);
			// Note: Using 'view' access_type since 'delete' is not a valid access_type
			// Valid types are: 'view', 'download', 'preview' (see migrations/20251007_010_create_access_logs.sql)
			await client.query(
				`INSERT INTO hr_public.document_access_logs
				 (document_id, user_id, access_type, access_outcome, ip_address, user_agent)
				 VALUES ($1, $2, $3, $4, $5, $6)`,
				[documentId, userId, 'view', 'success', clientIp, userAgent]
			);
			console.log(`[DELETE] Access log created successfully`);

			return { success: true, filename: document.filename };
		});

		console.log(`[DELETE] Transaction completed, result:`, result);

		if (!result.success) {
			console.log(`[DELETE] Transaction failed: ${result.error}`);
			throw error(400, { message: result.error || 'Failed to delete document' });
		}

		return json({
			success: true,
			message: `Document "${result.filename}" has been deleted successfully.`
		});
	} catch (err) {
		console.error('[DELETE] Document delete error:', err);
		console.error('[DELETE] Error stack:', (err as Error).stack);

		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Generic error fallback
		throw error(500, {
			message: 'Failed to delete document. Please try again later.'
		});
	}
};
