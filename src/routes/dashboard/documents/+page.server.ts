// Document list page server-side loader (Feature 024)
// Server-side data loading with GraphQL API

import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { GraphQLClient } from '$lib/server/graphql-client';
import { PermissionChecks } from '$lib/server/rbac-utils';
import { GET_DOCUMENTS } from '$lib/graphql/document-operations';

export const load: PageServerLoad = async ({ url, locals, cookies }) => {
	// Check authentication and permissions
	if (!locals.user) {
		redirect(303, '/login?redirectTo=/dashboard/documents');
	}

	PermissionChecks.documentsRead({ url, locals, cookies } as any);

	const userId = locals.user.id;
	const userPermissions = locals.permissions || [];

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
			error(500, {
            				message: response.errors[0].message || 'Failed to load documents'
            			});
		}

		// Step 5: Load database utilities
		const { transaction: dbTransaction, setJWTClaims: setDbClaims } = await import('$lib/server/db');

		// Step 6: Get total count from database and load assignee data
		const allAssignments = response.data?.documents?.flatMap((doc: any) => doc.assignments || []) || [];
		const uniqueUserIds = [...new Set(allAssignments.map((a: any) => a.userId))];

		const [totalCount, assigneeMap] = await dbTransaction(async (dbClient) => {
			await setDbClaims(dbClient, userId, userPermissions);

			// Get document count (only for documents assigned to current user)
			const countResult = await dbClient.query(
				`SELECT COUNT(DISTINCT d.id) as count
				 FROM hr_public.documents d
				 INNER JOIN hr_public.document_assignments da ON d.id = da.document_id
				 WHERE d.deleted_at IS NULL
				 AND da.user_id = $1::uuid`,
				[userId]
			);

			const count = parseInt(countResult.rows[0].count, 10);

			// Load user data for assignees
			let userMap = new Map();

			if (uniqueUserIds.length > 0) {
				const userResult = await dbClient.query(
					`SELECT id, display_name, email
					 FROM hr_public.users
					 WHERE id = ANY($1::uuid[])`,
					[uniqueUserIds]
				);

				userResult.rows.forEach((user) => {
					userMap.set(user.id, {
						id: user.id,
						displayName: user.display_name,
						email: user.email
					});
				});
			}

			return [count, userMap];
		});

		// Step 7: Filter documents to only show those assigned to current user
		const userDocuments = (response.data?.documents || []).filter((doc: any) => {
			return (doc.assignments || []).some((a: any) => a.userId === userId);
		});

		// Step 8: Transform GraphQL response to match page format
		const documents = userDocuments.map((doc: any) => ({
			id: doc.id,
			filename: doc.title,
			file_type: doc.mimeType,
			file_size_bytes: doc.fileSize,
			category: doc.category?.name || 'Other',
			sensitivity_level: doc.sensitivityLevel || 'Internal',
			uploaded_at: doc.createdAt,
			uploaded_by: doc.uploaderId,
			access_level: doc.accessLevel,
			is_encrypted: doc.isEncrypted,
			description: doc.description,
			expiration_date: doc.expiryDate,
			version_number: doc.versionNumber,
			assigned_users: (doc.assignments || []).map((a: any) => {
				const userInfo = assigneeMap.get(a.userId);
				return {
					id: a.userId,
					email: userInfo?.email || 'Unknown',
					displayName: userInfo?.displayName || 'Unknown User'
				};
			})
		}));

		// Step 9: Get all assignee options for MultiSearchInput
		const assigneeOptions = Array.from(assigneeMap.values()).map((user) => ({
			id: user.id,
			displayName: user.displayName,
			email: user.email
		}));

		// Step 10: Return data for the page
		return {
			documents,
			totalCount,
			page,
			limit,
			sortBy,
			sortOrder,
			filterCategory,
			searchQuery,
			assigneeOptions,
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
		error(500, {
        			message: 'Failed to load documents. Please try again later.'
        		});
	}
};
