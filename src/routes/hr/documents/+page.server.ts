import type { PageServerLoad } from './$types';
import { loadDocumentData, parseSearchParams } from '$lib/api/server-client';

export const load: PageServerLoad = async ({ cookies, url }) => {
	console.log('📄 Loading documents page with new API client');

	// Parse URL parameters for filtering and pagination
	const urlParams = parseSearchParams(url);
	const search = url.searchParams.get('search') || undefined;
	const category = url.searchParams.get('category') || 'all';
	const department = url.searchParams.get('department') || 'all';

	try {
		// Build API parameters
		const apiParams = {
			page: urlParams.page,
			limit: urlParams.limit,
			search,
			category: category !== 'all' ? category : undefined,
			department: department !== 'all' ? department : undefined
		};

		// Load document data using the centralized helper
		const documentData = await loadDocumentData(cookies, apiParams);

		console.log('✅ Documents page loaded with', documentData.documents.length, 'documents');

		return {
			documents: documentData.documents,
			departments: documentData.departments || [],
			pagination: {
				currentPage: urlParams.page,
				pageSize: urlParams.limit,
				totalCount: documentData.totalCount,
				totalPages: documentData.pagination?.totalPages || Math.ceil(documentData.totalCount / urlParams.limit)
			},
			filters: {
				search: search || '',
				category,
				department
			}
		};

	} catch (error: any) {
		console.error('❌ Error loading documents data:', error);
		
		// Return empty data with error state
		return {
			documents: [],
			departments: [],
			pagination: {
				currentPage: 1,
				pageSize: 20,
				totalCount: 0,
				totalPages: 1
			},
			filters: {
				search: '',
				category: 'all',
				department: 'all'
			},
			error: error.message || 'Failed to load documents data'
		};
	}
};