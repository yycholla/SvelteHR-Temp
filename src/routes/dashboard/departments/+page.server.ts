// Server-side data loading for departments page
// T036: Fix department management pages with standardized error handling

import type { Actions, PageServerLoad } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { requireAuth, getUserPermissions } from '$lib/server/rbac-utils';

export const load: PageServerLoad = async (event) => {
	const { cookies, url } = event;

	// RBAC: Check department access permissions
	requireAuth(event, {
		requiredPermissions: ['departments:read', 'departments:read:self', 'departments:read:team', 'departments:read:all']
	});

	// After permission check, re-destructure locals with guaranteed user
	const { locals } = event;

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
	const parentFilter = url.searchParams.get('parent') || '';
	const hasHeadFilter = url.searchParams.get('hasHead') || '';
	const page = parseInt(url.searchParams.get('page') || '1', 10);
	const limit = parseInt(url.searchParams.get('limit') || '20', 10);
	const offset = (page - 1) * limit;

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

		console.log(
			'[Departments] Using Rust GraphQL with session-based auth, user role:',
			locals.user?.role
		);
		console.log('[Departments] Filters:', { searchTerm, parentFilter, hasHeadFilter });

		// Load departments data with linked employee relationships
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
							managerId
							parentDepartmentId
							createdAt
							updatedAt
						}
					}
				`,
				variables: {
					limit,
					offset
				}
			})
		});

		const departmentsData = await departmentsResponse.json();
		console.log('[Departments] Departments data:', departmentsData);

		// Load users for department manager dropdown
		const usersResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
					query GetUsers {
						users(limit: 1000) {
							id
							displayName
							email
							departmentId
							roles {
								id
								name
							}
							isActive
						}
					}
				`
			})
		});

		const usersData = await usersResponse.json();

		if (usersData.errors) {
			console.error('[Departments] Users GraphQL errors:', usersData.errors);
		}

		// Keep all users for department counting (both active and inactive)
		const users = usersData?.data?.users || [];

		// Get standardized user permissions
		const userPermissions = getUserPermissions(locals);

		// Extract departments from Rust GraphQL response and enrich with related data
		const departments = (departmentsData?.data?.departments || []).map((dept: any) => {
			// Find manager/department head from users list
			const departmentHead = dept.managerId
				? users.find((u: any) => u.id === dept.managerId)
				: null;

			// Count employees in this department
			const employeesInDept = users.filter((u: any) => u.departmentId === dept.id);
			const employeeCount = employeesInDept.length;

			// Find parent department
			const parentDepartment = dept.parentDepartmentId
				? departmentsData?.data?.departments.find((d: any) => d.id === dept.parentDepartmentId)
				: null;

			// Count sub-departments
			const subDepartments = (departmentsData?.data?.departments || []).filter(
				(d: any) => d.parentDepartmentId === dept.id
			);

			return {
				...dept,
				employees: {
					nodes: employeesInDept,
					totalCount: employeeCount
				},
				departmentHead: departmentHead
					? {
							id: departmentHead.id,
							displayName: departmentHead.displayName,
							email: departmentHead.email,
							jobTitle: departmentHead.roles?.[0]?.name || 'Manager'
						}
					: null,
				parentDepartment: parentDepartment
					? {
							id: parentDepartment.id,
							name: parentDepartment.name
						}
					: null,
				subDepartments: {
					nodes: subDepartments,
					totalCount: subDepartments.length
				}
			};
		});

		// Return server-side loaded data
		return {
			user: userPermissions.user,
			userSession: userSession.toJSON(), // Convert UserSession to serializable object
			departments,
			users: users.filter((u: any) => u.isActive), // Return only active users for dropdowns
			totalDepartments: departments.length, // Use actual count from results
			hierarchy: [], // For now, return empty hierarchy
			filters: {
				searchTerm,
				parentFilter,
				hasHeadFilter,
				page,
				limit
			},
			// RBAC: Standardized permission checks
			...userPermissions,
			loadedAt: new Date().toISOString()
		};
	} catch (err) {
		console.error('[Departments Load Error]', err);

		// Create standardized error response
		const errorResponse = createErrorResponse(
			err instanceof Error ? err : new Error('Departments load failed'),
			{
				type: 'DATA_LOAD_ERROR',
				userMessage: 'Unable to load departments. Please refresh the page or try again later.'
			}
		);

		// Log error details for debugging
		console.error('[Departments Error Details]', {
			userId: locals.user?.id,
			userRole: locals.user?.role,
			searchTerm,
			parentFilter,
			hasHeadFilter,
			error: errorResponse
		});

		// Throw SvelteKit error with user-friendly message
		error(500, {
			message: 'Departments temporarily unavailable',
			details: errorResponse.userMessage
		});
	}
};

export const actions: Actions = {
	create: async (event) => {
		const { request, locals } = event;

		// RBAC: Check department write permissions
		PermissionChecks.departmentWrite(event);

		try {
			const formData = await request.formData();
			const name = formData.get('name')?.toString();
			const description = formData.get('description')?.toString();
			const managerId = formData.get('managerId')?.toString();

			// Validate required fields
			if (!name) {
				return fail(400, {
					error: 'Department name is required'
				});
			}

			// Make GraphQL mutation to create department with session-based authentication
			const { getGraphQLEndpoint } = await import('$lib/server/api-url');
			const graphqlEndpoint = getGraphQLEndpoint();

			// Headers for session-based authentication
			const cookieHeader = request.headers.get('cookie') || '';
			const headers: Record<string, string> = {
				'Content-Type': 'application/json',
				Cookie: cookieHeader
			};

			// Build input object
			const input: any = {
				name,
				description: description || null,
				managerId: managerId || null
			};

			const createResponse = await fetch(graphqlEndpoint, {
				method: 'POST',
				headers,
				body: JSON.stringify({
					query: `
						mutation CreateDepartment($input: CreateDepartmentInput!) {
							departments {
								createDepartment(input: $input) {
									id
									name
									description
									managerId
								}
							}
						}
					`,
					variables: { input }
				})
			});

			console.log('[Departments] Department creation request sent');

			const createData = await createResponse.json();

			if (createData.errors) {
				console.error('[Departments] GraphQL errors:', createData.errors);
				return fail(500, {
					error: createData.errors[0]?.message || 'Failed to create department'
				});
			}

			const newDepartmentId = createData.data?.departments?.createDepartment?.id;

			if (!newDepartmentId) {
				return fail(500, {
					error: 'Department created but ID not returned'
				});
			}

			console.log(`[Departments] Successfully created department with ID: ${newDepartmentId}`);

			// Return success (dialog will close and refresh the page)
			return { success: true, departmentId: newDepartmentId };
		} catch (err: any) {
			console.error('[Departments] Error creating department:', err);

			return fail(500, {
				error: 'Failed to create department. Please try again.'
			});
		}
	}
};
