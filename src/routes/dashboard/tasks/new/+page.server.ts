// Server-side data loading for new task creation page
// Feature: 028-task-system-expansion - Task T041
// Load form options for task creation

import type { PageServerLoad, Actions } from './$types';
import { error, redirect, fail } from '@sveltejs/kit';
import { PermissionChecks, getUserPermissions } from '$lib/server/rbac-utils';

export const load: PageServerLoad = async (event) => {
	const { locals, cookies, url } = event;

	// RBAC: Check task creation permissions
	try {
		if (!locals.user) {
			throw error(401, { message: 'Authentication required' });
		}
	} catch (err) {
		console.error('[Task Create] Permission check failed:', err);
		throw error(403, { message: 'Insufficient permissions to create tasks' });
	}

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
		const { getGraphQLEndpoint } = await import('$lib/server/api-url');
		const graphqlEndpoint = getGraphQLEndpoint();

		// Get JWT token from cookies for Rust GraphQL server authentication

		// Headers for session-based authentication (cookies sent automatically)
		const headers: Record<string, string> = {
			'Content-Type': 'application/json'
		};

		console.log('[Task Create] Loading form options, parentTaskId:', parentTaskId);

		// Load assignees
		const assigneesResponse = await authenticatedGraphQLRequest(
			graphqlEndpoint,
			`
				query GetUsersForAssignment($limit: Int!) {
					users(limit: $limit) {
						id
						displayName
						email
						role
						isActive
					}
				}
			`,
			{ limit: 100 },
			event.request
		);

		const assigneesData = await assigneesResponse.json();
		console.log('[Task Create] Assignees GraphQL response:', {
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
		console.log('[Task Create] Departments GraphQL response:', {
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
		console.log('[Task Create] Task types GraphQL response:', {
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

		console.log('[Task Create] Returning data:', {
			totalUsers: allUsers.length,
			activeUsers: assignees.length,
			assigneesCount: assignees.length,
			departmentsCount: departments.length,
			taskTypesCount: taskTypes.length,
			parentTasksCount: parentTasks.length
		});

		// Return server-side loaded data
		return {
			user: userPermissions.user,
			userSession: userSession.toJSON(),
			assignees,
			departments,
			taskTypes,
			parentTasks,
			parentTask,
			parentTaskId,
			...userPermissions,
			loadedAt: new Date().toISOString()
		};
	} catch (err) {
		console.error('[Task Create Load Error]', err);

		const errorResponse = createErrorResponse(
			err instanceof Error ? err : new Error('Task create load failed'),
			{
				type: 'DATA_LOAD_ERROR',
				userMessage:
					'Unable to load task creation form. Please refresh the page or try again later.'
			}
		);

		console.error('[Task Create Error Details]', {
			userId: locals.user?.id,
			error: errorResponse
		});

		throw error(500, {
			message: 'Task creation temporarily unavailable',
			details: errorResponse.userMessage
		});
	}
};

// Form actions for task creation
export const actions: Actions = {
	default: async (event) => {
		const { request, locals } = event;

		// Check authentication
		if (!locals.user) {
			throw error(401, { message: 'Authentication required' });
		}

		try {
			const formData = await request.formData();
			const formDataEntries = Object.fromEntries(formData);
			const { getGraphQLEndpoint, authenticatedGraphQLRequest } = await import(
				'$lib/server/api-url'
			);
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

			console.log('[Task Create] Creating new task:', {
				title,
				status,
				priority,
				assigneeId,
				dueDate,
				parentTaskId
			});

			// Prepare create input for Rust GraphQL schema
			const createInput: any = {
				title,
				description: description || undefined,
				status, // TaskStatus enum
				priority, // TaskPriority enum
				assigneeId: assigneeId || locals.user.id, // UUID - default to current user
				taskTypeId: taskTypeId || undefined, // UUID or undefined
				parentTaskId: parentTaskId || undefined, // UUID or undefined
				dueDate: dueDate || undefined, // ISO datetime string or undefined
				requiresManualReassignment
				// Note: reminderTime removed - not in CreateTaskInput schema
				// Note: organizationId, createdAt, updatedAt handled server-side
			};

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
				console.error('[Task Create] Create errors:', createData.errors);
				return fail(400, {
					error: createData.errors[0]?.message || 'Failed to create task',
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

			console.log('[Task Create] Task created successfully:', newTask.id);

			// Redirect to new task details page
			throw redirect(303, `/dashboard/tasks/${newTask.id}`);
		} catch (err) {
			// If it's a redirect, re-throw it
			if (err instanceof Response) {
				throw err;
			}

			console.error('[Task Create] Create error:', err);

			return fail(500, {
				error: err instanceof Error ? err.message : 'Failed to create task',
				values: formDataEntries
			});
		}
	}
};
