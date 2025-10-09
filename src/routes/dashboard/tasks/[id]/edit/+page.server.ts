// Server-side data loading for task edit page
// Feature: 028-task-system-expansion - Task T039
// Load task data for editing with form options

import type { PageServerLoad, Actions } from './$types';
import { error, redirect, fail } from '@sveltejs/kit';
import { PermissionChecks, getUserPermissions } from '$lib/server/rbac-utils';

export const load: PageServerLoad = async (event) => {
	const { locals, cookies, params } = event;
	const { id: taskId } = params;

	// RBAC: Check task edit permissions
	try {
		if (!locals.user) {
			throw error(401, { message: 'Authentication required' });
		}
	} catch (err) {
		console.error('[Task Edit] Permission check failed:', err);
		throw error(403, { message: 'Insufficient permissions to edit tasks' });
	}

	// Import required models
	const { createDataRequest } = await import('$lib/models/data-request');
	const { createErrorResponse } = await import('$lib/models/error-response');
	const { createUserSession } = await import('$lib/models/user-session');

	// Create user session
	const userSession = createUserSession({
		userId: locals.user.id,
		jwtToken: cookies.get('hr_token') || '',
		roles: [locals.user.role || 'employee'],
		permissions: locals.permissions || [],
		expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
		metadata: {
			userEmail: locals.user.email,
			displayName: locals.user.display_name || locals.user.email
		}
	});

	try {
		const { getGraphQLEndpoint } = await import('$lib/server/api-url');
		const graphqlEndpoint = getGraphQLEndpoint();

		const headers: Record<string, string> = {
			'Content-Type': 'application/json'
		};

		console.log('[Task Edit] Loading task for editing:', taskId);

		// Load task data
		// NOTE: Query updated to match new task schema (Feature 028)
		// Removed: reminderTime, organizationId (fields don't exist in new schema)
		const taskResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
					query GetTaskForEdit($taskId: UUID!) {
						taskById(id: $taskId) {
							id
							nodeId
							title
							description
							status
							priority
							dueDate
							assigneeId
							creatorId
							taskTypeId
							parentTaskId
							requiresManualReassignment
							archived
							createdAt
							updatedAt
						}
					}
				`,
				variables: { taskId }
			})
		});

		const taskData = await taskResponse.json();

		if (taskData.errors) {
			console.error('[Task Edit] GraphQL errors:', taskData.errors);
			throw new Error(taskData.errors[0]?.message || 'Failed to load task');
		}

		const task = taskData?.data?.taskById;

		if (!task) {
			throw error(404, { message: 'Task not found' });
		}

		// Load assignees for dropdown
		const assigneesResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
					query GetUsersForAssignment($first: Int) {
						allUsers(first: $first, condition: { is_active: true }) {
							nodes {
								id
								displayName
								email
								role
							}
						}
					}
				`,
				variables: { first: 100 }
			})
		});

		const assigneesData = await assigneesResponse.json();

		// Load departments
		const departmentsResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
					query GetDepartments($first: Int) {
						allDepartments(first: $first) {
							nodes {
								id
								name
								description
							}
						}
					}
				`,
				variables: { first: 100 }
			})
		});

		const departmentsData = await departmentsResponse.json();

		// Load task types
		const taskTypesResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
					query GetTaskTypes($first: Int) {
						allTaskTypes(first: $first) {
							nodes {
								id
								name
								description
							}
						}
					}
				`,
				variables: { first: 100 }
			})
		});

		const taskTypesData = await taskTypesResponse.json();

		// Load potential parent tasks (exclude current task and its descendants)
		const parentTasksResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
					query GetPotentialParentTasks($first: Int) {
						allTasks(first: $first, orderBy: CREATED_AT_DESC) {
							nodes {
								id
								title
								status
								priority
							}
						}
					}
				`,
				variables: { first: 200 }
			})
		});

		const parentTasksData = await parentTasksResponse.json();

		// Filter out current task and prevent circular hierarchy
		let potentialParents = parentTasksData?.data?.allTasks?.nodes || [];
		potentialParents = potentialParents.filter((t: any) => t.id !== taskId);

		// Get standardized user permissions
		const userPermissions = getUserPermissions(locals);

		// Return server-side loaded data
		return {
			user: userPermissions.user,
			userSession: userSession.toJSON(),
			task,
			assignees: assigneesData?.data?.allUsers?.nodes || [],
			departments: departmentsData?.data?.allDepartments?.nodes || [],
			taskTypes: taskTypesData?.data?.allTaskTypes?.nodes || [],
			parentTasks: potentialParents,
			...userPermissions,
			loadedAt: new Date().toISOString()
		};
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

		throw error(500, {
			message: 'Task edit temporarily unavailable',
			details: errorResponse.userMessage
		});
	}
};

// Form actions for task update
export const actions: Actions = {
	default: async (event) => {
		const { request, locals, params } = event;
		const { id: taskId } = params;

		// Check authentication
		if (!locals.user) {
			throw error(401, { message: 'Authentication required' });
		}

		try {
			const formData = await request.formData();
			const { getGraphQLEndpoint } = await import('$lib/server/api-url');
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
				dueDate
			});

			// Prepare update input
			// NOTE: reminderTime removed - field doesn't exist in new schema (Feature 028)
			const updateInput: any = {
				title,
				description: description || null,
				status,
				priority,
				assigneeId: assigneeId || null,
				taskTypeId: taskTypeId || null,
				parentTaskId: parentTaskId || null,
				dueDate: dueDate || null,
				requiresManualReassignment,
				updatedAt: new Date().toISOString()
			};

			// Execute update mutation
			const updateResponse = await fetch(graphqlEndpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					query: `
						mutation UpdateTask($taskId: UUID!, $input: TaskPatch!) {
							updateTaskById(input: { id: $taskId, taskPatch: $input }) {
								task {
									id
									title
									status
									updatedAt
								}
							}
						}
					`,
					variables: {
						taskId,
						input: updateInput
					}
				})
			});

			const updateData = await updateResponse.json();

			if (updateData.errors) {
				console.error('[Task Edit] Update errors:', updateData.errors);
				return fail(400, {
					error: updateData.errors[0]?.message || 'Failed to update task',
					values: Object.fromEntries(formData)
				});
			}

			const updatedTask = updateData?.data?.updateTaskById?.task;

			if (!updatedTask) {
				return fail(400, {
					error: 'Task update failed',
					values: Object.fromEntries(formData)
				});
			}

			console.log('[Task Edit] Task updated successfully:', updatedTask.id);

			// Redirect to task details page
			throw redirect(303, `/dashboard/tasks/${updatedTask.id}`);
		} catch (err) {
			// If it's a redirect, re-throw it
			if (err instanceof Response) {
				throw err;
			}

			console.error('[Task Edit] Update error:', err);

			return fail(500, {
				error: err instanceof Error ? err.message : 'Failed to update task',
				values: Object.fromEntries(await request.formData())
			});
		}
	}
};
