import type { PageServerLoad } from './$types';
import { apiClient } from '$lib/api/client';
import { apiCache, CACHE_KEYS, CACHE_TTL } from '$lib/api/cache';

export const load: PageServerLoad = async ({ cookies, locals, url }) => {
	const token = cookies.get('hr_token');

	// Parse URL parameters for filtering
	const page = Number(url.searchParams.get('page')) || 1;
	const search = url.searchParams.get('search') || '';
	const status = url.searchParams.get('status') || '';
	const category = url.searchParams.get('category') || '';
	const limit = Number(url.searchParams.get('limit')) || 20;

	console.log('📋 Compliance page load - Token present:', !!token);
	console.log('📋 Compliance page load - User authenticated:', !!locals.user);

	// Default compliance data structure
	const defaultData = {
		complianceItems: [],
		totalCount: 0,
		page,
		limit,
		totalPages: 0,
		hasMore: false,
		filters: { search, status, category },
		stats: {
			totalItems: 0,
			compliant: 0,
			nonCompliant: 0,
			pending: 0,
			upcomingDeadlines: 0
		},
		currentUser: locals.user,
		isUsingMockData: true
	};

	try {
		if (token) {
			console.log('📋 Fetching compliance data from API...');

			// Build query parameters
			const params = new URLSearchParams();
			if (search) params.append('search', search);
			if (status) params.append('status', status);
			if (category) params.append('category', category);
			params.append('page', page.toString());
			params.append('pageSize', limit.toString());

			// Check cache
			const cacheKey = `compliance_${params.toString()}`;
			const cachedCompliance = apiCache.get(cacheKey);
			if (cachedCompliance) {
				console.log('📋 Using cached compliance data');
				return { ...cachedCompliance, isUsingMockData: false };
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

			// Try to fetch compliance data - fallback to mock if endpoint doesn't exist
			let complianceResponse;
			try {
				complianceResponse = await serverApiClient.get(`compliance?${params.toString()}`).json();
			} catch (error) {
				console.log('📋 Compliance API not available, using mock data structure');
				complianceResponse = { data: [], total: 0 };
			}

			// Process compliance data
			const complianceData = Array.isArray(complianceResponse)
				? complianceResponse
				: complianceResponse.data || [];
			const totalCount = complianceResponse.total || complianceData.length;
			const totalPages = Math.ceil(totalCount / limit);

			// Format compliance items for UI
			const formattedItems = complianceData.map((item: any) => ({
				id: item.id || item.ID,
				title: item.title || item.Title || 'Untitled Compliance Item',
				description: item.description || item.Description || '',
				status: item.status || item.Status || 'pending',
				category: item.category || item.Category || 'general',
				dueDate: item.dueDate || item.due_date || item.DueDate,
				completedDate: item.completedDate || item.completed_date || item.CompletedDate,
				assignedTo: item.assignedTo || item.assigned_to || item.AssignedTo,
				assignedToName: item.assignedToName || item.assigned_to_name || 'Unassigned',
				priority: item.priority || item.Priority || 'medium',
				requirements: item.requirements || item.Requirements || [],
				documents: item.documents || item.Documents || [],
				createdAt: item.createdAt || item.created_at || item.CreatedAt,
				updatedAt: item.updatedAt || item.updated_at || item.UpdatedAt
			}));

			// Calculate stats
			const stats = {
				totalItems: totalCount,
				compliant: formattedItems.filter((item) => item.status === 'compliant').length,
				nonCompliant: formattedItems.filter((item) => item.status === 'non_compliant').length,
				pending: formattedItems.filter((item) => item.status === 'pending').length,
				upcomingDeadlines: formattedItems.filter((item) => {
					if (!item.dueDate) return false;
					const dueDate = new Date(item.dueDate);
					const now = new Date();
					const diffTime = dueDate.getTime() - now.getTime();
					const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
					return diffDays <= 30 && diffDays >= 0;
				}).length
			};

			const result = {
				complianceItems: formattedItems,
				totalCount,
				page,
				limit,
				totalPages,
				hasMore: page < totalPages,
				filters: { search, status, category },
				stats,
				currentUser: locals.user,
				isUsingMockData: false
			};

			// Cache the results
			apiCache.set(cacheKey, result, undefined, CACHE_TTL.MEDIUM);
			console.log(`📋 Cached ${formattedItems.length} compliance items`);

			return result;
		} else {
			console.log('🔒 No auth token, using default data');
			return defaultData;
		}
	} catch (err: any) {
		console.error('❌ Error loading compliance data:', err);
		// Return default data on error
		return defaultData;
	}
};
