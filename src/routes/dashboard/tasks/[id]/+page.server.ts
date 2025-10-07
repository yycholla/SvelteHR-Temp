// Task Detail Page Server-Side Data Loading
// Feature: 019-we-need-to - Task T034
// Purpose: Load single task details with assignment and activity history

import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { TasksOperations } from '$lib/graphql/tasks-operations';
import { createUrqlClient } from '$lib/graphql/client';

export const load: PageServerLoad = async ({ params, locals, url, cookies }) => {
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

	try {
		// Initialize GraphQL client and operations
		const urqlClient = createUrqlClient(undefined, token);
		const tasksOps = new TasksOperations(urqlClient);

		// Fetch task details
		const task = await tasksOps.getTaskById({
			taskId: params.id,
			userCredentials
		});

		if (!task) {
			throw error(404, {
				message: 'Task not found or you do not have permission to view it.'
			});
		}

		// Determine if user is the assignee
		const isAssignee = task.assigneeId === locals.user.id;

		// Determine if user is in the assigned department
		const isInAssignedDepartment =
			task.assignedToDepartmentId && task.assignedToDepartmentId === locals.user.department_id;

		// Check if user can manage task (assignee, department manager, or admin)
		const roleLevel = getRoleLevel(locals.user.role);
		const canManageTask =
			isAssignee ||
			isInAssignedDepartment ||
			roleLevel >= 80 || // HR Manager or Admin
			(roleLevel >= 60 && isInAssignedDepartment); // Manager in same department

		// Check if task is overdue
		const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';

		// Check if task is due soon (within 3 days)
		const isDueSoon =
			task.dueDate &&
			new Date(task.dueDate) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) &&
			task.status !== 'completed';

		return {
			task,
			isAssignee,
			isInAssignedDepartment,
			canManageTask,
			isOverdue,
			isDueSoon,
			user: locals.user
		};
	} catch (err: any) {
		console.error('Error loading task details:', err);

		// Handle specific error cases
		if (err.message?.includes('unauthorized') || err.message?.includes('authentication')) {
			throw redirect(303, `/login?redirectTo=${url.pathname}`);
		}

		// If it's already a SvelteKit error, rethrow it
		if (err.status) {
			throw err;
		}

		throw error(500, {
			message: 'Failed to load task details. Please try again later.'
		});
	}
};

// Helper function to get role level for authorization
function getRoleLevel(role: string | undefined): number {
	const roleLevels: Record<string, number> = {
		super_admin: 200, // Highest level - system administrator
		admin: 100,
		hr_manager: 80,
		manager: 60,
		employee: 20
	};

	return roleLevels[role?.toLowerCase() || 'employee'] || 20;
}
