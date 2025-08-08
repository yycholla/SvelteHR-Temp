import type { PageServerLoad } from './$types';
import { apiClient } from '$lib/api/client';

export const load: PageServerLoad = async ({ cookies, url }) => {
	const token = cookies.get('auth-token');
	
	console.log('🚀 Loading onboarding page - Token present:', !!token);

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

	try {
		// Build query parameters
		const queryParams = new URLSearchParams();
		if (status !== 'all') queryParams.append('status', status);

		// Fetch onboarding employees
		const employeesResponse = await serverApiClient.get(`employees?${queryParams.toString()}`).json();

		const employees = employeesResponse.data || [];

		// Calculate onboarding stats
		const stats = {
			total: employees.length,
			preHire: employees.filter((emp: any) => emp.status === 'PreHire').length,
			onboarding: employees.filter((emp: any) => emp.status === 'Onboarding').length,
			active: employees.filter((emp: any) => emp.status === 'Active').length,
			overdue: 0 // Would calculate based on hire date vs current progress
		};

		console.log('✅ Onboarding page data loaded successfully');

		return {
			onboardingEmployees: employees,
			stats,
			filters: {
				status
			}
		};
	} catch (error: any) {
		console.error('❌ Error loading onboarding data:', error);
		
		// Return empty data with error state
		return {
			onboardingEmployees: [],
			stats: {
				total: 0,
				preHire: 0,
				onboarding: 0,
				active: 0,
				overdue: 0
			},
			filters: {
				status: 'all'
			},
			error: error.message || 'Failed to load onboarding data'
		};
	}
};