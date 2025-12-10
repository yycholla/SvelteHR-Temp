// Document download API endpoint (Feature 024)
// GET /api/documents/[id]/download - Download document (with decryption if encrypted)
// ✅ Fully migrated to GraphQL backend (Phase 2 - Document API Migration)
// - Metadata and encrypted file data from GraphQL
// - Decryption keys still fetched from DB (stored encrypted with pgcrypto)

import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createUrqlClient } from '$lib/graphql/client';
import { gql } from '@urql/core';
import { setJWTClaims, transaction } from '$lib/server/db';
import { decryptFileFromGraphQL, getDecryptionKey } from '$lib/server/encryption';

const GET_DOCUMENT_FOR_DOWNLOAD_QUERY = gql`
	query GetDocumentForDownload($id: UUID!) {
		document(id: $id) {
			id
			title
			mimeType
			fileSize
			uploaderId
			isEncrypted
			createdAt
			encryptedFileStorage {
				id
				encryptedData
				iv
				encryptionKeyId
			}
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

export const GET: RequestHandler = async ({ params, locals, url, cookies, fetch }) => {
	// Step 1: Validate authentication
	if (!locals.user) {
		error(401, { message: 'Authentication required' });
	}

	const documentId = params.id;
	const userId = locals.user.id;
	const userRole = locals.user.role || 'employee';

	try {
		// Step 2: Retrieve document metadata via GraphQL
		const urqlClient = createUrqlClient(fetch, undefined, undefined, cookies.get('hr_session'));

		const docResult = await urqlClient
			.query(GET_DOCUMENT_FOR_DOWNLOAD_QUERY, {
				id: documentId
			})
			.toPromise();

		if (docResult.error) {
			console.error('GraphQL error fetching document:', docResult.error);
			error(500, { message: 'Failed to fetch document metadata' });
		}

		const document = docResult.data?.document;

		if (!document) {
			error(404, { message: 'Document not found' });
		}

		// Step 3: Check access permissions (RBAC)
		let canAccess = false;
		if (userRole === 'super_admin' || userRole === 'admin') {
			canAccess = true;
		} else if (document.uploaderId === userId) {
			canAccess = true; // User can download their own uploads
		}
		// TODO: Check document assignments via GraphQL when available

		if (!canAccess) {
			console.log(`Download access denied for user ${userId} to document ${documentId}`);
			error(403, {
				message: 'Access denied. You do not have permission to download this document.'
			});
		}

		// Step 4: Retrieve and decrypt file via GraphQL
		let decryptedData: Buffer;

		if (document.isEncrypted) {
			// Check if encrypted file storage is available
			const storage = document.encryptedFileStorage;
			if (!storage) {
				error(404, { message: 'Encrypted file storage not found' });
			}

			// Get decryption key from database (key is stored encrypted in DB)
			const encryptionKey = await transaction(async (client) => {
				await setJWTClaims(client, userId, userRole);
				return await getDecryptionKey(client, storage.encryptionKeyId);
			});

			// Decrypt file using GraphQL data
			decryptedData = decryptFileFromGraphQL(storage.encryptedData, storage.iv, encryptionKey);

			console.log(
				`Encrypted document ${documentId} decrypted for download - ${decryptedData.length} bytes`
			);
		} else {
			// For non-encrypted files, read from file system
			// TODO: Implement file system or S3 retrieval
			error(501, { message: 'Non-encrypted file download not yet implemented' });
		}

		// Step 5: Log download access via GraphQL
		await urqlClient
			.mutation(CREATE_ACCESS_LOG_MUTATION, {
				input: {
					documentId,
					userId,
					accessType: 'download',
					ipAddress: url.searchParams.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown',
					userAgent: url.searchParams.get('user-agent') || 'unknown'
				}
			})
			.toPromise();

		console.log(
			`Document ${documentId} downloaded by user ${userId} - decrypted ${decryptedData.length} bytes`
		);

		// Step 6: Serve decrypted file as download (not inline)
		return new Response(new Uint8Array(decryptedData), {
			status: 200,
			headers: {
				'Content-Type': document.mimeType,
				'Content-Disposition': `attachment; filename="${document.title}"`,
				'Content-Length': decryptedData.length.toString(),
				'X-Document-ID': documentId,
				'X-File-Type': document.mimeType,
				'Cache-Control': 'private, no-cache', // Don't cache downloads
				// Security headers
				'X-Content-Type-Options': 'nosniff'
			}
		});
	} catch (err) {
		console.error('Document download error:', err);

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		error(500, { message: 'Internal server error during download' });
	}
};
