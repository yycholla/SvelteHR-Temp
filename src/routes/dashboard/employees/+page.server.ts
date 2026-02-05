// Server-side data loading for employee directory page
// Migrated to use EmployeeService with advanced filtering capabilities (Task 21)
// Preserves RBACDataLoader for non-employee queries (departments, roles)

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { validateRoles } from '$lib/schemas/role';
import { logger } from '$lib/utils/logger';
import { createEmployeeService } from '$lib/server/services';
import type { EmployeeListFilters, EmployeeSortField, SortOrder } from '$domain';

// Phase 1 Foundation Utilities (for non-employee data)
import { RBACDataLoader } from '$lib/server/route-loaders';

// Pagination constants
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Helper: Build EmployeeListFilters from URL search parameters
 */
function buildEmployeeFilters(url: URL): EmployeeListFilters {
	const searchParams = url.searchParams;
	const filters: EmployeeListFilters = {};

	// Search term
	const search = searchParams.get('search');
	if (search) {
		filters.searchTerm = search;
	}

	// Department filter
	const department = searchParams.get('department');
	if (department) {
		filters.departmentId = department;
	}

	// Status filter (active/inactive/all)
	const status = searchParams.get('status');
	if (status === 'active') {
		filters.isActive = true;
	} else if (status === 'inactive') {
		filters.isActive = false;
	}
	// If status is empty or 'all', don't set isActive filter

	// Sorting
	const sortBy = searchParams.get('sortBy');
	const validSortFields: EmployeeSortField[] = ['name', 'email', 'hireDate', 'jobTitle'];
	if (sortBy && validSortFields.includes(sortBy as EmployeeSortField)) {
		filters.sortBy = sortBy as EmployeeSortField;
	}

	const sortOrder = searchParams.get('sortOrder');
	if (sortOrder && ['asc', 'desc'].includes(sortOrder)) {
		filters.sortOrder = sortOrder as SortOrder;
	}

	// Pagination with validation and safe defaults
	const pageParam = parseInt(searchParams.get('page') || String(DEFAULT_PAGE), 10);
	const limitParam = parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10);

	// Validate and clamp values to safe ranges
	const page = Math.max(1, isNaN(pageParam) ? DEFAULT_PAGE : pageParam);
	const limit = Math.max(1, Math.min(MAX_LIMIT, isNaN(limitParam) ? DEFAULT_LIMIT : limitParam));

	filters.limit = limit;
	filters.offset = (page - 1) * limit;

	return filters;
}

export const load: PageServerLoad = async (event) => {
	const { url } = event;

	// Use RBACDataLoader - handles auth, session, permissions automatically
	const loader = new RBACDataLoader(event, [
		'employees:read',
		'employees:read:self',
		'employees:read:team',
		'employees:read:all'
	]);

	return loader.loadWithClient(async (client) => {
		// Build filters from URL parameters
		const filters = buildEmployeeFilters(url);
		const page = Math.floor((filters.offset || 0) / (filters.limit || DEFAULT_LIMIT)) + 1;
		const limit = filters.limit || DEFAULT_LIMIT;

		logger.debug('[Employee Directory] Filters', {
			searchTerm: filters.searchTerm,
			departmentId: filters.departmentId,
			isActive: filters.isActive,
			sortBy: filters.sortBy,
			sortOrder: filters.sortOrder,
			limit: filters.limit,
			offset: filters.offset
		});

		try {
			// Create EmployeeService with authentication context
			const employeeService = createEmployeeService(event);

			// Load employees using service with advanced filtering
			const employeesResult = await employeeService.getEmployees(filters);

			if (employeesResult.isError) {
				// Extract the underlying error for structured logging
				const underlyingError =
					employeesResult.error.context?.originalError || employeesResult.error;

				// Convert domain error to Error if needed
				const errorObj =
					underlyingError instanceof Error
						? underlyingError
						: new Error(employeesResult.error.message);

				logger.error('[Employee Directory] Failed to load employees via service', errorObj, {
					domainErrorCode: employeesResult.error.code,
					domainErrorMessage: employeesResult.error.message,
					filters: {
						searchTerm: filters.searchTerm,
						departmentId: filters.departmentId,
						isActive: filters.isActive
					}
				});
				throw error(500, 'Failed to load employees. Please try again.');
			}

			const { employees: employeeEntities, total, offset } = employeesResult.value;

			logger.debug('[Employee Directory] Employees loaded via service', {
				count: employeeEntities.length,
				total,
				offset,
				limit
			});

			// Map domain Employee entities to page data format
			const employees = employeeEntities.map((emp) => ({
				id: emp.id,
				email: emp.email.value,
				firstName: emp.name.first,
				lastName: emp.name.last,
				displayName: emp.fullName,
				hireDate: emp.hireDate.value.toISOString(),
				departmentId: emp.departmentId,
				jobTitle: emp.jobTitle,
				phone: emp.phone,
				isActive: emp.isActive,
				// Note: roles will need to be fetched separately if needed for display
				role: null
			}));

			// Load departments via GraphQL (needed for filter dropdown)
			const GET_DEPARTMENTS_QUERY = `
				query GetDepartments($limit: Int, $offset: Int) {
					departments(limit: $limit, offset: $offset) {
						id
						name
						description
						parentDepartmentId
						managerId
						createdAt
						updatedAt
					}
				}
			`;

			// Parallel execution - saves ~1600ms by running independent queries concurrently
			const [departments, statsResult, autocompleteResult] = await Promise.all([
				client
					.query(
						GET_DEPARTMENTS_QUERY,
						{ limit: 100, offset: 0 },
						{
							operationName: 'GetDepartments',
							errorMessage: 'Failed to load departments',
							dataPath: 'departments'
						}
					)
					.catch((err) => {
						logger.error('[Employee Directory] Failed to load departments', err);
						return [];
					}),

				employeeService.getStatistics(),
				employeeService.getEmployees({ limit: 10000 }) // For autocomplete
			]);

			// Handle statistics results - single optimized query replaces 3 separate queries
			const stats = statsResult.isOk ? statsResult.value : { total: 0, active: 0, inactive: 0 };

			const totalActiveEmployees = stats.active;
			const totalInactiveEmployees = stats.inactive;

			logger.debug('[Employee Directory] Employee stats via getStatistics()', {
				total: stats.total,
				active: totalActiveEmployees,
				inactive: totalInactiveEmployees
			});

			// Handle autocomplete result
			const employeeAutocompleteOptions = autocompleteResult.isError
				? []
				: autocompleteResult.value.employees.map(
						(emp: { fullName: string; email: { value: string } }) => ({
							value: emp.fullName,
							label: emp.fullName,
							email: emp.email.value
						})
					);

			// Load roles data via REST API
			const { getApiBaseUrl } = await import('$lib/server/api-url');
			const apiBaseUrl = getApiBaseUrl();
			const cookieHeader = event.request.headers.get('cookie') || '';

			const rolesResponse = await fetch(`${apiBaseUrl}/api/roles`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Cookie: cookieHeader
				}
			});

			let rolesData: unknown[] = [];
			if (rolesResponse.ok) {
				rolesData = await rolesResponse.json();
			} else {
				logger.error(
					'[Employee Directory] Failed to load roles via REST',
					new Error('Failed to load roles'),
					{ statusText: rolesResponse.statusText }
				);
			}

			logger.debug('[Employee Directory] Roles data loaded', { count: rolesData.length });

			// Defensive: Validate roles with Zod schema to prevent SSR crashes
			const validRoles = validateRoles(rolesData || []);
			logger.debug('[Employee Directory] Valid roles count', { count: validRoles.length });

			// RBAC: Check if user can create reviews based on roles
			// RBACDataLoader provides locals via loader context
			const userRoles = loader['locals'].roles || [];
			const canCreateReviews = userRoles.some((role) =>
				['Admin', 'HR Manager', 'Manager'].includes(role)
			);

			// Calculate pagination metadata
			const totalPages = Math.ceil(total / limit);

			// Return standardized data structure
			// RBACDataLoader already includes userSession and permissions
			return {
				employees,
				totalEmployees: total, // Total count after all filters
				totalActiveEmployees, // Total active count from ALL employees
				totalInactiveEmployees, // Total inactive count from ALL employees
				departments: departments || [],
				validRoles, // Use filtered roles with valid names only
				employeeAutocompleteOptions, // All employee names for search autocomplete
				filters: {
					search: filters.searchTerm || '',
					department: filters.departmentId || '',
					role: url.searchParams.get('role') || '', // Preserve role filter from URL
					status: url.searchParams.get('status') || 'active'
				},
				pagination: {
					page,
					limit,
					offset,
					total,
					totalPages
				},
				canCreateReviews
			};
		} catch (err) {
			logger.error(
				'[Employee Directory Load Error]',
				err instanceof Error ? err : new Error(String(err))
			);

			// Throw SvelteKit error with user-friendly message
			error(500, 'Employee directory temporarily unavailable');
		}
	});
};
