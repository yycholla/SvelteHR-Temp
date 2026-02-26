// Document list page server-side loader (Feature 024)
// Server-side data loading with GraphQL API
// Fixed: Removed direct SQL queries, replaced with pure GraphQL

import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { GraphQLClient } from '$lib/server/graphql-client';
import { PermissionChecks } from '$lib/server/rbac-utils';
import { GET_DOCUMENTS } from '$lib/graphql/document-operations';
import { logger } from '$lib/utils/logger';

export const load: PageServerLoad = async ({ url, locals, cookies }) => {
	// Check authentication and permissions
	if (!locals.user) {
		redirect(303, '/login?redirectTo=/dashboard/documents');
	}

	PermissionChecks.documentsRead({ url, locals, cookies } as any);

	const userId = locals.user.id;
	const userPermissions = locals.permissions || [];

	try {
		const page = parseInt(url.searchParams.get('page') || '1');
		const limit = parseInt(url.searchParams.get('limit') || '20');
		const sortBy = url.searchParams.get('sortBy') || 'uploaded_at';
		const sortOrder = url.searchParams.get('sortOrder') || 'desc';
		const filterCategory = url.searchParams.get('category') || null;
		const searchQuery = url.searchParams.get('search') || '';

		const client = GraphQLClient.fromCookies(cookies);
		const offset = (page - 1) * limit;

		const response = await client.query(GET_DOCUMENTS, { limit, offset });

		if (response.errors && response.errors.length > 0) {
			logger.error(
				'[Documents] GraphQL errors',
				new Error(response.errors[0]?.message || 'GraphQL error'),
				{ errors: response.errors.map((e) => ({ message: e.message })) }
			);
			error(500, {
				message: response.errors[0].message || 'Failed to load documents'
			});
		}

		const allDocuments = response.data?.documents || [];

		// Build assignee map from GraphQL user queries
		const allAssignments = allDocuments.flatMap((doc: any) => doc.assignments || []) || [];
		const uniqueUserIds = [...new Set(allAssignments.map((a: any) => a.userId))] as string[];

		const assigneeMap = new Map<string, { id: string; displayName: string; email: string }>();

		for (const uid of uniqueUserIds) {
			try {
				const userQuery = `
					query GetUser($id: UUID!) {
						user(id: $id) {
							id
							email
							displayName
						}
					}
				`;
				const userRes = await client.query(userQuery, { id: uid });
				const u = userRes.data?.user;
				if (u) {
					assigneeMap.set(u.id, {
						id: u.id,
						displayName: u.displayName || 'Unknown User',
						email: u.email || 'Unknown'
					});
				}
			} catch (e) {
				logger.warn(`[Documents] Failed to resolve user ${uid}`, { error: e });
			}
		}

		// Filter documents to only show those assigned to current user
		const userDocuments = allDocuments.filter((doc: any) => {
			return (doc.assignments || []).some((a: any) => a.userId === userId);
		});

		const totalCount = userDocuments.length;

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

		const assigneeOptions = Array.from(assigneeMap.values()).map((user) => ({
			id: user.id,
			displayName: user.displayName,
			email: user.email
		}));

		const userQuery = `
			query GetUser($id: UUID!) {
				user(id: $id) {
					id
					email
					displayName
					roles {
						id
						name
					}
				}
			}
		`;

		const userResponse = await client.query(userQuery, { id: userId });
		const currentUser = userResponse.data?.user || locals.user;

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
			user: currentUser,
			userPermissions,
			totalPages: Math.ceil(totalCount / limit) || 0
		};
	} catch (err) {
		logger.error('Document list load error:', err as Error);

		if (err && typeof err === 'object' && ('status' in err || 'location' in err)) {
			throw err;
		}

		error(500, {
			message: 'Failed to load documents. Please try again later.'
		});
	}
};
