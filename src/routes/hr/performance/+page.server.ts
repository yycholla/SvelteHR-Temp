import type { PageServerLoad } from './$types';
import { createAuthenticatedApiClient, parseSearchParams } from '$lib/api/server-client';

export const load: PageServerLoad = async ({ cookies, url }) => {
	console.log('📊 Loading performance page with new API client');

	// Get query parameters for filtering
	const urlParams = parseSearchParams(url);
	const status = url.searchParams.get('status') || 'all';
	const employeeId = url.searchParams.get('employeeId') || 'all';

	try {
		const apiClient = createAuthenticatedApiClient(cookies);

		// Build API parameters for performance data
		const apiParams = {
			page: urlParams.page,
			limit: urlParams.limit,
			status: status !== 'all' ? status : undefined,
			employee_id: employeeId !== 'all' ? employeeId : undefined
		};

		// Load performance reviews and employees in parallel
		const [reviewsResult, employeesResult] = await Promise.allSettled([
			// Try to get performance reviews (may not exist as endpoint)
			apiClient.get('/api/v2/performance/reviews', apiParams),
			// Get employees for filtering
			apiClient.employees.list({ limit: 100 })
		]);

		// Process performance reviews
		let reviews: any[] = [];
		if (reviewsResult.status === 'fulfilled' && reviewsResult.value.success) {
			reviews = reviewsResult.value.data?.data || [];
		} else {
			console.log('ℹ️ Performance reviews endpoint not available');
		}

		// Process employees data
		let employees: any[] = [];
		if (employeesResult.status === 'fulfilled' && employeesResult.value.success) {
			employees = employeesResult.value.data?.data || [];
		}

		// Calculate performance stats
		const today = new Date();
		const stats = {
			totalReviews: reviews.length,
			completed: reviews.filter((r: any) => r.status === 'completed').length,
			pending: reviews.filter((r: any) => r.status === 'pending').length,
			overdue: reviews.filter((r: any) => {
				if (!r.due_date) return false;
				const dueDate = new Date(r.due_date);
				return r.status !== 'completed' && dueDate < today;
			}).length,
			averageScore: reviews.length > 0 && reviews.some((r: any) => r.overall_score)
				? Math.round(reviews
					.filter((r: any) => r.overall_score)
					.reduce((sum: number, r: any) => sum + r.overall_score, 0) / 
					reviews.filter((r: any) => r.overall_score).length * 10) / 10
				: 0
		};

		console.log('✅ Performance page loaded with', reviews.length, 'reviews');

		return {
			performanceReviews: reviews,
			employees,
			stats,
			totalCount: reviews.length,
			filters: {
				status,
				employeeId
			}
		};

	} catch (error: any) {
		console.error('❌ Error loading performance data:', error);
		
		return {
			performanceReviews: [],
			employees: [],
			stats: {
				totalReviews: 0,
				completed: 0,
				pending: 0,
				overdue: 0,
				averageScore: 0
			},
			totalCount: 0,
			filters: {
				status: 'all',
				employeeId: 'all'
			},
			error: error.message || 'Failed to load performance data'
		};
	}
};