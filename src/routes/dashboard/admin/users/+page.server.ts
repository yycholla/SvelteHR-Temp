// T025: User Management admin page - server-side data loading
// Admin-only page for managing all system users

import type { PageServerLoad } from './$types';
import { createUrqlClient } from '$lib/graphql/client';

export const load: PageServerLoad = async ({ locals, url, parent }) => {
	// Get isAdmin flag from parent layout
	const { isAdmin } = await parent();

	if (!isAdmin) {
		throw new Error('Admin access required');
	}

	// Get pagination parameters
	const page = parseInt(url.searchParams.get('page') || '1');
	const limit = parseInt(url.searchParams.get('limit') || '50');
	const offset = (page - 1) * limit;

	// Get filter parameters
	const roleFilter = url.searchParams.get('role') || '';
	const departmentFilter = url.searchParams.get('department') || '';
	const statusFilter = url.searchParams.get('status') || '';

	try {
		const client = createUrqlClient();

		// Query all users with pagination
		const usersQuery = `
			query GetAllUsers($first: Int!, $offset: Int!) {
				allUsers(first: $first, offset: $offset, orderBy: CREATED_AT_DESC) {
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

		const usersResult = await client.query(usersQuery, {
			first: limit,
			offset
		});

		// Query all departments for filtering/assignment
		const departmentsQuery = `
			query GetAllDepartments {
				allDepartments(orderBy: NAME_ASC) {
					nodes {
						id
						name
						code
					}
				}
			}
		`;

		const departmentsResult = await client.query(departmentsQuery, {});

		// Query all roles for filtering/assignment
		const rolesQuery = `
			query GetAllRoles {
				allRoles(orderBy: ROLE_LEVEL_DESC) {
					nodes {
						id
						name
						roleLevel
					}
				}
			}
		`;

		const rolesResult = await client.query(rolesQuery, {});

		const users = usersResult.data?.allUsers?.nodes || [];
		const totalCount = usersResult.data?.allUsers?.totalCount || 0;
		const departments = departmentsResult.data?.allDepartments?.nodes || [];
		const roles = rolesResult.data?.allRoles?.nodes || [];

		// Apply client-side filters if provided
		let filteredUsers = users;
		if (roleFilter) {
			filteredUsers = filteredUsers.filter(
				(u) => u.userRolesByUserId?.nodes?.some((ur) => ur.roleByRoleId?.name === roleFilter)
			);
		}
		if (departmentFilter) {
			filteredUsers = filteredUsers.filter(
				(u) => u.departmentByDepartmentId?.id === departmentFilter
			);
		}
		if (statusFilter) {
			const isActive = statusFilter === 'active';
			filteredUsers = filteredUsers.filter((u) => u.isActive === isActive);
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
