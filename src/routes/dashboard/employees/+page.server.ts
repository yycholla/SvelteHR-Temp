// Server-side data loading for employee directory page
// T035: Fix employee management pages implementation with standardized error handling
// REFACTORED: Phase 1 Foundation - Integration Proof-of-Concept #2
// Demonstrates: RBACDataLoader, UnifiedGraphQLClient, QueryParamExtractor, ClientSideFilter

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { validateRoles } from '$lib/schemas/role';
import { logger } from '$lib/utils/logger';

// Phase 1 Foundation Utilities
import { RBACDataLoader } from '$lib/server/route-loaders';
import { QueryParamExtractor } from '$lib/server/route-helpers/query-params';
import { ClientSideFilter } from '$lib/server/route-helpers/client-filter';

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
		// Use QueryParamExtractor for type-safe URL parameter extraction
		const params = new QueryParamExtractor(url);
		const { page, limit } = params.getPagination(20);

		// Extract all filter parameters
		const filters = {
			searchTerm: params.getString('search'),
			departmentFilter: params.getString('department'),
			roleFilter: params.getString('role'),
			statusFilter: params.getString('status', 'active') // Default to 'active'
		};

		logger.debug('[Employee Directory] Filters', filters);

		try {
			// GraphQL query definitions
			const GET_EMPLOYEES_QUERY = `
				query GetAllEmployees($limit: Int, $offset: Int) {
					users(limit: $limit, offset: $offset) {
						id
						email
						firstName
						lastName
						displayName
						roles {
							id
							name
						}
						phone
						departmentId
						managerId
						hireDate
						isActive
						createdAt
						updatedAt
					}
				}
			`;

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

			// Use UnifiedGraphQLClient to execute all queries
			// Fetch large dataset for client-side filtering (backend doesn't support filters yet)
			const allEmployees = await client.query(
				GET_EMPLOYEES_QUERY,
				{ limit: 10000, offset: 0 },
				{
					operationName: 'GetAllEmployees',
					errorMessage: 'Failed to load employees',
					dataPath: 'users'
				}
			);

			const departments = await client.query(
				GET_DEPARTMENTS_QUERY,
				{ limit: 100, offset: 0 },
				{
					operationName: 'GetDepartments',
					errorMessage: 'Failed to load departments',
					dataPath: 'departments'
				}
			);

			logger.debug('[Employee Directory] Employees loaded', {
				count: allEmployees?.length || 0
			});

			// Calculate statistics from ALL employees BEFORE filtering
			const totalActiveEmployees = (allEmployees || []).filter((emp: any) => emp.isActive === true)
				.length;
			const totalInactiveEmployees = (allEmployees || []).filter(
				(emp: any) => emp.isActive === false
			).length;

			logger.debug('[Employee Directory] Employee stats', {
				total: allEmployees?.length || 0,
				active: totalActiveEmployees,
				inactive: totalInactiveEmployees
			});

			// Create autocomplete suggestions from ALL employees (before filtering)
			const employeeAutocompleteOptions = (allEmployees || []).map((emp: any) => ({
				value: emp.displayName || emp.email,
				label: emp.displayName || emp.email,
				email: emp.email
			}));

			// Use ClientSideFilter for fluent filtering API
			let filteredEmployees = new ClientSideFilter(allEmployees || [])
				// Status filter (active/inactive)
				.filter((emp: any) => {
					if (filters.statusFilter === 'active') return emp.isActive === true;
					if (filters.statusFilter === 'inactive') return emp.isActive === false;
					return true; // Empty string shows all
				})
				// Department filter
				.where('departmentId', filters.departmentFilter || undefined)
				// Role filter (roles is array of {id, name} objects)
				.filter((emp: any) =>
					!filters.roleFilter
						? true
						: emp.roles?.some((role: any) => role.name === filters.roleFilter)
				)
				// Multi-term search filter (comma-separated)
				.filter((emp: any) => {
					if (!filters.searchTerm) return true;

					const searchTerms = filters.searchTerm
						.split(',')
						.map((term) => term.trim().toLowerCase())
						.filter(Boolean);

					const displayName = emp.displayName?.toLowerCase() || '';
					const firstName = emp.firstName?.toLowerCase() || '';
					const lastName = emp.lastName?.toLowerCase() || '';
					const email = emp.email?.toLowerCase() || '';
					const role = emp.roles
						? emp.roles
								.map((r: any) => r.name)
								.join(' ')
								.toLowerCase()
						: '';

					// Employee must match ANY search term (OR logic)
					return searchTerms.some((searchLower) => {
						return (
							displayName.includes(searchLower) ||
							firstName.includes(searchLower) ||
							lastName.includes(searchLower) ||
							email.includes(searchLower) ||
							role.includes(searchLower)
						);
					});
				})
				.get();

			const totalEmployees = filteredEmployees.length;

			logger.debug('[Employee Directory] Pagination info', {
				totalEmployees,
				page,
				limit
			});

			// Apply pagination to filtered results
			const startIndex = (page - 1) * limit;
			const endIndex = startIndex + limit;
			const employees = filteredEmployees.slice(startIndex, endIndex).map((emp: any) => ({
				...emp,
				// Transform roles array to single role string for consistent display
				role: emp.roles && emp.roles.length > 0 ? emp.roles[0].name : null
			}));

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

			let rolesData: any[] = [];
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

			// Return standardized data structure
			// RBACDataLoader already includes userSession and permissions
			return {
				employees,
				totalEmployees, // Total count after all filters, before pagination
				totalActiveEmployees, // Total active count from ALL employees
				totalInactiveEmployees, // Total inactive count from ALL employees
				departments: departments || [],
				validRoles, // Use filtered roles with valid names only
				employeeAutocompleteOptions, // All employee names for search autocomplete
				filters: {
					...filters,
					page,
					limit
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
