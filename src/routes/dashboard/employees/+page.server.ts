// Server-side data loading for employee directory page
// T035: Fix employee management pages implementation with standardized error handling

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { PermissionChecks, getUserPermissions } from '$lib/server/rbac-utils';

export const load: PageServerLoad = async (event) => {
	const { locals, cookies, url } = event;

	// Debug: Log user roles and permissions
	console.log('[Employee Directory] User role:', locals.user?.role);
	console.log('[Employee Directory] User roles array:', locals.roles);
	console.log('[Employee Directory] User permissions:', locals.permissions);

	// RBAC: Check employee directory access permissions
	PermissionChecks.employeeRead(event);

	// Import required models for standardized error handling
	const { createErrorResponse } = await import('$lib/models/error-response');

	// Create simple user session object (session-based auth doesn't use JWT)
	const userSession = {
		userId: locals.user.id,
		roles: [locals.user.role || 'employee'],
		permissions: locals.permissions || [],
		isAuthenticated: true,
		expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
		metadata: {
			userEmail: locals.user.email,
			displayName: locals.user.display_name || locals.user.email
		},
		toJSON: () => ({
			userId: locals.user.id,
			roles: [locals.user.role || 'employee'],
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
			'Cookie': cookieHeader // Forward all cookies for session authentication
		};

		console.log(
			'[Employee Directory] Using Rust GraphQL with session-based auth, user role:',
			locals.user?.role
		);
		console.log('[Employee Directory] Filters:', { searchTerm, departmentFilter, statusFilter });

		// Load ALL employees first (no pagination) to get accurate total count
		// We'll apply pagination after filtering
		const employeesResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
					query GetAllEmployees {
						users {
							id
							email
							firstName
							lastName
							displayName
							role
							phone
							departmentId
							managerId
							hireDate
							isActive
							createdAt
							updatedAt
						}
					}
				`
			})
		});

		const employeesData = await employeesResponse.json();
		console.log('[Employee Directory] Total employees fetched:', employeesData?.data?.users?.length);
		console.log('[Employee Directory] Status filter:', statusFilter);

		// Extract employees from Rust GraphQL response (direct array, no nodes wrapper)
		let allEmployees = employeesData?.data?.users || [];

		// Calculate statistics from ALL employees BEFORE filtering
		const totalActiveEmployees = allEmployees.filter((emp: any) => emp.isActive === true).length;
		const totalInactiveEmployees = allEmployees.filter((emp: any) => emp.isActive === false).length;

		// Debug: Check isActive values
		console.log(
			'[Employee Directory] Employee isActive values:',
			allEmployees.map((e: any) => ({
				email: e.email,
				isActive: e.isActive
			}))
		);
		console.log('[Employee Directory] Stats:', {
			total: allEmployees.length,
			active: totalActiveEmployees,
			inactive: totalInactiveEmployees
		});

		// Server-side filtering for isActive status
		if (statusFilter === 'active') {
			// Only show employees where isActive is true
			allEmployees = allEmployees.filter((emp: any) => emp.isActive === true);
			console.log('[Employee Directory] After active filter:', allEmployees.length, 'employees');
		} else if (statusFilter === 'inactive') {
			// Only show employees where isActive is false
			allEmployees = allEmployees.filter((emp: any) => emp.isActive === false);
			console.log('[Employee Directory] After inactive filter:', allEmployees.length, 'employees');
		}
		// If statusFilter is empty string, show all employees (no filtering)

		// Filter by department
		if (departmentFilter) {
			allEmployees = allEmployees.filter((emp: any) => emp.departmentId === departmentFilter);
			console.log('[Employee Directory] After department filter:', allEmployees.length, 'employees');
		}

		// Filter by role
		if (roleFilter) {
			allEmployees = allEmployees.filter((emp: any) => emp.role === roleFilter);
			console.log('[Employee Directory] After role filter:', allEmployees.length, 'employees');
		}

		// Client-side filtering for search term (supports multiple comma-separated terms)
		if (searchTerm) {
			// Split by comma and trim each term
			const searchTerms = searchTerm.split(',').map(term => term.trim().toLowerCase()).filter(Boolean);

			allEmployees = allEmployees.filter((emp: any) => {
				const displayName = emp.displayName?.toLowerCase() || '';
				const firstName = emp.firstName?.toLowerCase() || '';
				const lastName = emp.lastName?.toLowerCase() || '';
				const email = emp.email?.toLowerCase() || '';
				const role = emp.role?.toLowerCase() || '';

				// Employee must match ANY search term (OR logic)
				return searchTerms.some(searchLower => {
					return (
						displayName.includes(searchLower) ||
						firstName.includes(searchLower) ||
						lastName.includes(searchLower) ||
						email.includes(searchLower) ||
						role.includes(searchLower)
					);
				});
			});
			console.log('[Employee Directory] After search filter:', allEmployees.length, 'employees');
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
		const employees = allEmployees.slice(startIndex, endIndex);

		console.log('[Employee Directory] Pagination:', {
			totalEmployees,
			page,
			limit,
			startIndex,
			endIndex,
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
		console.log('[Employee Directory] Departments data:', departmentsData);

		// Return server-side loaded data
		// Get standardized user permissions
		const userPermissions = getUserPermissions(locals);

		// RBAC: Check if user can create reviews
		const userRole = locals.user?.role || 'employee';
		const canCreateReviews = ['admin', 'super_admin', 'hr_manager', 'manager'].includes(userRole);

		return {
			user: userPermissions.user,
			userSession: userSession.toJSON(), // Convert UserSession to serializable object
			employees: employees,
			totalEmployees: totalEmployees, // Total count after all filters, before pagination
			totalActiveEmployees: totalActiveEmployees, // Total active count from ALL employees
			totalInactiveEmployees: totalInactiveEmployees, // Total inactive count from ALL employees
			departments: departmentsData?.data?.departments || [],
			employeeAutocompleteOptions: employeeAutocompleteOptions, // All employee names for search autocomplete
			filters: {
				searchTerm,
				departmentFilter,
				roleFilter,
				statusFilter,
				page,
				limit
			},
			// RBAC: Standardized permission checks
			...userPermissions,
			canCreateReviews,
			loadedAt: new Date().toISOString()
		};
	} catch (err) {
		console.error('[Employee Directory Load Error]', err);

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
		console.error('[Employee Directory Error Details]', {
			userId: locals.user?.id,
			userRole: locals.user?.role,
			searchTerm,
			departmentFilter,
			statusFilter,
			error: errorResponse
		});

		// Throw SvelteKit error with user-friendly message
		error(500, {
        			message: 'Employee directory temporarily unavailable',
        			details: errorResponse.userMessage
        		});
	}
};
