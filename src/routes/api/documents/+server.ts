// Document listing and filtering API endpoint (Feature 024)
// GET /api/documents - List documents with RBAC filtering and pagination

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { documentFilterSchema } from '$lib/schemas/documentSchemas';
import { transaction, setJWTClaims } from '$lib/server/db';

export const GET: RequestHandler = async ({ url, locals }) => {
	// Step 1: Validate authentication
	if (!locals.user) {
		throw error(401, { message: 'Authentication required' });
	}

	try {
		// Step 2: Parse query parameters
		const employeeId = url.searchParams.get('employeeId') || undefined;
		const category = url.searchParams.get('category') || undefined;
		const sensitivityLevel = url.searchParams.get('sensitivityLevel') || undefined;
		const searchQuery = url.searchParams.get('search') || undefined;
		const page = parseInt(url.searchParams.get('page') || '1');
		const limit = parseInt(url.searchParams.get('limit') || '20');

		// Step 3: Validate filters
		const filters = documentFilterSchema.parse({
			employeeId,
			category,
			sensitivityLevel,
			page,
			limit,
			searchQuery
		});

		// Step 4: Apply RBAC filtering based on user role
		const userRole = locals.user.role || 'employee';
		const userId = locals.user.id;

		// Step 5: Build query based on role
		let whereConditions = [];
		let queryParams: any[] = [];
		let paramIndex = 1;

		if (userRole === 'super_admin') {
			// Super Admin sees ALL documents (including soft-deleted)
			// No additional filter
		} else if (userRole === 'admin') {
			// Admin sees all non-deleted documents
			whereConditions.push('d.is_deleted = FALSE');
		} else {
			// Employee/Manager sees only documents uploaded by them or assigned to them
			whereConditions.push('d.is_deleted = FALSE');
			whereConditions.push('(d.uploaded_by = $' + paramIndex + ')');
			queryParams.push(userId);
			paramIndex++;
		}

		// Apply additional filters
		if (filters.category) {
			whereConditions.push(`d.category = $${paramIndex}`);
			queryParams.push(filters.category);
			paramIndex++;
		}

		if (filters.sensitivityLevel) {
			whereConditions.push(`d.sensitivity_level = $${paramIndex}`);
			queryParams.push(filters.sensitivityLevel);
			paramIndex++;
		}

		if (filters.searchQuery) {
			whereConditions.push(
				`(d.filename ILIKE $${paramIndex} OR d.category ILIKE $${paramIndex})`
			);
			queryParams.push(`%${filters.searchQuery}%`);
			paramIndex++;
		}

		const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
		const offset = (filters.page - 1) * filters.limit;

		// Use transaction with JWT claims for RLS policies
		const { totalCount, documents } = await transaction(async (client) => {
			// Set JWT claims for RLS policy enforcement
			await setJWTClaims(client, userId, userRole);

			// Get total count
			const countResult = await client.query(
				`SELECT COUNT(*) as total FROM hr_public.documents d ${whereClause}`,
				queryParams
			);
			const total = parseInt(countResult.rows[0].total);

			// Get paginated documents
			const documentsResult = await client.query(
				`SELECT
					d.id, d.filename, d.file_type, d.file_size_bytes, d.storage_path,
					d.encryption_key_id, d.uploaded_by, d.uploaded_at, d.category,
					d.sensitivity_level, d.expiration_date, d.version_number,
					d.metadata_tags, d.is_deleted, d.deleted_at, d.deleted_by
				FROM hr_public.documents d
				${whereClause}
				ORDER BY d.uploaded_at DESC
				LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
				[...queryParams, filters.limit, offset]
			);

			return {
				totalCount: total,
				documents: documentsResult.rows
			};
		});

		// Step 6: Return paginated results
		return json({
			documents,
			totalCount,
			page: filters.page,
			limit: filters.limit,
			totalPages: Math.ceil(totalCount / filters.limit)
		});

	} catch (err) {
		console.error('Document listing error:', err);

		if (err && typeof err === 'object' && 'issues' in err) {
			throw error(400, { message: 'Invalid filter parameters', errors: err });
		}

		throw error(500, { message: 'Internal server error during document listing' });
	}
};
