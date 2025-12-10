// Server-side data loading for task edit page
// Feature: 028-task-system-expansion - Task T039
// Load task data for editing with form options

import type { Actions, PageServerLoad } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { requireAuth, getUserPermissions } from '$lib/server/rbac-utils';

export const load: PageServerLoad = async (event) => {
	const { cookies, params } = event;
	const { id: taskId } = params;

	// Check authentication and permissions
	requireAuth(event, {
		requiredPermissions: ['tasks:read', 'tasks:read:self', 'tasks:read:team', 'tasks:read:all']
	});

	// After permission check, re-destructure locals with guaranteed user
	const { locals } = event;

	// Import required models
	const { createDataRequest } = await import('$lib/models/data-request');
	const { createErrorResponse } = await import('$lib/models/error-response');
	const { createUserSession } = await import('$lib/models/user-session');

	// Create user session
	const userSession = createUserSession({
		userId: locals.user.id,
		// jwtToken is optional for session-based authentication
		roles: [locals.user.role || 'employee'],
		permissions: locals.permissions || [],
		expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
		metadata: {
			userEmail: locals.user.email,
			displayName: locals.user.display_name || locals.user.email
		}
	});

	try {
		const { getGraphQLEndpoint, authenticatedGraphQLRequest } = await import('$lib/server/api-url');
		const graphqlEndpoint = getGraphQLEndpoint();

		// Get JWT token from cookies for Rust GraphQL server authentication

		// Headers for session-based authentication (cookies sent automatically)
		const headers: Record<string, string> = {
			'Content-Type': 'application/json'
		};

		console.log('[Task Edit] Loading task for editing:', taskId);

		// Load task data
		// NOTE: Using Rust GraphQL schema - singular query for ID lookup
		const taskResponse = await authenticatedGraphQLRequest(
			graphqlEndpoint,
			`
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
			`,
			{ taskId },
			event.request
		);

		const taskData = await taskResponse.json();

		if (taskData.errors) {
			console.error('[Task Edit] GraphQL errors:', taskData.errors);
			throw new Error(taskData.errors[0]?.message || 'Failed to load task');
		}

		const task = taskData?.data?.task || null;

		if (!task) {
			error(404, 'Task not found');
		}

		console.log('[Task Edit] Raw task data from GraphQL:', {
			taskId: task.id,
			title: task.title,
			assignee: task.assignee,
			taskType: task.taskType,
			parentTask: task.parentTask
		});

		// Flatten nested GraphQL structure to match form expectations
		// GraphQL returns: task.assignee.id, task.taskType.id, task.parentTask.id
		// Form expects: task.assigneeId, task.taskTypeId, task.parentTaskId
		const flattenedTask = {
			...task,
			assigneeId: task.assignee?.id || null,
			taskTypeId: task.taskType?.id || null,
			parentTaskId: task.parentTask?.id || null
		};

		// Load assignees for dropdown
		const assigneesResponse = await authenticatedGraphQLRequest(
			graphqlEndpoint,
			`
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
			`,
			{ limit: 100 },
			event.request
		);

		const assigneesData = await assigneesResponse.json();

		// Load departments
		const departmentsResponse = await authenticatedGraphQLRequest(
			graphqlEndpoint,
			`
				query GetDepartments($limit: Int) {
					departments(limit: $limit) {
						id
						name
						description
					}
				}
			`,
			{ limit: 100 },
			event.request
		);

		const departmentsData = await departmentsResponse.json();

		// Load task types
		const taskTypesResponse = await authenticatedGraphQLRequest(
			graphqlEndpoint,
			`
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
			`,
			{ isActive: true },
			event.request
		);

		const taskTypesData = await taskTypesResponse.json();
		console.log('[Task Edit] Task types loaded:', {
			count: taskTypesData?.data?.taskTypes?.length || 0,
			taskTypes: taskTypesData?.data?.taskTypes
		});

		// Load potential parent tasks (exclude current task and its descendants)
		const parentTasksResponse = await authenticatedGraphQLRequest(
			graphqlEndpoint,
			`
				query GetPotentialParentTasks($limit: Int!, $offset: Int!) {
					tasks(limit: $limit, offset: $offset) {
						id
						title
						status
						priority
					}
				}
			`,
			{ limit: 200, offset: 0 },
			event.request
		);

		const parentTasksData = await parentTasksResponse.json();

		// Filter out current task and prevent circular hierarchy
		let potentialParents = parentTasksData?.data?.tasks || [];
		potentialParents = potentialParents.filter((t: any) => t.id !== taskId);

		// Get standardized user permissions
		const userPermissions = getUserPermissions(locals);

		// Prepare return data
		const returnData = {
			userSession: userSession.toJSON(),
			task: flattenedTask, // Use flattened structure for form compatibility
			assignees: assigneesData?.data?.users || [],
			departments: departmentsData?.data?.departments || [],
			taskTypes: taskTypesData?.data?.taskTypes || [],
			parentTasks: potentialParents,
			// RBAC: Standardized permission checks (includes user property)
			...userPermissions,
			loadedAt: new Date().toISOString()
		};

		console.log('[Task Edit] Returning data to page:', {
			taskId: flattenedTask.id,
			assigneesCount: returnData.assignees.length,
			departmentsCount: returnData.departments.length,
			taskTypesCount: returnData.taskTypes.length,
			parentTasksCount: returnData.parentTasks.length,
			taskTypeId: flattenedTask.taskTypeId
		});

		// Return server-side loaded data
		return returnData;
	} catch (err) {
		console.error('[Task Edit Load Error]', err);

		const errorResponse = createErrorResponse(
			err instanceof Error ? err : new Error('Task edit load failed'),
			{
				type: 'DATA_LOAD_ERROR',
				userMessage: 'Unable to load task for editing. Please refresh the page or try again later.'
			}
		);

		console.error('[Task Edit Error Details]', {
			userId: locals.user?.id,
			taskId,
			error: errorResponse
		});

		error(500, 'Task edit temporarily unavailable');
	}
};

// Form actions for task update
export const actions: Actions = {
	default: async (event) => {
		const { request, params } = event;
		const { id: taskId } = params;

		// Check authentication and permissions
		requireAuth(event, {
			requiredPermissions: ['tasks:write', 'tasks:write:self', 'tasks:write:team', 'tasks:write:all']
		});

		// After permission check, re-destructure locals
		const { locals } = event;

		// Declare formDataEntries outside try block for catch block access
		let formDataEntries: Record<string, any> = {};

		try {
			const formData = await request.formData();
			formDataEntries = Object.fromEntries(formData);
			const { getGraphQLEndpoint, authenticatedGraphQLRequest } =
				await import('$lib/server/api-url');
			const graphqlEndpoint = getGraphQLEndpoint();

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
					// For now, just strip the prefix - department assignment logic can be handled later
					assigneeId = assigneeIdRaw.replace('dept:', '');
				}
			}

			console.log('[Task Edit] Updating task:', taskId, {
				title,
				status,
				priority,
				assigneeId,
				taskTypeId,
				parentTaskId,
				requiresManualReassignment,
				dueDate
			});

			// Prepare update input - all fields supported by UpdateTaskInput GraphQL type
			// Filter out empty strings and null values to avoid GraphQL parsing errors
			const updateInput: Record<string, any> = {
				title,
				status,
				priority,
				requiresManualReassignment
			};

			// Only include optional fields if they have valid values
			if (description && description.trim()) {
				updateInput.description = description;
			}
			if (assigneeId && assigneeId.trim()) {
				updateInput.assigneeId = assigneeId;
			}
			if (taskTypeId && taskTypeId.trim()) {
				updateInput.taskTypeId = taskTypeId;
			}
			if (parentTaskId && parentTaskId.trim()) {
				updateInput.parentTaskId = parentTaskId;
			}
			if (dueDate && dueDate.trim()) {
				// Convert date-only format (YYYY-MM-DD) to RFC3339 DateTime (YYYY-MM-DDTHH:MM:SSZ)
				// HTML date inputs return YYYY-MM-DD, but GraphQL expects full datetime
				// Use end of day (23:59:59) since this is a due date
				updateInput.dueDate = `${dueDate}T23:59:59Z`;
			}

			// Execute update mutation
			// Migration: ✅ Use idiomatic Rust pattern (direct id/input parameters, no nested wrapper)
			const updateResponse = await authenticatedGraphQLRequest(
				graphqlEndpoint,
				`
					mutation UpdateTask($id: UUID!, $input: UpdateTaskInput!) {
						updateTask(id: $id, input: $input) {
							id
							title
							status
							priority
							taskType {
								id
								name
							}
							assignee {
								id
								displayName
							}
							parentTask {
								id
								title
							}
							requiresManualReassignment
							updatedAt
						}
					}
				`,
				{
					id: taskId,
					input: updateInput
				},
				event.request
			);

			const updateData = await updateResponse.json();

			if (updateData.errors) {
				console.error('[Task Edit] Update errors:', updateData.errors);
				return fail(400, {
					error: updateData.errors[0]?.message || 'Failed to update task',
					values: formDataEntries
				});
			}

			const updatedTask = updateData?.data?.updateTask;

			if (!updatedTask) {
				return fail(400, {
					error: 'Task update failed',
					values: formDataEntries
				});
			}

			console.log('[Task Edit] Task updated successfully:', {
				id: updatedTask.id,
				title: updatedTask.title,
				status: updatedTask.status,
				priority: updatedTask.priority,
				taskType: updatedTask.taskType,
				assignee: updatedTask.assignee,
				parentTask: updatedTask.parentTask,
				requiresManualReassignment: updatedTask.requiresManualReassignment
			});

			// Redirect to task details page
			redirect(303, `/dashboard/tasks/${updatedTask.id}`);
		} catch (err) {
			// SvelteKit redirect() throws an error with status 300-399
			// Check if this is a redirect by looking for status and location properties
			const isRedirect = err && typeof err === 'object' && 'status' in err && 'location' in err;

			if (isRedirect) {
				// This is a successful redirect - re-throw without logging
				throw err;
			}

			// Log actual errors only (not redirects)
			console.error('[Task Edit] Update error:', err);

			return fail(500, {
				error: err instanceof Error ? err.message : 'Failed to update task',
				values: formDataEntries
			});
		}
	}
};
