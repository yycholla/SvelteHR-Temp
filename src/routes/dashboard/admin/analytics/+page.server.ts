// T028: Analytics Dashboard admin page - server-side data loading
// Admin-only page for system-wide analytics and insights

import type { PageServerLoad } from './$types';
import { createUrqlClient } from '$lib/graphql/client';

export const load: PageServerLoad = async ({ locals, parent }) => {
	// Auth check already done by admin +layout.server.ts
	const { isAdmin } = await parent();

	if (!isAdmin) {
		throw new Error('Admin access required');
	}

	try {
		const client = createUrqlClient();

		// Query aggregate statistics
		const statsQuery = `
			query GetSystemStats {
				allUsers {
					totalCount
				}
				allDepartments {
					totalCount
				}
				allRoles {
					totalCount
				}
			}
		`;

		const result = await client.query(statsQuery, {});

		// Calculate analytics data
		// Note: These are mock calculations - in a real system, you'd query actual metrics
		const now = new Date();
		const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
		const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

		const analytics = {
			overview: {
				totalUsers: result.data?.allUsers?.totalCount || 0,
				activeUsers: Math.floor((result.data?.allUsers?.totalCount || 0) * 0.85), // 85% active
				totalDepartments: result.data?.allDepartments?.totalCount || 0,
				totalRoles: result.data?.allRoles?.totalCount || 0
			},
			growth: {
				usersThisMonth: Math.floor((result.data?.allUsers?.totalCount || 0) * 0.15),
				usersLastMonth: Math.floor((result.data?.allUsers?.totalCount || 0) * 0.12),
				userGrowthPercent: 25.0
			},
			activity: {
				dailyActiveUsers: Math.floor((result.data?.allUsers?.totalCount || 0) * 0.6),
				weeklyActiveUsers: Math.floor((result.data?.allUsers?.totalCount || 0) * 0.75),
				monthlyActiveUsers: Math.floor((result.data?.allUsers?.totalCount || 0) * 0.85)
			},
			departments: {
				largest: { name: 'Engineering', count: 45 },
				smallest: { name: 'Legal', count: 3 },
				avgSize: 12.5
			}
		};

		// Mock chart data for user growth (last 6 months)
		const chartData = {
			userGrowth: [
				{ month: 'Jul', users: 120 },
				{ month: 'Aug', users: 135 },
				{ month: 'Sep', users: 142 },
				{ month: 'Oct', users: 158 },
				{ month: 'Nov', users: 171 },
				{ month: 'Dec', users: analytics.overview.totalUsers }
			],
			departmentDistribution: [
				{ department: 'Engineering', count: 45 },
				{ department: 'Sales', count: 28 },
				{ department: 'Marketing', count: 18 },
				{ department: 'HR', count: 12 },
				{ department: 'Finance', count: 15 },
				{ department: 'Operations', count: 22 },
				{ department: 'Legal', count: 3 }
			],
			roleDistribution: [
				{ role: 'Employee', count: Math.floor(analytics.overview.totalUsers * 0.7) },
				{ role: 'Manager', count: Math.floor(analytics.overview.totalUsers * 0.2) },
				{ role: 'HR Manager', count: Math.floor(analytics.overview.totalUsers * 0.05) },
				{ role: 'Admin', count: Math.floor(analytics.overview.totalUsers * 0.05) }
			]
		};

		return {
			analytics,
			chartData
		};
	} catch (error) {
		console.error('[ADMIN ANALYTICS] Load error:', error);
		return {
			analytics: {
				overview: { totalUsers: 0, activeUsers: 0, totalDepartments: 0, totalRoles: 0 },
				growth: { usersThisMonth: 0, usersLastMonth: 0, userGrowthPercent: 0 },
				activity: { dailyActiveUsers: 0, weeklyActiveUsers: 0, monthlyActiveUsers: 0 },
				departments: { largest: { name: '—', count: 0 }, smallest: { name: '—', count: 0 }, avgSize: 0 }
			},
			chartData: {
				userGrowth: [],
				departmentDistribution: [],
				roleDistribution: []
			},
			error: 'Failed to load analytics data'
		};
	}
};
