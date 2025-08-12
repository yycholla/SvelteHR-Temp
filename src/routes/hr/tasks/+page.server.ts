import type { PageServerLoad } from './$types';
import { apiClient } from '$lib/api/client';

export const load: PageServerLoad = async ({ cookies, url }) => {
	const token = cookies.get('auth-token');
	
	console.log('✅ Loading tasks page - Token present:', !!token);

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
	const relatedEntityType = searchParams.get('relatedEntityType') || 'all';

	try {
		// Build query parameters
		const queryParams = new URLSearchParams();
		if (status !== 'all') queryParams.append('status', status);
		if (relatedEntityType !== 'all') queryParams.append('relatedEntityType', relatedEntityType);

		// Use v2 endpoints for enhanced task features
		const tasksResponse = await serverApiClient.get(`tasks?${queryParams.toString()}`).json();

		const tasks = tasksResponse.data || [];

		console.log('✅ Tasks page data loaded successfully');

		return {
			tasks,
			stats: {
				total: tasks.length,
				pending: tasks.filter((task: any) => task.status === 'Pending').length,
				inProgress: tasks.filter((task: any) => task.status === 'InProgress').length,
				completed: tasks.filter((task: any) => task.status === 'Completed').length,
				blocked: tasks.filter((task: any) => task.status === 'Blocked').length
			},
			filters: {
				status,
				relatedEntityType
			}
		};
	} catch (error: any) {
		console.error('❌ Error loading tasks data:', error);
		
		return {
			tasks: [],
			stats: {
				total: 0,
				pending: 0,
				inProgress: 0,
				completed: 0,
				blocked: 0
			},
			filters: {
				status: 'all',
				relatedEntityType: 'all'
			},
			error: error.message || 'Failed to load tasks data'
		};
	}
};