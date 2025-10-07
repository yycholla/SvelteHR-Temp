// Document list page server-side loader (Feature 024)
// Server-side data loading with RBAC filtering

import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

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
		// TODO: Implement actual database queries
		// For now, return empty data structure to allow page to load
		const documents: any[] = [];
		const totalCount = 0;

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
