// Document list page server-side loader (Feature 024)
// Server-side data loading with GraphQL API

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { logger } from '$lib/utils/logger';
import { RBACDataLoader } from '$lib/server/route-loaders';
import { AccessTier } from '$lib/server/rbac-utils';
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
	const loader = new RBACDataLoader(event, AccessTier.ALL);

	return loader.loadWithClient(async (client) => {
		const { locals } = event;
		const userId = loader.getUserId();

		try {
			const params = new QueryParamExtractor(event.url);
			const { page, limit, offset } = params.getPagination(20);
			const sortBy = params.getString('sortBy', 'uploaded_at');
			const sortOrder = params.getString('sortOrder', 'desc');
			const filterCategory = params.getString('category') || null;
			const searchQuery = params.getString('search');

			const data = await client.query(GET_DOCUMENTS, {
				limit,
				offset
			});

			const sourceDocuments: DocumentQueryRecord[] = data?.documents || [];
			const allAssignments = sourceDocuments.flatMap((doc) => doc.assignments || []);
			const uniqueUserIds = [...new Set(allAssignments.map((assignment) => assignment.userId))];

			const totalCount = sourceDocuments.length;

			const assigneeMap = new Map<string, AssigneeInfo>();
			uniqueUserIds.forEach((uid) => {
				assigneeMap.set(uid, {
					id: uid,
					displayName: 'Employee',
					email: `user-${uid.slice(0, 8)}@company.com`
				});
			});

			const allEmployees: EmployeeOption[] = [
				{ id: '550e8400-e29b-41d4-a716-446655440001', displayName: 'Admin User' },
				{ id: '550e8400-e29b-41d4-a716-446655440002', displayName: 'Jane Smith' },
				{ id: '550e8400-e29b-41d4-a716-446655440003', displayName: 'Bob Johnson' }
			];

			const documents = sourceDocuments.map((doc: any) => ({
				id: doc.id,
				filename: doc.title,
				file_type: doc.mimeType || doc.fileType || 'application/octet-stream',
				file_size_bytes: doc.fileSize || 0,
				category: (typeof doc.category === 'object' ? doc.category?.name : doc.category) || 'Other',
				sensitivity_level: doc.sensitivityLevel || (doc.isConfidential ? 'Confidential' : 'Internal'),
				uploaded_at: doc.createdAt,
				uploaded_by: doc.uploaderId || doc.uploadedBy,
				access_level: doc.accessLevel || 'internal',
				is_encrypted: doc.isEncrypted || false,
				description: doc.description,
				expiration_date: doc.expiryDate || doc.expiresAt,
				version_number: doc.versionNumber || doc.version,
				assigned_users: (doc.assignments || []).map((assignment: any) => {
					const userInfo = assigneeMap.get(assignment.userId);
					return {
						id: assignment.userId,
						email: userInfo?.email || 'Unknown',
						displayName: userInfo?.displayName || 'Unknown User'
					};
				})
			}));

			const assigneeOptions = Array.from(assigneeMap.values()).map((user) => ({
				id: user.id,
				displayName: user.displayName,
				email: user.email
			}));

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
				allEmployees,
				totalPages: Math.ceil(totalCount / limit) || 0
			};
		} catch (err) {
			logger.error('Document list load error:', err as Error);

			if (err && typeof err === 'object' && ('status' in err || 'location' in err)) {
				throw err;
			}

			throw error(500, {
				message: 'Failed to load documents. Please try again later.'
			});
		}
	});
};
