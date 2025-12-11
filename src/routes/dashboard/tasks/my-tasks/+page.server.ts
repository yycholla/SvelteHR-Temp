// Server-side data loading for My Tasks page
// Feature: 028-task-system-expansion - Task T043
// Load tasks assigned to current user

import type { Actions, PageServerLoad } from './$types';
import { error, fail } from '@sveltejs/kit';
import { getUserPermissions, requireAuth } from '$lib/server/rbac-utils';
import { logger } from '$lib/utils/logger';

export const load: PageServerLoad = async (event) => {
	const { cookies, url } = event;

	// Check authentication and permissions
	requireAuth(event, {
		requiredPermissions: ['tasks:read', 'tasks:read:self', 'tasks:read:team', 'tasks:read:all']
	});

	// After permission check, re-destructure locals with guaranteed user
	const { locals } = event;

	// Import required models
	const { createUserSession } = await import('$lib/models/user-session');
	const { createErrorResponse } = await import('$lib/models/error-response');

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

	// Extract filter parameters
	const statusFilter = url.searchParams.get('status') || '';
	const priorityFilter = url.searchParams.get('priority') || '';
	const searchTerm = url.searchParams.get('search') || '';

	try {
		const { getGraphQLEndpoint, authenticatedGraphQLRequest } = await import('$lib/server/api-url');
		const graphqlEndpoint = getGraphQLEndpoint();

		logger.info('[My Tasks] Loading tasks for user', {
			userId: locals.user.id
		});

		// Load user's tasks with authenticated request (forwards session cookies)
		// NOTE: Rust GraphQL schema uses TaskFilter input object
		// Status/priority filtering will be done client-side
		const tasksResponse = await authenticatedGraphQLRequest(
			graphqlEndpoint,
			`
				query GetMyTasks($filter: TaskFilter!, $limit: Int!, $offset: Int!) {
					tasks(filter: $filter, limit: $limit, offset: $offset) {
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
						department {
							id
							name
							description
						}
						creator {
							id
							displayName
							email
						}
						taskType {
							id
							name
						}
						parentTask {
							id
							title
							status
						}
					}
				}
			`,
			{
				filter: { assigneeId: locals.user.id },
				limit: 100,
				offset: 0
			},
			event.request
		);

		const tasksData = await tasksResponse.json();
		logger.info('[My Tasks] Tasks response received', {
			tasksCount: tasksData?.data?.tasks?.length || 0
		});

		if (tasksData.errors) {
			const errorMsg = tasksData.errors[0]?.message || 'Failed to load tasks';
			logger.error('[My Tasks] GraphQL errors', new Error(errorMsg), {
				errors: tasksData.errors
			});
			throw new Error(errorMsg);
		}

		let tasks = tasksData?.data?.tasks || [];

		// Client-side filtering for status
		if (statusFilter) {
			// NOTE: Rust GraphQL returns enum values in SCREAMING_SNAKE_CASE
			// Convert filter to uppercase to match
			const statusUpper = statusFilter.toUpperCase().replace('-', '_');
			tasks = tasks.filter((task: any) => task.status === statusUpper);
		}

		// Client-side filtering for priority
		if (priorityFilter) {
			const priorityUpper = priorityFilter.toUpperCase();
			tasks = tasks.filter((task: any) => task.priority === priorityUpper);
		}

		// Client-side search filtering
		if (searchTerm) {
			const searchLower = searchTerm.toLowerCase();
			tasks = tasks.filter((task: any) => {
				const title = task.title?.toLowerCase() || '';
				const description = task.description?.toLowerCase() || '';
				return title.includes(searchLower) || description.includes(searchLower);
			});
		}

		// Calculate task statistics
		// NOTE: Rust GraphQL returns enum values in SCREAMING_SNAKE_CASE (async-graphql default)
		// Database stores: 'todo', 'in_progress', etc. (lowercase)
		// GraphQL returns: 'TODO', 'IN_PROGRESS', etc. (uppercase)
		const taskStats = {
			total: tasks.length,
			notStarted: tasks.filter((t: any) => t.status === 'TODO').length,
			inProgress: tasks.filter((t: any) => t.status === 'IN_PROGRESS').length,
			blocked: tasks.filter((t: any) => t.status === 'BLOCKED').length,
			review: tasks.filter((t: any) => t.status === 'REVIEW').length,
			completed: tasks.filter((t: any) => t.status === 'DONE').length,
			overdue: tasks.filter((t: any) => {
				if (!t.dueDate) return false;
				return new Date(t.dueDate) < new Date() && t.status !== 'DONE';
			}).length
		};

		// Load assignees (users) for QuickAddTask component
		const assigneesResponse = await authenticatedGraphQLRequest(
			graphqlEndpoint,
			`
				query GetUsersForAssigneeFilter($limit: Int!) {
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
			{
				limit: 100
			},
			event.request
		);

		const assigneesData = await assigneesResponse.json();

		// Load task types for QuickAddTask component
		const taskTypesResponse = await authenticatedGraphQLRequest(
			graphqlEndpoint,
			`
				query GetTaskTypesForFilter($isActive: Boolean) {
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
			{},
			event.request
		);

		const taskTypesData = await taskTypesResponse.json();

		// Load today's events with RSVP status filtering
		const today = new Date();
		const startOfDay = new Date(
			today.getFullYear(),
			today.getMonth(),
			today.getDate()
		).toISOString();
		const endOfDay = new Date(
			today.getFullYear(),
			today.getMonth(),
			today.getDate(),
			23,
			59,
			59,
			999
		).toISOString();

		const eventsResponse = await authenticatedGraphQLRequest(
			graphqlEndpoint,
			`
				query GetTodayEvents($limit: Int!) {
					events(limit: $limit) {
						id
						title
						startTime
						endTime
						isAllDay
						location
						status
						attendees(limit: 100) {
							id
							employeeId
							responseStatus
						}
					}
				}
			`,
			{
				limit: 100
			},
			event.request
		);

		const eventsData = await eventsResponse.json();

		// Filter events for today and user's RSVP status (accepted, tentative, pending)
		const allEvents = eventsData?.data?.events || [];
		const todayEvents = allEvents
			.filter((evt: any) => {
				// Check if user is an attendee
				const userAttendee = evt.attendees?.find((a: any) => a.employeeId === locals.user.id);
				if (!userAttendee) return false;

				// Check RSVP status (accepted, tentative, or pending)
				const validStatuses = ['accepted', 'tentative', 'pending'];
				if (!validStatuses.includes(userAttendee.responseStatus)) return false;

				// Check if event is today
				const eventStart = new Date(evt.startTime);
				const eventDay = new Date(
					eventStart.getFullYear(),
					eventStart.getMonth(),
					eventStart.getDate()
				);
				const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
				return eventDay.getTime() === todayDay.getTime();
			})
			.map((evt: any) => ({
				id: evt.id,
				title: evt.title,
				time: new Date(evt.startTime).toLocaleTimeString('en-US', {
					hour: 'numeric',
					minute: '2-digit',
					hour12: true
				}),
				location: evt.location,
				startTime: evt.startTime,
				endTime: evt.endTime,
				isAllDay: evt.isAllDay
			}))
			.sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

		// Get standardized user permissions
		const userPermissions = getUserPermissions(locals);

		return {
			userSession: userSession.toJSON(),
			tasks,
			totalTasks: tasks.length,
			taskStats,
			assignees: assigneesData?.data?.users || [],
			taskTypes: taskTypesData?.data?.taskTypes || [],
			todayEvents,
			filters: {
				searchTerm,
				statusFilter,
				priorityFilter
			},
			// RBAC: Standardized permission checks (includes user property)
			...userPermissions,
			loadedAt: new Date().toISOString()
		};
	} catch (err) {
		logger.error('[My Tasks Load Error]', err as Error);

		const errorResponse = createErrorResponse(
			err instanceof Error ? err : new Error('My tasks load failed'),
			{
				type: 'DATA_LOAD_ERROR',
				userMessage: 'Unable to load your tasks. Please refresh the page or try again later.'
			}
		);

		logger.error('[My Tasks Error Details]', undefined, {
			userId: locals.user?.id,
			errorMessage: errorResponse.userMessage
		});

		// Return safe fallback data instead of crashing the page
		// This prevents the "white screen of death" or hydration errors if data is missing
		return {
			userSession: userSession.toJSON(),
			tasks: [],
			totalTasks: 0,
			taskStats: {
				total: 0,
				notStarted: 0,
				inProgress: 0,
				blocked: 0,
				review: 0,
				completed: 0,
				overdue: 0
			},
			assignees: [],
			taskTypes: [],
			todayEvents: [],
			filters: {
				searchTerm,
				statusFilter,
				priorityFilter
			},
			// Default permissions if loading failed (includes user property)
			...getUserPermissions(locals),
			loadedAt: new Date().toISOString(),
			error: errorResponse.userMessage
		};
	}
};

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

		// After permission check, re-destructure locals with guaranteed user
		const { locals } = event;

		try {
			const formData = await request.formData();
			const { getGraphQLEndpoint, authenticatedGraphQLRequest } =
				await import('$lib/server/api-url');
			const graphqlEndpoint = getGraphQLEndpoint();

			// Extract form data
			const title = formData.get('title') as string;
			const description = formData.get('description') as string | null;
			const priority = (formData.get('priority') as string) || 'MEDIUM';
			const assigneeId = formData.get('assigneeId') as string;
			const taskTypeId = formData.get('taskTypeId') as string | null;
			const dueDate = formData.get('dueDate') as string | null;

			logger.info('[My Tasks - Quick Add] Creating task', {
				title,
				priority,
				assigneeId,
				dueDate,
				taskTypeId,
				currentUserId: locals.user.id,
				assigneeMatchesUser: assigneeId === locals.user.id
			});

			// Prepare create input for Rust GraphQL schema
			const createInput: Record<string, any> = {
				title,
				status: 'TODO', // Default status for quick-add
				priority,
				assigneeId,
				requiresManualReassignment: false
			};

			// Only include optional fields if they have valid values
			if (description && description.trim()) {
				createInput.description = description;
			}
			if (taskTypeId && taskTypeId.trim()) {
				createInput.taskTypeId = taskTypeId;
			}
			if (dueDate && dueDate.trim()) {
				// GraphQL expects full datetime, add end of day
				createInput.dueDate = `${dueDate}T23:59:59Z`;
			}

			// Execute create mutation
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
				logger.error('[My Tasks - Quick Add] Create errors', new Error(errorMsg), {
					errors: createData.errors
				});
				return fail(400, {
					error: errorMsg
				});
			}

			const newTask = createData?.data?.createTask;

			if (!newTask) {
				return fail(400, {
					error: 'Task creation failed'
				});
			}

			logger.info('[My Tasks - Quick Add] Task created successfully', {
				taskId: newTask.id
			});

			return {
				success: true,
				taskId: newTask.id
			};
		} catch (err) {
			logger.error('[My Tasks - Quick Add] Create error', err instanceof Error ? err : new Error(String(err)));

			return fail(500, {
				error: err instanceof Error ? err.message : 'Failed to create task'
			});
		}
	}
};
