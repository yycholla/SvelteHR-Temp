// Server-side data loading for Team Tasks page
// Feature: 028-task-system-expansion - Task T045
// Load tasks assigned to team members in the same department/organization

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getUserPermissions } from '$lib/server/rbac-utils';

export const load: PageServerLoad = async (event) => {
	const { locals, cookies, url } = event;

	// Check authentication
	if (!locals.user) {
		throw error(401, { message: 'Authentication required' });
	}

	// Import required models
	const { createUserSession } = await import('$lib/models/user-session');
	const { createErrorResponse } = await import('$lib/models/error-response');

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

	// Extract filter parameters
	const statusFilter = url.searchParams.get('status') || '';
	const priorityFilter = url.searchParams.get('priority') || '';
	const assigneeFilter = url.searchParams.get('assignee') || '';
	const searchTerm = url.searchParams.get('search') || '';

	try {
		const { getGraphQLEndpoint } = await import('$lib/server/api-url');
		const graphqlEndpoint = getGraphQLEndpoint();

		const headers: Record<string, string> = {
			'Content-Type': 'application/json'
		};

		console.log('[Team Tasks] Loading team tasks for user:', locals.user.id);

		// First, get team members (users in the same department)
		const teamMembersResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
					query GetTeamMembers($departmentId: UUID, $first: Int) {
						allUsers(
							first: $first
							condition: { departmentId: $departmentId, is_active: true }
						) {
							nodes {
								id
								displayName
								email
								role
								departmentId
							}
						}
					}
				`,
				variables: {
					departmentId: locals.user.departmentId || null,
					first: 100
				}
			})
		});

		const teamMembersData = await teamMembersResponse.json();
		const teamMembers = teamMembersData?.data?.allUsers?.nodes || [];
		const teamMemberIds = teamMembers.map((m: any) => m.id);

		console.log('[Team Tasks] Found team members:', teamMemberIds.length);

		// Build task filter condition
		const condition: any = {};

		if (statusFilter) {
			condition.status = statusFilter;
		}

		if (priorityFilter) {
			condition.priority = priorityFilter;
		}

		if (assigneeFilter) {
			condition.assigneeId = assigneeFilter;
		}

		// Load team tasks
		// NOTE: Query updated to match new task schema (Feature 028)
		// Removed: reminderTime (field doesn't exist in new schema)
		const tasksResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
					query GetTeamTasks($first: Int, $condition: TaskCondition) {
						allTasks(
							first: $first
							condition: $condition
							orderBy: [DUE_DATE_ASC, PRIORITY_DESC, CREATED_AT_DESC]
						) {
							nodes {
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
								userByAssigneeId {
									id
									displayName
									email
									departmentId
								}
								userByCreatorId {
									id
									displayName
									email
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
								}
								tasksByParentTaskId {
									totalCount
								}
								taskDependenciesByBlockedTaskId {
									totalCount
								}
							}
							pageInfo {
								hasNextPage
								hasPreviousPage
							}
							totalCount
						}
					}
				`,
				variables: {
					first: 200,
					condition: Object.keys(condition).length > 0 ? condition : null
				}
			})
		});

		const tasksData = await tasksResponse.json();

		if (tasksData.errors) {
			console.error('[Team Tasks] GraphQL errors:', tasksData.errors);
			throw new Error(tasksData.errors[0]?.message || 'Failed to load team tasks');
		}

		let tasks = tasksData?.data?.allTasks?.nodes || [];

		// Filter to only team members' tasks
		tasks = tasks.filter((task: any) => {
			return teamMemberIds.includes(task.assigneeId);
		});

		// Client-side search filtering
		if (searchTerm) {
			const searchLower = searchTerm.toLowerCase();
			tasks = tasks.filter((task: any) => {
				const title = task.title?.toLowerCase() || '';
				const description = task.description?.toLowerCase() || '';
				const assigneeName = task.userByAssigneeId?.displayName?.toLowerCase() || '';
				return title.includes(searchLower) || description.includes(searchLower) || assigneeName.includes(searchLower);
			});
		}

		// Calculate task statistics
		const taskStats = {
			total: tasks.length,
			notStarted: tasks.filter((t: any) => t.status === 'Not Started').length,
			inProgress: tasks.filter((t: any) => t.status === 'In Progress').length,
			blocked: tasks.filter((t: any) => t.status === 'Blocked').length,
			completed: tasks.filter((t: any) => t.status === 'Completed').length,
			overdue: tasks.filter((t: any) => {
				if (!t.dueDate) return false;
				return new Date(t.dueDate) < new Date() && t.status !== 'Completed';
			}).length
		};

		// Get standardized user permissions
		const userPermissions = getUserPermissions(locals);

		return {
			user: userPermissions.user,
			userSession: userSession.toJSON(),
			tasks,
			totalTasks: tasks.length,
			teamMembers,
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

		throw error(500, {
			message: 'Team tasks temporarily unavailable',
			details: errorResponse.userMessage
		});
	}
};
