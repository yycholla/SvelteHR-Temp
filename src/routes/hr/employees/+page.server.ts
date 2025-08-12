import type { PageServerLoad } from './$types';
import { apiClient } from '$lib/api/client';

export const load: PageServerLoad = async ({ cookies, url }) => {
	const token = cookies.get('auth-token');
	
	console.log('👥 Loading employees page - Token present:', !!token);

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
	const status = searchParams.get('status') || undefined;
	const department = searchParams.get('department') || undefined;
	const page = parseInt(searchParams.get('page') || '1');
	const pageSize = parseInt(searchParams.get('pageSize') || '50');

	try {
		// Build query parameters
		const queryParams = new URLSearchParams();
		if (search) queryParams.append('search', search);
		if (status && status !== 'all') queryParams.append('status', status);
		if (department && department !== 'all') queryParams.append('department', department);
		queryParams.append('page', page.toString());
		queryParams.append('pageSize', pageSize.toString());

		// Use v1 endpoints (v2 not available)
		const [employeesResponse, departmentsResponse] = await Promise.allSettled([
			serverApiClient.get(`employees?${queryParams.toString()}`).json(),
			serverApiClient.get('departments').json()
		]);

		// Process employees response
		const employeesData = employeesResponse.status === 'fulfilled' 
			? employeesResponse.value 
			: { data: [], total: 0, totalPages: 1 };

		// Process departments response
		const departmentsData = departmentsResponse.status === 'fulfilled' 
			? departmentsResponse.value 
			: [];

		console.log('✅ Employees page data loaded successfully:', {
			employeesCount: employeesData.data?.length || 0,
			employeesTotal: employeesData.total,
			firstEmployee: employeesData.data?.[0],
			departmentsCount: Array.isArray(departmentsData) ? departmentsData.length : departmentsData.data?.length || 0
		});

		// Transform employee data to match component expectations
		const transformedEmployees = (employeesData.data || []).map((emp: any) => ({
			...emp, // Keep all original fields
			// Add transformed fields for component compatibility
			jobTitle: emp.JobInformation?.JobTitle || '',
			status: emp.OnboardingStatus || 'Active',
			department: emp.JobInformation?.Department ? {
				id: emp.JobInformation.Department.ID,
				name: emp.JobInformation.Department.Name
			} : undefined
		}));

		return {
			employees: transformedEmployees,
			departments: Array.isArray(departmentsData) ? departmentsData : departmentsData.data || [],
			pagination: {
				currentPage: page,
				pageSize,
				totalCount: employeesData.total || 0,
				totalPages: employeesData.totalPages || 1
			},
			filters: {
				search: search || '',
				status: status || 'all',
				department: department || 'all'
			}
		};
	} catch (error: any) {
		console.error('❌ Error loading employees data:', error);
		
		// Return empty data with error state
		return {
			employees: [],
			departments: [],
			pagination: {
				currentPage: 1,
				pageSize: 10,
				totalCount: 0,
				totalPages: 1
			},
			filters: {
				search: '',
				status: 'all',
				department: 'all'
			},
			error: error.message || 'Failed to load employees data'
		};
	}
};