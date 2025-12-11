import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { logger } from '$lib/utils/logger';
import { GraphQLClient } from '$lib/server/graphql-client';
import { requireAuth } from '$lib/server/rbac-utils';
import {
	ASSIGN_TO_ALL_EMPLOYEES_MUTATION,
	ASSIGN_TO_DEPARTMENT_MUTATION,
	CREATE_ASSIGNMENT_MUTATION,
	DELETE_ASSIGNMENT_MUTATION,
	GET_ALL_DEPARTMENTS_QUERY,
	GET_TRAINING_ASSIGNMENTS_QUERY
} from '$lib/graphql/training-operations';

export const load: PageServerLoad = async (event) => {
	requireAuth(event, { requiredRoles: ['Admin', 'HR Manager'] });

	const { id } = event.params;
	const client = GraphQLClient.fromCookies(event.cookies);

	const trainingQuery = `
        query GetTraining($id: UUID!) {
            training(id: $id) {
                id
                title
                description
                startDate
                endDate
                isActive
                metaTitle
                metaDescription
                tags
                authorId
            }
        }
    `;

	// Fetch training details
	const trainingResponse = await client.query(trainingQuery, { id });

	if (!trainingResponse.data?.training) {
		throw redirect(303, '/dashboard/admin/trainings');
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
		logger.error('Failed to fetch users from REST endpoint:', {
			status: usersResponse.status,
			statusText: usersResponse.statusText
		});
		throw fail(500, { error: 'Failed to load users' });
	}

	const allUsers = await usersResponse.json();

	// Fetch all departments for bulk assignment
	const departmentsResponse = await client.query(GET_ALL_DEPARTMENTS_QUERY);

	// Fetch existing assignments for this training
	let assignments = [];
	const assignmentsResponse = await client.query(GET_TRAINING_ASSIGNMENTS_QUERY, {
		trainingId: id
	});

	if (assignmentsResponse.errors) {
		logger.error('Training assignments query error:', {
			message: assignmentsResponse.errors[0]?.message
		});
	} else {
		assignments = assignmentsResponse.data?.trainingAssignments || [];
	}

	return {
		training: trainingResponse.data.training,
		allUsers,
		departments: departmentsResponse.data?.departments || [],
		assignments
	};
};

export const actions: Actions = {
	update: async ({ request, cookies, params }) => {
		const data = await request.formData();
		const id = params.id;
		const title = data.get('title')?.toString();
		const description = data.get('description')?.toString();
		const startDate = data.get('startDate')?.toString();
		const endDate = data.get('endDate')?.toString();
		const isActive = data.get('isActive') === 'on';

		const metaTitle = data.get('metaTitle')?.toString();
		const metaDescription = data.get('metaDescription')?.toString();
		const tagsJson = data.get('tags')?.toString();
		const authorId = data.get('authorId')?.toString();
		const recurrencePatternJson = data.get('recurrencePattern')?.toString();

		let tags: string[] | null = null;
		try {
			if (tagsJson) {
				tags = JSON.parse(tagsJson);
			}
		} catch (e) {
			logger.error('Failed to parse tags:', e as Error);
		}

		// Parse recurrence pattern
		let rrule: string | null = null;
		let recurrenceEndDate: string | null = null;
		try {
			if (recurrencePatternJson && recurrencePatternJson !== 'null') {
				const pattern = JSON.parse(recurrencePatternJson);
				if (pattern?.rruleString) {
					rrule = pattern.rruleString;
					if (pattern.endDate) {
						recurrenceEndDate = new Date(pattern.endDate).toISOString();
					}
				}
			}
		} catch (e) {
			logger.error('Failed to parse recurrence pattern:', e as Error);
		}

		if (!title) {
			return fail(400, { error: 'Title is required' });
		}

		const client = GraphQLClient.fromCookies(cookies);

		const mutation = `
            mutation UpdateTraining($id: UUID!, $input: UpdateTrainingInput!) {
                training {
                    updateTraining(id: $id, input: $input) {
                        id
                    }
                }
            }
        `;

		// Format dates to ISO strings if present
		const isoStartDate = startDate ? new Date(startDate).toISOString() : null;
		const isoEndDate = endDate ? new Date(endDate).toISOString() : null;

		const variables = {
			id,
			input: {
				title,
				description: description || null,
				startDate: isoStartDate,
				endDate: isoEndDate,
				isActive,
				metaTitle: metaTitle || null,
				metaDescription: metaDescription || null,
				tags: tags && tags.length > 0 ? tags : null,
				authorId: authorId || null,
				rrule,
				recurrenceEndDate
			}
		};

		try {
			const response = await client.mutation(mutation, variables);
			if (response.errors) {
				logger.error('Update training errors:', undefined, { errors: response.errors });
				return fail(500, { error: response.errors[0].message });
			}
		} catch (err) {
			logger.error('Update training error:', err as Error);
			return fail(500, { error: 'Internal server error' });
		}

		return { success: true };
	},

	assign: async ({ request, cookies, params }) => {
		const data = await request.formData();
		const trainingId = params.id;
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
				trainingId,
				dueDate: isoDueDate
			}
		};

		try {
			const response = await client.mutation(CREATE_ASSIGNMENT_MUTATION, variables);
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
			const response = await client.mutation(DELETE_ASSIGNMENT_MUTATION, variables);
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
		const trainingId = params.id;
		const departmentId = data.get('departmentId')?.toString();
		const dueDate = data.get('dueDate')?.toString();

		if (!departmentId) {
			return fail(400, { error: 'Department is required' });
		}

		const client = GraphQLClient.fromCookies(cookies);
		const isoDueDate = dueDate ? new Date(dueDate).toISOString() : null;

		const variables = {
			trainingId,
			departmentId,
			dueDate: isoDueDate
		};

		try {
			const response = await client.mutation(ASSIGN_TO_DEPARTMENT_MUTATION, variables);
			if (response.errors) {
				logger.error('Bulk assignment errors:', undefined, { errors: response.errors });
				return fail(500, { error: response.errors[0].message });
			}
			const count = response.data?.training?.assignTrainingToDepartment || 0;
			return { success: true, message: `Assigned to ${count} employee(s)` };
		} catch (err) {
			logger.error('Bulk assignment error:', err as Error);
			return fail(500, { error: 'Internal server error' });
		}
	},

	assignToAllEmployees: async ({ request, cookies, params }) => {
		const data = await request.formData();
		const trainingId = params.id;
		const dueDate = data.get('dueDate')?.toString();

		const client = GraphQLClient.fromCookies(cookies);
		const isoDueDate = dueDate ? new Date(dueDate).toISOString() : null;

		const variables = {
			trainingId,
			dueDate: isoDueDate
		};

		try {
			const response = await client.mutation(ASSIGN_TO_ALL_EMPLOYEES_MUTATION, variables);
			if (response.errors) {
				logger.error('Bulk assignment errors:', undefined, { errors: response.errors });
				return fail(500, { error: response.errors[0].message });
			}
			const count = response.data?.training?.assignTrainingToAllEmployees || 0;
			return { success: true, message: `Assigned to ${count} employee(s)` };
		} catch (err) {
			logger.error('Bulk assignment error:', err as Error);
			return fail(500, { error: 'Internal server error' });
		}
	}
};
