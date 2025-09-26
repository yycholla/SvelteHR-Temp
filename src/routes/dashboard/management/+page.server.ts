// Server-side data loading for management dashboard overview
// T043: Fix management index page with standardized error handling

import type { PageServerLoad } from './$types';
import { PermissionChecks, getUserPermissions } from '$lib/server/rbac-utils';
import { createLeaveManagementOperations } from '$lib/graphql/leave-management-operations';
import { createPerformanceOperations } from '$lib/graphql/performance-management-operations';
import { createGoalsOKROperations } from '$lib/graphql/goals-okrs-operations';
import { createReportsOperations } from '$lib/graphql/reports-operations';

export const load: PageServerLoad = async (event) => {
	const { locals, cookies, url } = event;

	// RBAC: Check management dashboard access permissions
	PermissionChecks.management(event);

	// Import required models for standardized error handling
	const { createDataRequest } = await import('$lib/models/data-request');
	const { createErrorResponse } = await import('$lib/models/error-response');
	const { createUserSession } = await import('$lib/models/user-session');

	// Create user session from server locals
	const userSession = createUserSession({
		userId: locals.user.id,
		userEmail: locals.user.email,
		displayName: locals.user.display_name || locals.user.email,
		role: locals.user.role || 'employee',
		permissions: locals.permissions || [],
		accessToken: cookies.get('hr_token') || '',
		tokenExpiry: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
		isValid: true
	});

	// Extract period filter from URL (default to current month)
	const selectedPeriod = url.searchParams.get('period') || 'this-month';
	const selectedTeamId = url.searchParams.get('team') || '';

	// Create data request for management dashboard data
	const dataRequest = createDataRequest({
		operationName: 'GetManagementDashboard',
		variables: {
			managerId: userSession.userId,
			period: selectedPeriod,
			teamId: selectedTeamId
		},
		userCredentials: {
			userId: userSession.userId,
			userEmail: userSession.userEmail,
			role: userSession.role,
			accessToken: userSession.accessToken
		},
		timeoutMs: 5000,
		retryAttempts: 0,
		maxRetries: 3
	});

	try {
		// Create operations instances
		const leaveOps = createLeaveManagementOperations(null);
		const performanceOps = createPerformanceOperations(null);
		const goalsOps = createGoalsOKROperations(null);
		const reportsOps = createReportsOperations(null);

		// Fetch all dashboard data in parallel
		const [pendingLeaves, pendingReviews, teamGoals, recentReports] = await Promise.all([
			// Pending leave requests for manager approval
			leaveOps.getLeaveRequests({
				first: 10,
				filter: {
					status: 'pending',
					managerId: userSession.userId
				},
				orderBy: ['CREATED_AT_DESC'],
				userCredentials: {
					userId: userSession.userId,
					userEmail: userSession.userEmail,
					role: userSession.role,
					accessToken: userSession.accessToken
				}
			}).catch(() => ({ nodes: [], totalCount: 0 })),

			// Pending performance reviews for manager
			performanceOps.getPerformanceReviews({
				first: 10,
				filter: {
					status: 'pending',
					managerId: userSession.userId
				},
				orderBy: ['DUE_DATE_ASC'],
				userCredentials: {
					userId: userSession.userId,
					userEmail: userSession.userEmail,
					role: userSession.role,
					accessToken: userSession.accessToken
				}
			}).catch(() => ({ nodes: [], totalCount: 0 })),

			// Team goals and OKRs
			goalsOps.getTeamGoals({
				first: 20,
				filter: {
					status: 'active',
					teamId: selectedTeamId || undefined
				},
				orderBy: ['TARGET_DATE_ASC'],
				userCredentials: {
					userId: userSession.userId,
					userEmail: userSession.userEmail,
					role: userSession.role,
					accessToken: userSession.accessToken
				}
			}).catch(() => ({ nodes: [], totalCount: 0 })),

			// Recent reports
			reportsOps.getHRReports({
				first: 10,
				filter: {
					createdBy: userSession.userId
				},
				orderBy: ['CREATED_AT_DESC'],
				userCredentials: {
					userId: userSession.userId,
					userEmail: userSession.userEmail,
					role: userSession.role,
					accessToken: userSession.accessToken
				}
			}).catch(() => ({ nodes: [], totalCount: 0 }))
		]);

		// Calculate dashboard analytics
		const dashboardAnalytics = {
			leaveRequests: {
				pending: pendingLeaves.nodes.length,
				approved: pendingLeaves.nodes.filter(l => l.status === 'approved').length,
				rejected: pendingLeaves.nodes.filter(l => l.status === 'rejected').length,
				totalThisMonth: pendingLeaves.totalCount || 0
			},
			performanceReviews: {
				pending: pendingReviews.nodes.length,
				overdue: pendingReviews.nodes.filter(r => new Date(r.dueDate) < new Date()).length,
				completed: pendingReviews.nodes.filter(r => r.status === 'completed').length,
				avgRating: pendingReviews.nodes.length > 0
					? Number((pendingReviews.nodes.reduce((sum, r) => sum + (r.overallRating || 0), 0) / pendingReviews.nodes.length).toFixed(1))
					: 0
			},
			teamGoals: {
				active: teamGoals.nodes.length,
				overdue: teamGoals.nodes.filter(g => new Date(g.targetDate) < new Date() && g.status !== 'completed').length,
				atRisk: teamGoals.nodes.filter(g => g.progress < 50 && new Date(g.targetDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).length,
				avgProgress: teamGoals.nodes.length > 0
					? Math.round(teamGoals.nodes.reduce((sum, g) => sum + (g.progress || 0), 0) / teamGoals.nodes.length)
					: 0,
				completed: teamGoals.nodes.filter(g => g.status === 'completed').length
			},
			reports: {
				generated: recentReports.nodes.filter(r => r.status === 'active').length,
				scheduled: recentReports.nodes.filter(r => r.isRecurring).length,
				failed: recentReports.nodes.filter(r => r.status === 'archived').length,
				totalThisMonth: recentReports.totalCount || 0
			},
			teamStats: {
				totalEmployees: 42, // Mock data - would come from employee operations
				activeEmployees: 40,
				departmentCount: 5,
				avgTenure: '2.5 years'
			}
		};

		// Generate recent activities from all data sources
		const recentActivities = [
			// Recent leave requests
			...pendingLeaves.nodes.slice(0, 3).map((leave: any) => ({
				id: `leave-${leave.id}`,
				type: 'leave_request',
				title: `${leave.employee?.displayName || 'Employee'} requested ${leave.leaveType} leave`,
				description: `${new Date(leave.startDate).toLocaleDateString()} - ${new Date(leave.endDate).toLocaleDateString()} (${leave.daysRequested} days)`,
				timestamp: leave.createdAt,
				icon: 'Calendar',
				color: 'blue',
				href: `/dashboard/management/leave-approvals?highlight=${leave.id}`
			})),
			// Pending reviews
			...pendingReviews.nodes.slice(0, 3).map((review: any) => ({
				id: `review-${review.id}`,
				type: 'performance_review',
				title: `Performance review due for ${review.employee?.displayName || 'Employee'}`,
				description: `Due: ${new Date(review.dueDate).toLocaleDateString()} - ${review.reviewType}`,
				timestamp: review.createdAt,
				icon: 'Award',
				color: 'green',
				href: `/dashboard/management/reviews?highlight=${review.id}`
			})),
			// Goal updates
			...teamGoals.nodes.slice(0, 2).map((goal: any) => ({
				id: `goal-${goal.id}`,
				type: 'goal_update',
				title: `Goal progress: ${goal.title}`,
				description: `${goal.progress || 0}% complete - Target: ${new Date(goal.targetDate).toLocaleDateString()}`,
				timestamp: goal.updatedAt,
				icon: 'Target',
				color: 'purple',
				href: `/dashboard/management/goals?highlight=${goal.id}`
			})),
			// Recent reports
			...recentReports.nodes.slice(0, 2).map((report: any) => ({
				id: `report-${report.id}`,
				type: 'report_generated',
				title: `Report generated: ${report.title}`,
				description: `Type: ${report.reportType} - Generated: ${report.generatedCount} times`,
				timestamp: report.createdAt,
				icon: 'FileText',
				color: 'orange',
				href: `/dashboard/management/reports?highlight=${report.id}`
			}))
		].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 8);

		// Generate performance metrics
		const performanceMetrics = [
			{
				label: 'Leave Approval Rate',
				value: dashboardAnalytics.leaveRequests.pending > 0 ?
					Math.round((dashboardAnalytics.leaveRequests.approved / (dashboardAnalytics.leaveRequests.approved + dashboardAnalytics.leaveRequests.rejected || 1)) * 100) : 0,
				target: 85,
				color: 'blue'
			},
			{
				label: 'Review Completion',
				value: Math.round((dashboardAnalytics.performanceReviews.completed / (dashboardAnalytics.performanceReviews.completed + dashboardAnalytics.performanceReviews.pending || 1)) * 100),
				target: 95,
				color: 'green'
			},
			{
				label: 'Goal Progress',
				value: dashboardAnalytics.teamGoals.avgProgress,
				target: 80,
				color: 'purple'
			},
			{
				label: 'Report Success Rate',
				value: Math.round((dashboardAnalytics.reports.generated / (dashboardAnalytics.reports.generated + dashboardAnalytics.reports.failed || 1)) * 100),
				target: 98,
				color: 'orange'
			}
		];

		// Generate alerts based on dashboard data
		const alerts = [
			...(dashboardAnalytics.teamGoals.overdue > 0 ? [{
				type: 'warning' as const,
				title: `${dashboardAnalytics.teamGoals.overdue} Overdue Goals`,
				message: 'Some team goals have passed their target date and need attention.',
				action: 'View Goals',
				href: '/dashboard/management/goals'
			}] : []),
			...(dashboardAnalytics.performanceReviews.overdue > 0 ? [{
				type: 'error' as const,
				title: `${dashboardAnalytics.performanceReviews.overdue} Overdue Reviews`,
				message: 'Performance reviews are past due and require immediate attention.',
				action: 'View Reviews',
				href: '/dashboard/management/reviews'
			}] : []),
			...(dashboardAnalytics.leaveRequests.pending > 5 ? [{
				type: 'info' as const,
				title: `${dashboardAnalytics.leaveRequests.pending} Pending Leave Requests`,
				message: 'Multiple leave requests are waiting for your approval.',
				action: 'Review Requests',
				href: '/dashboard/management/leave-approvals'
			}] : [])
		];

		// Quick actions with counts
		const quickActions = [
			{
				title: 'Approve Leave Requests',
				description: 'Review and approve pending leave requests',
				icon: 'Calendar',
				href: '/dashboard/management/leave-approvals',
				count: dashboardAnalytics.leaveRequests.pending,
				color: 'blue'
			},
			{
				title: 'Performance Reviews',
				description: 'Complete pending performance reviews',
				icon: 'Award',
				href: '/dashboard/management/reviews',
				count: dashboardAnalytics.performanceReviews.pending,
				color: 'green'
			},
			{
				title: 'Team Goals',
				description: 'Track team goals and OKRs',
				icon: 'Target',
				href: '/dashboard/management/goals',
				count: dashboardAnalytics.teamGoals.active,
				color: 'purple'
			},
			{
				title: 'Generate Reports',
				description: 'Create team analytics reports',
				icon: 'FileText',
				href: '/dashboard/management/reports',
				count: dashboardAnalytics.reports.totalThisMonth,
				color: 'orange'
			}
		];

		// Get standardized user permissions
		const userPermissions = getUserPermissions(locals);

		// Return server-side loaded dashboard data with RBAC permissions
		return {
			user: userPermissions.user,
			userSession,
			dashboardAnalytics,
			recentActivities,
			performanceMetrics,
			alerts,
			quickActions,
			filters: {
				selectedPeriod,
				selectedTeamId
			},
			// RBAC: Standardized permission checks
			...userPermissions,
			loadedAt: new Date().toISOString()
		};
	} catch (err) {
		console.error('[Management Dashboard Load Error]', err);

		// Create standardized error response
		const errorResponse = createErrorResponse(err instanceof Error ? err : new Error('Management dashboard load failed'), {
			type: 'DATA_LOAD_ERROR',
			userMessage: 'Unable to load management dashboard. Please refresh the page or try again later.'
		});

		// Log error details for debugging
		console.error('[Management Dashboard Error Details]', {
			userId: locals.user?.id,
			userRole: locals.user?.role,
			selectedPeriod,
			selectedTeamId,
			error: errorResponse
		});

		// Throw SvelteKit error with user-friendly message
		throw error(500, {
			message: 'Management dashboard temporarily unavailable',
			details: errorResponse.userMessage
		});
	}
};