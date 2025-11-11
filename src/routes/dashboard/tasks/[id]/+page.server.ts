// Server-side data loading for task details page
// Feature: 028-task-system-expansion - Task T037
// Load single task with full relationships

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { PermissionChecks, getUserPermissions } from '$lib/server/rbac-utils';

export const load: PageServerLoad = async (event) => {
	const { locals, cookies, params } = event;
	const { id: taskId } = params;

	// Check authentication and permissions
	PermissionChecks.tasksRead(event);

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

	// Create data request
	const dataRequest = createDataRequest({
		operationName: 'GetTaskDetails',
		variables: { taskId },
		userCredentials: {
			userId: userSession.userId,
			userEmail: userSession.metadata.userEmail as string,
			roles: userSession.roles,
			permissions: userSession.permissions,
			// jwtToken omitted for session-based auth
			isAuthenticated: Boolean(userSession.isAuthenticated)
		},
		timeoutMs: 5000,
		retryAttempts: 0,
		maxRetries: 3
	});

	try {
		const { getGraphQLEndpoint, authenticatedGraphQLRequest } = await import('$lib/server/api-url');
		const graphqlEndpoint = getGraphQLEndpoint();

		console.log('[Task Details] Loading task:', taskId);

		// Load task with full relationships
		// NOTE: Using Rust GraphQL schema - singular query for ID lookup
		const taskResponse = await authenticatedGraphQLRequest(
			graphqlEndpoint,
			`
				query GetTaskDetails($taskId: UUID!) {
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
							roles {
								id
								name
							}
						}
						department {
							id
							name
							description
						}
						creator {
							id
							displayName
							email
							roles {
								id
								name
							}
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
							status
							priority
							dueDate
						}
						subtasks {
							id
							title
							description
							status
							priority
							dueDate
							assignee {
								id
								displayName
							}
							department {
								id
								name
							}
							createdAt
							updatedAt
						}
					}
				}
			`,
			{ taskId },
			event.request
		);

		const taskData = await taskResponse.json();
		console.log('[Task Details] Task response:', taskData);

		if (taskData.errors) {
			console.error('[Task Details] GraphQL errors:', taskData.errors);
			throw new Error(taskData.errors[0]?.message || 'Failed to load task');
		}

		const task = taskData?.data?.task || null;

		if (!task) {
			error(404, { message: 'Task not found' });
		}

		// Note: Audit trail functionality not available in current schema
		// Skipping audit trail query for now
		const auditTrail: any[] = [];
		const auditTotalCount = 0;
		const auditHasMore = false;

		// Load available assignees for reassignment
		const assigneesResponse = await authenticatedGraphQLRequest(
			graphqlEndpoint,
			`
				query GetUsersForReassignment($limit: Int!) {
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

		// Load all tasks for dependency/parent selection
		const allTasksResponse = await authenticatedGraphQLRequest(
			graphqlEndpoint,
			`
				query GetAllTasksForSelection($limit: Int!, $offset: Int!) {
					tasks(limit: $limit, offset: $offset) {
						id
						title
						status
						priority
						dueDate
						assignee {
							id
							displayName
						}
					}
				}
			`,
			{ limit: 200, offset: 0 },
			event.request
		);

		const allTasksData = await allTasksResponse.json();

		// Load available resources for linking
		const resourcesResponse = await authenticatedGraphQLRequest(
			graphqlEndpoint,
			`
				query GetAvailableResources($limit: Int!) {
					users(limit: $limit) {
						id
						displayName
					}
				}
			`,
			{ limit: 100 },
			event.request
		);

		const resourcesData = await resourcesResponse.json();

		// Build available resources list (for now just employees)
		const availableResources = (resourcesData?.data?.users || []).map((user: any) => ({
			id: user.id,
			type: 'Employee',
			title: user.displayName
		}));

		// Get standardized user permissions
		const userPermissions = getUserPermissions(locals);

		// Return server-side loaded data
		return {
			user: userPermissions.user,
			userSession: userSession.toJSON(),
			task,
			auditTrail,
			auditTotalCount,
			auditHasMore,
			assignees: assigneesData?.data?.users || [],
			taskTypes: taskTypesData?.data?.taskTypes || [],
			availableTasks: allTasksData?.data?.tasks || [],
			availableResources,
			...userPermissions,
			loadedAt: new Date().toISOString()
		};
	} catch (err) {
		console.error('[Task Details Load Error]', err);

		const errorResponse = createErrorResponse(
			err instanceof Error ? err : new Error('Task details load failed'),
			{
				type: 'DATA_LOAD_ERROR',
				userMessage: 'Unable to load task details. Please refresh the page or try again later.'
			}
		);

		console.error('[Task Details Error Details]', {
			userId: locals.user?.id,
			taskId,
			error: errorResponse
		});

		error(500, {
        			message: 'Task details temporarily unavailable',
        			details: errorResponse.userMessage
        		});
	}
};
