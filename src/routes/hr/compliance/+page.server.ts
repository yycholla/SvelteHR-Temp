import type { PageServerLoad } from './$types';
import { apiClient } from '$lib/api/client';

export const load: PageServerLoad = async ({ cookies, url }) => {
	const token = cookies.get('auth-token');
	
	console.log('📋 Loading compliance page - Token present:', !!token);

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

	// Get query parameters for filtering
	const searchParams = url.searchParams;
	const status = searchParams.get('status') || 'all';
	const itemType = searchParams.get('itemType') || 'all';

	try {
		// Build query parameters
		const queryParams = new URLSearchParams();
		if (status !== 'all') queryParams.append('status', status);
		if (itemType !== 'all') queryParams.append('itemType', itemType);

		// Use v2 endpoints for enhanced compliance features
		const [complianceResponse, statsResponse, documentsResponse] = await Promise.allSettled([
			serverApiClient.get(`compliance?${queryParams.toString()}`).json(),
			serverApiClient.get('compliance/stats').json(),
			serverApiClient.get('documents?category=Certificate,Training,Policy').json()
		]);

		// Process responses
		const complianceData = complianceResponse.status === 'fulfilled' 
			? complianceResponse.value 
			: { data: [] };

		const statsData = statsResponse.status === 'fulfilled' 
			? statsResponse.value 
			: {};

		const documentsData = documentsResponse.status === 'fulfilled' 
			? documentsResponse.value 
			: { data: [] };

		console.log('✅ Compliance page data loaded successfully');

		return {
			complianceItems: complianceData.data || [],
			documents: documentsData.data || [],
			stats: {
				totalActive: statsData.totalActive || 0,
				expiringSoon: statsData.expiringSoon || 0,
				expired: statsData.expired || 0,
				pending: statsData.pending || 0
			},
			filters: {
				status,
				itemType
			}
		};
	} catch (error: any) {
		console.error('❌ Error loading compliance data:', error);
		
		// Return empty data with error state
		return {
			complianceItems: [],
			documents: [],
			stats: {
				totalActive: 0,
				expiringSoon: 0,
				expired: 0,
				pending: 0
			},
			filters: {
				status: 'all',
				itemType: 'all'
			},
			error: error.message || 'Failed to load compliance data'
		};
	}
};