// Document upload API endpoint (Feature 024)
// POST /api/documents/upload
// Handles encrypted document upload with metadata and assignments

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { documentUploadSchema } from '$lib/schemas/documentSchemas';
import { z } from 'zod';
import { transaction, setJWTClaims } from '$lib/server/db';

export const POST: RequestHandler = async ({ request, locals }) => {
	// Step 1: Validate authentication
	if (!locals.user) {
		throw error(401, { message: 'Authentication required' });
	}

	// Step 2: Check authorization (Admin or Super Admin only can upload)
	const userRole = locals.user.role || 'employee';
	if (!['admin', 'super_admin'].includes(userRole)) {
		throw error(403, { message: 'Insufficient permissions. Admin role required.' });
	}

	try {
		// Step 3: Parse request body
		const body = await request.json();
		console.log('[Upload API] Received request body:', JSON.stringify(body, null, 2));

		// Step 4: Validate upload data
		const uploadData = {
			file: {
				name: body.filename,
				size: body.fileSizeBytes,
				type: `application/${body.fileType.toLowerCase()}`
			},
			metadata: {
				filename: body.filename,
				category: body.category,
				sensitivityLevel: body.sensitivityLevel,
				expirationDate: body.expirationDate ? new Date(body.expirationDate) : undefined,
				metadataTags: body.metadataTags,
				assignToEmployees: body.assignToEmployees,
				assignToDepartments: body.assignToDepartments
			}
		};

		// Basic validation
		if (!body.filename || !body.fileSizeBytes || !body.storagePath || !body.encryptionKeyId) {
			throw error(400, { message: 'Missing required fields' });
		}

		// Validate file size (50MB max)
		if (body.fileSizeBytes > 52428800) {
			throw error(413, { message: 'File size exceeds 50MB limit' });
		}

		// Validate file type
		const allowedTypes = ['PDF', 'JPEG', 'PNG', 'GIF', 'DOCX', 'XLSX', 'TXT', 'CSV'];
		if (!allowedTypes.includes(body.fileType.toUpperCase())) {
			throw error(400, { message: `Invalid file type. Allowed: ${allowedTypes.join(', ')}` });
		}

		// Step 5: Create document record in database with transaction and JWT claims
		const documentId = crypto.randomUUID();

		const { uploadedAt } = await transaction(async (client) => {
			// Set JWT claims for RLS policy enforcement
			await setJWTClaims(client, locals.user.id, userRole);

			// Include IV in metadata_tags for backward compatibility (also prepended to encrypted data)
			const metadataTags = {
				...(body.metadataTags || {}),
				iv: body.iv // Store IV array for backward compatibility
			};

			// Insert document record
			const result = await client.query(
				`INSERT INTO hr_public.documents (
					id, filename, file_type, file_size_bytes, storage_path,
					encryption_key_id, uploaded_by, category, sensitivity_level,
					expiration_date, metadata_tags
				) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
				RETURNING id, uploaded_at`,
				[
					documentId,
					body.filename,
					body.fileType.toUpperCase(),
					body.fileSizeBytes,
					body.storagePath,
					body.encryptionKeyId,
					locals.user.id,
					body.category || 'Other', // Default to 'Other' if not provided
					body.sensitivityLevel || 'Internal', // Default to 'Internal' if not provided
					body.expirationDate || null,
					JSON.stringify(metadataTags)
				]
			);

			const uploaded_at = result.rows[0].uploaded_at;

			// Step 6: Create document assignments (if provided)
			if (body.assignToEmployees && body.assignToEmployees.length > 0) {
				for (const employeeId of body.assignToEmployees) {
					await client.query(
						`INSERT INTO hr_public.document_assignments (
							document_id, employee_id, assigned_by, assignment_reason
						) VALUES ($1, $2, $3, $4)`,
						[documentId, employeeId, locals.user.id, 'Document uploaded and assigned']
					);
				}
			}

			if (body.assignToDepartments && body.assignToDepartments.length > 0) {
				for (const departmentId of body.assignToDepartments) {
					await client.query(
						`INSERT INTO hr_public.document_assignments (
							document_id, department_id, assigned_by, assignment_reason
						) VALUES ($1, $2, $3, $4)`,
						[documentId, departmentId, locals.user.id, 'Document uploaded and assigned to department']
					);
				}
			}

			// Step 7: Log upload in audit trail
			// Note: Using 'view' access_type since 'upload' is not a valid access_type
			await client.query(
				`INSERT INTO hr_public.document_access_logs (
					document_id, user_id, access_type, access_outcome, user_agent
				) VALUES ($1, $2, $3, $4, $5)`,
				[
					documentId,
					locals.user.id,
					'view', // Using 'view' as closest match since 'upload' isn't valid
					'success',
					`Upload: ${body.filename} (${body.fileSizeBytes} bytes)`
				]
			);

			return { uploadedAt: uploaded_at };
		});

		// Step 8: Return success response
		return json({
			documentId,
			uploadedAt,
			encryptionKeyId: body.encryptionKeyId
		}, { status: 201 });

	} catch (err) {
		console.error('Document upload error:', err);
		console.error('Error stack:', err instanceof Error ? err.stack : 'No stack trace');
		console.error('Error details:', JSON.stringify(err, null, 2));

		if (err instanceof z.ZodError) {
			throw error(400, { message: 'Invalid upload data', errors: err.errors });
		}

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Return more detailed error message
		const errorMessage = err instanceof Error ? err.message : 'Internal server error during upload';
		console.error('Throwing error with message:', errorMessage);
		throw error(500, { message: errorMessage });
	}
};
