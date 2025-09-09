import type { PageServerLoad } from './$types';
import { redirect, error } from '@sveltejs/kit';
import { createBrowserGraphQLClient } from '$lib/graphql/client.js';
import { queries } from '$lib/graphql/queries.js';

export const load: PageServerLoad = async ({ cookies }) => {
	const token = cookies.get('hr_token');
	
	if (!token) {
		throw redirect(303, '/login');
	}

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

		// Load dashboard data based on user permissions
		const dashboardData: any = {
			user,
			permissions: user.permissions || [],
			roles: user.roles || []
		};

		// Load dashboard statistics
		try {
			const statsResponse = await graphqlClient.query(
				queries.dashboard.statistics,
				{}
			);

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
				queries.departments.list,
				{ active: true, limit: 10 }
			);

			if (departmentsResponse.data?.departments) {
				dashboardData.departments = departmentsResponse.data.departments.data;
			}
		} catch (deptError) {
			console.warn('Failed to load departments for dashboard:', deptError);
			dashboardData.departments = [];
		}

		// Load recent employees for dashboard
		try {
			const recentEmployeesResponse = await graphqlClient.query(
				queries.employees.list,
				{ 
					limit: 5,
					sortBy: 'createdAt',
					sortOrder: 'DESC'
				}
			);

			if (recentEmployeesResponse.data?.employees) {
				dashboardData.recentEmployees = recentEmployeesResponse.data.employees.data;
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