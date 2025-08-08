import type { PageServerLoad, Actions } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { apiClient } from '$lib/api/client';
import { employeeSchema, departmentSchema } from '$lib/schemas/employee';
import { mockEmployees, departments as mockDepartments } from '$lib/data/mockEmployees';
import { apiCache, CACHE_KEYS, CACHE_TTL } from '$lib/api/cache';

export const load: PageServerLoad = async ({ params, cookies, locals }) => {
	const { id } = params;
	const token = cookies.get('auth-token');

	console.log(`🔍 Employee ${id} edit page load - Token present:`, !!token);
	console.log(`🔍 Employee ${id} edit page load - User authenticated:`, !!locals.user);
	console.log(`🔍 Employee ${id} edit page load - User data:`, locals.user);

	try {
		if (token) {
			console.log(`🔍 Fetching employee ${id} and form data from API...`);
			
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

			// Check cache first for employee, departments, roles, and managers
			const cachedEmployee = apiCache.get(CACHE_KEYS.EMPLOYEE_DETAIL, { id });
			const cachedDepartments = apiCache.get(CACHE_KEYS.DEPARTMENTS);
			const cachedRoles = apiCache.get(CACHE_KEYS.ROLES);
			const cachedManagers = apiCache.get('MANAGERS');
			
			// Fetch employee data and form options in parallel (skip if cached)
			const apiCalls: Promise<any>[] = [];
			
			if (!cachedEmployee) {
				apiCalls.push(serverApiClient.get(`employees/${id}`).json());
			} else {
				apiCalls.push(Promise.resolve(cachedEmployee));
			}
			
			if (!cachedDepartments) {
				apiCalls.push(serverApiClient.get('departments').json());
			} else {
				apiCalls.push(Promise.resolve(cachedDepartments));
			}
			
			if (!cachedRoles) {
				apiCalls.push(serverApiClient.get('roles').json());
			} else {
				apiCalls.push(Promise.resolve(cachedRoles));
			}
			
			if (!cachedManagers) {
				// Fetch employees with manager roles or who are marked as managers
				apiCalls.push(serverApiClient.get('employees?pageSize=100').json());
			} else {
				apiCalls.push(Promise.resolve(cachedManagers));
			}
			
			const [employeeResponse, departmentsResponse, rolesResponse, managersResponse] = await Promise.allSettled(apiCalls);

			// Check if critical API calls were successful (managers is optional)
			if (employeeResponse.status === 'fulfilled' && 
			    departmentsResponse.status === 'fulfilled' && 
			    rolesResponse.status === 'fulfilled') {
				
				console.log(`✅ Employee ${id} and form data fetched from API`);
				console.log('🔍 Raw API Response for employee:', JSON.stringify(employeeResponse.value, null, 2));
				console.log('🔍 API Response keys:', Object.keys(employeeResponse.value));
				console.log('🔍 Sample API fields:', {
					middleName: employeeResponse.value.middleName,
					phoneNumber: employeeResponse.value.phoneNumber,
					addressStreet: employeeResponse.value.addressStreet,
					payRate: employeeResponse.value.payRate,
					payType: employeeResponse.value.payType
				});

				// Parse and validate API responses (skip parsing if using cached data)
				const employee = cachedEmployee || employeeSchema.parse(employeeResponse.value);
				const departments = cachedDepartments || departmentsResponse.value;
				const roles = cachedRoles || rolesResponse.value;
				
				// Extract managers from employees list or use cached data (fallback to empty array if failed)
				let managers = [];
				if (cachedManagers) {
					managers = cachedManagers;
				} else if (managersResponse.status === 'fulfilled') {
					const allEmployeesData = managersResponse.value;
					managers = (allEmployeesData?.data || allEmployeesData?.employees || [])
						.filter((emp: any) => emp.IsManager || emp.isManager)
						.map((emp: any) => ({
							id: emp.id,
							firstName: emp.firstName,
							lastName: emp.lastName,
							jobTitle: emp.JobInformation?.JobTitle || emp.jobTitle || ''
						}));
				}
				
				console.log('🔍 Schema-transformed employee (edit):', JSON.stringify(employee, null, 2));
				console.log('🔍 Schema-transformed keys (edit):', Object.keys(employee));
				console.log('🔍 Schema-transformed sample fields (edit):', {
					middleName: employee.middleName,
					phoneNumber: employee.phoneNumber,
					addressStreet: employee.addressStreet,
					payRate: employee.payRate,
					payType: employee.payType
				});
				
				// Cache the results for future requests
				if (!cachedEmployee) {
					apiCache.set(CACHE_KEYS.EMPLOYEE_DETAIL, employee, { id }, CACHE_TTL.MEDIUM);
				}
				if (!cachedDepartments) {
					apiCache.set(CACHE_KEYS.DEPARTMENTS, departments, undefined, CACHE_TTL.LONG);
				}
				if (!cachedRoles) {
					apiCache.set(CACHE_KEYS.ROLES, roles, undefined, CACHE_TTL.LONG);
				}
				if (!cachedManagers && managers.length > 0) {
					apiCache.set('MANAGERS', managers, undefined, CACHE_TTL.MEDIUM);
				}

				return {
					employee,
					departments,
					roles,
					managers,
					isUsingMockData: false
				};
			} else {
				// Log specific API failures
				if (employeeResponse.status === 'rejected') {
					console.error(`❌ Employee API error:`, employeeResponse.reason);
					const err: any = employeeResponse.reason;
					if (err.response?.status === 404) {
						throw error(404, {
							message: `Employee with ID ${id} not found`
						});
					}
				}
				if (departmentsResponse.status === 'rejected') {
					console.error(`❌ Departments API error:`, departmentsResponse.reason);
				}
				if (rolesResponse.status === 'rejected') {
					console.error(`❌ Roles API error:`, rolesResponse.reason);
				}
				if (managersResponse.status === 'rejected') {
					console.error(`❌ Managers API error:`, managersResponse.reason);
				}
				
				// Throw error for failed API calls
				throw error(500, {
					message: 'Failed to load required data from API'
				});
			}
		}
	} catch (err: any) {
		console.error(`❌ Failed to fetch employee ${id} for editing:`, err);
		
		// Re-throw SvelteKit errors
		if (err.status) {
			throw err;
		}
		
		// Handle API errors
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
		
		throw error(500, {
			message: 'Unexpected error occurred'
		});
	}

	// No token available, cannot access employee data
	throw error(401, {
		message: 'Authentication required to access employee data'
	});
};

export const actions: Actions = {
	save: async ({ params, request, cookies }) => {
		const { id } = params;
		const token = cookies.get('auth-token');

		if (!token) {
			throw error(401, { message: 'Authentication required' });
		}

		try {
			const formData = await request.formData();
			
			// Extract form data
			const payload = {
				firstName: formData.get('firstName') as string,
				lastName: formData.get('lastName') as string,
				middleName: formData.get('middleName') as string || null,
				email: formData.get('email') as string,
				phoneNumber: formData.get('phoneNumber') as string || null,
				workPhoneNumber: formData.get('workPhoneNumber') as string || null,
				addressStreet: formData.get('addressStreet') as string || null,
				addressCity: formData.get('addressCity') as string || null,
				addressState: formData.get('addressState') as string || null,
				addressZip: formData.get('addressZip') as string || null,
				emergencyContactName: formData.get('emergencyContactName') as string || null,
				emergencyContactRelationship: formData.get('emergencyContactRelationship') as string || null,
				emergencyContactPhone: formData.get('emergencyContactPhone') as string || null,
				jobTitle: formData.get('jobTitle') as string,
				departmentId: formData.get('departmentId') ? parseInt(formData.get('departmentId') as string) : null,
				roleId: formData.get('roleId') ? parseInt(formData.get('roleId') as string) : null,
				managerId: formData.get('managerId') ? parseInt(formData.get('managerId') as string) : null,
				employmentType: formData.get('employmentType') as string || null,
				hireDate: formData.get('hireDate') as string || null,
				dateOfBirth: formData.get('dateOfBirth') as string || null,
				gender: formData.get('gender') as string || null,
				payType: formData.get('payType') as string || null,
				payRate: formData.get('payRate') ? parseFloat(formData.get('payRate') as string) : null,
				workAuthorizationStatus: formData.get('workAuthorizationStatus') as string || null
			};

			console.log('🔄 Saving employee via server action:', payload);

			// Create server-side API client with proper token handling
			const serverApiClient = apiClient.extend({
				hooks: {
					beforeRequest: [
						(request) => {
							request.headers.set('Authorization', `Bearer ${token}`);
							request.headers.set('Content-Type', 'application/json');
						}
					]
				}
			});

			// Make API call to update employee
			const updatedEmployee = await serverApiClient.put(`employees/${id}`, {
				json: payload
			}).json();

			console.log('✅ Employee updated successfully:', updatedEmployee);
			
			// Invalidate employee caches since data has been updated
			apiCache.invalidatePattern(CACHE_KEYS.EMPLOYEES); // Clear all employee list caches
			apiCache.invalidate(CACHE_KEYS.EMPLOYEE_DETAIL, { id }); // Clear specific employee detail cache
			console.log('🗑️ Employee caches invalidated after update');

		} catch (err: any) {
			console.error('❌ Failed to save employee:', err);
			
			// Handle API errors
			if (err.response?.status >= 400) {
				throw error(err.response.status, {
					message: `Failed to update employee: ${err.message}`
				});
			}
			
			throw error(500, {
				message: 'Failed to save employee changes'
			});
		}

		// If we get here, the save was successful, so redirect
		throw redirect(302, `/employees/${id}`);
	}
};