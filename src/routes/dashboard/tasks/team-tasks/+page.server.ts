// Server-side data loading for Team Tasks page
// Feature: 028-task-system-expansion - Task T045
// Load tasks assigned to team members in the same department/organization

import type { Actions, PageServerLoad } from './$types';
import { error, fail } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/rbac-utils';
import { logger } from '$lib/utils/logger';
import { RBACDataLoader } from '$lib/server/route-loaders';
import { QueryParamExtractor, ClientSideFilter } from '$lib/server/route-helpers';
import { StatisticsCalculator } from '$lib/server/analytics';

export const load: PageServerLoad = async (event) => {
	// Initialize RBAC loader with required permissions
	const loader = new RBACDataLoader(event, [
		'tasks:read',
		'tasks:read:self',
		'tasks:read:team',
		'tasks:read:all'
	]);

	return loader.loadWithClient(async (client) => {
		const { locals, url } = event;
		if (!locals.user) throw error(401, 'Unauthorized');

		// Extract filter parameters
		const params = new QueryParamExtractor(url);
		const statusFilter = params.getString('status');
		const priorityFilter = params.getString('priority');
		const assigneeFilter = params.getString('assignee');
		const searchTerm = params.getString('search');

		try {
			logger.info('[Team Tasks] Loading team tasks for user', {
				userId: locals.user.id
			});

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

			const currentUser = currentUserResponse?.user;
			const userDepartmentId = currentUser?.departmentId;

			logger.info(`[Team Tasks] Current user department ID: ${userDepartmentId}`);

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

			const departments = departmentsResponse?.departments || [];

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

			let tasks = tasksResponse?.tasks || [];

			// Apply team/department filtering logic
			const taskFilter = new ClientSideFilter(tasks);

			if (userDepartmentId) {
				// User has a department - filter to show only tasks assigned to that department
				// AND don't have an individual assignee (department-level tasks only)
				taskFilter.filter((task: any) => {
					const isUserDepartment = task.department?.id === userDepartmentId;
					const hasNoIndividualAssignee = !task.assignee?.id;
					return isUserDepartment && hasNoIndividualAssignee;
				});
			} else {
				// User is not assigned to a department - show no tasks
				logger.warn('[Team Tasks] User is not assigned to a department - showing no team tasks');
				taskFilter.filter(() => false);
			}

			// Client-side filtering for status
			if (statusFilter) {
				// NOTE: Rust GraphQL returns enum values in SCREAMING_SNAKE_CASE
				const statusUpper = statusFilter.toUpperCase().replace('-', '_');
				taskFilter.where('status', statusUpper);
			}

			// Client-side filtering for priority
			if (priorityFilter) {
				const priorityUpper = priorityFilter.toUpperCase();
				taskFilter.where('priority', priorityUpper);
			}

			// Client-side filtering for assignee filter
			if (assigneeFilter) {
				taskFilter.filter((task: any) => task.assignee?.id === assigneeFilter);
			}

			// Client-side search filtering
			if (searchTerm) {
				taskFilter.search(searchTerm, ['title', 'description']);
				// Additional check for assignee name
				taskFilter.filter((task: any) =>
					task.assignee?.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
				);
			}

			// Get final filtered tasks
			const filteredTasks = taskFilter.get();

			// Calculate task statistics using StatisticsCalculator
			const taskStats = StatisticsCalculator.forTasks(filteredTasks);

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

			const taskTypes = taskTypesResponse?.taskTypes || [];

			// Import user session model only if needed (or rely on RBACDataLoader structure)
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

			return {
				userSession: userSession.toJSON(),
				tasks: filteredTasks,
				totalTasks: filteredTasks.length,
				departments,
				taskTypes,
				taskStats,
				filters: {
					searchTerm,
					statusFilter,
					priorityFilter,
					assigneeFilter
				}
			};
		} catch (err) {
			logger.error('[Team Tasks Load Error]', err as Error);
			// RBACDataLoader will handle the error and return a 500
			throw err;
		}
	});
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

			logger.info('[Team Tasks - Quick Add] Creating team task', {
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
				const errorMsg = createData.errors[0]?.message || 'Failed to create task';
				logger.error('[Team Tasks - Quick Add] Create errors', new Error(errorMsg), {
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

			logger.info('[Team Tasks - Quick Add] Task created successfully', {
				taskId: newTask.id
			});

			return {
				success: true,
				taskId: newTask.id
			};
		} catch (err) {
			logger.error(
				'[Team Tasks - Quick Add] Create error',
				err instanceof Error ? err : new Error(String(err))
			);

			return fail(500, {
				error: err instanceof Error ? err.message : 'Failed to create task'
			});
		}
	}
};