import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { createServerClient } from '$lib/graphql/client-factory';
import { queries } from '$lib/graphql/queries';

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
		// Create GraphQL client with server-side authentication
		const graphqlClient = createServerClient(token);

		// Verify authentication and get user context
		const authResponse = await graphqlClient.query(queries.auth.me);

		if (!authResponse.data?.me?.authenticated) {
			throw redirect(303, '/login');
		}

		const user = authResponse.data.me.user;
		const permissions = authResponse.data.me.permissions || [];

		// Load employees with GraphQL using proper query structure
		const employeesResponse = await graphqlClient.query(
			queries.employees.employees,
			{
				page,
				limit,
				search: search || undefined,
				department_id: departmentId || undefined,
				status: status || undefined,
				position: role || undefined, // Map role parameter to position
				sort: sortBy || undefined,
				order: sortOrder || undefined
			}
		);

		// Load departments for filters
		const departmentsResponse = await graphqlClient.query(
			queries.departments.departments
		);

		// For filter options, we'll derive them from the current employees data
		// In a real implementation, this would be a separate GraphQL query
		const employees = employeesResponse.data?.employees?.data || [];
		const departments = departmentsResponse.data?.departments || [];
		
		// Extract unique filter options from current data
		const positions = [...new Set(employees.map(emp => emp.position).filter(Boolean))];
		const statuses = [...new Set(employees.map(emp => emp.status).filter(Boolean))];

		return {
			user,
			permissions,
			employees: {
				data: employees,
				pagination: employeesResponse.data?.employees?.pagination || {
					page: 1,
					limit: 20,
					total: 0,
					total_pages: 1,
					has_next: false,
					has_previous: false
				}
			},
			departments,
			filterOptions: {
				positions,
				statuses,
				locations: [] // Would be populated from employee addresses in real implementation
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
