// Employee document assignment endpoint (Feature 024)
// POST /api/employees/[id]/assign-documents - Assign documents to an employee

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { transaction, setJWTClaims } from '$lib/server/db';

export const POST: RequestHandler = async ({ params, locals, request }) => {
	// Step 1: Validate authentication
	if (!locals.user) {
		throw error(401, { message: 'Authentication required' });
	}

	const employeeId = params.id;
	const userId = locals.user.id;
	const userRole = locals.user.role || 'employee';

	// Step 2: Check if user has assign permissions (admin only)
	if (userRole !== 'super_admin' && userRole !== 'admin') {
		throw error(403, {
			message: 'Insufficient permissions. Only administrators can assign documents to employees.'
		});
	}

	try {
		// Step 3: Parse request body
		const body = await request.json();
		const { documentIds } = body;

		if (!Array.isArray(documentIds) || documentIds.length === 0) {
			throw error(400, { message: 'Invalid request: documentIds must be a non-empty array' });
		}

		console.log(`[ASSIGN DOCS] User ${userId} assigning ${documentIds.length} documents to employee ${employeeId}`);

		// Step 4: Perform bulk assignment
		const result = await transaction(async (client) => {
			// Set JWT claims for RLS
			await setJWTClaims(client, userId, userRole);

			// Verify employee exists
			const employeeCheck = await client.query(
				`SELECT id, email FROM hr_public.users WHERE id = $1`,
				[employeeId]
			);

			if (employeeCheck.rows.length === 0) {
				return { success: false, error: 'Employee not found' };
			}

			const employee = employeeCheck.rows[0];

			// Verify all documents exist and are not deleted
			const docsCheck = await client.query(
				`SELECT id, filename FROM hr_public.documents
				 WHERE id = ANY($1) AND is_deleted = false`,
				[documentIds]
			);

			if (docsCheck.rows.length !== documentIds.length) {
				return {
					success: false,
					error: `Some documents not found or deleted. Found ${docsCheck.rows.length} of ${documentIds.length} requested.`
				};
			}

			// Check which documents are already assigned
			const existingAssignments = await client.query(
				`SELECT document_id FROM hr_public.document_assignments
				 WHERE document_id = ANY($1) AND employee_id = $2`,
				[documentIds, employeeId]
			);

			const existingDocIds = existingAssignments.rows.map((row) => row.document_id);
			const newDocIds = documentIds.filter((id) => !existingDocIds.includes(id));

			// Insert new assignments
			let assignedCount = 0;
			if (newDocIds.length > 0) {
				const values = newDocIds
					.map((_, i) => `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`)
					.join(', ');

				const params = newDocIds.flatMap((docId) => [docId, employeeId, userId]);

				await client.query(
					`INSERT INTO hr_public.document_assignments
					 (document_id, employee_id, assigned_by)
					 VALUES ${values}`,
					params
				);

				assignedCount = newDocIds.length;
			}

			// Log the assignments in access logs
			const clientIp =
				request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
				request.headers.get('x-real-ip')?.trim() ||
				null;
			const userAgent = request.headers.get('user-agent') || null;

			for (const docId of newDocIds) {
				await client.query(
					`INSERT INTO hr_public.document_access_logs
					 (document_id, user_id, access_type, access_outcome, ip_address, user_agent)
					 VALUES ($1, $2, $3, $4, $5, $6)`,
					[docId, userId, 'view', 'success', clientIp, userAgent]
				);
			}

			return {
				success: true,
				assignedCount,
				skippedCount: existingDocIds.length,
				employeeEmail: employee.email
			};
		});

		if (!result.success) {
			throw error(400, { message: result.error || 'Failed to assign documents' });
		}

		console.log(`[ASSIGN DOCS] Successfully assigned ${result.assignedCount} documents, skipped ${result.skippedCount} already assigned`);

		return json({
			success: true,
			message: `Successfully assigned ${result.assignedCount} document(s) to ${result.employeeEmail}`,
			assignedCount: result.assignedCount,
			skippedCount: result.skippedCount
		});
	} catch (err) {
		console.error('[ASSIGN DOCS] Error:', err);

		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Generic error fallback
		throw error(500, {
			message: 'Failed to assign documents. Please try again later.'
		});
	}
};
