import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { logger } from '$lib/utils/logger';
import { GraphQLClient } from '$lib/server/graphql-client';
import { requireAuth } from '$lib/server/rbac-utils';
import {
	ASSIGN_ONBOARDING_MUTATION,
	ASSIGN_ONBOARDING_TO_DEPARTMENT_MUTATION,
	DELETE_ONBOARDING_ASSIGNMENT_MUTATION
} from '$lib/graphql/onboarding-operations';
import { GET_ALL_DEPARTMENTS_QUERY } from '$lib/graphql/training-operations';

export const load: PageServerLoad = async (event) => {
	logger.info('[ONBOARDING DETAIL SERVER] Load function called', {
		moduleId: event.params.id,
		url: event.url.href,
		pathname: event.url.pathname,
		timestamp: new Date().toISOString()
	});

	requireAuth(event, { requiredRoles: ['Admin', 'HR Manager'] });

	const { id } = event.params;
	const client = GraphQLClient.fromCookies(event.cookies);

	const query = `
		query GetOnboardingModule($id: UUID!) {
			onboardingModule(id: $id) {
				id
				title
				description
				isActive
				category
				tags
				authorId
				createdAt
				updatedAt
			}
			onboardingContentBlocks(onboardingModuleId: $id) {
				id
				title
				type
				sequenceOrder
				isRequired
			}
			onboardingAssignments(onboardingModuleId: $id) {
				id
				userId
				user {
					id
					displayName
					email
				}
				assignedAt
				dueDate
				completedAt
			}
		}
	`;

	try {
		// Fetch module data
		const response = await client.query(query, { id });

		if (response.errors) {
			logger.error('GraphQL errors loading onboarding module:', undefined, { errors: response.errors });
			throw error(500, {
				message: `Failed to load module: ${response.errors[0]?.message || 'Unknown error'}`
			});
		}

		if (!response.data?.onboardingModule) {
			throw error(404, { message: 'Onboarding module not found' });
		}

		// Fetch all users via REST endpoint (defaults to 1000 limit)
		const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://hr-graphql-rust:4000';
		const usersResponse = await fetch(`${apiUrl}/api/users?limit=1000`, {
			credentials: 'include',
			headers: {
				Cookie: event.request.headers.get('cookie') || ''
			}
		});

		if (!usersResponse.ok) {
			logger.error('Failed to fetch users from REST endpoint:', undefined, {
				status: usersResponse.status,
				statusText: usersResponse.statusText
			});
			throw error(500, { message: 'Failed to load users' });
		}

		const allUsers = await usersResponse.json();

		logger.info('[ONBOARDING SERVER] Fetched users count:', { count: allUsers.length });
		logger.info('[ONBOARDING SERVER] Sample user:', { user: allUsers[0] });

		// Fetch all departments for bulk assignment
		const departmentsResponse = await client.query(GET_ALL_DEPARTMENTS_QUERY);

		return {
			module: response.data.onboardingModule,
			contentBlocks: response.data?.onboardingContentBlocks || [],
			assignments: response.data?.onboardingAssignments || [],
			allUsers,
			departments: departmentsResponse.data?.departments || []
		};
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		logger.error('Error loading onboarding module page:', err as Error);
		throw error(500, {
			message: 'Failed to load onboarding module'
		});
	}
};

export const actions: Actions = {
	assign: async ({ request, cookies, params }) => {
		const data = await request.formData();
		const userId = data.get('userId')?.toString();
		const dueDate = data.get('dueDate')?.toString();

		if (!userId) {
			return fail(400, { error: 'User is required' });
		}

		const client = GraphQLClient.fromCookies(cookies);
		const isoDueDate = dueDate ? new Date(dueDate).toISOString() : null;

		const variables = {
			input: {
				userId,
				onboardingModuleId: params.id,
				dueDate: isoDueDate
			}
		};

		try {
			const response = await client.mutation(ASSIGN_ONBOARDING_MUTATION, variables);
			if (response.errors) {
				logger.error('Assignment creation errors:', undefined, { errors: response.errors });
				return fail(500, { error: response.errors[0].message });
			}
		} catch (err) {
			logger.error('Assignment creation error:', err as Error);
			return fail(500, { error: 'Internal server error' });
		}

		return { success: true };
	},

	unassign: async ({ request, cookies }) => {
		const data = await request.formData();
		const assignmentId = data.get('assignmentId')?.toString();

		if (!assignmentId) {
			return fail(400, { error: 'Assignment ID is required' });
		}

		const client = GraphQLClient.fromCookies(cookies);
		const variables = { id: assignmentId };

		try {
			const response = await client.mutation(DELETE_ONBOARDING_ASSIGNMENT_MUTATION, variables);
			if (response.errors) {
				logger.error('Assignment deletion errors:', undefined, { errors: response.errors });
				return fail(500, { error: response.errors[0].message });
			}
		} catch (err) {
			logger.error('Assignment deletion error:', err as Error);
			return fail(500, { error: 'Internal server error' });
		}

		return { success: true };
	},

	assignToDepartment: async ({ request, cookies, params }) => {
		const data = await request.formData();
		const departmentId = data.get('departmentId')?.toString();
		const dueDate = data.get('dueDate')?.toString();

		if (!departmentId) {
			return fail(400, { error: 'Department is required' });
		}

		const client = GraphQLClient.fromCookies(cookies);
		const isoDueDate = dueDate ? new Date(dueDate).toISOString() : null;

		const variables = {
			onboardingModuleId: params.id,
			departmentId,
			dueDate: isoDueDate
		};

		try {
			const response = await client.mutation(ASSIGN_ONBOARDING_TO_DEPARTMENT_MUTATION, variables);
			if (response.errors) {
				logger.error('Bulk assignment errors:', undefined, { errors: response.errors });
				return fail(500, { error: response.errors[0].message });
			}
			const count = response.data?.onboarding?.assignOnboardingToDepartment || 0;
			return { success: true, message: `Assigned to ${count} employee(s)` };
		} catch (err) {
			logger.error('Bulk assignment error:', err as Error);
			return fail(500, { error: 'Internal server error' });
		}
	}
};
