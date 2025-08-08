import type { PageServerLoad } from './$types';
import { apiClient } from '$lib/api/client';

export const load: PageServerLoad = async ({ cookies, url }) => {
	const token = cookies.get('auth-token');
	
	console.log('📊 Loading performance page - Token present:', !!token);

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
	const employeeId = searchParams.get('employeeId') || 'all';

	try {
		// Build query parameters for performance reviews
		const queryParams = new URLSearchParams();
		if (status !== 'all') queryParams.append('status', status);
		if (employeeId !== 'all') queryParams.append('employeeId', employeeId);

		// Fetch performance reviews
		const reviewsResponse = await serverApiClient.get(`performance/reviews?${queryParams.toString()}`).json();
		
		const reviews = (reviewsResponse && reviewsResponse.data) || [];

		// Calculate stats
		const today = new Date();
		const stats = {
			totalReviews: reviews.length,
			completed: reviews.filter((r: any) => r.status === 'Completed').length,
			pending: reviews.filter((r: any) => r.status === 'Pending').length,
			overdue: reviews.filter((r: any) => {
				const dueDate = new Date(r.dueDate);
				return r.status !== 'Completed' && dueDate < today;
			}).length,
			averageScore: reviews.length > 0 
				? Math.round(reviews
					.filter((r: any) => r.overallScore)
					.reduce((sum: number, r: any) => sum + r.overallScore, 0) / 
					reviews.filter((r: any) => r.overallScore).length * 10) / 10
				: 0
		};

		console.log('✅ Performance page data loaded successfully');

		return {
			performanceReviews: reviews,
			stats,
			filters: {
				status,
				employeeId
			}
		};
	} catch (error: any) {
		console.error('❌ Error loading performance data:', error);
		
		return {
			performanceReviews: [],
			stats: {
				totalReviews: 0,
				completed: 0,
				pending: 0,
				overdue: 0,
				averageScore: 0
			},
			filters: {
				status: 'all',
				employeeId: 'all'
			},
			error: error.message || 'Failed to load performance data'
		};
	}
};