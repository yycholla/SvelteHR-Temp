// Server-side data loading for new task creation page
// Feature: 028-task-system-expansion - Task T041
// Load form options for task creation

import type { Actions, PageServerLoad } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { getUserPermissions, requireAuth } from '$lib/server/rbac-utils';
import { logger } from '$lib/utils/logger';

export const load: PageServerLoad = async (event) => {
	const { cookies, url } = event;

	// Check authentication and permissions
	requireAuth(event, {
		requiredPermissions: ['tasks:write', 'tasks:write:self', 'tasks:write:team', 'tasks:write:all']
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

	// Check for parent task ID in query params (for creating subtasks)
	const parentTaskId = url.searchParams.get('parent') || null;

	try {
		const { getGraphQLEndpoint, authenticatedGraphQLRequest } = await import('$lib/server/api-url');
		const graphqlEndpoint = getGraphQLEndpoint();

		// Get JWT token from cookies for Rust GraphQL server authentication

		// Headers for session-based authentication (cookies sent automatically)
		const headers: Record<string, string> = {
			'Content-Type': 'application/json'
		};

		logger.info('[Task Create] Loading form options', { parentTaskId });

		// Load assignees
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
						isActive
					}
				}
			`,
			{ limit: 100 },
			event.request
		);

		const assigneesData = await assigneesResponse.json();
		logger.info('[Task Create] Assignees GraphQL response:', {
			hasData: !!assigneesData.data,
			hasUsers: !!assigneesData.data?.users,
			usersLength: assigneesData.data?.users?.length || 0,
			errors: assigneesData.errors
		});

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
		logger.info('[Task Create] Departments GraphQL response:', {
			hasData: !!departmentsData.data,
			nodesLength: departmentsData.data?.departments?.length || 0,
			errors: departmentsData.errors
		});

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
		logger.info('[Task Create] Task types GraphQL response:', {
			hasData: !!taskTypesData.data,
			typesLength: taskTypesData.data?.taskTypes?.length || 0,
			errors: taskTypesData.errors
		});

		// Load potential parent tasks
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

		// Load parent task details if parentTaskId is provided
		let parentTask = null;
		if (parentTaskId) {
			const parentResponse = await authenticatedGraphQLRequest(
				graphqlEndpoint,
				`
					query GetParentTaskInfo($taskId: UUID!) {
						task(id: $taskId) {
							id
							title
							status
							priority
							assigneeId
							taskTypeId
							organizationId
						}
					}
				`,
				{ taskId: parentTaskId },
				event.request
			);

			const parentData = await parentResponse.json();
			parentTask = parentData?.data?.task || null;
		}

		// Get standardized user permissions
		const userPermissions = getUserPermissions(locals);

		// Extract and filter data
		const allUsers = assigneesData?.data?.users || [];
		// Filter to only active users client-side
		const assignees = allUsers.filter((user: any) => user.isActive === true);
		const departments = departmentsData?.data?.departments || [];
		const taskTypes = taskTypesData?.data?.taskTypes || [];
		const parentTasks = parentTasksData?.data?.tasks || [];

		logger.info('[Task Create] Returning data:', {
			totalUsers: allUsers.length,
			activeUsers: assignees.length,
			assigneesCount: assignees.length,
			departmentsCount: departments.length,
			taskTypesCount: taskTypes.length,
			parentTasksCount: parentTasks.length
		});

		// Return server-side loaded data
		return {
			userSession: userSession.toJSON(),
			assignees,
			departments,
			taskTypes,
			parentTasks,
			parentTask,
			parentTaskId,
			// RBAC: Standardized permission checks (includes user property)
			...userPermissions,
			loadedAt: new Date().toISOString()
		};
	} catch (err) {
		logger.error('[Task Create Load Error]', err as Error);

		const errorResponse = createErrorResponse(
			err instanceof Error ? err : new Error('Task create load failed'),
			{
				type: 'DATA_LOAD_ERROR',
				userMessage:
					'Unable to load task creation form. Please refresh the page or try again later.'
			}
		);

		logger.error('[Task Create Error Details]', undefined, {
			userId: locals.user?.id,
			error: errorResponse
		});

		error(500, 'Task creation temporarily unavailable');
	}
};

// Form actions for task creation
export const actions: Actions = {
	default: async (event) => {
		const { request } = event;

		// Check authentication and permissions
		requireAuth(event, {
			requiredPermissions: [
				'tasks:write',
				'tasks:write:self',
				'tasks:write:team',
				'tasks:write:all'
			]
		});

		// After permission check, re-destructure locals
		const { locals } = event;

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
			const status = (formData.get('status') as string) || 'Not Started';
			const priority = (formData.get('priority') as string) || 'Medium';
			const assigneeIdRaw = formData.get('assigneeId') as string | null;
			const taskTypeId = formData.get('taskTypeId') as string | null;
			const parentTaskId = formData.get('parentTaskId') as string | null;
			const dueDate = formData.get('dueDate') as string | null;
			const reminderTime = formData.get('reminderTime') as string | null;
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

			logger.info('[Task Create] Creating new task:', {
				title,
				status,
				priority,
				assigneeId,
				dueDate,
				parentTaskId
			});

			// Prepare create input for Rust GraphQL schema
			// Filter out empty strings and null values to avoid GraphQL parsing errors
			const createInput: Record<string, any> = {
				title,
				status, // TaskStatus enum
				priority, // TaskPriority enum
				assigneeId: assigneeId || locals.user.id, // UUID - default to current user
				requiresManualReassignment
			};

			// Only include optional fields if they have valid values
			if (description && description.trim()) {
				createInput.description = description;
			}
			if (taskTypeId && taskTypeId.trim()) {
				createInput.taskTypeId = taskTypeId;
			}
			if (parentTaskId && parentTaskId.trim()) {
				createInput.parentTaskId = parentTaskId;
			}
			if (dueDate && dueDate.trim()) {
				// Convert date-only format (YYYY-MM-DD) to RFC3339 DateTime (YYYY-MM-DDTHH:MM:SSZ)
				// HTML date inputs return YYYY-MM-DD, but GraphQL expects full datetime
				// Use end of day (23:59:59) since this is a due date
				createInput.dueDate = `${dueDate}T23:59:59Z`;
			}
			// Note: reminderTime removed - not in CreateTaskInput schema
			// Note: organizationId, createdAt, updatedAt handled server-side

			// Execute create mutation
			// Migration: ✅ Use Rust GraphQL schema (CreateTaskInput, direct return)
			const createResponse = await authenticatedGraphQLRequest(
				graphqlEndpoint,
				`
					mutation CreateTask($input: CreateTaskInput!) {
						createTask(input: $input) {
							id
							title
							status
							createdAt
						}
					}
				`,
				{ input: createInput },
				event.request
			);

			const createData = await createResponse.json();

			if (createData.errors) {
				const errorMsg = createData.errors[0]?.message || 'Failed to create task';
				logger.error('[Task Create] Create errors', new Error(errorMsg), {
					errors: createData.errors
				});
				return fail(400, {
					error: errorMsg,
					values: formDataEntries
				});
			}

			const newTask = createData?.data?.createTask;

			if (!newTask) {
				return fail(400, {
					error: 'Task creation failed',
					values: formDataEntries
				});
			}

			logger.info('[Task Create] Task created successfully', {
				taskId: newTask.id
			});

			// Redirect to new task details page
			redirect(303, `/dashboard/tasks/${newTask.id}`);
		} catch (err) {
			// If it's a redirect, re-throw it
			if (err instanceof Response) {
				throw err;
			}

			logger.error(
				'[Task Create] Create error',
				err instanceof Error ? err : new Error(String(err))
			);

			return fail(500, {
				error: err instanceof Error ? err.message : 'Failed to create task',
				values: formDataEntries
			});
		}
	}
};
