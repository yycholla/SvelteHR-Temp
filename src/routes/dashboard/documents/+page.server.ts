// Document list page server-side loader (Feature 024)
// Server-side data loading with RBAC filtering

import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { transaction, setJWTClaims } from '$lib/server/db';

export const load: PageServerLoad = async ({ url, locals }) => {
	// Step 1: Validate authentication
	if (!locals.user) {
		throw redirect(303, '/login?redirectTo=/dashboard/documents');
	}

	const userId = locals.user.id;
	const userRole = locals.user.role || 'employee';

	try {
		// Step 2: Parse query parameters
		const page = parseInt(url.searchParams.get('page') || '1');
		const limit = parseInt(url.searchParams.get('limit') || '20');
		const sortBy = url.searchParams.get('sortBy') || 'uploaded_at';
		const sortOrder = url.searchParams.get('sortOrder') || 'desc';
		const filterCategory = url.searchParams.get('category') || null;
		const filterSensitivity = url.searchParams.get('sensitivity') || null;
		const searchQuery = url.searchParams.get('search') || '';

		// Step 3: Query database directly with RBAC filtering
		const { documents, totalCount } = await transaction(async (client) => {
			// Set JWT claims for RLS policy enforcement
			await setJWTClaims(client, userId, userRole);

			// Build WHERE clause with filters
			const whereConditions = ['is_deleted = FALSE'];
			const queryParams: any[] = [];
			let paramIndex = 1;

			if (filterCategory) {
				whereConditions.push(`category = $${paramIndex}`);
				queryParams.push(filterCategory);
				paramIndex++;
			}

			if (filterSensitivity) {
				whereConditions.push(`sensitivity_level = $${paramIndex}`);
				queryParams.push(filterSensitivity);
				paramIndex++;
			}

			if (searchQuery) {
				whereConditions.push(`filename ILIKE $${paramIndex}`);
				queryParams.push(`%${searchQuery}%`);
				paramIndex++;
			}

			const whereClause = whereConditions.join(' AND ');

			// Query documents with pagination and assignments
			const offset = (page - 1) * limit;
			const documentsResult = await client.query(
				`SELECT
					d.id, d.filename, d.file_type, d.file_size_bytes,
					d.category, d.sensitivity_level, d.uploaded_at, d.uploaded_by,
					d.expiration_date, d.version_number,
					COALESCE(
						json_agg(
							DISTINCT jsonb_build_object('email', u.email, 'id', da.employee_id)
						) FILTER (WHERE da.employee_id IS NOT NULL),
						'[]'::json
					) as assigned_users
				FROM hr_public.documents d
				LEFT JOIN hr_public.document_assignments da ON d.id = da.document_id
				LEFT JOIN hr_public.users u ON da.employee_id = u.id
				WHERE ${whereClause}
				GROUP BY d.id, d.filename, d.file_type, d.file_size_bytes, d.category,
				         d.sensitivity_level, d.uploaded_at, d.uploaded_by,
				         d.expiration_date, d.version_number
				ORDER BY ${sortBy} ${sortOrder.toUpperCase()}
				LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
				[...queryParams, limit, offset]
			);

			// Get total count
			const countResult = await client.query(
				`SELECT COUNT(*) as count
				FROM hr_public.documents
				WHERE ${whereClause}`,
				queryParams
			);

			return {
				documents: documentsResult.rows,
				totalCount: parseInt(countResult.rows[0]?.count || '0')
			};
		});

		// Step 4: Determine user permissions
		const userPermissions: string[] = [];

		if (userRole === 'super_admin' || userRole === 'admin') {
			userPermissions.push('documents:upload', 'documents:delete', 'documents:assign');
		} else if (userRole === 'manager') {
			userPermissions.push('documents:upload');
		}

		// Step 5: Return data for the page
		// Note: Database queries are TODO - returning empty data for now
		return {
			documents,
			totalCount,
			page,
			limit,
			sortBy,
			sortOrder,
			filterCategory,
			filterSensitivity,
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
