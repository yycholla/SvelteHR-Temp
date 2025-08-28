import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { EmployeeService, DepartmentService } from '$lib/api/services';
import { apiClient } from '$lib/api/client';
import { employeeListResponseSchema, departmentSchema, embeddedPositionSchema as positionSchema } from '$lib/schemas/employee';
import { mockEmployees, departments as mockDepartments, positions as mockPositions } from '$lib/data/mockEmployees';
import { apiCache, CACHE_KEYS, CACHE_TTL } from '$lib/api/cache';
import { z } from 'zod';

export const load: PageServerLoad = async ({ url, cookies }) => {
	// Check if cache should be cleared (for debugging)
	const clearCache = url.searchParams.get('clearCache');
	if (clearCache === 'true') {
		console.log('🧹 Manual cache clear requested');
		apiCache.clear();
	}
	
	// Get authentication token
	const token = cookies.get('hr_token');
	
	// Parse URL parameters
	const page = Number(url.searchParams.get('page')) || 1;
	const search = url.searchParams.get('search') || '';
	const departmentId = url.searchParams.get('departmentId') || '';
	const status = url.searchParams.get('status') || '';
	const limit = Number(url.searchParams.get('limit')) || 20;
	const sortBy = url.searchParams.get('sortBy') || 'lastName';
	const sortOrder = url.searchParams.get('sortOrder') || 'asc';

	// Build query parameters for API (based on API schema documentation)
	const params = new URLSearchParams();
	if (search) params.append('search', search);
	if (departmentId) params.append('filter[department_id]', departmentId);
	if (status) params.append('filter[onboarding_status]', status);
	params.append('page', page.toString());
	params.append('pageSize', limit.toString()); // API uses 'pageSize' not 'limit'
	params.append('sort', sortBy);
	params.append('order', sortOrder.toUpperCase()); // API expects 'ASC' or 'DESC'

	try {
		// If we have a token, try to fetch from the real API
		if (token) {
			console.log('🔍 Attempting to fetch from API with MountainHR client...');
			
			// Check cache first for employees (only cache first page with no filters for optimal performance)
			const isFirstPageNoFilters = page === 1 && !search && !departmentId && !status && sortBy === 'lastName' && sortOrder === 'asc';
			
			let cachedEmployees = null;
			let cachedDepartments = null;
			
            if (isFirstPageNoFilters) {
                cachedEmployees = apiCache.get(CACHE_KEYS.EMPLOYEES, { page: 1, limit });
                // Validate cached employees shape defensively to avoid placeholder fallback
                if (cachedEmployees) {
                    try {
                        const validated = employeeListResponseSchema.parse(cachedEmployees);
                        cachedEmployees = validated;
                        console.log('📋 Using validated cached employees (first page)');
                    } catch (e) {
                        console.warn('🗑️ Clearing invalid cached employees data (shape mismatch)');
                        apiCache.invalidate(CACHE_KEYS.EMPLOYEES, { page: 1, limit });
                        cachedEmployees = null;
                    }
                } else {
                    console.log('🔄 No cached employees, fetching from API');
                }
            }
			
			// Always try to get departments from cache since they change less frequently
            cachedDepartments = apiCache.get(CACHE_KEYS.DEPARTMENTS);
            if (cachedDepartments) {
                try {
                    cachedDepartments = z.array(departmentSchema).parse(cachedDepartments);
                    console.log('📋 Using validated cached departments');
                } catch (e) {
                    console.warn('🗑️ Clearing invalid cached departments data (shape mismatch)');
                    apiCache.invalidate(CACHE_KEYS.DEPARTMENTS);
                    cachedDepartments = null;
                }
            } else {
                console.log('🔄 No cached departments, fetching from API');
            }

			// For server-side usage, set the token temporarily for this request
			apiClient.setToken(token);

			// Prepare API calls using the new services
			const apiCalls: Promise<any>[] = [];
			
			if (!cachedEmployees) {
				// Use EmployeeService with the new query builder
				const employeeOptions = {
					page,
					pageSize: limit,
					search: search || undefined,
					department_id: departmentId || undefined,
					status: status as 'active' | 'inactive' | 'terminated' || undefined,
					fields: ['id', 'full_name', 'email', 'status', 'hire_date'],
					include: ['department', 'role', 'manager']
				};
				
				apiCalls.push(EmployeeService.list(employeeOptions));
			} else {
				apiCalls.push(Promise.resolve({ success: true, data: cachedEmployees }));
			}
			
			if (!cachedDepartments) {
				apiCalls.push(DepartmentService.list());
			} else {
				apiCalls.push(Promise.resolve({ success: true, data: cachedDepartments }));
			}
			
			const [employeesResponse, departmentsResponse] = await Promise.allSettled(apiCalls);

			// Check if API calls were successful
			if (employeesResponse.status === 'fulfilled' && 
			    departmentsResponse.status === 'fulfilled') {
				
				const employeesApiResponse = employeesResponse.value;
				const departmentsApiResponse = departmentsResponse.value;
				
				// Check if our API responses were successful
				if (employeesApiResponse.success && departmentsApiResponse.success) {
					console.log('✅ API calls successful, transforming data...');
					
					try {
						// Transform backend response to match frontend schema
						const backendResponse = employeesApiResponse.data;
						console.log('🔍 Backend response structure:', JSON.stringify(backendResponse, null, 2));
						
						// Transform backend response to match the schema expectations
						const employeesData = {
							data: backendResponse.data || [],
							total: backendResponse.meta?.total || 0,
							page: backendResponse.meta?.page || 1,
							pageSize: backendResponse.meta?.pageSize || 20,
							totalPages: backendResponse.meta?.totalPages || 1,
							hasMore: backendResponse.meta?.hasMore || false
						};
						
						console.log('🔍 Transformed data structure:', JSON.stringify(employeesData, null, 2));
						
						// Validate the transformed data
						const validatedEmployeesData = employeeListResponseSchema.parse(employeesData);
						const departments = z.array(departmentSchema).parse(departmentsApiResponse.data);

						console.log(`📊 API data: ${validatedEmployeesData.employees.length} employees (page ${validatedEmployeesData.page}/${validatedEmployeesData.totalPages}), ${departments.length} departments`);
						
						// Cache the results for future requests
						if (isFirstPageNoFilters && !cachedEmployees) {
							// Store normalized, transformed structure in cache for stability
							apiCache.set(CACHE_KEYS.EMPLOYEES, validatedEmployeesData, { page: 1, limit: validatedEmployeesData.limit }, CACHE_TTL.MEDIUM);
						}
						
						if (!cachedDepartments) {
							apiCache.set(CACHE_KEYS.DEPARTMENTS, departments, undefined, CACHE_TTL.LONG);
						}

						// Server handles filtering and pagination, so we use the data as-is

						// Create positions from unique job titles
						const positions = Array.from(
							new Set(validatedEmployeesData.employees.map((emp: any) => emp.JobInformation?.JobTitle || emp.jobTitle).filter(Boolean))
						).map((title, index) => ({
							id: (index + 1).toString(),
							title,
							description: '',
							departmentId: '',
							level: 'N/A',
							isActive: true
						}));

						console.log(`📊 Processed ${validatedEmployeesData.employees.length} employees (page ${validatedEmployeesData.page}/${validatedEmployeesData.totalPages})`);

						return {
							employeesData: validatedEmployeesData,
							departments,
							positions,
							filters: {
								search,
								departmentId,
								status,
								page,
								limit: validatedEmployeesData.limit,
								sortBy,
								sortOrder
							},
							isUsingMockData: false
						};
					} catch (validationError) {
						console.warn('⚠️ API data validation failed:', validationError);
						console.warn('Raw API response structure:', JSON.stringify(employeesApiResponse, null, 2));
						
						// Clear invalid cached data to prevent repeated failures
						if (isFirstPageNoFilters && cachedEmployees) {
							console.log('🗑️ Clearing invalid cached employees data');
							apiCache.invalidate(CACHE_KEYS.EMPLOYEES, { page: 1, limit });
						}
						if (cachedDepartments) {
							console.log('🗑️ Clearing invalid cached departments data');
							apiCache.invalidate(CACHE_KEYS.DEPARTMENTS);
						}
						
						// Fall through to mock data
					}
				} else {
					console.warn('⚠️ API responses were not successful:');
					console.warn('Employees API response:', employeesApiResponse);
					console.warn('Departments API response:', departmentsApiResponse);
					// Fall through to mock data
				}
			} else {
				console.warn('⚠️ API calls failed, falling back to mock data');
				// Log specific failures
				if (employeesResponse.status === 'rejected') {
					console.warn('Employee API error:', employeesResponse.reason);
					// Clear employees cache on API failure
					if (isFirstPageNoFilters) {
						apiCache.invalidate(CACHE_KEYS.EMPLOYEES, { page: 1, limit });
					}
				}
				if (departmentsResponse.status === 'rejected') {
					console.warn('Departments API error:', departmentsResponse.reason);
					// Clear departments cache on API failure
					apiCache.invalidate(CACHE_KEYS.DEPARTMENTS);
				}
			}
		} else {
			console.log('🔒 No auth token, using mock data');
		}

		// Fallback to mock data with client-side filtering
		console.log('📋 Using mock data as fallback');
		
		let filteredEmployees = [...mockEmployees];

		// Apply search filter
		if (search.trim()) {
			const query = search.toLowerCase();
			filteredEmployees = filteredEmployees.filter(emp => 
				emp.firstName.toLowerCase().includes(query) ||
				emp.lastName.toLowerCase().includes(query) ||
				emp.email.toLowerCase().includes(query) ||
				emp.position.title.toLowerCase().includes(query) ||
				emp.department.name.toLowerCase().includes(query) ||
				emp.employeeId.toLowerCase().includes(query)
			);
		}

		// Apply department filter
		if (departmentId) {
			filteredEmployees = filteredEmployees.filter(emp => 
				emp.department.id === departmentId
			);
		}

		// Apply status filter
		if (status) {
			filteredEmployees = filteredEmployees.filter(emp => 
				emp.status === status
			);
		}

		// Apply sorting
		filteredEmployees.sort((a, b) => {
			let aValue: string | number;
			let bValue: string | number;

			switch (sortBy) {
				case 'firstName':
					aValue = a.firstName.toLowerCase();
					bValue = b.firstName.toLowerCase();
					break;
				case 'lastName':
					aValue = a.lastName.toLowerCase();
					bValue = b.lastName.toLowerCase();
					break;
				case 'hireDate':
					aValue = new Date(a.hireDate).getTime();
					bValue = new Date(b.hireDate).getTime();
					break;
				case 'department':
					aValue = a.department.name.toLowerCase();
					bValue = b.department.name.toLowerCase();
					break;
				case 'position':
					aValue = a.position.title.toLowerCase();
					bValue = b.position.title.toLowerCase();
					break;
				default:
					aValue = a.lastName.toLowerCase();
					bValue = b.lastName.toLowerCase();
			}

			if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
			if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
			return 0;
		});

		// Apply pagination
		const totalCount = filteredEmployees.length;
		const totalPages = Math.ceil(totalCount / limit);
		const startIndex = (page - 1) * limit;
		const paginatedEmployees = filteredEmployees.slice(startIndex, startIndex + limit);

		// Convert mock data format to API format for consistency
		const employeesData = {
			employees: paginatedEmployees.map(emp => ({
				id: emp.id,
				employeeId: emp.employeeId,
				firstName: emp.firstName,
				lastName: emp.lastName,
				email: emp.email,
				phone: emp.phone || '',
				hireDate: emp.hireDate,
				status: emp.status,
				departmentId: emp.department.id,
				positionId: emp.position.id,
				managerId: emp.managerId,
				salary: emp.salary,
				currency: 'USD',
				workLocation: emp.location,
				workType: 'FULL_TIME' as const,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				// Keep original nested objects for UI compatibility
				department: emp.department,
				position: emp.position
			})),
			totalCount,
			page,
			limit,
			totalPages
		};

		return {
			employeesData,
			departments: mockDepartments.map(dept => ({
				id: dept.id,
				name: dept.name,
				description: '',
				isActive: true,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			})),
			positions: mockPositions.map(pos => ({
				id: pos.id,
				title: pos.title,
				departmentId: '1', // Default to first department
				level: pos.level,
				isActive: true
			})),
			filters: {
				search,
				departmentId,
				status,
				page,
				limit,
				sortBy,
				sortOrder
			},
			isUsingMockData: true
		};

	} catch (err) {
		console.error('❌ Error loading employee data:', err);
		throw error(500, {
			message: 'Failed to load employee data'
		});
	}
};