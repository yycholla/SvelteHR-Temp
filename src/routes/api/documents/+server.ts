import { logger } from '$lib/utils/logger';
// Document listing and filtering API endpoint (Feature 024)
// GET /api/documents - List documents with RBAC filtering and pagination
// Migrated to GraphQL backend (Phase 2 - Document API Migration)

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { documentFilterSchema } from '$lib/schemas/documentSchemas';
import { createUrqlClient } from '$lib/graphql/client';
import { gql } from '@urql/core';

const GET_DOCUMENTS_QUERY = gql`
	query GetDocuments($limit: Int, $offset: Int) {
		documents(limit: $limit, offset: $offset) {
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

export const GET: RequestHandler = async ({ url, locals, cookies, fetch }) => {
	// Step 1: Validate authentication
	if (!locals.user) {
		error(401, 'Authentication required');
	}

	try {
		// Step 2: Parse query parameters
		const searchQuery = url.searchParams.get('search') || undefined;
		const page = parseInt(url.searchParams.get('page') || '1');
		const limit = parseInt(url.searchParams.get('limit') || '20');

		// Step 3: Validate filters
		const filters = documentFilterSchema.parse({
			page,
			limit,
			searchQuery
		});

		// Step 4: Create GraphQL client with session cookies
		const urqlClient = createUrqlClient(fetch, undefined, undefined, cookies.get('hr_session'));

		// Step 5: Query documents via GraphQL
		const offset = (filters.page - 1) * filters.limit;
		const result = await urqlClient
			.query(GET_DOCUMENTS_QUERY, {
				limit: filters.limit,
				offset
			})
			.toPromise();

		if (result.error) {
			logger.error('GraphQL errors:', result.error);
			error(500, 'Failed to fetch documents from GraphQL backend');
		}

		// Step 6: Apply client-side filtering based on RBAC
		// Note: Server-side RBAC filtering should be implemented in GraphQL resolvers
		const userRole = locals.user.role || 'employee';
		const userId = locals.user.id;
		let documents = result.data?.documents || [];

		// Apply role-based filtering (temporary until GraphQL implements RBAC)
		if (userRole !== 'super_admin' && userRole !== 'admin') {
			// Employee/Manager sees only documents uploaded by them
			documents = documents.filter((doc: any) => doc.uploaderId === userId);
		}

		// Apply search filter if provided
		if (filters.searchQuery) {
			const searchLower = filters.searchQuery.toLowerCase();
			documents = documents.filter(
				(doc: any) =>
					doc.title?.toLowerCase().includes(searchLower) ||
					doc.description?.toLowerCase().includes(searchLower)
			);
		}

		const totalCount = documents.length;

		// Step 7: Return paginated results
		return json({
			documents,
			totalCount,
			page: filters.page,
			limit: filters.limit,
			totalPages: Math.ceil(totalCount / filters.limit)
		});
	} catch (err) {
		logger.error('Document listing error:', err as Error);

		if (err && typeof err === 'object' && 'issues' in err) {
			error(400, 'Invalid filter parameters');
		}

		error(500, 'Internal server error during document listing');
	}
};
