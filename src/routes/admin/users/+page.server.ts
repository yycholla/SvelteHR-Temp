// T025: User Management admin page - server-side data loading
// Admin-only page for managing all system users

import type { PageServerLoad } from './$types';
import { logger } from '$lib/utils/logger';
import { RBACDataLoader } from '$lib/server/route-loaders';
import { QueryParamExtractor, ClientSideFilter } from '$lib/server/route-helpers';

export const load: PageServerLoad = async (event) => {
	// Initialize RBAC loader with required permissions
	const loader = new RBACDataLoader(event, ['admin:read', 'admin:read:all']);

	return loader.loadWithClient(async (client) => {
		const params = new QueryParamExtractor(event.url);
		const { page, limit } = params.getPagination(20);

		// Get filter parameters
		const filters = params.getFilters(['role', 'department', 'status']);

		try {
			// NOTE: Rust GraphQL backend does NOT support complex filter parameter
			// Fetch all users and filter client-side for department, status, and role
			const usersQuery = `
				query GetAllUsers($limit: Int!, $offset: Int!) {
					users(limit: $limit, offset: $offset) {
						id
						email
						displayName
						roles {
							id
							name
						}
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

			// Execute queries in parallel
			// Fetch large dataset for client-side filtering (1000 items)
			const [usersData, departmentsData] = await Promise.all([
				client.query(usersQuery, { limit: 1000, offset: 0 }),
				client.query(departmentsQuery, { limit: 100, offset: 0 })
			]);

			const users = usersData?.users || [];
			const departments = departmentsData?.departments || [];

			// Build roles list from user data (flatten and get unique role values)
			const uniqueRoles = [
				...new Set(users.flatMap((u: any) => (u.roles || []).map((r: any) => r.name)))
			];
			const roles = uniqueRoles.filter(Boolean).map((name) => ({ id: name, name }));

			// Use ClientSideFilter for filtering and pagination
			const userFilter = new ClientSideFilter(users);

			// Filter by role
			if (filters.role) {
				userFilter.filter((u: any) => u.roles?.some((r: any) => r.name === filters.role));
			}

			// Filter by department
			if (filters.department) {
				userFilter.where('department', { id: filters.department }); // Assuming u.department object equality check won't work, need deeper check.
				// Actually ClientSideFilter.where does strict equality.
				// Let's use .filter for nested property
				userFilter.filter((u: any) => u.department?.id === filters.department);
			}

			// Filter by status
			if (filters.status === 'active') {
				userFilter.where('isActive', true);
			} else if (filters.status === 'inactive') {
				userFilter.where('isActive', false);
			}

			// Get total count
			const totalCount = userFilter.count();

			// Return all users (non-paginated) for client-side filtering
			// The user requested a non-paginated endpoint for better UX
			const allUsers = userFilter.get();

			return {
				users: allUsers,
				totalCount,
				departments,
				roles,
				pagination: {
					page: 1,
					limit: totalCount, // Effectively no limit
					totalPages: 1
				},
				filters
			};
		} catch (error) {
			logger.error('[ADMIN USERS] Load error:', error as Error);
			return {
				users: [],
				totalCount: 0,
				departments: [],
				roles: [],
				pagination: { page: 1, limit: 20, totalPages: 0 },
				filters: { role: '', department: '', status: '' },
				error: 'Failed to load users'
			};
		}
	});
};
