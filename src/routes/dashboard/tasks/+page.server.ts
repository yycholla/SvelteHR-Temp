// Server-side data loading for tasks dashboard page
// Feature: 028-task-system-expansion - Task T035
// REFACTORED: Phase 1 Foundation - Integration Proof-of-Concept
// Demonstrates: RBACDataLoader, UnifiedGraphQLClient, QueryParamExtractor,
//               ClientSideFilter, StatisticsCalculator

import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { logger } from '$lib/utils/logger';
import { requireAuth } from '$lib/server/rbac-utils';

export const load: PageServerLoad = async (event) => {
	requireAuth(event, {
		requiredPermissions: [
			'tasks:read',
			'tasks:read:self',
			'tasks:read:team',
			'tasks:read:all',
			'admin:read'
		]
	});

	const role = (event.locals.user?.role || '').toLowerCase();
	const teamTaskRoles = new Set([
		'manager',
		'hr_manager',
		'admin',
		'hr_admin',
		'system_admin',
		'super_admin'
	]);

	const destination = teamTaskRoles.has(role)
		? '/dashboard/tasks/team-tasks'
		: '/dashboard/tasks/my-tasks';
	const query = event.url.searchParams.toString();

	throw redirect(303, query ? `${destination}?${query}` : destination);
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
