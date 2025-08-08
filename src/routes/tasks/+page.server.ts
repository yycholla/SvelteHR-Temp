import type { PageServerLoad } from './$types';
import { apiClient } from '$lib/api/client';
import { apiCache, CACHE_KEYS, CACHE_TTL } from '$lib/api/cache';

export const load: PageServerLoad = async ({ cookies, locals, url }) => {
	const token = cookies.get('auth-token');
	
	// Parse URL parameters for filtering
	const page = Number(url.searchParams.get('page')) || 1;
	const search = url.searchParams.get('search') || '';
	const status = url.searchParams.get('status') || '';
	const priority = url.searchParams.get('priority') || '';
	const limit = Number(url.searchParams.get('limit')) || 20;
	
	console.log('📋 Tasks page load - Token present:', !!token);
	console.log('📋 Tasks page load - User authenticated:', !!locals.user);

	// Default tasks data structure
	const defaultData = {
		tasks: [],
		totalCount: 0,
		page,
		limit,
		totalPages: 0,
		hasMore: false,
		filters: { search, status, priority },
		currentUser: locals.user,
		isUsingMockData: true
	};

	try {
		if (token) {
			console.log('📋 Fetching tasks from API...');
			
			// Build query parameters
			const params = new URLSearchParams();
			if (search) params.append('search', search);
			if (status) params.append('status', status);
			if (priority) params.append('priority', priority);
			params.append('page', page.toString());
			params.append('pageSize', limit.toString());
			
			// Check cache
			const cacheKey = `tasks_${params.toString()}`;
			const cachedTasks = apiCache.get(cacheKey);
			if (cachedTasks) {
				console.log('📋 Using cached tasks data');
				return { ...cachedTasks, isUsingMockData: false };
			}
			
			// Create server-side API client
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

			// Fetch tasks data
			const tasksResponse = await serverApiClient.get(`tasks?${params.toString()}`).json();
			
			// Process tasks data
			const tasksData = Array.isArray(tasksResponse) ? tasksResponse : tasksResponse.data || [];
			const totalCount = tasksResponse.total || tasksData.length;
			const totalPages = Math.ceil(totalCount / limit);
			
			// Format tasks for UI
			const formattedTasks = tasksData.map((task: any) => ({
				id: task.id || task.ID,
				title: task.title || task.Title || 'Untitled Task',
				description: task.description || task.Description || '',
				status: task.status || task.Status || 'pending',
				priority: task.priority || task.Priority || 'medium',
				assignedTo: task.assignedTo || task.assigned_to || task.AssignedTo,
				assignedToName: task.assignedToName || task.assigned_to_name || 'Unassigned',
				dueDate: task.dueDate || task.due_date || task.DueDate,
				createdAt: task.createdAt || task.created_at || task.CreatedAt,
				updatedAt: task.updatedAt || task.updated_at || task.UpdatedAt,
				issuedBy: task.issuedBy || task.issued_by || task.IssuedBy,
				issuedByName: task.issuedByName || task.issued_by_name || 'System'
			}));

			const result = {
				tasks: formattedTasks,
				totalCount,
				page,
				limit,
				totalPages,
				hasMore: page < totalPages,
				filters: { search, status, priority },
				currentUser: locals.user,
				isUsingMockData: false
			};

			// Cache the results
			apiCache.set(cacheKey, result, undefined, CACHE_TTL.SHORT);
			console.log(`📋 Cached ${formattedTasks.length} tasks`);

			return result;
		} else {
			console.log('🔒 No auth token, using default data');
			return defaultData;
		}
	} catch (err: any) {
		console.error('❌ Error loading tasks:', err);
		// Return default data on error
		return defaultData;
	}
};