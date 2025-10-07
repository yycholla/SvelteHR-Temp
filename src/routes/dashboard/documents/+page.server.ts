// Document list page server-side loader (Feature 024)
// Server-side data loading with RBAC filtering

import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals, fetch }) => {
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

		// Step 3: Build query string for API call
		const queryParams = new URLSearchParams();
		queryParams.set('page', page.toString());
		queryParams.set('limit', limit.toString());
		queryParams.set('sortBy', sortBy);
		queryParams.set('sortOrder', sortOrder);

		if (filterCategory) queryParams.set('category', filterCategory);
		if (filterSensitivity) queryParams.set('sensitivityLevel', filterSensitivity);
		if (searchQuery) queryParams.set('search', searchQuery);

		// Step 4: Call documents API with RBAC filtering
		// The API endpoint will apply role-based filtering server-side
		const response = await fetch(`/api/documents?${queryParams.toString()}`);

		if (!response.ok) {
			if (response.status === 401) {
				throw redirect(303, '/login?redirectTo=/dashboard/documents');
			}

			throw error(response.status, {
				message: 'Failed to load documents'
			});
		}

		const result = await response.json();

		// Step 5: Determine user permissions
		const userPermissions: string[] = [];

		if (userRole === 'super_admin' || userRole === 'admin') {
			userPermissions.push('documents:upload', 'documents:delete', 'documents:assign');
		} else if (userRole === 'manager') {
			userPermissions.push('documents:upload');
		}

		// Step 6: Return data for the page
		return {
			documents: result.documents || [],
			totalCount: result.totalCount || 0,
			page,
			limit,
			sortBy,
			sortOrder,
			filterCategory,
			filterSensitivity,
			searchQuery,
			user: locals.user,
			userPermissions,
			totalPages: result.totalPages || 0
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
