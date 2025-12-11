// Server-side data loading for employee directory page
// T035: Fix employee management pages implementation with standardized error handling

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getUserPermissions, requireAuth } from '$lib/server/rbac-utils';
import { validateRoles } from '$lib/schemas/role';
import { logger } from '$lib/utils/logger';

export const load: PageServerLoad = async (event) => {
	const { cookies, url } = event;

	// RBAC: Check employee directory access permissions
	requireAuth(event, {
		requiredPermissions: [
			'employees:read',
			'employees:read:self',
			'employees:read:team',
			'employees:read:all'
		]
	});

	// After permission check, re-destructure locals with guaranteed user
	const { locals } = event;

	// Debug: Log user roles and permissions
	logger.debug('[Employee Directory] User access info', {
		role: locals.user.role,
		roles: locals.roles,
		permissions: locals.permissions
	});

	// Import required models for standardized error handling
	const { createErrorResponse } = await import('$lib/models/error-response');

	// Create simple user session object (session-based auth doesn't use JWT)
	const userSession = {
		userId: locals.user.id,
		roles: locals.roles || [],
		permissions: locals.permissions || [],
		isAuthenticated: true,
		expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
		metadata: {
			userEmail: locals.user.email,
			displayName: locals.user.display_name || locals.user.email
		},
		toJSON: () => ({
			userId: locals.user.id,
			roles: locals.roles || [],
			permissions: locals.permissions || [],
			isAuthenticated: true,
			expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
			metadata: {
				userEmail: locals.user.email,
				displayName: locals.user.display_name || locals.user.email
			}
		})
	};

	// Extract search parameters from URL
	const searchTerm = url.searchParams.get('search') || '';
	const departmentFilter = url.searchParams.get('department') || '';
	const roleFilter = url.searchParams.get('role') || '';
	// Default to 'active' to show only active employees by default
	const statusFilter = url.searchParams.get('status') || 'active';
	const page = parseInt(url.searchParams.get('page') || '1', 10);
	const limit = parseInt(url.searchParams.get('limit') || '20', 10);

	// Note: dataRequest is not needed for session-based auth
	// We fetch data directly with session cookies

	try {
		// Make direct GraphQL calls to Rust GraphQL backend with session-based authentication
		const { getGraphQLEndpoint } = await import('$lib/server/api-url');
		const graphqlEndpoint = getGraphQLEndpoint();

		// Headers for session-based authentication
		// Forward session cookies to Rust GraphQL backend
		const cookieHeader = event.request.headers.get('cookie') || '';
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
			Cookie: cookieHeader // Forward all cookies for session authentication
		};

		logger.debug('[Employee Directory] Using Rust GraphQL with session-based auth', {
			userRole: locals.user?.role,
			filters: { searchTerm, departmentFilter, statusFilter }
		});

		// Load ALL employees first (no pagination) to get accurate total count
		// We'll apply pagination after filtering
		// Pass limit=10000 to override backend's default 100 limit
		const employeesResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
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
				`,
				variables: {
					limit: 10000,
					offset: 0
				}
			})
		});

		const employeesData = await employeesResponse.json();

		// Check for GraphQL errors
		if (employeesData.errors) {
			logger.error('[Employee Directory] GraphQL errors', {
				errors: employeesData.errors
			});
		}

		logger.debug('[Employee Directory] Fetch stats', {
			totalFetched: employeesData?.data?.users?.length,
			statusFilter
		});

		// Extract employees from Rust GraphQL response (direct array, no nodes wrapper)
		let allEmployees = employeesData?.data?.users || [];

		// Calculate statistics from ALL employees BEFORE filtering
		const totalActiveEmployees = allEmployees.filter((emp: any) => emp.isActive === true).length;
		const totalInactiveEmployees = allEmployees.filter((emp: any) => emp.isActive === false).length;

		// Debug: Check isActive values
		logger.debug('[Employee Directory] Employee stats', {
			total: allEmployees.length,
			active: totalActiveEmployees,
			inactive: totalInactiveEmployees
		});

		// Server-side filtering for isActive status
		if (statusFilter === 'active') {
			// Only show employees where isActive is true
			allEmployees = allEmployees.filter((emp: any) => emp.isActive === true);
		} else if (statusFilter === 'inactive') {
			// Only show employees where isActive is false
			allEmployees = allEmployees.filter((emp: any) => emp.isActive === false);
		}
		// If statusFilter is empty string, show all employees (no filtering)

		// Filter by department
		if (departmentFilter) {
			allEmployees = allEmployees.filter((emp: any) => emp.departmentId === departmentFilter);
		}

		// Filter by role (roles is now an array of {id, name} objects)
		if (roleFilter) {
			allEmployees = allEmployees.filter((emp: any) =>
				emp.roles?.some((role: any) => role.name === roleFilter)
			);
		}

		// Client-side filtering for search term (supports multiple comma-separated terms)
		if (searchTerm) {
			// Split by comma and trim each term
			const searchTerms = searchTerm
				.split(',')
				.map((term) => term.trim().toLowerCase())
				.filter(Boolean);

			allEmployees = allEmployees.filter((emp: any) => {
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
			});
		}

		// Get total count AFTER all filtering
		const totalEmployees = allEmployees.length;

		// Create autocomplete suggestions from ALL employees (before filtering and pagination)
		// This allows the search autocomplete to suggest any employee, not just those on current page
		const allEmployeesForAutocomplete = employeesData?.data?.users || [];
		const employeeAutocompleteOptions = allEmployeesForAutocomplete.map((emp: any) => ({
			value: emp.displayName || emp.email,
			label: emp.displayName || emp.email,
			email: emp.email
		}));

		// Apply pagination to filtered results
		const startIndex = (page - 1) * limit;
		const endIndex = startIndex + limit;
		const employees = allEmployees.slice(startIndex, endIndex).map((emp: any) => ({
			...emp,
			// Transform roles array to single role string for consistent display
			role: emp.roles && emp.roles.length > 0 ? emp.roles[0].name : null
		}));

		logger.debug('[Employee Directory] Pagination info', {
			totalEmployees,
			page,
			limit,
			pageEmployees: employees.length
		});

		// Load departments data with Rust GraphQL schema
		const departmentsResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
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
				`,
				variables: {
					limit: 100,
					offset: 0
				}
			})
		});

		const departmentsData = await departmentsResponse.json();

		// Check for GraphQL errors
		if (departmentsData.errors) {
			logger.error('[Employee Directory] Departments GraphQL errors', {
				errors: departmentsData.errors
			});
		}

		// Load roles data via REST API
		const { getApiBaseUrl } = await import('$lib/server/api-url');
		const apiBaseUrl = getApiBaseUrl();

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
			logger.error('[Employee Directory] Failed to load roles via REST', {
				status: rolesResponse.statusText
			});
		}

		logger.debug('[Employee Directory] Roles data loaded', { count: rolesData.length });

		// Defensive: Validate roles with Zod schema to prevent SSR crashes from invalid data
		const validRoles = validateRoles(rolesData || []);
		logger.debug('[Employee Directory] Valid roles count', { count: validRoles.length });

		// Return server-side loaded data
		// Get standardized user permissions
		const userPermissions = getUserPermissions(locals);

		// RBAC: Check if user can create reviews
		const userRoles = locals.roles || [];
		const canCreateReviews = userRoles.some((role) =>
			['Admin', 'HR Manager', 'Manager'].includes(role)
		);

		return {
			userSession: userSession.toJSON(), // Convert UserSession to serializable object
			employees,
			totalEmployees, // Total count after all filters, before pagination
			totalActiveEmployees, // Total active count from ALL employees
			totalInactiveEmployees, // Total inactive count from ALL employees
			departments: departmentsData?.data?.departments || [],
			validRoles, // Use filtered roles with valid names only (renamed to avoid conflict with userPermissions.roles)
			employeeAutocompleteOptions, // All employee names for search autocomplete
			filters: {
				searchTerm,
				departmentFilter,
				roleFilter,
				statusFilter,
				page,
				limit
			},
			// RBAC: Standardized permission checks (includes user and roles properties)
			...userPermissions,
			canCreateReviews,
			loadedAt: new Date().toISOString()
		};
	} catch (err) {
		logger.error('[Employee Directory Load Error]', err instanceof Error ? err : new Error(String(err)));

		// Create standardized error response
		const errorResponse = createErrorResponse(
			err instanceof Error ? err : new Error('Employee directory load failed'),
			{
				type: 'DATA_LOAD_ERROR',
				userMessage:
					'Unable to load employee directory. Please refresh the page or try again later.'
			}
		);

		// Log error details for debugging
		logger.error('[Employee Directory Error Details]', {
			userId: locals.user?.id,
			userRole: locals.user?.role,
			searchTerm,
			departmentFilter,
			statusFilter,
			error: errorResponse
		});

		// Throw SvelteKit error with user-friendly message
		error(500, 'Employee directory temporarily unavailable');
	}
};
