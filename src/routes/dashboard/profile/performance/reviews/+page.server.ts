// User Performance Reviews - Server-Side Data Loading
// Implements proper PostGraphile GraphQL queries with backend initialization
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { GraphQLClient } from '$lib/server/graphql-client';
import { ensureBackendReady } from '$lib/server/backend-init';

export const load: PageServerLoad = async (event) => {
	const { locals, url, cookies } = event;

	// Verify user is authenticated
	if (!locals.user?.id) {
		throw error(401, 'Authentication required');
	}

	// Use authenticated user's ID
	const userId = locals.user.id;

	try {
		// Check backend services are ready before proceeding
		const backendReady = await ensureBackendReady();

		// If backend is not ready, return error state but don't crash
		if (!backendReady) {
			console.warn('Backend not ready for user performance reviews page');
			return {
				user: null,
				userId,
				reviews: [],
				reviewTypes: [],
				competencyAreas: [],
				reviewStats: {
					total: 0,
					completed: 0,
					inProgress: 0,
					scheduled: 0,
					overdue: 0,
					averageRating: 0,
					lastReviewDate: null,
					nextReviewDate: null
				},
				canManageReviews: false,
				isOwnReviews: true,
				permissions: locals.permissions || [],
				loadedAt: new Date().toISOString(),
				error: {
					message: 'Backend services are initializing. Please try again in a moment.',
					details: 'Backend initialization in progress',
					retryable: true
				}
			};
		}

		// Create GraphQL client with authentication
		const graphqlClient = GraphQLClient.fromCookies(cookies);

		// Load user details using new GraphQL client
		const userQuery = `
			query GetUser($id: UUID!) {
				userById(id: $id) {
					id
					email
					firstName
					lastName
					departmentId
					isActive
					departmentByDepartmentId {
						id
						name
						managerId
					}
				}
			}
		`;

		const userData = await graphqlClient.query(userQuery, { id: userId });
		const user = userData.data?.userById;

		if (!user) {
			throw error(404, 'User not found');
		}

		// TODO: Load actual performance reviews from database
		// For now, generate sample data
		const reviewTypes = [
			{ id: '1', name: 'Annual Review', frequency: 'yearly', color: 'blue' },
			{ id: '2', name: 'Mid-Year Review', frequency: 'bi-annual', color: 'green' },
			{ id: '3', name: 'Quarterly Check-in', frequency: 'quarterly', color: 'purple' },
			{ id: '4', name: '90-Day Review', frequency: 'quarterly', color: 'orange' },
			{ id: '5', name: 'Probation Review', frequency: 'one-time', color: 'red' }
		];

		const competencyAreas = [
			'Technical Skills',
			'Communication',
			'Leadership',
			'Problem Solving',
			'Teamwork',
			'Initiative',
			'Quality of Work',
			'Reliability',
			'Adaptability',
			'Customer Focus'
		];

		const currentDate = new Date();

		// Generate sample performance reviews
		const reviews = Array.from({ length: 6 }, (_, i) => {
			const reviewDate = new Date(currentDate);
			reviewDate.setMonth(reviewDate.getMonth() - (i * 6)); // Reviews every 6 months

			const reviewType = reviewTypes[i % reviewTypes.length];
			const statuses = ['completed', 'in_progress', 'scheduled', 'overdue'];
			const status = i === 0 ? 'in_progress' : i === 1 ? 'scheduled' : 'completed';

			// Generate competency ratings (1-5 scale)
			const competencies = competencyAreas.map(area => ({
				name: area,
				rating: Math.floor(Math.random() * 2) + 3.5, // 3.5-5 range for good performance
				feedback: `Strong performance in ${area.toLowerCase()}. Continue to develop skills in this area.`
			}));

			const overallRating = competencies.reduce((sum, c) => sum + c.rating, 0) / competencies.length;

			return {
				id: `review-${i}`,
				type: reviewType,
				status,
				reviewPeriod: {
					start: new Date(reviewDate.getFullYear(), reviewDate.getMonth() - 6, 1).toISOString().split('T')[0],
					end: new Date(reviewDate.getFullYear(), reviewDate.getMonth(), 0).toISOString().split('T')[0]
				},
				scheduledDate: reviewDate.toISOString().split('T')[0],
				completedDate: status === 'completed' ? reviewDate.toISOString().split('T')[0] : null,
				reviewer: {
					id: 'reviewer-1',
					displayName: 'Sarah Johnson',
					email: 'sarah.johnson@company.com'
				},
				overallRating: Math.round(overallRating * 10) / 10,
				competencies,
				goals: Array.from({ length: Math.floor(Math.random() * 3) + 2 }, (_, j) => ({
					id: `goal-${i}-${j}`,
					title: `Performance Goal ${j + 1}`,
					description: `Specific goal set during review period ${i + 1}`,
					status: ['achieved', 'partially_achieved', 'not_achieved'][Math.floor(Math.random() * 3)],
					progress: Math.floor(Math.random() * 100)
				})),
				feedback: {
					strengths: [
						'Excellent technical skills and problem-solving abilities',
						'Strong communication and collaboration with team members',
						'Consistently delivers high-quality work on time'
					],
					improvements: [
						'Could benefit from taking on more leadership responsibilities',
						'Opportunity to mentor junior team members',
						'Continue developing expertise in emerging technologies'
					],
					managerComments: `Overall strong performance during this review period. ${user.firstName} ${user.lastName} has consistently exceeded expectations and shown great potential for growth.`,
					employeeComments: status === 'completed' ? 'I appreciate the feedback and look forward to continuing to grow in my role.' : null
				},
				developmentPlan: [
					'Complete advanced technical training course',
					'Lead a cross-functional project',
					'Attend industry conference or workshop',
					'Shadow senior team member for leadership development'
				],
				createdAt: reviewDate.toISOString(),
				lastUpdated: status === 'in_progress' ? new Date().toISOString() : reviewDate.toISOString()
			};
		});

		// Generate review statistics
		const reviewStats = {
			total: reviews.length,
			completed: reviews.filter(r => r.status === 'completed').length,
			inProgress: reviews.filter(r => r.status === 'in_progress').length,
			scheduled: reviews.filter(r => r.status === 'scheduled').length,
			overdue: reviews.filter(r => r.status === 'overdue').length,
			averageRating: reviews
				.filter(r => r.status === 'completed')
				.reduce((sum, r, _, arr) => sum + r.overallRating / arr.length, 0),
			lastReviewDate: reviews.find(r => r.status === 'completed')?.completedDate,
			nextReviewDate: reviews.find(r => r.status === 'scheduled' || r.status === 'in_progress')?.scheduledDate
		};

		return {
			user,
			userId,
			reviews: reviews.sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()),
			reviewTypes,
			competencyAreas,
			reviewStats,
			canManageReviews: false,
			isOwnReviews: true,
			permissions: locals.permissions || [],
			loadedAt: new Date().toISOString()
		};

	} catch (err) {
		console.error('Error loading user performance reviews:', err);

		// Return error state instead of throwing to prevent page crash
		return {
			user: null,
			userId,
			reviews: [],
			reviewTypes: [],
			competencyAreas: [],
			reviewStats: {
				total: 0,
				completed: 0,
				inProgress: 0,
				scheduled: 0,
				overdue: 0,
				averageRating: 0,
				lastReviewDate: null,
				nextReviewDate: null
			},
			canManageReviews: false,
			isOwnReviews: true,
			permissions: locals.permissions || [],
			loadedAt: new Date().toISOString(),
			error: {
				message: 'Unable to load performance reviews. Please try again later.',
				details: err instanceof Error ? err.message : 'Unknown error',
				retryable: true
			}
		};
	}
};
