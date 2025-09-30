// T025: User Management admin page - server-side data loading
// Admin-only page for managing all system users

import type { PageServerLoad } from './$types';
import { createUrqlClient, executeQuery } from '$lib/graphql/client';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, url, parent, cookies, fetch: fetchFn }) => {
	// Get isAdmin flag from parent layout
	const { isAdmin } = await parent();

	if (!isAdmin) {
		throw error(403, 'Admin access required');
	}

	// Get JWT token for authenticated GraphQL queries
	const jwtToken = cookies.get('hr_token') || cookies.get('auth-token');
	if (!jwtToken) {
		throw error(401, 'Authentication token required');
	}

	// Get pagination parameters - reduced to 20 for better performance
	const page = parseInt(url.searchParams.get('page') || '1');
	const limit = parseInt(url.searchParams.get('limit') || '20');
	const offset = (page - 1) * limit;

	// Get filter parameters
	const roleFilter = url.searchParams.get('role') || '';
	const departmentFilter = url.searchParams.get('department') || '';
	const statusFilter = url.searchParams.get('status') || '';

	try {
		// Create authenticated GraphQL client with server-side fetch and JWT
		const client = createUrqlClient(fetchFn, jwtToken);

		// Build condition object for server-side filtering
		const condition: any = {};
		if (statusFilter === 'active') {
			condition.isActive = true;
		} else if (statusFilter === 'inactive') {
			condition.isActive = false;
		}
		if (departmentFilter) {
			condition.departmentId = departmentFilter;
		}

		// Query users with server-side filtering and pagination
		const usersQuery = `
			query GetAllUsers($first: Int!, $offset: Int!, $condition: UserCondition) {
				allUsers(first: $first, offset: $offset, orderBy: CREATED_AT_DESC, condition: $condition) {
					nodes {
						id
						email
						displayName
						role
						isActive
						createdAt
						updatedAt
						departmentByDepartmentId {
							id
							name
						}
						userRolesByUserId {
							nodes {
								roleByRoleId {
									id
									name
								}
							}
						}
					}
					totalCount
				}
			}
		`;

		// Simplified queries - fetch only essential fields
		const departmentsQuery = `
			query GetAllDepartments {
				allDepartments(orderBy: NAME_ASC) {
					nodes {
						id
						name
					}
				}
			}
		`;

		const rolesQuery = `
			query GetAllRoles {
				allRoles(orderBy: ROLE_LEVEL_DESC) {
					nodes {
						id
						name
					}
				}
			}
		`;

		// Execute all queries in parallel with executeQuery helper
		const [usersData, departmentsData, rolesData] = await Promise.all([
			executeQuery(client, usersQuery, { first: limit, offset, condition }),
			executeQuery(client, departmentsQuery, {}),
			executeQuery(client, rolesQuery, {})
		]);

		const users = usersData?.allUsers?.nodes || [];
		const totalCount = usersData?.allUsers?.totalCount || 0;
		const departments = departmentsData?.allDepartments?.nodes || [];
		const roles = rolesData?.allRoles?.nodes || [];

		// Apply remaining client-side filter for role (if PostGraphile doesn't support nested filtering)
		let filteredUsers = users;
		if (roleFilter) {
			filteredUsers = filteredUsers.filter(
				(u) => u.userRolesByUserId?.nodes?.some((ur) => ur.roleByRoleId?.name === roleFilter)
			);
		}

		return {
			users: filteredUsers,
			totalCount,
			departments,
			roles,
			pagination: {
				page,
				limit,
				totalPages: Math.ceil(totalCount / limit)
			},
			filters: {
				role: roleFilter,
				department: departmentFilter,
				status: statusFilter
			}
		};
	} catch (error) {
		console.error('[ADMIN USERS] Load error:', error);
		return {
			users: [],
			totalCount: 0,
			departments: [],
			roles: [],
			pagination: { page: 1, limit: 50, totalPages: 0 },
			filters: { role: '', department: '', status: '' },
			error: 'Failed to load users'
		};
	}
};
