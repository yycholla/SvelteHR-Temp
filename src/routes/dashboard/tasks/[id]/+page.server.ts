// Server-side data loading for task details page
// Feature: 028-task-system-expansion - Task T037
// Load single task with full relationships

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { PermissionChecks, getUserPermissions } from '$lib/server/rbac-utils';

export const load: PageServerLoad = async (event) => {
	const { locals, cookies, params } = event;
	const { id: taskId } = params;

	// RBAC: Check task read permissions
	try {
		if (!locals.user) {
			throw error(401, { message: 'Authentication required' });
		}
	} catch (err) {
		console.error('[Task Details] Permission check failed:', err);
		throw error(403, { message: 'Insufficient permissions to view task details' });
	}

	// Import required models
	const { createDataRequest } = await import('$lib/models/data-request');
	const { createErrorResponse } = await import('$lib/models/error-response');
	const { createUserSession } = await import('$lib/models/user-session');

	// Create user session
	const userSession = createUserSession({
		userId: locals.user.id,
		jwtToken: '', // Session-based auth doesn't use client-side JWT tokens
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
			jwtToken: userSession.jwtToken,
			isAuthenticated: Boolean(userSession.isAuthenticated)
		},
		timeoutMs: 5000,
		retryAttempts: 0,
		maxRetries: 3
	});

	try {
		const { getGraphQLEndpoint } = await import('$lib/server/api-url');
		const graphqlEndpoint = getGraphQLEndpoint();

		const headers: Record<string, string> = {
			'Content-Type': 'application/json'
		};

		console.log('[Task Details] Loading task:', taskId);

		// Load task with full relationships
		// NOTE: Query updated to match new task schema (Feature 028)
		// Removed: reminderTime, organizationId (fields don't exist in new schema)
		const taskResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
					query GetTaskDetails($taskId: UUID!) {
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
							archivedAt
							archivedBy
							createdAt
							updatedAt
							userByAssigneeId {
								id
								displayName
								email
								role
							}
							userByCreatorId {
								id
								displayName
								email
								role
							}
							taskTypeByTaskTypeId {
								id
								name
								description
								isSystem
							}
							taskByParentTaskId {
								id
								title
								status
								priority
								dueDate
							}
							tasksByParentTaskId(orderBy: CREATED_AT_ASC) {
								totalCount
								nodes {
									id
									title
									status
									priority
									dueDate
									assigneeId
									userByAssigneeId {
										id
										displayName
									}
									tasksByParentTaskId {
										totalCount
									}
								}
							}
							taskDependenciesByBlockingTaskId {
								totalCount
								nodes {
									id
									blockedTaskId
									dependencyType
									createdAt
									taskByBlockedTaskId {
										id
										title
										status
										priority
										dueDate
									}
								}
							}
							taskDependenciesByBlockedTaskId {
								totalCount
								nodes {
									id
									blockingTaskId
									dependencyType
									createdAt
									taskByBlockingTaskId {
										id
										title
										status
										priority
										dueDate
									}
								}
							}
							linkedResourcesByTaskId(orderBy: CREATED_AT_DESC) {
								totalCount
								nodes {
									id
									resourceId
									resourceType
									resourceTitle
									availabilityStatus
									lastChecked
									createdAt
								}
							}
						}
					}
				`,
				variables: { taskId }
			})
		});

		const taskData = await taskResponse.json();
		console.log('[Task Details] Task response:', taskData);

		if (taskData.errors) {
			console.error('[Task Details] GraphQL errors:', taskData.errors);
			throw new Error(taskData.errors[0]?.message || 'Failed to load task');
		}

		const task = taskData?.data?.taskById;

		if (!task) {
			throw error(404, { message: 'Task not found' });
		}

		// Load audit trail
		const auditResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
					query GetTaskAuditTrail($taskId: UUID!, $first: Int) {
						allTaskAuditTrails(
							condition: { taskId: $taskId }
							orderBy: TIMESTAMP_DESC
							first: $first
						) {
							totalCount
							nodes {
								id
								taskId
								userId
								actionType
								changedFields
								newValues
								timestamp
								userByUserId {
									id
									displayName
									email
								}
							}
							pageInfo {
								hasNextPage
								endCursor
							}
						}
					}
				`,
				variables: {
					taskId,
					first: 20
				}
			})
		});

		const auditData = await auditResponse.json();
		const auditTrail = auditData?.data?.allTaskAuditTrails?.nodes || [];
		const auditTotalCount = auditData?.data?.allTaskAuditTrails?.totalCount || 0;
		const auditHasMore = auditData?.data?.allTaskAuditTrails?.pageInfo?.hasNextPage || false;

		// Load available assignees for reassignment
		const assigneesResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
					query GetUsersForReassignment($first: Int) {
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

		// Load all tasks for dependency/parent selection
		const allTasksResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
					query GetAllTasksForSelection($first: Int) {
						allTasks(first: $first, orderBy: CREATED_AT_DESC) {
							nodes {
								id
								title
								status
								priority
								dueDate
								assigneeId
							}
						}
					}
				`,
				variables: { first: 200 }
			})
		});

		const allTasksData = await allTasksResponse.json();

		// Load available resources for linking
		const resourcesResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
					query GetAvailableResources {
						allUsers(first: 100, condition: { is_active: true }) {
							nodes {
								id
								displayName
							}
						}
					}
				`,
				variables: {}
			})
		});

		const resourcesData = await resourcesResponse.json();

		// Build available resources list (for now just employees)
		const availableResources = resourcesData?.data?.allUsers?.nodes.map((user: any) => ({
			id: user.id,
			type: 'Employee',
			title: user.displayName
		})) || [];

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
			assignees: assigneesData?.data?.allUsers?.nodes || [],
			taskTypes: taskTypesData?.data?.allTaskTypes?.nodes || [],
			availableTasks: allTasksData?.data?.allTasks?.nodes || [],
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

		throw error(500, {
			message: 'Task details temporarily unavailable',
			details: errorResponse.userMessage
		});
	}
};
