import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { createServerClient } from '$lib/graphql/client-factory';
import { queries } from '$lib/graphql/queries';

export const load: PageServerLoad = async ({ cookies, locals, url }) => {
	const token = cookies.get('hr_token') || cookies.get('auth_token');

	if (!token) {
		throw redirect(303, '/login');
	}

	// Parse URL parameters for filtering
	const search = url.searchParams.get('search') || '';
	const activeOnly = url.searchParams.get('active_only') !== 'false'; // Default to true
	const sortBy = url.searchParams.get('sortBy') || 'name';
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

		// Check if user has permission to view departments
		const canViewDepartments = permissions.includes('*') || 
			permissions.some(p => p.startsWith('departments:') || p.includes('hr') || p.includes('admin'));

		if (!canViewDepartments) {
			throw error(403, {
				message: 'Insufficient permissions to view departments'
			});
		}

		console.log('🔍 Fetching departments from GraphQL API...');

		// Load departments data via GraphQL
		const departmentsResponse = await graphqlClient.query(
			queries.departments.departments
		);

		// Load department metrics if user has advanced permissions
		let departmentMetrics = null;
		if (permissions.includes('*') || permissions.some(p => p.includes('admin') || p.includes('hr'))) {
			try {
				// This would be a separate GraphQL query for metrics
				// For now, we'll simulate it
				departmentMetrics = {
					totalDepartments: departmentsResponse.data?.departments?.length || 0,
					activeDepartments: departmentsResponse.data?.departments?.filter(d => d.is_active !== false).length || 0,
					totalEmployees: departmentsResponse.data?.departments?.reduce((sum, dept) => sum + (dept.employee_count || 0), 0) || 0,
					totalBudget: departmentsResponse.data?.departments?.reduce((sum, dept) => sum + (dept.budget || 0), 0) || 0
				};
			} catch (metricsError) {
				console.warn('Failed to load department metrics:', metricsError);
			}
		}

		let departments = departmentsResponse.data?.departments || [];

		// Apply client-side filtering (in production, this would be handled by GraphQL variables)
		if (search) {
			const searchLower = search.toLowerCase();
			departments = departments.filter(dept => 
				dept.name?.toLowerCase().includes(searchLower) ||
				dept.description?.toLowerCase().includes(searchLower)
			);
		}

		if (activeOnly) {
			departments = departments.filter(dept => dept.is_active !== false);
		}

		// Apply sorting
		departments.sort((a, b) => {
			let aValue = a[sortBy] || '';
			let bValue = b[sortBy] || '';
			
			if (typeof aValue === 'string') aValue = aValue.toLowerCase();
			if (typeof bValue === 'string') bValue = bValue.toLowerCase();
			
			if (sortOrder === 'desc') {
				return aValue < bValue ? 1 : -1;
			}
			return aValue > bValue ? 1 : -1;
		});

		console.log(`✅ Departments fetched from GraphQL API: ${departments.length} departments`);

		return {
			user,
			permissions,
			departments,
			departmentMetrics,
			filters: {
				search,
				activeOnly,
				sortBy,
				sortOrder
			},
			isUsingGraphQL: true
		};

	} catch (err: any) {
		console.error('❌ Failed to load departments via GraphQL:', err);

		if (err.message?.includes('auth')) {
			throw redirect(303, '/login');
		}

		if (err.status === 403) {
			throw err; // Re-throw permission errors
		}

		throw error(500, {
			message: `Failed to load departments: ${err.message}`
		});
	}
};
