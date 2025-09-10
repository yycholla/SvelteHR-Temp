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

		// Check if user has reports permissions
		const hasReportsAccess = permissions.includes('*') || 
			permissions.some(p => p.includes('reports') || p.includes('admin') || p.includes('hr'));

		if (!hasReportsAccess) {
			throw error(403, {
				message: 'Insufficient permissions to access reports'
			});
		}

		// Load reports data via GraphQL
		const [reportsData, employeeData, leaveData] = await Promise.allSettled([
			graphqlClient.query(queries.reports.dashboard),
			graphqlClient.query(queries.employees.employees),
			graphqlClient.query(queries.hr.leave, { status: 'pending' })
		]);

		// Process employee data for headcount
		const employees = employeeData.status === 'fulfilled' && employeeData.value.data?.employees
			? employeeData.value.data.employees
			: [];

		// Process leave data for pending requests
		const pendingLeaves = leaveData.status === 'fulfilled' && leaveData.value.data?.leaves
			? leaveData.value.data.leaves
			: [];

		// Calculate metrics from GraphQL data
		const metrics = {
			totalEmployees: employees.length,
			timeOffRequests: pendingLeaves.length,
			payrollTotal: 0, // Would come from payroll GraphQL query
			performanceCompletion: 0 // Would come from performance GraphQL query
		};

		return { 
			user,
			permissions,
			metrics, 
			isUsingGraphQL: true 
		};
	} catch (err: any) {
		console.error('❌ Failed to load reports via GraphQL:', err);

		if (err.message?.includes('auth')) {
			throw redirect(303, '/login');
		}

		if (err.status === 403) {
			throw err; // Re-throw permission errors
		}

		throw error(500, {
			message: `Failed to load reports: ${err.message}`
		});
	}
};
