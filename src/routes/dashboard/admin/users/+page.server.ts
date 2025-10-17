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

	// Get pagination parameters - reduced to 20 for better performance
	const page = parseInt(url.searchParams.get('page') || '1');
	const limit = parseInt(url.searchParams.get('limit') || '20');
	const offset = (page - 1) * limit;

	// Get filter parameters
	const roleFilter = url.searchParams.get('role') || '';
	const departmentFilter = url.searchParams.get('department') || '';
	const statusFilter = url.searchParams.get('status') || '';

	try {
		// Create GraphQL client with server-side fetch (session-based auth)
		const client = createUrqlClient(fetchFn);

		// Build filter condition for server-side filtering
		// Using Rust GraphQL schema pattern: filter: { field: { equalTo: value } }
		let filterCondition: any = null;

		if (statusFilter || departmentFilter) {
			filterCondition = {};
			if (statusFilter === 'active') {
				filterCondition.isActive = { equalTo: true };
			} else if (statusFilter === 'inactive') {
				filterCondition.isActive = { equalTo: false };
			}
			if (departmentFilter) {
				filterCondition.departmentId = { equalTo: departmentFilter };
			}
		}

		// Query users with server-side filtering and pagination
		// NOTE: Using Rust GraphQL schema (users query, no nested relationships)
		const usersQuery = filterCondition
			? `
			query GetAllUsers($limit: Int!, $offset: Int!, $filter: UserFilter!) {
				users(limit: $limit, offset: $offset, filter: $filter) {
					id
					email
					displayName
					role
					isActive
					createdAt
					updatedAt
					department {
						id
						name
					}
				}
			}
		`
			: `
			query GetAllUsers($limit: Int!, $offset: Int!) {
				users(limit: $limit, offset: $offset) {
					id
					email
					displayName
					role
					isActive
					createdAt
					updatedAt
					department {
						id
						name
					}
				}
			}
		`;

		// Simplified queries - fetch only essential fields
		const departmentsQuery = `
			query GetAllDepartments($limit: Int!, $offset: Int!) {
				departments(limit: $limit, offset: $offset) {
					id
					name
				}
			}
		`;

		// Execute queries in parallel with executeQuery helper
		const variables = filterCondition
			? { limit, offset, filter: filterCondition }
			: { limit, offset };

		const [usersData, departmentsData] = await Promise.all([
			executeQuery(client, usersQuery, variables),
			executeQuery(client, departmentsQuery, { limit: 100, offset: 0 })
		]);

		let users = usersData?.users || [];
		const departments = departmentsData?.departments || [];

		// Build roles list from user data (unique role values)
		const uniqueRoles = [...new Set(users.map((u: any) => u.role))];
		const roles = uniqueRoles.filter(Boolean).map((name) => ({ id: name, name }));

		// Apply client-side filter for role
		let filteredUsers = users;
		if (roleFilter) {
			filteredUsers = filteredUsers.filter((u: any) => u.role === roleFilter);
		}

		const totalCount = filteredUsers.length;

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
