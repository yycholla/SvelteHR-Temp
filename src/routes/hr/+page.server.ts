import type { PageServerLoad } from './$types';
import { redirect, error } from '@sveltejs/kit';
import { createServerClient } from '$lib/graphql/client-factory';
import { queries } from '$lib/graphql/queries';

export const load: PageServerLoad = async ({ cookies }) => {
	const token = cookies.get('hr_token');
	
	if (!token) {
		throw redirect(303, '/login');
	}

	console.log('🏢 Loading HR dashboard with GraphQL');

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

		// Check if user has HR permissions
		const hasHRAccess = permissions.includes('*') || 
			permissions.some(p => p.includes('hr') || p.includes('admin') || p.startsWith('employees:'));

		if (!hasHRAccess) {
			throw error(403, {
				message: 'Insufficient permissions to access HR dashboard'
			});
		}

		// Load comprehensive dashboard data in parallel
		const [employeeData, departmentData, taskData, leaveData] =
			await Promise.allSettled([
				graphqlClient.query(queries.employees.employees, { limit: 10 }),
				graphqlClient.query(queries.departments.departments),
				graphqlClient.query(queries.hr.tasks, { limit: 10 }),
				graphqlClient.query(queries.hr.leave, { limit: 10, status: 'pending' })
			]);

		// Process employee data
		const employees = employeeData.status === 'fulfilled' && employeeData.value.data?.employees
			? employeeData.value.data.employees
			: [];

		// Process department data
		const departments = departmentData.status === 'fulfilled' && departmentData.value.data?.departments
			? departmentData.value.data.departments
			: [];

		// Process task data
		const tasks = taskData.status === 'fulfilled' && taskData.value.data?.tasks
			? taskData.value.data.tasks
			: [];

		// Process leave requests
		const leaves = leaveData.status === 'fulfilled' && leaveData.value.data?.leaves
			? leaveData.value.data.leaves
			: [];

		// Calculate dashboard statistics
		const stats = {
			totalEmployees: employees.length,
			totalDepartments: departments.length,
			activeTasks: tasks.length,
			pendingLeaves: leaves.length,
			recentActivities: 0,
			activeAnnouncements: 0
		};

		// Get upcoming tasks
		const upcomingTasks = tasks.slice(0, 5);

		// Get recent employees (newly joined)
		const recentEmployees = employees
			.filter((emp) => emp.created_at)
			.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
			.slice(0, 5);

		console.log('✅ HR dashboard loaded with comprehensive data');

		return {
			user,
			permissions,
			// Core data
			employees: employees.slice(0, 10),
			departments,
			tasks: tasks.slice(0, 10),
			announcements: [],
			recentActivities: [],
			pendingLeaves: leaves,

			// Dashboard widgets
			stats,
			recentEmployees,
			upcomingTasks,

			// Quick access data
			totalCounts: {
				employees: employees.length,
				tasks: tasks.length,
				leaves: leaves.length,
				announcements: 0,
				activities: 0
			}
		};
	} catch (err: any) {
		console.error('❌ Failed to load HR dashboard data:', err);

		if (err.message?.includes('auth')) {
			throw redirect(303, '/login');
		}

		if (err.status === 403) {
			throw err; // Re-throw permission errors
		}

		throw error(500, {
			message: `Failed to load HR dashboard: ${err.message}`
		});
	}
};
