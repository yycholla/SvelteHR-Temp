// Server-side data loading for Team Tasks page
// Feature: 028-task-system-expansion - Task T045
// Load tasks assigned to team members in the same department/organization

import type { Actions, PageServerLoad } from './$types';
import { error, fail } from '@sveltejs/kit';
import { requireAuth, getUserPermissions } from '$lib/server/rbac-utils';

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
	const assigneeFilter = url.searchParams.get('assignee') || '';
	const searchTerm = url.searchParams.get('search') || '';

	try {
		const { GraphQLClient } = await import('$lib/server/graphql-client');

		// Create authenticated GraphQL client with session cookies
		const client = GraphQLClient.fromCookies(cookies);

		console.log('[Team Tasks] Loading team tasks for user:', locals.user.id);

		// Load current user's information to get their department
		const currentUserResponse = await client.query(
			`
				query GetCurrentUser($id: UUID!) {
					user(id: $id) {
						id
						departmentId
						department {
							id
							name
						}
					}
				}
			`,
			{
				id: locals.user.id
			}
		);

		const currentUser = currentUserResponse?.data?.user;
		const userDepartmentId = currentUser?.departmentId;

		console.log('[Team Tasks] Current user department ID:', userDepartmentId);

		// Load departments for team task assignment
		const departmentsResponse = await client.query(
			`
				query GetDepartments($limit: Int) {
					departments(limit: $limit) {
						id
						name
						description
					}
				}
			`,
			{
				limit: 100
			}
		);

		console.log('[Team Tasks] Departments response:', departmentsResponse);

		if (departmentsResponse.errors) {
			console.error('[Team Tasks] Departments GraphQL errors:', departmentsResponse.errors);
			throw new Error(departmentsResponse.errors[0]?.message || 'Failed to load departments');
		}

		const departments = departmentsResponse?.data?.departments || [];
		console.log('[Team Tasks] Found departments:', departments.length);

		// Load team tasks
		// NOTE: Rust GraphQL schema doesn't support complex filters
		// We'll do all filtering client-side
		const tasksResponse = await client.query(
			`
				query GetTeamTasks($limit: Int!, $offset: Int!) {
					tasks(limit: $limit, offset: $offset) {
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
							departmentId
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
							departmentId
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
				limit: 200,
				offset: 0
			}
		);

		console.log('[Team Tasks] Tasks response:', tasksResponse);

		if (tasksResponse.errors) {
			console.error('[Team Tasks] GraphQL errors:', tasksResponse.errors);
			throw new Error(tasksResponse.errors[0]?.message || 'Failed to load team tasks');
		}

		let tasks = tasksResponse?.data?.tasks || [];

		console.log('[Team Tasks] Total tasks before filter:', tasks.length);

		if (userDepartmentId) {
			// User has a department - filter to show only tasks assigned to that department
			tasks = tasks.filter((task: any) => {
				// Only include tasks that are assigned to the user's department
				// AND don't have an individual assignee (department-level tasks only)
				const isUserDepartment = task.department?.id === userDepartmentId;
				const hasNoIndividualAssignee = !task.assignee?.id;

				return isUserDepartment && hasNoIndividualAssignee;
			});

			console.log(
				`[Team Tasks] Filtered to ${tasks.length} tasks assigned to department:`,
				userDepartmentId
			);
		} else {
			// User is not assigned to a department - show no tasks
			console.warn('[Team Tasks] User is not assigned to a department - showing no team tasks');
			tasks = [];
		}

		// Client-side filtering for status
		if (statusFilter) {
			// NOTE: Rust GraphQL returns enum values in SCREAMING_SNAKE_CASE
			const statusUpper = statusFilter.toUpperCase().replace('-', '_');
			tasks = tasks.filter((task: any) => task.status === statusUpper);
		}

		// Client-side filtering for priority
		if (priorityFilter) {
			const priorityUpper = priorityFilter.toUpperCase();
			tasks = tasks.filter((task: any) => task.priority === priorityUpper);
		}

		// Client-side filtering for assignee filter
		if (assigneeFilter) {
			tasks = tasks.filter((task: any) => task.assignee?.id === assigneeFilter);
		}

		// Client-side search filtering
		if (searchTerm) {
			const searchLower = searchTerm.toLowerCase();
			tasks = tasks.filter((task: any) => {
				const title = task.title?.toLowerCase() || '';
				const description = task.description?.toLowerCase() || '';
				const assigneeName = task.assignee?.displayName?.toLowerCase() || '';
				return (
					title.includes(searchLower) ||
					description.includes(searchLower) ||
					assigneeName.includes(searchLower)
				);
			});
		}

		// Calculate task statistics
		// NOTE: Rust GraphQL returns enum values in SCREAMING_SNAKE_CASE (async-graphql default)
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

		// Get standardized user permissions
		const userPermissions = getUserPermissions(locals);

		// Load task types for the form
		const taskTypesResponse = await client.query(
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
			{
				isActive: true
			}
		);

		const taskTypesData = taskTypesResponse;

		return {
			user: userPermissions.user,
			userSession: userSession.toJSON(),
			tasks,
			totalTasks: tasks.length,
			departments,
			taskTypes: taskTypesData?.data?.taskTypes || [],
			taskStats,
			filters: {
				searchTerm,
				statusFilter,
				priorityFilter,
				assigneeFilter
			},
			...userPermissions,
			loadedAt: new Date().toISOString()
		};
	} catch (err) {
		console.error('[Team Tasks Load Error]', err);

		const errorResponse = createErrorResponse(
			err instanceof Error ? err : new Error('Team tasks load failed'),
			{
				type: 'DATA_LOAD_ERROR',
				userMessage: 'Unable to load team tasks. Please refresh the page or try again later.'
			}
		);

		console.error('[Team Tasks Error Details]', {
			userId: locals.user?.id,
			error: errorResponse
		});

		error(500, {
			message: 'Team tasks temporarily unavailable',
			details: errorResponse.userMessage
		});
	}
};

export const actions: Actions = {
	default: async (event) => {
		const { request } = event;

		// Check authentication and permissions
		requireAuth(event, {
			requiredPermissions: ['tasks:write', 'tasks:write:self', 'tasks:write:team', 'tasks:write:all']
		});

		// After permission check, re-destructure locals
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
			const departmentId = formData.get('departmentId') as string;
			const taskTypeId = formData.get('taskTypeId') as string | null;
			const dueDate = formData.get('dueDate') as string | null;

			console.log('[Team Tasks - Quick Add] Creating team task:', {
				title,
				priority,
				departmentId,
				dueDate,
				taskTypeId
			});

			// Prepare create input for Rust GraphQL schema with department assignment
			const createInput: Record<string, any> = {
				title,
				status: 'TODO', // Default status for quick-add
				priority,
				departmentId, // Assign to department (exclusive with assigneeId)
				requiresManualReassignment: false
			};

			// Only include optional fields if they have valid values
			if (taskTypeId && taskTypeId.trim()) {
				createInput.taskTypeId = taskTypeId;
			}
			if (dueDate && dueDate.trim()) {
				// GraphQL expects full datetime, add end of day
				createInput.dueDate = `${dueDate}T23:59:59Z`;
			}

			// Add description if provided
			if (description && description.trim()) {
				createInput.description = description;
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
				console.error('[Team Tasks - Quick Add] Create errors:', createData.errors);
				return fail(400, {
					error: createData.errors[0]?.message || 'Failed to create task'
				});
			}

			const newTask = createData?.data?.createTask;

			if (!newTask) {
				return fail(400, {
					error: 'Task creation failed'
				});
			}

			console.log('[Team Tasks - Quick Add] Task created successfully:', newTask.id);

			return {
				success: true,
				taskId: newTask.id
			};
		} catch (err) {
			console.error('[Team Tasks - Quick Add] Create error:', err);

			return fail(500, {
				error: err instanceof Error ? err.message : 'Failed to create task'
			});
		}
	}
};
