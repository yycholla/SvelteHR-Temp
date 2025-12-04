// Server-side data loading for teams management page
// T037: Fix teams management pages with standardized error handling

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { PermissionChecks, getUserPermissions } from '$lib/server/rbac-utils';

export const load: PageServerLoad = async (event) => {
	const { locals, cookies, url } = event;

	// RBAC: Check teams management permissions
	PermissionChecks.teamRead(event);

	// Import required models for standardized error handling
	const { createDataRequest } = await import('$lib/models/data-request');
	const { createErrorResponse } = await import('$lib/models/error-response');
	const { createUserSession } = await import('$lib/models/user-session');

	// Create user session from server locals
	const userSession = createUserSession({
		userId: locals.user.id,
		// jwtToken is optional for session-based authentication
		roles: [locals.user.role || 'employee'],
		permissions: locals.permissions || [],
		expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes from now
		metadata: {
			userEmail: locals.user.email,
			displayName: locals.user.display_name || locals.user.email
		}
	});

	// Extract search parameters from URL
	const searchTerm = url.searchParams.get('search') || '';
	const sizeFilter = url.searchParams.get('size') || '';
	const headFilter = url.searchParams.get('head') || '';
	const parentFilter = url.searchParams.get('parent') || '';
	const viewMode = url.searchParams.get('view') || 'table';
	const page = parseInt(url.searchParams.get('page') || '1', 10);
	const limit = parseInt(url.searchParams.get('limit') || '20', 10);

	// Create data request for teams data
	const dataRequest = createDataRequest({
		operationName: 'GetTeamsManagement',
		variables: {
			searchTerm,
			sizeFilter,
			headFilter,
			parentFilter,
			page,
			limit,
			includeHierarchy: viewMode === 'hierarchy'
		},
		userCredentials: {
			userId: userSession.userId,
			userEmail: userSession.metadata.userEmail as string,
			roles: userSession.roles,
			permissions: userSession.permissions,
			// jwtToken omitted for session-based auth
			isAuthenticated: Boolean(userSession.isAuthenticated)
		},
		timeoutMs: 5000,
		retryAttempts: 0,
		maxRetries: 3
	});

	try {
		// Fetch user's managed department for managers (admins see all)
		const { getGraphQLEndpoint } = await import('$lib/server/api-url');
		const graphqlEndpoint = getGraphQLEndpoint();

		let managedDepartmentId: string | null = null;
		let isAdmin = userSession.roles.includes('admin');

		// For managers, get their managed department
		if (!isAdmin && userSession.roles.includes('manager')) {
			const deptResponse = await fetch(graphqlEndpoint, {
				method: 'POST',
				headers,
				body: JSON.stringify({
					query: `
						query GetManagerDepartment($userId: UUID!) {
							user(id: $userId) {
								id
								departmentId
							}
						}
					`,
					variables: { userId: userSession.userId }
				})
			});

			const deptData = await deptResponse.json();
			const userData = deptData?.data?.user;

			// If user has a department ID, fetch the department to check if they're the manager
			if (userData?.departmentId) {
				const deptDetailResponse = await fetch(graphqlEndpoint, {
					method: 'POST',
					headers,
					body: JSON.stringify({
						query: `
							query GetDepartment($deptId: UUID!) {
								department(id: $deptId) {
									id
									name
									managerId
								}
							}
						`,
						variables: { deptId: userData.departmentId }
					})
				});

				const deptDetailData = await deptDetailResponse.json();
				const userDept = deptDetailData?.data?.department;

				// Only set managedDepartmentId if user is actually the manager of their department
				if (userDept && userDept.managerId === userSession.userId) {
					managedDepartmentId = userDept.id;
				}
			}
		}

		// Build GraphQL query for departments (teams) using Rust GraphQL server schema
		// Determine department filter
		let filterDepartmentId: string | undefined = undefined;
		if (parentFilter) {
			filterDepartmentId = parentFilter;
		} else if (!isAdmin && managedDepartmentId) {
			filterDepartmentId = managedDepartmentId;
		}

		// Get JWT token from cookies for Rust GraphQL server authentication

		// Headers for session-based authentication (cookies sent automatically)
		const headers: Record<string, string> = {
			'Content-Type': 'application/json'
		};

		// Fetch departments (teams) data
		// When filtering by single department ID, use singular query; otherwise use plural
		let departments: any[] = [];

		if (filterDepartmentId) {
			// Use singular query for single department
			const singleDeptResponse = await fetch(graphqlEndpoint, {
				method: 'POST',
				headers,
				body: JSON.stringify({
					query: `
						query GetDepartment($departmentId: UUID!) {
							department(id: $departmentId) {
								id
								name
								description
								managerId
								createdAt
								updatedAt
							}
						}
					`,
					variables: { departmentId: filterDepartmentId }
				})
			});

			const singleDeptData = await singleDeptResponse.json();
			const dept = singleDeptData?.data?.department;
			departments = dept ? [dept] : [];
		} else {
			// Use plural query for all departments
			const allDeptsResponse = await fetch(graphqlEndpoint, {
				method: 'POST',
				headers,
				body: JSON.stringify({
					query: `
						query GetDepartments($limit: Int!, $offset: Int!) {
							departments(limit: $limit, offset: $offset) {
								id
								name
								description
								managerId
								createdAt
								updatedAt
							}
						}
					`,
					variables: {
						limit,
						offset: (page - 1) * limit
					}
				})
			});

			const allDeptsData = await allDeptsResponse.json();
			departments = allDeptsData?.data?.departments || [];
		}

		// Fetch manager details for each department
		// NOTE: Rust backend doesn't support PostGraphile's userByManagerId relationship
		// We need to fetch managers separately
		const managersMap = new Map();
		const managerIds = [...new Set(departments.map((d: any) => d.managerId).filter(Boolean))];

		if (managerIds.length > 0) {
			// Fetch all managers in parallel
			const managerPromises = managerIds.map((managerId) =>
				fetch(graphqlEndpoint, {
					method: 'POST',
					headers,
					body: JSON.stringify({
						query: `
							query GetUser($id: UUID!) {
								user(id: $id) {
									id
									displayName
									email
								}
							}
						`,
						variables: { id: managerId }
					})
				}).then((r) => r.json())
			);

			const managerResponses = await Promise.all(managerPromises);
			managerResponses.forEach((response) => {
				const manager = response?.data?.user;
				if (manager) {
					managersMap.set(manager.id, manager);
				}
			});
		}

		// Debug logging
		console.log('[Teams Page] Filter Department ID:', filterDepartmentId);
		console.log('[Teams Page] Is Admin:', isAdmin);
		console.log('[Teams Page] Departments found:', departments.length);
		const totalCount = departments.length; // Rust server doesn't provide totalCount in this format

		console.log('[Teams Page] Departments found:', departments.length);
		console.log('[Teams Page] Total count:', totalCount);

		// Calculate team statistics (employee counts not available in current Rust GraphQL schema)
		const totalEmployees = 0; // TODO: Implement separate query for employee counts per department
		const teamsWithHeads = departments.filter((dept: any) => dept.managerId).length;
		const averageTeamSize = 0; // TODO: Calculate when employee counts are available

		// Return server-side loaded data
		// Get standardized user permissions
		const userPermissions = getUserPermissions(locals);

		return {
			user: userPermissions.user,
			userSession: userSession.toJSON(), // Convert UserSession to serializable object
			teams: departments.map((dept: any) => {
				const manager = dept.managerId ? managersMap.get(dept.managerId) : null;
				return {
					id: dept.id,
					name: dept.name,
					description: dept.description,
					departmentHead: manager
						? {
								id: manager.id,
								displayName: manager.displayName,
								email: manager.email
							}
						: null,
					parentDepartment: null, // Not available in current schema
					employees: {
						totalCount: 0 // TODO: Implement separate query for employee counts
					},
					subDepartments: {
						totalCount: 0 // Not available in current schema
					},
					createdAt: dept.createdAt,
					updatedAt: dept.updatedAt
				};
			}),
			totalTeams: totalCount,
			hierarchy: [],
			teamStats: {
				totalTeams: totalCount,
				totalEmployees,
				averageTeamSize,
				teamsWithHeads
			},
			filters: {
				searchTerm,
				sizeFilter,
				headFilter,
				parentFilter,
				viewMode,
				page,
				limit
			},
			// Team/Department context for managers
			managedDepartmentId,
			isAdmin,
			canViewAllTeams: isAdmin, // Only admins can view all teams
			canViewManagedTeam: !!managedDepartmentId, // Managers can view their department
			// RBAC: Standardized permission checks
			...userPermissions,
			loadedAt: new Date().toISOString()
		};
	} catch (err) {
		console.error('[Teams Management Load Error]', err);

		// Create standardized error response
		const errorResponse = createErrorResponse(
			err instanceof Error ? err : new Error('Teams management load failed'),
			{
				type: 'DATA_LOAD_ERROR',
				userMessage:
					'Unable to load teams management data. Please refresh the page or try again later.'
			}
		);

		// Log error details for debugging
		console.error('[Teams Management Error Details]', {
			userId: locals.user?.id,
			userRole: locals.user?.role,
			searchTerm,
			sizeFilter,
			headFilter,
			parentFilter,
			error: errorResponse
		});

		// Throw SvelteKit error with user-friendly message
		error(500, {
			message: 'Teams management temporarily unavailable',
			details: errorResponse.userMessage
		});
	}
};
