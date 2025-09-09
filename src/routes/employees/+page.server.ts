import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { createBrowserGraphQLClient } from '$lib/graphql/client.js';
import { queries } from '$lib/graphql/queries.js';

export const load: PageServerLoad = async ({ url, cookies }) => {
	const token = cookies.get('hr_token');
	
	if (!token) {
		throw redirect(303, '/login');
	}

	// Parse URL parameters for filtering
	const page = Number(url.searchParams.get('page')) || 1;
	const search = url.searchParams.get('search') || '';
	const departmentId = url.searchParams.get('departmentId') || '';
	const status = url.searchParams.get('status') || '';
	const location = url.searchParams.get('location') || '';
	const role = url.searchParams.get('role') || '';
	const limit = Number(url.searchParams.get('limit')) || 20;
	const sortBy = url.searchParams.get('sortBy') || 'lastName';
	const sortOrder = url.searchParams.get('sortOrder') || 'asc';

	try {
		// Create GraphQL client
		const graphqlClient = createBrowserGraphQLClient();
		graphqlClient.setToken(token);

		// Verify authentication and get user context
		const authResponse = await graphqlClient.query(
			queries.auth.verify,
			{}
		);

		if (!authResponse.data?.me) {
			throw redirect(303, '/login');
		}

		const user = authResponse.data.me;

		// Load employees with GraphQL
		const employeesResponse = await graphqlClient.query(
			queries.employees.list,
			{
				page,
				limit,
				search: search || null,
				departments: departmentId ? [departmentId] : null,
				statuses: status ? [status] : null,
				locations: location ? [location] : null,
				roles: role ? [role] : null,
				sortBy: sortBy || null,
				sortOrder: sortOrder?.toUpperCase() || null
			}
		);

		// Load departments for filters
		const departmentsResponse = await graphqlClient.query(
			queries.departments.list,
			{ active: true, limit: 100 }
		);

		// Load filter options (locations, roles, etc.)
		const filterOptionsResponse = await graphqlClient.query(
			queries.employees.filterOptions,
			{}
		);

		return {
			user,
			permissions: user.permissions || [],
			employees: employeesResponse.data?.employees || {
				data: [],
				total: 0,
				page: 1,
				limit: 20,
				totalPages: 1,
				hasNextPage: false,
				hasPreviousPage: false
			},
			departments: departmentsResponse.data?.departments?.data || [],
			filterOptions: filterOptionsResponse.data?.employeeFilterOptions || {
				locations: [],
				roles: []
			},
			filters: {
				search,
				departmentId,
				status,
				location,
				role,
				page,
				limit,
				sortBy,
				sortOrder
			}
		};

	} catch (err) {
		console.error('Employees load error:', err);
		
		// If authentication fails, redirect to login
		if (err instanceof Error && err.message.includes('auth')) {
			throw redirect(303, '/login');
		}
		
		throw error(500, {
			message: 'Failed to load employee data'
		});
	}
};
