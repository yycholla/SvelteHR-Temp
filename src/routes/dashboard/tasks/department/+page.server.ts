// Department Tasks Page Server-Side Data Loading
// Feature: 019-we-need-to - Task T027
// Purpose: Load department tasks for managers with server-side GraphQL queries

import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { GraphQLClient } from '$lib/server/graphql-client';
import { ensureBackendReady } from '$lib/server/backend-init';
import { PermissionChecks } from '$lib/server/rbac-utils';
import type { TaskPriority, TaskStatus } from '$lib/graphql/types';

export const load: PageServerLoad = async ({ locals, url, cookies }) => {
	// Check authentication and permissions
	if (!locals.user) {
		redirect(303, `/login?redirectTo=${url.pathname}`);
	}

	PermissionChecks.tasksRead({ locals, url, cookies } as any);

	try {
		// Ensure backend is ready before proceeding
		await ensureBackendReady();

		// Create GraphQL client with authentication
		const graphqlClient = GraphQLClient.fromCookies(cookies);

		// Get query parameters for filtering
		const departmentId = url.searchParams.get('department');
		const statusFilter = url.searchParams.get('status') as TaskStatus | null;
		const priorityFilter = url.searchParams.get('priority') as TaskPriority | null;
		const sortBy = url.searchParams.get('sort') || 'priority';
		const page = parseInt(url.searchParams.get('page') || '1');
		const limit = parseInt(url.searchParams.get('limit') || '50');

		// If no department selected and user manages only one department, auto-select it
		let selectedDepartmentId = departmentId;
		if (!selectedDepartmentId && locals.user.department_id) {
			selectedDepartmentId = locals.user.department_id;
		}

		// Check if user has broad scope permissions (can view all departments)
		const userPermissions = locals.permissions || [];
		const isAdmin =
			userPermissions.includes('*') ||
			userPermissions.includes('*:*') ||
			userPermissions.includes('tasks:read:all');

		if (!selectedDepartmentId && !isAdmin) {
			error(400, {
				message:
					'No department selected. Please select a department from the dropdown or ensure your profile has a department assigned.'
			});
		}

		// NOTE: Using Rust GraphQL schema - fetch all and filter client-side
		let tasks: any[] = [];
		let allTasks: any[] = [];

		if (selectedDepartmentId) {
			// Fetch tasks for department
			const tasksQuery = `
				query GetDepartmentTasks($limit: Int!) {
					tasks(limit: $limit) {
						id
						title
						description
						status
						priority
						dueDate
						assigneeId
						departmentId
						creatorId
						createdAt
						updatedAt
						assignee {
							id
							displayName
							email
						}
						creator {
							id
							displayName
							email
						}
					}
				}
			`;

			const tasksData = await graphqlClient.query(tasksQuery, { limit: 1000 });
			let allTasksFromQuery = tasksData.data?.tasks || [];

			// Client-side filtering for department
			allTasksFromQuery = allTasksFromQuery.filter(
				(task: any) => task.departmentId === selectedDepartmentId
			);

			// Client-side filtering for status
			if (statusFilter) {
				allTasksFromQuery = allTasksFromQuery.filter((task: any) => task.status === statusFilter);
			}

			// Client-side filtering for priority
			if (priorityFilter) {
				allTasksFromQuery = allTasksFromQuery.filter(
					(task: any) => task.priority === priorityFilter
				);
			}

			// Client-side sorting (since Rust schema doesn't support orderBy)
			const sortFunctions: Record<string, (a: any, b: any) => number> = {
				priority: (a, b) => {
					const priorityOrder: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
					return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
				},
				dueDate: (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
				created: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
				status: (a, b) => a.status.localeCompare(b.status)
			};

			const sortFn = sortFunctions[sortBy] || sortFunctions.priority;
			allTasksFromQuery.sort(sortFn);

			// Store all filtered tasks for statistics
			allTasks = allTasksFromQuery;

			// Paginate client-side
			const offset = (page - 1) * limit;
			tasks = allTasksFromQuery.slice(offset, offset + limit);
		}

		// Get user's managed departments (for department selector)
		let managedDepartments: Array<{ id: string; name: string }> = [];

		if (isAdmin) {
			// Admins can see all departments - fetch from database
			// NOTE: Using Rust GraphQL schema - fetch and sort client-side
			try {
				const departmentsQuery = `
					query GetAllDepartments($limit: Int!) {
						departments(limit: $limit) {
							id
							name
						}
					}
				`;
				const deptResult = await graphqlClient.query(departmentsQuery, { limit: 100 });

				if (deptResult.data?.departments) {
					// Client-side sorting by name (Rust schema doesn't support orderBy)
					managedDepartments = deptResult.data.departments.sort((a: any, b: any) =>
						a.name.localeCompare(b.name)
					);
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

		// Calculate pagination info
		const totalCount = allTasks.length;
		const hasNextPage = page * limit < totalCount;

		return {
			tasks,
			allTasks,
			totalCount,
			hasNextPage,
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
			redirect(303, `/login?redirectTo=${url.pathname}`);
		}

		// If it's already a SvelteKit error, rethrow it
		if (err.status) {
			throw err;
		}

		error(500, {
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
