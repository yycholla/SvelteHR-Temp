// Server-side data loading for task edit page
// Feature: 028-task-system-expansion - Task T039
// Load task data for editing with form options

import type { Actions, PageServerLoad } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { logger } from '$lib/utils/logger';
import { RBACDataLoader } from '$lib/server/route-loaders';
import { requireAuth, AccessTier } from '$lib/server/rbac-utils';
import { gql } from '@urql/svelte';

export const load: PageServerLoad = async (event) => {
	// Initialize RBAC loader with required permissions
	const loader = new RBACDataLoader(event, [
		'tasks:read',
		'tasks:read:self',
		'tasks:read:team',
		'tasks:read:all'
	]);

	return loader.loadWithClient(async (client) => {
		const { params, locals } = event;
		const { id: taskId } = params;

		// Assert user exists for TS
		if (!locals.user) throw error(401, 'Unauthorized');

		// Import user session model only if explicitly needed by the page component
		// RBACDataLoader provides basic user info, but let's keep compatibility
		const { createUserSession } = await import('$lib/models/user-session');
		const userSession = createUserSession({
			userId: locals.user.id,
			roles: [locals.user.role || 'employee'],
			permissions: locals.permissions || [],
			expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
			metadata: {
				userEmail: locals.user.email,
				displayName: locals.user.display_name || locals.user.email
			}
		});

		try {
			logger.info('[Task Edit] Loading task for editing', { taskId });

			// Define queries
			const GET_TASK = gql`
				query GetTaskForEdit($taskId: UUID!) {
					task(id: $taskId) {
						id
						title
						description
						status
						priority
						dueDate
						requiresManualReassignment
						archived
						createdAt
						updatedAt
						assignee {
							id
							displayName
							email
						}
						taskType {
							id
							name
							description
							defaultPriority
							colorCode
							isActive
						}
						parentTask {
							id
							title
						}
					}
				}
			`;

			const GET_ASSIGNEES = gql`
				query GetUsersForAssignment($limit: Int!) {
					users(limit: $limit) {
						id
						displayName
						email
						roles {
							id
							name
						}
					}
				}
			`;

			const GET_DEPARTMENTS = gql`
				query GetDepartments($limit: Int) {
					departments(limit: $limit) {
						items {
							id
							name
							description
						}
					}
				}
			`;

			const GET_TASK_TYPES = gql`
				query GetTaskTypes($isActive: Boolean) {
					taskTypes(isActive: $isActive) {
						id
						name
						description
						defaultPriority
						colorCode
						isActive
					}
				}
			`;

			const GET_PARENT_TASKS = gql`
				query GetPotentialParentTasks($limit: Int!, $offset: Int!) {
					tasks(limit: $limit, offset: $offset) {
						id
						title
						status
						priority
					}
				}
			`;

			// Execute queries in parallel
			const [taskResult, assigneesResult, departmentsResult, taskTypesResult, parentTasksResult] =
				await Promise.all([
					client.query(GET_TASK, { taskId }),
					client.query(GET_ASSIGNEES, { limit: 100 }),
					client.query(GET_DEPARTMENTS, { limit: 100 }),
					client.query(GET_TASK_TYPES, { isActive: true }),
					client.query(GET_PARENT_TASKS, { limit: 200, offset: 0 })
				]);

			const task = taskResult?.task;

			if (!task) {
				throw error(404, 'Task not found');
			}

			// Flatten nested GraphQL structure to match form expectations
			const flattenedTask = {
				...task,
				assigneeId: task.assignee?.id || null,
				taskTypeId: task.taskType?.id || null,
				parentTaskId: task.parentTask?.id || null
			};

			// Filter out current task from potential parents to prevent circular hierarchy
			let potentialParents = parentTasksResult?.tasks || [];
			potentialParents = potentialParents.filter((t: any) => t.id !== taskId);

			// Return data
			return {
				userSession: userSession.toJSON(),
				task: flattenedTask,
				assignees: assigneesResult?.users || [],
				departments: departmentsResult?.departments?.items || [],
				taskTypes: taskTypesResult?.taskTypes || [],
				parentTasks: potentialParents,
				// Spread permissions from loader
				...loader['permissions']
			};
		} catch (err) {
			logger.error('[Task Edit Load Error]', err as Error);
			// Re-throw SvelteKit errors
			if (err && typeof err === 'object' && 'status' in err) {
				throw err;
			}
			throw error(500, 'Unable to load task for editing');
		}
	});
};

// Form actions for task update
export const actions: Actions = {
	default: async (event) => {
		const { request, params, locals } = event;
		const { id: taskId } = params;

		// Check permissions
		if (!locals.user) throw error(401, 'Unauthorized');

		requireAuth(event, { minTier: AccessTier.SELF });

		const { UnifiedGraphQLClient } = await import('$lib/server/graphql/unified-client');
		const client = new UnifiedGraphQLClient(event);

		// Declare formDataEntries outside try block for catch block access
		let formDataEntries: Record<string, any> = {};

		try {
			const formData = await request.formData();
			formDataEntries = Object.fromEntries(formData);

			// Extract form data
			const title = formData.get('title') as string;
			const description = formData.get('description') as string | null;
			const status = formData.get('status') as string;
			const priority = formData.get('priority') as string;
			const assigneeIdRaw = formData.get('assigneeId') as string | null;
			const taskTypeId = formData.get('taskTypeId') as string | null;
			const parentTaskId = formData.get('parentTaskId') as string | null;
			const dueDate = formData.get('dueDate') as string | null;
			const requiresManualReassignment = formData.get('requiresManualReassignment') === 'true';

			// Handle user: or dept: prefix in assigneeId
			let assigneeId = assigneeIdRaw;
			if (assigneeIdRaw) {
				if (assigneeIdRaw.startsWith('user:')) {
					assigneeId = assigneeIdRaw.replace('user:', '');
				} else if (assigneeIdRaw.startsWith('dept:')) {
					assigneeId = assigneeIdRaw.replace('dept:', '');
				}
			}

			logger.info('[Task Edit] Updating task', { taskId, title });

			// Prepare update input
			const updateInput: Record<string, any> = {
				title,
				status,
				priority,
				requiresManualReassignment
			};

			if (description?.trim()) updateInput.description = description;
			if (assigneeId?.trim()) updateInput.assigneeId = assigneeId;
			if (taskTypeId?.trim()) updateInput.taskTypeId = taskTypeId;
			if (parentTaskId?.trim()) updateInput.parentTaskId = parentTaskId;
			if (dueDate?.trim()) updateInput.dueDate = `${dueDate}T23:59:59Z`;

			const UPDATE_TASK = gql`
				mutation UpdateTask($id: UUID!, $input: UpdateTaskInput!) {
					updateTask(id: $id, input: $input) {
						id
						title
						status
						priority
						updatedAt
					}
				}
			`;

			await client.mutate(UPDATE_TASK, {
				id: taskId,
				input: updateInput
			});

			logger.info('[Task Edit] Task updated successfully', { taskId });

			throw redirect(303, `/dashboard/tasks/${taskId}`);
		} catch (err) {
			if (err && typeof err === 'object' && 'status' in err && (err as any).status === 303) {
				throw err;
			}

			logger.error('[Task Edit] Update error', err as Error);

			return fail(500, {
				error: err instanceof Error ? err.message : 'Failed to update task',
				values: formDataEntries
			});
		}
	}
};
