// Document upload API endpoint (Feature 024)
// POST /api/documents/upload
// Handles encrypted document upload with metadata and assignments
// Migrated to GraphQL backend (Phase 2 - Document API Migration)

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { createUrqlClient } from '$lib/graphql/client';
import { gql } from '@urql/core';

const UPLOAD_DOCUMENT_MUTATION = gql`
	mutation UploadDocument($input: UploadDocumentInput!) {
		uploadDocument(input: $input) {
			id
			title
			filePath
			fileSize
			uploaderId
			createdAt
		}
	}
`;

const CREATE_DOCUMENT_ASSIGNMENT_MUTATION = gql`
	mutation CreateDocumentAssignment($input: CreateDocumentAssignmentInput!) {
		createDocumentAssignment(input: $input) {
			id
			documentId
			employeeId
			assignedBy
		}
	}
`;

const CREATE_ACCESS_LOG_MUTATION = gql`
	mutation CreateDocumentAccessLog($input: CreateDocumentAccessLogInput!) {
		createDocumentAccessLog(input: $input) {
			id
		}
	}
`;

export const POST: RequestHandler = async ({ request, locals, cookies, fetch }) => {
	// Step 1: Validate authentication
	if (!locals.user) {
		error(401, { message: 'Authentication required' });
	}

	// Step 2: Check authorization using permission-based RBAC
	const userPermissions = locals.permissions || [];
	const canUploadDocuments = userPermissions.some(
		(perm: string) => perm === 'documents:write' || perm === '*' || perm === '*:*'
	);

	if (!canUploadDocuments) {
		console.error('[Upload API] Permission denied:', {
			userId: locals.user?.id,
			permissions: userPermissions
		});
		error(403, {
			message: 'Insufficient permissions. documents:write permission required.'
		});
	}

	console.log('[Upload API] Authorization passed:', {
		userId: locals.user.id,
		permissions: userPermissions
	});

	try {
		// Step 3: Parse request body
		const body = await request.json();
		console.log('[Upload API] Received request body:', JSON.stringify(body, null, 2));

		// Step 4: Validate upload data
		if (!body.filename || !body.fileSizeBytes || !body.encryptedData || !body.encryptionKeyId) {
			error(400, {
				message: 'Missing required fields (filename, fileSizeBytes, encryptedData, encryptionKeyId)'
			});
		}

		// Validate file size (50MB max)
		if (body.fileSizeBytes > 52428800) {
			error(413, { message: 'File size exceeds 50MB limit' });
		}

		// Validate file type
		const allowedTypes = ['PDF', 'JPEG', 'PNG', 'GIF', 'DOCX', 'XLSX', 'TXT', 'CSV'];
		if (!allowedTypes.includes(body.fileType.toUpperCase())) {
			error(400, { message: `Invalid file type. Allowed: ${allowedTypes.join(', ')}` });
		}

		// Step 5: Create GraphQL client with session cookies
		const urqlClient = createUrqlClient(fetch, undefined, undefined, cookies.get('hr_session'));

		// Step 6: Upload document via GraphQL (handles encryption and storage)
		const uploadInput = {
			filename: body.filename,
			fileType: body.fileType.toUpperCase(),
			fileSizeBytes: body.fileSizeBytes,
			encryptedData: body.encryptedData, // Base64 encoded encrypted data
			iv: body.iv || [], // Initialization vector for AES-GCM
			encryptionKeyId: body.encryptionKeyId,
			sensitivityLevel: body.sensitivityLevel || 'Internal',
			expirationDate: body.expirationDate || null
		};

		console.log('[Upload API] Uploading to GraphQL backend');
		const uploadResult = await urqlClient
			.mutation(UPLOAD_DOCUMENT_MUTATION, {
				input: uploadInput
			})
			.toPromise();

		if (uploadResult.error) {
			console.error('[Upload API] GraphQL upload error:', uploadResult.error);
			error(500, {
				message: 'Failed to upload document to GraphQL backend',
				details: uploadResult.error.message
			});
		}

		const document = uploadResult.data?.uploadDocument;
		if (!document) {
			error(500, { message: 'Upload succeeded but no document returned' });
		}

		console.log('[Upload API] Document uploaded successfully:', document.id);

		// Step 7: Create document assignments (if provided)
		if (body.assignToEmployees && body.assignToEmployees.length > 0) {
			console.log('[Upload API] Creating employee assignments:', body.assignToEmployees.length);
			for (const employeeId of body.assignToEmployees) {
				await urqlClient
					.mutation(CREATE_DOCUMENT_ASSIGNMENT_MUTATION, {
						input: {
							documentId: document.id,
							employeeId,
							assignedBy: locals.user.id,
							accessLevel: 'read' // Default access level
						}
					})
					.toPromise();
			}
		}

		// Step 8: Log upload in audit trail
		console.log('[Upload API] Logging document access');
		await urqlClient
			.mutation(CREATE_ACCESS_LOG_MUTATION, {
				input: {
					documentId: document.id,
					userId: locals.user.id,
					accessType: 'view', // Using 'view' as closest match since 'upload' isn't valid
					ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown',
					userAgent: request.headers.get('user-agent') || 'unknown'
				}
			})
			.toPromise();

		// Step 9: Return success response
		return json(
			{
				documentId: document.id,
				uploadedAt: document.createdAt,
				encryptionKeyId: body.encryptionKeyId
			},
			{ status: 201 }
		);
	} catch (err) {
		console.error('Document upload error:', err);
		console.error('Error stack:', err instanceof Error ? err.stack : 'No stack trace');
		console.error('Error details:', JSON.stringify(err, null, 2));

		if (err instanceof z.ZodError) {
			error(400, { message: 'Invalid upload data', errors: err.errors });
		}

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Return more detailed error message
		const errorMessage = err instanceof Error ? err.message : 'Internal server error during upload';
		console.error('Throwing error with message:', errorMessage);
		error(500, { message: errorMessage });
	}
};
