// Server-side data loading for user performance reviews page
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { PermissionChecks, getUserPermissions } from '$lib/server/rbac-utils';

export const load: PageServerLoad = async (event) => {
	const { locals, params, url } = event;

	// RBAC: Check performance review access permissions
	PermissionChecks.dashboard(event);

	// Verify user can access this review data (own data or has management permissions)
	let userId = params.id;

	// TEMPORARY FIX: Handle legacy user ID mapping
	if (userId === '1' && locals.user?.email === 'admin@postgraphile-hr.com') {
		userId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
	}

	const canViewOthers = locals.roles?.includes('admin') || locals.roles?.includes('manager');

	if (!canViewOthers && locals.user?.id !== userId) {
		throw error(403, {
			message: 'Access denied: You can only view your own performance reviews'
		});
	}

	try {
		// Make direct GraphQL calls to PostGraphile backend
		const graphqlEndpoint = 'http://localhost:4000/graphql';
		const headers: Record<string, string> = {
			'Content-Type': 'application/json'
		};

		// Load user details
		const userResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
					query GetUser($id: UUID!) {
						userById(id: $id) {
							id
							email
							displayName
							role
							departmentId
							departmentByDepartmentId {
								id
								name
								userByManagerId {
									id
									displayName
									email
								}
							}
						}
					}
				`,
				variables: { id: userId }
			})
		});

		const userData = await userResponse.json();
		const user = userData?.data?.userById;

		if (!user) {
			throw error(404, { message: 'User not found' });
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
				reviewer: user.departmentByDepartmentId?.userByManagerId || {
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
					managerComments: `Overall strong performance during this review period. ${user.displayName} has consistently exceeded expectations and shown great potential for growth.`,
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

		// Get standardized user permissions
		const userPermissions = getUserPermissions(locals);

		return {
			user,
			userId,
			reviews: reviews.sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()),
			reviewTypes,
			competencyAreas,
			reviewStats,
			canManageReviews: canViewOthers,
			isOwnReviews: locals.user?.id === userId,
			...userPermissions,
			loadedAt: new Date().toISOString()
		};

	} catch (err) {
		console.error('[User Performance Reviews Load Error]', err);

		throw error(500, {
			message: 'Unable to load performance reviews. Please try again later.'
		});
	}
};