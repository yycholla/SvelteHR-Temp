/**
 * Task-specific RBAC Permission Helpers
 * Feature: 028-task-system-expansion
 *
 * Provides task-specific permission checking for:
 * - Task ownership (creator can manage their tasks)
 * - Task assignment (assignee can view/update assigned tasks)
 * - Department-scoped access (managers can see team tasks)
 * - Hierarchy-based access (parent task access grants child access)
 * - Admin-level access (full task management)
 */

import { error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { getRolePrecedence, hasPermission, hasRole } from '$lib/server/rbac-utils';
import type { TaskPriority, TaskStatus } from '$lib/types/task';

/**
 * Task permission configuration
 */
export interface TaskPermissionConfig {
	taskId?: string;
	assigneeId?: string;
	creatorId?: string;
	parentTaskId?: string;
	requireOwnership?: boolean; // User must be creator or assignee
	requireCreator?: boolean; // User must be creator
	requireAssignee?: boolean; // User must be assignee
	allowTeamAccess?: boolean; // Managers can access team tasks
}

/**
 * Check if user can view a specific task
 *
 * Access rules:
 * - Admin: All tasks
 * - Creator: Tasks they created
 * - Assignee: Tasks assigned to them
 * - Manager: Tasks assigned to their direct reports
 * - Employee: Only tasks they created or are assigned to
 */
export async function canViewTask(
	userId: string,
	taskCreatorId: string,
	taskAssigneeId: string,
	userRoles: string[],
	userPermissions: string[]
): Promise<boolean> {
	// Admin has full access
	if (
		userPermissions.includes('*') ||
		userPermissions.includes('*:*') ||
		userPermissions.includes('tasks:read')
	) {
		const effectiveRole = getRolePrecedence(userRoles);
		if (effectiveRole === 'admin' || effectiveRole === 'super_admin') {
			return true;
		}
	}

	// User is the creator
	if (userId === taskCreatorId) {
		return true;
	}

	// User is the assignee
	if (userId === taskAssigneeId) {
		return true;
	}

	// Manager can view tasks assigned to their direct reports
	const effectiveRole = getRolePrecedence(userRoles);
	if (effectiveRole === 'manager') {
		const isDirectReport = await isUserDirectReport(userId, taskAssigneeId);
		if (isDirectReport) {
			return true;
		}
	}

	return false;
}

/**
 * Check if user can edit a specific task
 *
 * Edit rules:
 * - Admin: All tasks
 * - Creator: Tasks they created
 * - Assignee: Can update status and add comments
 * - Manager: Tasks assigned to their direct reports
 */
export async function canEditTask(
	userId: string,
	taskCreatorId: string,
	taskAssigneeId: string,
	userRoles: string[],
	userPermissions: string[]
): Promise<boolean> {
	// Admin has full access
	if (
		userPermissions.includes('*') ||
		userPermissions.includes('*:*') ||
		userPermissions.includes('tasks:write')
	) {
		const effectiveRole = getRolePrecedence(userRoles);
		if (effectiveRole === 'admin' || effectiveRole === 'super_admin') {
			return true;
		}
	}

	// User is the creator - full edit access
	if (userId === taskCreatorId) {
		return true;
	}

	// User is the assignee - can update status and comments
	if (userId === taskAssigneeId) {
		return true;
	}

	// Manager can edit tasks assigned to their direct reports
	const effectiveRole = getRolePrecedence(userRoles);
	if (effectiveRole === 'manager') {
		const isDirectReport = await isUserDirectReport(userId, taskAssigneeId);
		if (isDirectReport) {
			return true;
		}
	}

	return false;
}

/**
 * Check if user can delete/archive a specific task
 *
 * Delete rules:
 * - Admin: All tasks
 * - Creator: Tasks they created (if no subtasks)
 * - Manager: Cannot delete unless they are creator
 */
export async function canDeleteTask(
	userId: string,
	taskCreatorId: string,
	userRoles: string[],
	userPermissions: string[]
): Promise<boolean> {
	// Admin has full access
	if (
		userPermissions.includes('*') ||
		userPermissions.includes('*:*') ||
		userPermissions.includes('tasks:delete')
	) {
		const effectiveRole = getRolePrecedence(userRoles);
		if (effectiveRole === 'admin' || effectiveRole === 'super_admin') {
			return true;
		}
	}

	// User is the creator
	if (userId === taskCreatorId) {
		return true;
	}

	return false;
}

/**
 * Check if user can reassign a task to another user
 *
 * Reassignment rules:
 * - Admin: Can reassign any task
 * - Creator: Can reassign tasks they created
 * - Manager: Can reassign tasks within their department
 */
export async function canReassignTask(
	userId: string,
	taskCreatorId: string,
	taskAssigneeId: string,
	newAssigneeId: string,
	userRoles: string[],
	userPermissions: string[]
): Promise<boolean> {
	// Admin has full access
	if (
		userPermissions.includes('*') ||
		userPermissions.includes('*:*') ||
		userPermissions.includes('tasks:reassign')
	) {
		const effectiveRole = getRolePrecedence(userRoles);
		if (effectiveRole === 'admin' || effectiveRole === 'super_admin') {
			return true;
		}
	}

	// User is the creator
	if (userId === taskCreatorId) {
		return true;
	}

	// Manager can reassign tasks within their department
	const effectiveRole = getRolePrecedence(userRoles);
	if (effectiveRole === 'manager') {
		// Check if both current assignee and new assignee are direct reports
		const currentIsDirectReport = await isUserDirectReport(userId, taskAssigneeId);
		const newIsDirectReport = await isUserDirectReport(userId, newAssigneeId);

		if (currentIsDirectReport && newIsDirectReport) {
			return true;
		}
	}

	return false;
}

/**
 * Check if user can create tasks
 *
 * Creation rules:
 * - Admin: Can create any task
 * - Manager: Can create tasks for their department
 * - Employee: Can create tasks (must be assigned to self initially)
 */
export function canCreateTask(userRoles: string[], userPermissions: string[]): boolean {
	// Admin has full access
	if (
		userPermissions.includes('*') ||
		userPermissions.includes('*:*') ||
		userPermissions.includes('tasks:create')
	) {
		return true;
	}

	// All authenticated users can create tasks
	// RLS policies will enforce proper scoping
	return true;
}

/**
 * Check if a user is a direct report of a manager
 */
async function isUserDirectReport(managerId: string, employeeId: string): Promise<boolean> {
	try {
		const { getGraphQLEndpoint } = await import('$lib/server/api-url');
		const graphqlEndpoint = getGraphQLEndpoint();

		const response = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: `
					query CheckDirectReport($managerId: UUID!, $employeeId: UUID!) {
						managerUser: userById(id: $managerId) {
							id
							departmentByDepartmentId {
								id
								managerId
								usersByDepartmentId {
									nodes {
										id
									}
								}
							}
						}
						employeeUser: userById(id: $employeeId) {
							id
							departmentId
						}
					}
				`,
				variables: { managerId, employeeId }
			})
		});

		const data = await response.json();
		const managerDept = data?.data?.managerUser?.departmentByDepartmentId;
		const employeeDeptId = data?.data?.employeeUser?.departmentId;

		// Check if manager is the department manager and employee is in that department
		if (managerDept?.managerId === managerId && managerDept?.id === employeeDeptId) {
			return true;
		}

		return false;
	} catch (error) {
		console.error('[Task Permissions] Error checking direct report:', error);
		return false;
	}
}

/**
 * Build task filter based on user role and permissions
 *
 * Returns a PostGraphile condition object for filtering tasks
 */
export function buildTaskFilterForUser(
	userId: string,
	userRoles: string[],
	userPermissions: string[],
	additionalFilters?: {
		status?: TaskStatus;
		priority?: TaskPriority;
		archived?: boolean;
		parentTaskId?: string | null;
	}
): any {
	const effectiveRole = getRolePrecedence(userRoles);
	const condition: any = {};

	// Apply additional filters first
	if (additionalFilters) {
		if (additionalFilters.status) {
			condition.status = { equalTo: additionalFilters.status };
		}
		if (additionalFilters.priority) {
			condition.priority = { equalTo: additionalFilters.priority };
		}
		if (additionalFilters.archived !== undefined) {
			condition.archived = { equalTo: additionalFilters.archived };
		}
		if (additionalFilters.parentTaskId !== undefined) {
			if (additionalFilters.parentTaskId === null) {
				condition.parentTaskId = { isNull: true };
			} else {
				condition.parentTaskId = { equalTo: additionalFilters.parentTaskId };
			}
		}
	}

	// Admin sees all tasks
	if (effectiveRole === 'admin' || effectiveRole === 'super_admin') {
		return condition;
	}

	// Manager sees own tasks + direct reports' tasks (handled by RLS)
	// Employee sees only own tasks (handled by RLS)
	// RLS policies enforce proper scoping, so we don't need to add user-specific filters here

	return condition;
}

/**
 * Task permission guard for server-side routes
 */
export async function requireTaskPermission(
	event: RequestEvent,
	config: TaskPermissionConfig = {}
): Promise<void> {
	const { locals } = event;

	if (!locals.user) {
		error(401, 'Authentication required');
	}

	const userId = locals.user.id;
	const userRoles = locals.roles || [];
	const userPermissions = locals.permissions || [];

	// If specific task access is being checked
	if (config.taskId) {
		// Fetch task details to check ownership/assignment
		const task = await getTaskById(config.taskId);

		if (!task) {
			error(404, 'Task not found');
		}

		// Check if user has permission to access this task
		const canAccess = await canViewTask(
			userId,
			task.creatorId,
			task.assigneeId,
			userRoles,
			userPermissions
		);

		if (!canAccess) {
			error(403, 'You do not have permission to access this task');
		}
	}

	// Check creator-only operations
	if (config.requireCreator && config.creatorId) {
		if (userId !== config.creatorId) {
			const effectiveRole = getRolePrecedence(userRoles);
			if (effectiveRole !== 'admin' && effectiveRole !== 'super_admin') {
				error(403, 'Only the task creator can perform this action');
			}
		}
	}

	// Check assignee-only operations
	if (config.requireAssignee && config.assigneeId) {
		if (userId !== config.assigneeId) {
			const effectiveRole = getRolePrecedence(userRoles);
			if (effectiveRole !== 'admin' && effectiveRole !== 'super_admin') {
				error(403, 'Only the task assignee can perform this action');
			}
		}
	}

	// Check ownership (creator OR assignee)
	if (config.requireOwnership && config.creatorId && config.assigneeId) {
		if (userId !== config.creatorId && userId !== config.assigneeId) {
			const effectiveRole = getRolePrecedence(userRoles);
			if (effectiveRole !== 'admin' && effectiveRole !== 'super_admin') {
				error(403, 'Only the task creator or assignee can perform this action');
			}
		}
	}
}

/**
 * Get task by ID (helper function)
 */
async function getTaskById(taskId: string): Promise<{
	id: string;
	creatorId: string;
	assigneeId: string;
	parentTaskId?: string;
} | null> {
	try {
		const { getGraphQLEndpoint } = await import('$lib/server/api-url');
		const graphqlEndpoint = getGraphQLEndpoint();

		const response = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: `
					query GetTaskPermissionInfo($taskId: UUID!) {
						taskById(id: $taskId) {
							id
							creatorId
							assigneeId
							parentTaskId
						}
					}
				`,
				variables: { taskId }
			})
		});

		const data = await response.json();
		return data?.data?.taskById || null;
	} catch (error) {
		console.error('[Task Permissions] Error fetching task:', error);
		return null;
	}
}

/**
 * Pre-configured permission checks for common task scenarios
 */
export const TaskPermissionChecks = {
	// View task details
	viewTask: async (event: RequestEvent, taskId: string) => {
		await requireTaskPermission(event, { taskId });
	},

	// Create new task
	createTask: (event: RequestEvent) => {
		if (!event.locals.user) {
			error(401, 'Authentication required');
		}
		if (!canCreateTask(event.locals.roles || [], event.locals.permissions || [])) {
			error(403, 'You do not have permission to create tasks');
		}
	},

	// Edit task (title, description, due date, etc.)
	editTask: async (event: RequestEvent, taskId: string) => {
		await requireTaskPermission(event, { taskId });
		// Additional edit permission check happens in the operation itself
	},

	// Delete/archive task
	deleteTask: async (event: RequestEvent, taskId: string) => {
		await requireTaskPermission(event, { taskId });
		// Additional delete permission check happens in the operation itself
	},

	// Reassign task to another user
	reassignTask: async (event: RequestEvent, taskId: string) => {
		await requireTaskPermission(event, { taskId });
		// Additional reassignment permission check happens in the operation itself
	},

	// Update task status (assignee can update)
	updateStatus: async (event: RequestEvent, taskId: string) => {
		await requireTaskPermission(event, { taskId, requireOwnership: true });
	},

	// Add task dependency
	addDependency: async (event: RequestEvent, taskId: string) => {
		await requireTaskPermission(event, { taskId, requireCreator: true });
	},

	// Add linked resource
	addLinkedResource: async (event: RequestEvent, taskId: string) => {
		await requireTaskPermission(event, { taskId, requireOwnership: true });
	}
};

/**
 * Get user's task permissions summary for UI components
 */
export function getTaskPermissionsSummary(
	userId: string,
	userRoles: string[],
	userPermissions: string[]
) {
	const effectiveRole = getRolePrecedence(userRoles);

	return {
		canCreateTasks: canCreateTask(userRoles, userPermissions),
		canViewAllTasks: effectiveRole === 'admin' || effectiveRole === 'super_admin',
		canViewTeamTasks:
			effectiveRole === 'manager' || effectiveRole === 'admin' || effectiveRole === 'super_admin',
		canReassignTasks:
			hasPermission(userPermissions, ['tasks:reassign']) || effectiveRole === 'manager',
		canDeleteTasks:
			hasPermission(userPermissions, ['tasks:delete']) || effectiveRole === 'admin',
		canManageTaskTypes: effectiveRole === 'admin' || effectiveRole === 'super_admin',
		effectiveRole
	};
}
