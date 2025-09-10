import type { PageServerLoad } from './$types';
import { redirect, error } from '@sveltejs/kit';
import { createServerClient } from '$lib/graphql/client-factory';
import { queries } from '$lib/graphql/queries';

export const load: PageServerLoad = async ({ cookies }) => {
	const token = cookies.get('hr_token');
	
	if (!token) {
		throw redirect(303, '/login');
	}

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

		// Load dashboard data based on user permissions
		const dashboardData: any = {
			user,
			permissions,
			roles: user.roles || []
		};

		// Load dashboard statistics
		try {
			const statsResponse = await graphqlClient.query(queries.dashboard.stats);

			if (statsResponse.data?.dashboardStats) {
				dashboardData.statistics = statsResponse.data.dashboardStats;
			}
		} catch (statsError) {
			console.warn('Failed to load dashboard statistics:', statsError);
			// Use fallback statistics
			dashboardData.statistics = {
				totalEmployees: 0,
				activeEmployees: 0,
				pendingRequests: 0,
				upcomingReviews: 0,
				recentActivity: []
			};
		}

		// Load department data for dashboard widgets
		try {
			const departmentsResponse = await graphqlClient.query(
				queries.departments.departments
			);

			if (departmentsResponse.data?.departments) {
				dashboardData.departments = departmentsResponse.data.departments;
			}
		} catch (deptError) {
			console.warn('Failed to load departments for dashboard:', deptError);
			dashboardData.departments = [];
		}

		// Load recent employees for dashboard
		try {
			const recentEmployeesResponse = await graphqlClient.query(
				queries.employees.employees,
				{ 
					limit: 5,
					sort: 'created_at',
					order: 'desc'
				}
			);

			if (recentEmployeesResponse.data?.employees) {
				dashboardData.recentEmployees = recentEmployeesResponse.data.employees.data || recentEmployeesResponse.data.employees;
			}
		} catch (empError) {
			console.warn('Failed to load recent employees:', empError);
			dashboardData.recentEmployees = [];
		}

		return dashboardData;

	} catch (err) {
		console.error('Dashboard load error:', err);
		
		// If authentication fails, redirect to login
		if (err instanceof Error && err.message.includes('auth')) {
			throw redirect(303, '/login');
		}
		
		throw error(500, {
			message: 'Failed to load dashboard data'
		});
	}
};