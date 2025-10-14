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

		// Get JWT token from cookies for authentication
		const jwtToken = cookies.get('hr_token') || '';

		// Headers with JWT authentication for Rust GraphQL server
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${jwtToken}`
		};

		console.log('[Team Tasks] Loading team tasks for user:', locals.user.id);

		// First, get team members (users in the same department)
		// NOTE: Query updated to match Rust GraphQL schema
		// The users query only supports limit, offset, and status parameters
		// We'll filter by department client-side
		const teamMembersResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
					query GetTeamMembers($limit: Int, $status: UserStatus) {
						users(
							limit: $limit
							status: $status
						) {
							id
							displayName
							email
							role
							departmentId
						}
					}
				`,
				variables: {
					limit: 200,
					status: 'active'
				}
			})
		});

		const teamMembersData = await teamMembersResponse.json();
		console.log('[Team Tasks] Team members response:', teamMembersData);

		if (teamMembersData.errors) {
			console.error('[Team Tasks] Team members GraphQL errors:', teamMembersData.errors);
			throw new Error(teamMembersData.errors[0]?.message || 'Failed to load team members');
		}

		// Get all active users and filter to same department
		let teamMembers = teamMembersData?.data?.users || [];

		// Filter to only users in the same department
		if (locals.user.departmentId) {
			teamMembers = teamMembers.filter((m: any) => m.departmentId === locals.user.departmentId);
		}

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
		// NOTE: Query updated to match Rust GraphQL schema (idiomatic naming)
		const tasksResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
					query GetTeamTasks($limit: Int, $filter: TaskFilter) {
						tasks(
							limit: $limit
							filter: $filter
							orderBy: "due_date_asc"
						) {
							id
							title
							description
							status
							priority
							dueDate
							assigneeId
							createdBy
							taskTypeId
							parentTaskId
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
							creator {
								id
								displayName
								email
							}
							parentTask {
								id
								title
								status
							}
						}
					}
				`,
				variables: {
					limit: 200,
					filter: Object.keys(condition).length > 0 ? condition : null
				}
			})
		});

		const tasksData = await tasksResponse.json();
		console.log('[Team Tasks] Tasks response:', tasksData);

		if (tasksData.errors) {
			console.error('[Team Tasks] GraphQL errors:', tasksData.errors);
			throw new Error(tasksData.errors[0]?.message || 'Failed to load team tasks');
		}

		let tasks = tasksData?.data?.tasks || [];

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
				const assigneeName = task.assignee?.displayName?.toLowerCase() || '';
				return title.includes(searchLower) || description.includes(searchLower) || assigneeName.includes(searchLower);
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
