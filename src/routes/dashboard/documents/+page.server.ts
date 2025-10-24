// Document list page server-side loader (Feature 024)
// Server-side data loading with GraphQL API

import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { GraphQLClient } from '$lib/server/graphql-client';
import { GET_DOCUMENTS } from '$lib/graphql/document-operations';

export const load: PageServerLoad = async ({ url, locals, cookies }) => {
	// Step 1: Validate authentication
	if (!locals.user) {
		throw redirect(303, '/login?redirectTo=/dashboard/documents');
	}

	const userId = locals.user.id;
	const userPermissions = locals.permissions || [];
	const isAdmin = userPermissions.includes('*') || userPermissions.includes('documents:*');

	try {
		// Step 2: Parse query parameters
		const page = parseInt(url.searchParams.get('page') || '1');
		const limit = parseInt(url.searchParams.get('limit') || '20');
		const sortBy = url.searchParams.get('sortBy') || 'uploaded_at';
		const sortOrder = url.searchParams.get('sortOrder') || 'desc';
		const filterCategory = url.searchParams.get('category') || null;
		const searchQuery = url.searchParams.get('search') || '';

		// Step 3: Create GraphQL client with session cookies
		const client = GraphQLClient.fromCookies(cookies);

		// Step 4: Query documents via GraphQL
		const offset = (page - 1) * limit;

		const response = await client.query(GET_DOCUMENTS, {
			limit,
			offset
		});

		if (response.errors && response.errors.length > 0) {
			console.error('[Documents] GraphQL errors:', response.errors);
			throw error(500, {
				message: response.errors[0].message || 'Failed to load documents'
			});
		}

		// Step 5: Transform GraphQL response to match page format
		const documents = (response.data?.documents || []).map((doc: any) => ({
			id: doc.id,
			filename: doc.title,
			file_type: doc.mimeType,
			file_size_bytes: doc.fileSize,
			category: doc.category?.name || 'Uncategorized',
			uploaded_at: doc.createdAt,
			uploaded_by: doc.uploaderId,
			access_level: doc.accessLevel,
			is_encrypted: doc.isEncrypted,
			description: doc.description,
			expiration_date: doc.expiryDate,
			version_number: doc.versionNumber,
			assigned_users: (doc.assignments || []).map((a: any) => ({
				id: a.userId,
				email: 'Unknown' // User relationship is lazy-loaded
			}))
		}));

		const totalCount = documents.length; // Simple count for now

		// Step 7: Return data for the page
		return {
			documents,
			totalCount,
			page,
			limit,
			sortBy,
			sortOrder,
			filterCategory,
			searchQuery,
			user: locals.user,
			userPermissions,
			totalPages: Math.ceil(totalCount / limit) || 0
		};
	} catch (err) {
		console.error('Document list load error:', err);

		// Re-throw redirects and errors
		if (err && typeof err === 'object' && ('status' in err || 'location' in err)) {
			throw err;
		}

		// Generic error fallback
		throw error(500, {
			message: 'Failed to load documents. Please try again later.'
		});
	}
};
