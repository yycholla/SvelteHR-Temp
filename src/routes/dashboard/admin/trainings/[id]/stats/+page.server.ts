import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { logger } from '$lib/utils/logger';
import { GraphQLClient } from '$lib/server/graphql-client';
import { requireAuth } from '$lib/server/rbac-utils';

export const load: PageServerLoad = async (event) => {
	requireAuth(event, { requiredRoles: ['Admin', 'HR Manager'] });

	const { id } = event.params;
	const client = GraphQLClient.fromCookies(event.cookies);

	// Fetch training details
	const trainingQuery = `
		query GetTraining($id: UUID!) {
			training(id: $id) {
				id
				title
				description
				startDate
				endDate
				isActive
				createdAt
			}
		}
	`;

	const trainingResponse = await client.query(trainingQuery, { id });

	if (!trainingResponse.data?.training) {
		throw redirect(303, '/dashboard/admin/trainings');
	}

	// Fetch assignments with user details and progress
	const assignmentsQuery = `
		query GetTrainingAssignments($trainingId: UUID!) {
			trainingAssignments(trainingId: $trainingId) {
				id
				userId
				trainingId
				assignedAt
				dueDate
				user {
					id
					email
					displayName
					departmentId
				}
			}
		}
	`;

	const assignmentsResponse = await client.query(assignmentsQuery, { trainingId: id });

	if (assignmentsResponse.errors) {
		logger.error('Assignments query error:', undefined, { errors: assignmentsResponse.errors });
	}

	const assignments = assignmentsResponse.data?.trainingAssignments || [];

	// Fetch content count
	const contentsQuery = `
		query GetTrainingContents($trainingId: UUID!) {
			trainingContents(trainingId: $trainingId) {
				id
			}
		}
	`;

	const contentsResponse = await client.query(contentsQuery, { trainingId: id });
	const totalContents = contentsResponse.data?.trainingContents?.length || 0;

	// Fetch progress for each assigned user
	const assignmentsWithProgress = await Promise.all(
		assignments.map(async (assignment: any) => {
			// Calculate days until due date
			const daysSinceAssigned = assignment.assignedAt
				? Math.floor(
						(new Date().getTime() - new Date(assignment.assignedAt).getTime()) /
							(1000 * 60 * 60 * 24)
					)
				: 0;

			const daysUntilDue = assignment.dueDate
				? Math.floor(
						(new Date(assignment.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
					)
				: null;

			// Fetch progress for this user
			const progressQuery = `
				query GetTrainingProgress($trainingId: UUID!, $userId: UUID!) {
					trainingProgress(trainingId: $trainingId, userId: $userId) {
						id
						trainingContentId
						status
						completedAt
					}
				}
			`;

			let completedCount = 0;
			let completionPercentage = 0;

			try {
				const progressResponse = await client.query(progressQuery, {
					trainingId: id,
					userId: assignment.userId
				});

				if (!progressResponse.errors && progressResponse.data?.trainingProgress) {
					const progress = progressResponse.data.trainingProgress;
					completedCount = progress.filter((p: any) => p.status === 'COMPLETED').length;
					completionPercentage =
						totalContents > 0 ? Math.round((completedCount / totalContents) * 100) : 0;
				}
			} catch (err) {
				logger.error('Error fetching progress for user', err as Error, {
					userId: assignment.userId
				});
			}

			return {
				...assignment,
				daysSinceAssigned,
				daysUntilDue,
				totalContents,
				completedCount,
				completionPercentage,
				status:
					completionPercentage === 100
						? 'Completed'
						: completionPercentage > 0
							? 'In Progress'
							: 'Not Started'
			};
		})
	);

	// Calculate statistics with completion data
	const completedAssignments = assignmentsWithProgress.filter(
		(a) => a.status === 'Completed'
	).length;
	const inProgressAssignments = assignmentsWithProgress.filter(
		(a) => a.status === 'In Progress'
	).length;
	const notStartedAssignments = assignmentsWithProgress.filter(
		(a) => a.status === 'Not Started'
	).length;

	const stats = {
		totalAssigned: assignmentsWithProgress.length,
		completed: completedAssignments,
		inProgress: inProgressAssignments,
		notStarted: notStartedAssignments,
		withDueDate: assignmentsWithProgress.filter((a) => a.dueDate !== null).length,
		overdue: assignmentsWithProgress.filter((a) => a.daysUntilDue !== null && a.daysUntilDue < 0)
			.length,
		dueSoon: assignmentsWithProgress.filter(
			(a) => a.daysUntilDue !== null && a.daysUntilDue >= 0 && a.daysUntilDue <= 7
		).length,
		averageCompletion:
			assignmentsWithProgress.length > 0
				? Math.round(
						assignmentsWithProgress.reduce((sum, a) => sum + a.completionPercentage, 0) /
							assignmentsWithProgress.length
					)
				: 0
	};

	return {
		training: trainingResponse.data.training,
		assignments: assignmentsWithProgress,
		stats,
		totalContents
	};
};
