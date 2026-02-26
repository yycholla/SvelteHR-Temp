// Document list page server-side loader (Feature 024)
// Server-side data loading with GraphQL API

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { logger } from '$lib/utils/logger';
import { RBACDataLoader } from '$lib/server/route-loaders';
import { QueryParamExtractor } from '$lib/server/route-helpers';
import { GET_DOCUMENTS } from '$lib/graphql/document-operations';

interface DocumentAssignmentRecord {
	userId: string;
}

interface DocumentQueryRecord {
	id: string;
	title: string;
	mimeType: string;
	fileSize: number;
	category?: { name?: string | null } | null;
	sensitivityLevel?: string | null;
	createdAt: string;
	uploaderId: string;
	accessLevel: string;
	isEncrypted: boolean;
	description?: string | null;
	expiryDate?: string | null;
	versionNumber?: number | null;
	assignments?: DocumentAssignmentRecord[];
}

interface AssigneeInfo {
	id: string;
	displayName: string;
	email: string;
}

interface EmployeeOption {
	id: string;
	displayName: string;
}

export const load: PageServerLoad = async (event) => {
	const loader = new RBACDataLoader(event, ['documents:read:all']);

	return loader.loadWithClient(async (client) => {
		const { locals } = event;
		const userId = loader.getUserId();

		try {
			// Step 2: Parse query parameters
			const params = new QueryParamExtractor(event.url);
			const { page, limit, offset } = params.getPagination(20);
			const sortBy = params.getString('sortBy', 'uploaded_at');
			const sortOrder = params.getString('sortOrder', 'desc');
			const filterCategory = params.getString('category') || null;
			const searchQuery = params.getString('search');

			// Step 4: Query documents via GraphQL
			// UnifiedGraphQLClient throws on error, so we catch it below
			const data = await client.query(GET_DOCUMENTS, {
				limit,
				offset
			});

			// Step 5: Load database utilities
			const { transaction: dbTransaction, setJWTClaims: setDbClaims } =
				await import('$lib/server/db');

			// Step 6: Get total count from database and load assignee data
			const sourceDocuments: DocumentQueryRecord[] = data?.documents || [];
			const allAssignments = sourceDocuments.flatMap((doc) => doc.assignments || []);
			const uniqueUserIds = [...new Set(allAssignments.map((assignment) => assignment.userId))];

			const transactionResult = await dbTransaction(async (dbClient) => {
				await setDbClaims(dbClient, userId, locals.user!.role || 'employee');

				// Get document count
				const countResult = await dbClient.query(
					`SELECT COUNT(*) as count
					 FROM hr_public.documents
					 WHERE deleted_at IS NULL`
				);

				const count = parseInt(countResult.rows[0].count, 10);

				// Load user data for assignees
				const userMap = new Map<string, AssigneeInfo>();

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

				// Load ALL active employees for the assignment dropdown
				const allEmployeesResult = await dbClient.query(
					`SELECT id, display_name
					 FROM hr_public.users
					 WHERE is_active = true
					 ORDER BY display_name ASC`
				);

				const allEmployees = allEmployeesResult.rows.map((row) => ({
					id: row.id,
					displayName: row.display_name
				}));

				return [count, userMap, allEmployees];
			});

			const [totalCount, assigneeMap, allEmployees] = transactionResult as [
				number,
				Map<string, AssigneeInfo>,
				EmployeeOption[]
			];

			// Step 7: Transform GraphQL response to match page format
			const documents = sourceDocuments.map((doc) => ({
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
				assigned_users: (doc.assignments || []).map((assignment) => {
					const userInfo = assigneeMap.get(assignment.userId);
					return {
						id: assignment.userId,
						email: userInfo?.email || 'Unknown',
						displayName: userInfo?.displayName || 'Unknown User'
					};
				})
			}));

			// Step 8: Get all assignee options for MultiSearchInput
			const assigneeOptions = Array.from(assigneeMap.values()).map((user) => ({
				id: user.id,
				displayName: user.displayName,
				email: user.email
			}));

			// Step 9: Return data for the page
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
				allEmployees, // New field
				totalPages: Math.ceil(totalCount / limit) || 0
			};
		} catch (err) {
			logger.error('Document list load error:', err as Error);

			// Re-throw redirects and errors
			if (err && typeof err === 'object' && ('status' in err || 'location' in err)) {
				throw err;
			}

			// Generic error fallback
			throw error(500, {
				message: 'Failed to load documents. Please try again later.'
			});
		}
	});
};
