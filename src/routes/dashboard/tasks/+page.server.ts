// Server-side data loading for tasks dashboard page
// Feature: 028-task-system-expansion - Task T035
// REFACTORED: Phase 1 Foundation - Integration Proof-of-Concept
// Demonstrates: RBACDataLoader, UnifiedGraphQLClient, QueryParamExtractor,
//               ClientSideFilter, StatisticsCalculator

import type { Actions, PageServerLoad } from './$types';
import { error, fail } from '@sveltejs/kit';
import { logger } from '$lib/utils/logger';
import { requireAuth } from '$lib/server/rbac-utils';

// Phase 1 Foundation Utilities
import { RBACDataLoader } from '$lib/server/route-loaders';
import { QueryParamExtractor } from '$lib/server/route-helpers/query-params';
import { ClientSideFilter } from '$lib/server/route-helpers/client-filter';
import { StatisticsCalculator } from '$lib/server/analytics/statistics-calculator';

export const load: PageServerLoad = async (event) => {
	const { url } = event;

	// Use RBACDataLoader - handles auth, session, permissions automatically
	const loader = new RBACDataLoader(event, ['tasks:read:all', 'admin:read']);

	return loader.loadWithClient(async (client) => {
		// Use QueryParamExtractor for type-safe URL parameter extraction
		const params = new QueryParamExtractor(url);
		const { page, limit } = params.getPagination(20);

		// Extract all filter parameters
		const filters = {
			searchTerm: params.getString('search'),
			statusFilter: params.getString('status'),
			priorityFilter: params.getString('priority'),
			assigneeFilter: params.getString('assignee'),
			taskTypeFilter: params.getString('taskType'),
			dueDateStart: params.getString('dueDateStart'),
			dueDateEnd: params.getString('dueDateEnd'),
			hasParent: params.getString('hasParent')
		};

		logger.info('[Tasks Dashboard] Filters', filters);

		try {
			// GraphQL query definitions
			const GET_TASKS_QUERY = `
				query GetTasksForDashboard($limit: Int!, $offset: Int!) {
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
			`;

			const GET_ASSIGNEES_QUERY = `
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
			`;

			const GET_TASK_TYPES_QUERY = `
				query GetTaskTypesForFilter($limit: Int!) {
					taskTypes(isActive: true) {
						id
						name
						description
						defaultPriority
						colorCode
						isActive
					}
				}
			`;

			// Use UnifiedGraphQLClient to execute all queries
			// Fetch large dataset for client-side filtering (backend doesn't support filters yet)
			const tasksData = await client.query(
				GET_TASKS_QUERY,
				{ limit: 1000, offset: 0 },
				{
					operationName: 'GetTasksForDashboard',
					errorMessage: 'Failed to load tasks',
					dataPath: 'tasks'
				}
			);

			const assignees = await client.query(
				GET_ASSIGNEES_QUERY,
				{ limit: 100 },
				{
					operationName: 'GetUsersForAssigneeFilter',
					errorMessage: 'Failed to load assignees',
					dataPath: 'users'
				}
			);

			const taskTypes = await client.query(
				GET_TASK_TYPES_QUERY,
				{ limit: 100 },
				{
					operationName: 'GetTaskTypesForFilter',
					errorMessage: 'Failed to load task types',
					dataPath: 'taskTypes'
				}
			);

			logger.info('[Tasks Dashboard] Tasks loaded', {
				count: tasksData?.length || 0
			});

			// Use ClientSideFilter for fluent filtering API
			let filteredTasks = new ClientSideFilter(tasksData || [])
				// Status filter (GraphQL returns SCREAMING_SNAKE_CASE)
				.where('status', filters.statusFilter ? filters.statusFilter.toUpperCase().replace('-', '_') : undefined)
				// Priority filter
				.where('priority', filters.priorityFilter ? filters.priorityFilter.toUpperCase() : undefined)
				// Assignee filter
				.filter((task: any) => !filters.assigneeFilter || task.assignee?.id === filters.assigneeFilter)
				// Task type filter
				.filter((task: any) => !filters.taskTypeFilter || task.taskType?.id === filters.taskTypeFilter)
				// Search filter (title + description)
				.search(filters.searchTerm, ['title', 'description'])
				// Due date range filter
				.filter((task: any) => {
					if (!filters.dueDateStart && !filters.dueDateEnd) return true;
					if (!task.dueDate) return false;
					const taskDate = new Date(task.dueDate);
					if (filters.dueDateStart && taskDate < new Date(filters.dueDateStart)) return false;
					if (filters.dueDateEnd && taskDate > new Date(filters.dueDateEnd)) return false;
					return true;
				})
				// Parent task filter
				.filter((task: any) => {
					if (filters.hasParent === 'true') return task.parentTask != null;
					if (filters.hasParent === 'false') return task.parentTask == null;
					return true;
				})
				.get();

			// Use StatisticsCalculator for task statistics
			const taskStats = StatisticsCalculator.forTasks(filteredTasks);

			// Return standardized data structure
			// RBACDataLoader already includes userSession and permissions
			return {
				tasks: filteredTasks,
				totalTasks: filteredTasks.length,
				assignees: assignees || [],
				taskTypes: taskTypes || [],
				taskStats,
				filters: {
					...filters,
					page,
					limit
				}
			};
		} catch (err) {
			logger.error('[Tasks Dashboard Load Error]', err as Error);

			// Return safe fallback data
			return {
				tasks: [],
				totalTasks: 0,
				assignees: [],
				taskTypes: [],
				taskStats: {
					total: 0,
					notStarted: 0,
					inProgress: 0,
					blocked: 0,
					review: 0,
					completed: 0,
					overdue: 0
				},
				filters: {
					...filters,
					page,
					limit
				},
				error: err instanceof Error ? err.message : 'Failed to load tasks dashboard'
			};
		}
	});
};

export const actions: Actions = {
	default: async (event) => {
		const { request } = event;

		// Check authentication
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
			const parentTaskId = formData.get('parentTaskId') as string | null;
			const dueDate = formData.get('dueDate') as string | null;

			logger.info('[Quick Add Task] Creating task', {
				title,
				priority,
				assigneeId,
				dueDate,
				taskTypeId,
				parentTaskId
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
			if (parentTaskId && parentTaskId.trim()) {
				createInput.parentTaskId = parentTaskId;
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
				logger.error('[Quick Add Task] Create errors', new Error(errorMsg), {
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

			logger.info('[Quick Add Task] Task created successfully', {
				taskId: newTask.id
			});

			return {
				success: true,
				taskId: newTask.id
			};
		} catch (err) {
			logger.error(
				'[Quick Add Task] Create error',
				err instanceof Error ? err : new Error(String(err))
			);

			return fail(500, {
				error: err instanceof Error ? err.message : 'Failed to create task'
			});
		}
	}
};
