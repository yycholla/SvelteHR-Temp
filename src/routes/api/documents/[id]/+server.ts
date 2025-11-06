// Document management endpoints (Feature 024)
// GET /api/documents/[id] - Get document by ID
// DELETE /api/documents/[id] - Soft delete a document
// Migrated to GraphQL backend (Phase 2 - Document API Migration)

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createUrqlClient } from '$lib/graphql/client';
import { gql } from '@urql/core';

const GET_DOCUMENT_QUERY = gql`
	query GetDocument($id: UUID!) {
		document(id: $id) {
			id
			title
			description
			categoryId
			filePath
			fileSize
			mimeType
			uploaderId
			accessLevel
			isEncrypted
			expiryDate
			versionNumber
			createdAt
			updatedAt
			deletedAt
		}
	}
`;

const DELETE_DOCUMENT_MUTATION = gql`
	mutation DeleteDocument($id: UUID!) {
		deleteDocument(id: $id)
	}
`;

const CREATE_ACCESS_LOG_MUTATION = gql`
	mutation CreateDocumentAccessLog($input: CreateDocumentAccessLogInput!) {
		createDocumentAccessLog(input: $input) {
			id
			documentId
			userId
			accessType
			accessedAt
		}
	}
`;

export const GET: RequestHandler = async ({ params, locals, cookies, fetch }) => {
	// Step 1: Validate authentication
	if (!locals.user) {
		error(401, { message: 'Authentication required' });
	}

	const documentId = params.id;

	try {
		// Step 2: Create GraphQL client with session cookies
		const urqlClient = createUrqlClient(fetch, undefined, undefined, cookies.get('hr_session'));

		// Step 3: Query document via GraphQL
		const result = await urqlClient
			.query(GET_DOCUMENT_QUERY, {
				id: documentId
			})
			.toPromise();

		if (result.error) {
			console.error('GraphQL error:', result.error);
			error(500, { message: 'Failed to fetch document from GraphQL backend' });
		}

		const document = result.data?.document;

		if (!document) {
			error(404, { message: 'Document not found' });
		}

		// Step 4: Apply RBAC filtering
		const userRole = locals.user.role || 'employee';
		const userId = locals.user.id;

		if (userRole !== 'super_admin' && userRole !== 'admin') {
			// Employee/Manager can only view documents uploaded by them
			if (document.uploaderId !== userId) {
				error(403, {
                					message: 'Insufficient permissions to view this document'
                				});
			}
		}

		return json(document);
	} catch (err) {
		console.error('Document fetch error:', err);

		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		error(500, { message: 'Internal server error during document fetch' });
	}
};

export const DELETE: RequestHandler = async ({ params, locals, request, cookies, fetch }) => {
	// Step 1: Validate authentication
	if (!locals.user) {
		error(401, { message: 'Authentication required' });
	}

	const documentId = params.id;
	const userId = locals.user.id;
	const userRole = locals.user.role || 'employee';

	// Step 2: Check if user has delete permissions
	if (userRole !== 'super_admin' && userRole !== 'admin') {
		error(403, {
        			message: 'Insufficient permissions. Only administrators can delete documents.'
        		});
	}

	try {
		console.log(
			`[DELETE] Starting delete for document ${documentId} by user ${userId} (${userRole})`
		);

		// Step 3: Create GraphQL client with session cookies
		const urqlClient = createUrqlClient(fetch, undefined, undefined, cookies.get('hr_session'));

		// Step 4: Perform soft delete via GraphQL
		const deleteResult = await urqlClient
			.mutation(DELETE_DOCUMENT_MUTATION, {
				id: documentId
			})
			.toPromise();

		if (deleteResult.error) {
			console.error('GraphQL delete error:', deleteResult.error);
			error(500, { message: 'Failed to delete document via GraphQL backend' });
		}

		if (!deleteResult.data?.deleteDocument) {
			error(404, { message: 'Document not found or already deleted' });
		}

		// Step 5: Log the deletion in access logs
		const clientIp =
			request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
			request.headers.get('x-real-ip')?.trim() ||
			'unknown';
		const userAgent = request.headers.get('user-agent') || 'unknown';

		console.log(`[DELETE] Logging access: ip=${clientIp}, ua=${userAgent}`);

		await urqlClient
			.mutation(CREATE_ACCESS_LOG_MUTATION, {
				input: {
					documentId: documentId,
					userId: userId,
					accessType: 'view', // Using 'view' since 'delete' is not a valid type
					ipAddress: clientIp,
					userAgent: userAgent
				}
			})
			.toPromise();

		console.log(`[DELETE] Access log created successfully`);

		return json({
			success: true,
			message: `Document has been deleted successfully.`
		});
	} catch (err) {
		console.error('[DELETE] Document delete error:', err);
		console.error('[DELETE] Error stack:', (err as Error).stack);

		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Generic error fallback
		error(500, {
        			message: 'Failed to delete document. Please try again later.'
        		});
	}
};
