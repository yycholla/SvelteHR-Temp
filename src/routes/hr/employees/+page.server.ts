import type { PageServerLoad } from './$types';
import { secureApiClient } from '$lib/utils/secure-fetch';

export const load: PageServerLoad = async ({ cookies, url }) => {
	console.log('🔄 SERVER LOAD: employees page load function called');
	const token = cookies.get('hr_token');
	

	if (!token) {
		throw new Error('Authentication required');
	}

	// Get query parameters for filtering and pagination
	const searchParams = url.searchParams;
	const search = searchParams.get('search') || undefined;
	const status = searchParams.get('status') || undefined;
	const department = searchParams.get('department') || undefined;
	const page = parseInt(searchParams.get('page') || '1');
	const pageSize = parseInt(searchParams.get('pageSize') || '50');

	try {
		// Build query parameters object
		const queryParams: Record<string, string | number> = {
			page,
			pageSize
		};
		if (search) queryParams.search = search;
		if (status && status !== 'all') queryParams.status = status;
		if (department && department !== 'all') queryParams.department_id = department;

		// Use secure API client for production-ready server-side calls
		console.log('🔒 SERVER LOAD: Making secure API calls to v2 backend...');
		const [employeesResponse, departmentsResponse, rolesResponse] = await Promise.allSettled([
			secureApiClient.get('/api/v2/employees', token, queryParams),
			secureApiClient.get('/api/v2/departments', token),
			secureApiClient.get('/api/v2/roles', token)
		]);
		console.log('✅ SERVER LOAD: Secure API calls completed');

		// Process employees response
		let employeesData = { data: [], total: 0, totalPages: 1 };
		if (employeesResponse.status === 'fulfilled' && employeesResponse.value.success) {
			employeesData = employeesResponse.value.data || employeesData;
		} else if (employeesResponse.status === 'fulfilled') {
			console.error('Employees API error:', employeesResponse.value.error);
		}

		// Process departments response
		let departmentsData = [];
		if (departmentsResponse.status === 'fulfilled' && departmentsResponse.value.success) {
			departmentsData = departmentsResponse.value.data || [];
		} else if (departmentsResponse.status === 'fulfilled') {
			console.error('Departments API error:', departmentsResponse.value.error);
		}

		// Process roles response with simple transformation
		let rolesData = [];
		if (rolesResponse.status === 'fulfilled' && rolesResponse.value.success) {
			try {
				const rawRoles = rolesResponse.value.data;
				const rolesArray = Array.isArray(rawRoles) ? rawRoles : [];
				rolesData = rolesArray.map((role: any) => ({
					id: (role.ID || role.id || 0).toString(),
					name: role.Name || role.name || 'Unknown Role',
					description: role.Description || role.description || null
				}));
			} catch (error) {
				console.error('Error processing roles:', error);
				rolesData = [];
			}
		} else if (rolesResponse.status === 'fulfilled') {
			console.error('Roles API error:', rolesResponse.value.error);
		}



		// Transform employee data to match component expectations
		const transformedEmployees = (employeesData.data || []).map((emp: any) => {
			try {
				// Handle both nested (JobInformation) and flat API formats
				const jobTitle = emp.JobInformation?.JobTitle || emp.jobTitle || 'Unknown Position';
				const status = emp.OnboardingStatus || emp.onboardingStatus || 'Active';
				
				// Handle department from multiple possible sources
				let department = undefined;
				if (emp.JobInformation?.Department) {
					// Nested format
					department = {
						id: emp.JobInformation.Department.ID || emp.JobInformation.Department.id,
						name: emp.JobInformation.Department.Name || emp.JobInformation.Department.name
					};
				} else if (emp.department) {
					// Already flat format or pre-transformed
					department = {
						id: emp.department.id || emp.department.ID,
						name: emp.department.name || emp.department.Name
					};
				} else if (emp.departmentId) {
					// Find department by ID from departments list
					const deptList = Array.isArray(departmentsData) ? departmentsData : departmentsData.data || [];
					const foundDept = deptList.find((d: any) => 
						(d.id || d.ID) === emp.departmentId || 
						(d.id || d.ID) === parseInt(emp.departmentId)
					);
					if (foundDept) {
						department = {
							id: foundDept.id || foundDept.ID,
							name: foundDept.name || foundDept.Name
						};
					}
				}
				
				const transformed = {
					...emp, // Keep all original fields
					// Add transformed fields for component compatibility
					jobTitle,
					status,
					department,
					// Ensure email is accessible from multiple sources
					email: emp.email || emp.ContactInformation?.Email || '',
					// Add missing fields that might be required
					firstName: emp.firstName || 'Unknown',
					lastName: emp.lastName || 'User',
					username: emp.username || `user_${emp.id}`
				};
				
				
				return transformed;
			} catch (error) {
				console.error('❌ Error transforming employee:', emp.id, error);
				// Return minimal valid employee object for failed transformations
				return {
					...emp,
					jobTitle: 'Unknown Position',
					status: 'Active',
					department: undefined,
					email: emp.email || emp.ContactInformation?.Email || '',
					firstName: emp.firstName || 'Unknown',
					lastName: emp.lastName || 'User',
					username: emp.username || `user_${emp.id}`
				};
			}
		});


		const result = {
			employees: transformedEmployees,
			departments: Array.isArray(departmentsData) ? departmentsData : departmentsData.data || [],
			roles: rolesData,
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
		
		console.log('✅ SERVER LOAD: Returning data with', transformedEmployees.length, 'employees');
		return result;
	} catch (error: any) {
		console.error('❌ Error loading employees data:', error);
		
		// Return empty data with error state
		return {
			employees: [],
			departments: [],
			roles: [],
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