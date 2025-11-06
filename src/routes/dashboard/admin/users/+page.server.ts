// T025: User Management admin page - server-side data loading
// Admin-only page for managing all system users

import type { PageServerLoad } from './$types';
import { createUrqlClient, executeQuery, serializeCookies } from '$lib/graphql/client';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, url, parent, cookies, fetch: fetchFn }) => {
	// Get isAdmin flag from parent layout
	const { isAdmin } = await parent();

	if (!isAdmin) {
		error(403, 'Admin access required');
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
		// Create GraphQL client with server-side fetch and forward session cookies
		const cookieHeader = serializeCookies(cookies);
		const client = createUrqlClient(fetchFn, undefined, undefined, cookieHeader);

		// NOTE: Rust GraphQL backend does NOT support complex filter parameter
		// Fetch all users and filter client-side for department, status, and role
		const usersQuery = `
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
		// NOTE: Rust backend uses offset-based pagination (limit/offset), not cursor-based (first/after)
		// Fetch large dataset for client-side filtering
		const [usersData, departmentsData] = await Promise.all([
			executeQuery(client, usersQuery, { limit: 1000, offset: 0 }),
			executeQuery(client, departmentsQuery, { limit: 100, offset: 0 })
		]);

		let users = usersData?.users || [];
		const departments = departmentsData?.departments || [];

		// Build roles list from user data (unique role values)
		const uniqueRoles = [...new Set(users.map((u: any) => u.role))];
		const roles = uniqueRoles.filter(Boolean).map((name) => ({ id: name, name }));

		// Client-side filtering for all criteria (Rust backend doesn't support complex filters)
		let filteredUsers = users;

		// Filter by role
		if (roleFilter) {
			filteredUsers = filteredUsers.filter((u: any) => u.role === roleFilter);
		}

		// Filter by department
		if (departmentFilter) {
			filteredUsers = filteredUsers.filter((u: any) => u.department?.id === departmentFilter);
		}

		// Filter by status
		if (statusFilter === 'active') {
			filteredUsers = filteredUsers.filter((u: any) => u.isActive === true);
		} else if (statusFilter === 'inactive') {
			filteredUsers = filteredUsers.filter((u: any) => u.isActive === false);
		}

		// Client-side pagination
		const totalCount = filteredUsers.length;
		const startIndex = (page - 1) * limit;
		const endIndex = startIndex + limit;
		const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

		return {
			users: paginatedUsers,
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
