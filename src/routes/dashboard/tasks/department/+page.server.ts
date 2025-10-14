// Department Tasks Page Server-Side Data Loading
// Feature: 019-we-need-to - Task T027
// Purpose: Load department tasks for managers with server-side GraphQL queries

import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { TasksOperations } from '$lib/graphql/tasks-operations';
import { createUrqlClient } from '$lib/graphql/client';
import type { TaskStatus, TaskPriority } from '$lib/graphql/types';

export const load: PageServerLoad = async ({ locals, url, cookies }) => {
	// Check authentication
	if (!locals.user) {
		throw redirect(303, `/login?redirectTo=${url.pathname}`);
	}

	// Get user credentials for GraphQL operations
	const token = cookies.get('hr_token') || cookies.get('auth-token');
	if (!token) {
		throw redirect(303, `/login?redirectTo=${url.pathname}`);
	}

	const userCredentials = {
		jwtToken: token,
		userId: locals.user.id,
		roles: locals.roles || [],
		permissions: locals.permissions || [],
		isAuthenticated: true,
		expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
	};

	// Check if user has manager or higher privileges
	const userPermissions = locals.permissions || [];
	const hasManagerAccess =
		userPermissions.includes('*') ||
		userPermissions.includes('tasks:department') ||
		userPermissions.includes('management:read');

	if (!hasManagerAccess) {
		throw error(403, {
			message: 'Access denied. Manager privileges required to view department tasks.'
		});
	}

	try {
		// Initialize GraphQL client and operations
		// For server-side: createUrqlClient(fetchFn?, authToken?)
		const urqlClient = createUrqlClient(undefined, token);
		const tasksOps = new TasksOperations(urqlClient);

		// Get query parameters for filtering
		const departmentId = url.searchParams.get('department');
		const statusFilter = url.searchParams.get('status') as TaskStatus | null;
		const priorityFilter = url.searchParams.get('priority') as TaskPriority | null;
		const sortBy = url.searchParams.get('sort') || 'priority';
		const page = parseInt(url.searchParams.get('page') || '1');
		const limit = parseInt(url.searchParams.get('limit') || '50');

		// Determine sort order for GraphQL
		const orderByMap: Record<string, string> = {
			priority: 'PRIORITY_DESC',
			dueDate: 'DUE_DATE_ASC',
			created: 'CREATED_AT_DESC',
			status: 'STATUS_ASC'
		};
		const orderBy = orderByMap[sortBy] || 'PRIORITY_DESC';

		// If no department selected and user manages only one department, auto-select it
		let selectedDepartmentId = departmentId;
		if (!selectedDepartmentId && locals.user.department_id) {
			selectedDepartmentId = locals.user.department_id;
		}

		// For admins without department, show message prompting to select department

		const isAdmin = userPermissions.includes('*') || userPermissions.includes('admin:read');
		if (!selectedDepartmentId && !isAdmin) {
			throw error(400, {
				message:
					'No department selected. Please select a department from the dropdown or ensure your profile has a department assigned.'
			});
		}

		// Build filter for department tasks (only if department selected)
		const filter: any = {};

		if (selectedDepartmentId) {
			filter.departmentId = selectedDepartmentId;
		}

		if (statusFilter) {
			filter.status = statusFilter;
		}

		if (priorityFilter) {
			filter.priority = priorityFilter;
		}

		// Fetch department tasks (or empty if no department selected)
		let tasksResult = { tasks: [], totalCount: 0, hasNextPage: false };
		let allTasksResult = { tasks: [], totalCount: 0, hasNextPage: false };

		if (selectedDepartmentId) {
			tasksResult = await tasksOps.getDepartmentTasks({
				first: limit,
				offset: (page - 1) * limit,
				filter,
				userCredentials
			});

			// Fetch all tasks without pagination for statistics
			allTasksResult = await tasksOps.getDepartmentTasks({
				first: 1000, // Reasonable max for statistics
				filter: { departmentId: selectedDepartmentId },
				userCredentials
			});
		}

		// Get user's managed departments (for department selector)
		let managedDepartments: Array<{ id: string; name: string }> = [];

		if (isAdmin) {
			// Admins can see all departments - fetch from database
			try {
				const departmentsQuery = `
					query GetAllDepartments {
						departments(orderBy: NAME_ASC) {
							id
							name
						}
					}
				`;
				const deptResult = await urqlClient.query(departmentsQuery, {}).toPromise();

				if (deptResult.data?.departments) {
					managedDepartments = deptResult.data.departments;
				}
			} catch (err) {
				console.error('Error fetching departments for admin:', err);
				// Fallback to user's department if query fails
				if (locals.user.department_id) {
					managedDepartments = [
						{
							id: locals.user.department_id,
							name: locals.user.department_name || 'My Department'
						}
					];
				}
			}
		} else {
			// Managers only see their assigned department
			if (locals.user.department_id) {
				managedDepartments = [
					{
						id: locals.user.department_id,
						name: locals.user.department_name || 'My Department'
					}
				];
			}
		}

		// Show department selector if admin or multiple departments available
		const showDepartmentSelector = isAdmin || managedDepartments.length > 1;

		return {
			tasks: tasksResult.tasks,
			allTasks: allTasksResult.tasks,
			totalCount: tasksResult.totalCount,
			hasNextPage: tasksResult.hasNextPage,
			currentPage: page,
			limit,
			filters: {
				status: statusFilter,
				priority: priorityFilter,
				sortBy,
				departmentId: selectedDepartmentId
			},
			managedDepartments,
			selectedDepartment: selectedDepartmentId
				? managedDepartments.find((d) => d.id === selectedDepartmentId) ||
					managedDepartments[0] ||
					null
				: null,
			showDepartmentSelector,
			isAdmin,
			user: locals.user
		};
	} catch (err: any) {
		console.error('Error loading department tasks:', err);

		// Handle specific error cases
		if (err.message?.includes('unauthorized') || err.message?.includes('authentication')) {
			throw redirect(303, `/login?redirectTo=${url.pathname}`);
		}

		// If it's already a SvelteKit error, rethrow it
		if (err.status) {
			throw err;
		}

		throw error(500, {
			message: 'Failed to load department tasks. Please try again later.'
		});
	}
};

// Helper function to get role level for authorization
function getRoleLevel(role: string | undefined): number {
	const normalizedRole = role?.toLowerCase().replace('-', '_') || 'employee';

	const roleLevels: Record<string, number> = {
		super_admin: 100,
		superadmin: 100,
		admin: 100,
		hr_manager: 80,
		hrmanager: 80,
		manager: 60,
		employee: 20
	};

	return roleLevels[normalizedRole] || 20;
}
