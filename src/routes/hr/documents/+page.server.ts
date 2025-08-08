import type { PageServerLoad } from './$types';
import { apiClient } from '$lib/api/client';

export const load: PageServerLoad = async ({ cookies, url }) => {
	const token = cookies.get('auth-token');
	
	console.log('📄 Loading documents page - Token present:', !!token);

	if (!token) {
		throw new Error('Authentication required');
	}

	// Create server-side API client with auth token
	const serverApiClient = apiClient.extend({
		hooks: {
			beforeRequest: [
				(request) => {
					request.headers.set('Authorization', `Bearer ${token}`);
					request.headers.set('Content-Type', 'application/json');
					console.log(`📡 API Request: ${request.method} ${request.url}`);
				}
			],
			afterResponse: [
				(request, options, response) => {
					console.log(`📡 API Response: ${response.status} for ${request.url}`);
					return response;
				}
			]
		}
	});

	// Get query parameters for filtering and pagination
	const searchParams = url.searchParams;
	const search = searchParams.get('search') || undefined;
	const category = searchParams.get('category') || undefined;
	const department = searchParams.get('department') || undefined;
	const page = parseInt(searchParams.get('page') || '1');
	const pageSize = parseInt(searchParams.get('pageSize') || '20');

	try {
		// Build query parameters
		const queryParams = new URLSearchParams();
		if (search) queryParams.append('search', search);
		if (category && category !== 'all') queryParams.append('category', category);
		if (department && department !== 'all') queryParams.append('department', department);
		queryParams.append('page', page.toString());
		queryParams.append('pageSize', pageSize.toString());

		// Fetch documents and departments in parallel
		const [documentsResponse, departmentsResponse] = await Promise.allSettled([
			serverApiClient.get(`documents?${queryParams.toString()}`).json(),
			serverApiClient.get('departments').json()
		]);

		// Process documents response
		const documentsData = documentsResponse.status === 'fulfilled' 
			? documentsResponse.value 
			: { data: [], total: 0, totalPages: 1 };

		// Process departments response
		const departmentsData = departmentsResponse.status === 'fulfilled' 
			? departmentsResponse.value 
			: [];

		console.log('✅ Documents page data loaded successfully');

		return {
			documents: documentsData.data || [],
			departments: Array.isArray(departmentsData) ? departmentsData : departmentsData.data || [],
			pagination: {
				currentPage: page,
				pageSize,
				totalCount: documentsData.total || 0,
				totalPages: documentsData.totalPages || 1
			},
			filters: {
				search: search || '',
				category: category || 'all',
				department: department || 'all'
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