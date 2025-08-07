import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { apiClient } from '$lib/api/client';
import { employeeSchema } from '$lib/schemas/employee';
import { mockEmployees } from '$lib/data/mockEmployees';
import { apiCache, CACHE_KEYS, CACHE_TTL } from '$lib/api/cache';

export const load: PageServerLoad = async ({ params, cookies, locals }) => {
	const { id } = params;
	const token = cookies.get('auth-token');

	console.log(`🔍 Employee ${id} page load - Token present:`, !!token);
	console.log(`🔍 Employee ${id} page load - User authenticated:`, !!locals.user);
	console.log(`🔍 Employee ${id} page load - User data:`, locals.user);

	try {
		if (token) {
			console.log(`🔍 Fetching employee ${id} from API...`);
			
			// Check cache first
			const cachedEmployee = apiCache.get(CACHE_KEYS.EMPLOYEE_DETAIL, { id });
			if (cachedEmployee) {
				console.log(`📋 Using cached employee ${id}`);
				return {
					employee: cachedEmployee,
					isUsingMockData: false
				};
			}
			
			// Create server-side API client with proper token handling
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

			// Fetch employee data
			const employeeResponse = await serverApiClient.get(`employees/${id}`).json();
			
			console.log(`✅ Employee ${id} fetched from API`);
			console.log('🔍 Raw API Response for employee:', JSON.stringify(employeeResponse, null, 2));
			console.log('🔍 API Response keys:', Object.keys(employeeResponse));
			console.log('🔍 Sample API fields:', {
				middleName: employeeResponse.middleName,
				phoneNumber: employeeResponse.phoneNumber,
				addressStreet: employeeResponse.addressStreet,
				payRate: employeeResponse.payRate,
				payType: employeeResponse.payType
			});

			// Parse and validate API response
			const employee = employeeSchema.parse(employeeResponse);
			
			console.log('🔍 Schema-transformed employee:', JSON.stringify(employee, null, 2));
			console.log('🔍 Schema-transformed keys:', Object.keys(employee));
			console.log('🔍 Schema-transformed sample fields:', {
				middleName: employee.middleName,
				phoneNumber: employee.phoneNumber,
				addressStreet: employee.addressStreet,
				payRate: employee.payRate,
				payType: employee.payType
			});
			
			// Cache the employee data
			apiCache.set(CACHE_KEYS.EMPLOYEE_DETAIL, employee, { id }, CACHE_TTL.MEDIUM);

			return {
				employee,
				isUsingMockData: false
			};
		}
	} catch (err: any) {
		console.error(`❌ Failed to fetch employee ${id}:`, err);
		if (err.response) {
			console.error(`API Response Status: ${err.response.status}`);
			console.error(`API Response Body:`, err.response.body || 'No body');
		}
		
		// Re-throw specific API errors to preserve status codes
		if (err.response?.status === 404) {
			throw error(404, {
				message: `Employee with ID ${id} not found`
			});
		}
		if (err.response?.status >= 400) {
			throw error(err.response.status, {
				message: `API Error: ${err.message || 'Failed to fetch employee'}`
			});
		}
	}

	// No token available, cannot access employee data
	throw error(401, {
		message: 'Authentication required to access employee data'
	});
};