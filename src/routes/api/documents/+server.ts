// Document listing and filtering API endpoint (Feature 024)
// GET /api/documents - List documents with RBAC filtering and pagination

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { documentFilterSchema } from '$lib/schemas/documentSchemas';

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
		let documents: any[] = [];
		let totalCount = 0;

		if (userRole === 'super_admin') {
			// Super Admin sees ALL documents (including soft-deleted)
			// TODO: SELECT * FROM hr_public.documents WHERE ... ORDER BY uploaded_at DESC
			documents = [];
			totalCount = 0;
		} else if (userRole === 'admin') {
			// Admin sees all non-deleted documents
			// TODO: SELECT * FROM hr_public.documents WHERE is_deleted = FALSE AND ...
			documents = [];
			totalCount = 0;
		} else if (userRole === 'manager') {
			// Manager sees:
			// 1. Documents assigned to them
			// 2. Documents assigned to their direct reports (recursive CTE)
			// 3. Department-wide documents
			// TODO: Complex query with recursive CTE for direct reports
			documents = [];
			totalCount = 0;
		} else {
			// Employee sees only documents assigned to them
			// TODO: SELECT d.* FROM hr_public.documents d
			//       JOIN hr_public.document_assignments da ON d.id = da.document_id
			//       WHERE (da.employee_id = ? OR da.department_id IN (
			//         SELECT department_id FROM hr_public.users WHERE id = ?
			//       )) AND da.assignment_status = 'active' AND d.is_deleted = FALSE
			documents = [];
			totalCount = 0;
		}

		// Step 6: Apply additional filters
		if (filters.category) {
			documents = documents.filter(d => d.category === filters.category);
		}

		if (filters.sensitivityLevel) {
			documents = documents.filter(d => d.sensitivity_level === filters.sensitivityLevel);
		}

		if (filters.searchQuery) {
			const query = filters.searchQuery.toLowerCase();
			documents = documents.filter(d =>
				d.filename.toLowerCase().includes(query) ||
				d.category.toLowerCase().includes(query)
			);
		}

		// Step 7: Apply pagination
		const startIndex = (filters.page - 1) * filters.limit;
		const endIndex = startIndex + filters.limit;
		const paginatedDocuments = documents.slice(startIndex, endIndex);

		// Step 8: Return paginated results
		return json({
			documents: paginatedDocuments,
			totalCount: documents.length,
			page: filters.page,
			limit: filters.limit,
			totalPages: Math.ceil(documents.length / filters.limit)
		});

	} catch (err) {
		console.error('Document listing error:', err);

		if (err && typeof err === 'object' && 'issues' in err) {
			throw error(400, { message: 'Invalid filter parameters', errors: err });
		}

		throw error(500, { message: 'Internal server error during document listing' });
	}
};
