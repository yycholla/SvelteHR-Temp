import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { employeeOperations } from '$lib/graphql/client';
import {
	employeeListResponseSchema,
	departmentSchema,
	embeddedPositionSchema as positionSchema
} from '$lib/schemas/employee';
import {
	mockEmployees,
	departments as mockDepartments,
	positions as mockPositions
} from '$lib/data/mockEmployees';
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

	// GraphQL doesn't need URL parameter building like REST APIs

	try {
		// If we have a token, try to fetch from GraphQL API
		if (token) {
			console.log('🔍 Attempting to fetch from GraphQL API...');

			try {
				// Use GraphQL employeeOperations to get employees data
				const employeesResponse = await employeeOperations.getEmployees({
					page,
					limit,
					search: search || undefined,
					department: departmentId || undefined,
					status: status || undefined,
					sortBy: sortBy || undefined,
					sortOrder: (sortOrder?.toUpperCase() as 'ASC' | 'DESC') || undefined
				});

				// Check if GraphQL request was successful
				if (employeesResponse.data && !employeesResponse.errors) {
					console.log('✅ GraphQL employees query successful');

					// Transform GraphQL response to match UI expectations
					const employeesData = {
						employees: employeesResponse.data.employees.employees || [],
						totalCount: employeesResponse.data.employees.total || 0,
						page: employeesResponse.data.employees.page || 1,
						limit: employeesResponse.data.employees.limit || 20,
						totalPages: employeesResponse.data.employees.totalPages || 1,
						hasNextPage: employeesResponse.data.employees.hasNextPage || false,
						hasPreviousPage: employeesResponse.data.employees.hasPreviousPage || false
					};

					console.log(
						`📊 GraphQL data: ${employeesData.employees.length} employees (page ${employeesData.page}/${employeesData.totalPages})`
					);

					// For now, use mock departments - in a real app this would be a separate GraphQL query
					// TODO: Implement departments GraphQL query
					const mockDepartmentsFormatted = mockDepartments.map((dept) => ({
						id: dept.id,
						name: dept.name,
						description: '',
						isActive: true,
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString()
					}));

					// Extract positions from employees data
					const positions = Array.from(
						new Set(
							employeesData.employees
								.map((emp: any) => emp.position?.title || emp.position)
								.filter(Boolean)
						)
					).map((title, index) => ({
						id: (index + 1).toString(),
						title,
						description: '',
						departmentId: '',
						level: 'N/A',
						isActive: true
					}));

					return {
						employeesData,
						departments: mockDepartmentsFormatted,
						positions,
						filters: {
							search,
							departmentId,
							status,
							page,
							limit,
							sortBy,
							sortOrder
						},
						isUsingMockData: false // Using GraphQL data
					};
				} else {
					console.warn('⚠️ GraphQL query failed:', employeesResponse.errors);
					// Fall through to mock data
				}
			} catch (gqlError) {
				console.warn('⚠️ GraphQL request error:', gqlError);
				// Fall through to mock data
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
			filteredEmployees = filteredEmployees.filter(
				(emp) =>
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
			filteredEmployees = filteredEmployees.filter((emp) => emp.department.id === departmentId);
		}

		// Apply status filter
		if (status) {
			filteredEmployees = filteredEmployees.filter((emp) => emp.status === status);
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
			employees: paginatedEmployees.map((emp) => ({
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
			departments: mockDepartments.map((dept) => ({
				id: dept.id,
				name: dept.name,
				description: '',
				isActive: true,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			})),
			positions: mockPositions.map((pos) => ({
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
