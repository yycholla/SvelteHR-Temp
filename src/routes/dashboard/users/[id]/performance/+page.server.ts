// Server-side data loading for user performance/goals page
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { PermissionChecks, getUserPermissions } from '$lib/server/rbac-utils';

export const load: PageServerLoad = async (event) => {
	const { locals, params, url } = event;

	// RBAC: Check performance management access permissions
	PermissionChecks.dashboard(event);

	// Verify user can access this performance data (own data or has management permissions)
	let userId = params.id;

	const canViewOthers = locals.roles?.includes('admin') || locals.roles?.includes('manager');

	if (!canViewOthers && locals.user?.id !== userId) {
		throw error(403, {
			message: 'Access denied: You can only view your own performance data'
		});
	}

	try {
		// Make direct GraphQL calls to PostGraphile backend
		const { getGraphQLEndpoint } = await import('$lib/server/api-url');
		const graphqlEndpoint = getGraphQLEndpoint();
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

		// TODO: Load actual goals and OKRs from database
		// For now, generate sample data
		const goalCategories = [
			{ id: '1', name: 'Professional Development', color: 'blue' },
			{ id: '2', name: 'Performance', color: 'green' },
			{ id: '3', name: 'Leadership', color: 'purple' },
			{ id: '4', name: 'Skills & Learning', color: 'orange' },
			{ id: '5', name: 'Team Collaboration', color: 'pink' }
		];

		const currentDate = new Date();
		const quarterStart = new Date(currentDate.getFullYear(), Math.floor(currentDate.getMonth() / 3) * 3, 1);
		const quarterEnd = new Date(quarterStart);
		quarterEnd.setMonth(quarterEnd.getMonth() + 3);
		quarterEnd.setDate(0); // Last day of quarter

		// Generate sample goals/OKRs
		const goals = Array.from({ length: 8 }, (_, i) => {
			const category = goalCategories[Math.floor(Math.random() * goalCategories.length)];
			const statuses = ['not_started', 'in_progress', 'completed', 'at_risk', 'blocked'];
			const status = statuses[Math.floor(Math.random() * statuses.length)];
			const progress = status === 'completed' ? 100 : status === 'not_started' ? 0 : Math.floor(Math.random() * 80) + 10;

			const goalTitles = [
				'Complete Advanced Leadership Training',
				'Improve Team Communication Skills',
				'Increase Customer Satisfaction Score',
				'Learn New Programming Framework',
				'Mentor Junior Team Members',
				'Optimize Department Workflow',
				'Achieve Sales Target Goals',
				'Implement Process Improvements'
			];

			return {
				id: `goal-${i}`,
				title: goalTitles[i] || `Goal ${i + 1}`,
				description: `Detailed description for ${goalTitles[i] || `Goal ${i + 1}`}. This goal focuses on ${category.name.toLowerCase()} and aims to improve overall performance and contribution to the team.`,
				category,
				status,
				progress,
				priority: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)],
				startDate: quarterStart.toISOString().split('T')[0],
				targetDate: quarterEnd.toISOString().split('T')[0],
				createdAt: new Date(quarterStart.getTime() + (i * 7 * 24 * 60 * 60 * 1000)).toISOString(),
				lastUpdated: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)).toISOString(),
				assignedBy: user.departmentByDepartmentId?.userByManagerId || null,
				keyResults: Array.from({ length: Math.floor(Math.random() * 3) + 2 }, (_, j) => ({
					id: `kr-${i}-${j}`,
					description: `Key result ${j + 1} for ${goalTitles[i]}`,
					target: Math.floor(Math.random() * 100) + 50,
					current: Math.floor(Math.random() * 80) + 10,
					unit: ['%', 'points', 'hours', 'items', 'users'][Math.floor(Math.random() * 5)]
				}))
			};
		});

		// Generate goal statistics
		const goalStats = {
			total: goals.length,
			completed: goals.filter(g => g.status === 'completed').length,
			inProgress: goals.filter(g => g.status === 'in_progress').length,
			atRisk: goals.filter(g => g.status === 'at_risk').length,
			notStarted: goals.filter(g => g.status === 'not_started').length,
			blocked: goals.filter(g => g.status === 'blocked').length,
			averageProgress: Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / goals.length),
			completionRate: Math.round((goals.filter(g => g.status === 'completed').length / goals.length) * 100)
		};

		// Get standardized user permissions
		const userPermissions = getUserPermissions(locals);

		return {
			user,
			userId,
			goals: goals.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()),
			goalCategories,
			goalStats,
			currentQuarter: {
				start: quarterStart.toISOString().split('T')[0],
				end: quarterEnd.toISOString().split('T')[0],
				name: `Q${Math.floor(currentDate.getMonth() / 3) + 1} ${currentDate.getFullYear()}`
			},
			canManageGoals: canViewOthers,
			isOwnGoals: locals.user?.id === userId,
			...userPermissions,
			loadedAt: new Date().toISOString()
		};

	} catch (err) {
		console.error('[User Performance Load Error]', err);

		throw error(500, {
			message: 'Unable to load performance data. Please try again later.'
		});
	}
};