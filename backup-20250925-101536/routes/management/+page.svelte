<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { getOperationStore, queryStore } from '@urql/svelte';
	import { toast } from 'svelte-sonner';
	import {
		Users, Clock, Target, FileText, TrendingUp, AlertCircle,
		CheckCircle, Calendar, BarChart, Activity, Award, MapPin
	} from 'lucide-svelte';

	// Import operations from different modules for comprehensive dashboard
	import {
		GET_PENDING_LEAVE_REQUESTS,
		formatDateRange
	} from '$lib/graphql/leave-management-operations';
	import {
		GET_PENDING_REVIEWS_FOR_MANAGER,
		calculateAverageRating,
		getRatingInfo
	} from '$lib/graphql/performance-management-operations';
	import {
		GET_TEAM_GOALS,
		calculateGoalCompletion,
		isGoalOverdue,
		isGoalAtRisk
	} from '$lib/graphql/goals-okrs-operations';
	import {
		GET_TEAM_REPORTS,
		getReportTypeInfo,
		getReportStatusInfo
	} from '$lib/graphql/team-reports-operations';

	// Page data from server
	export let data;

	// Local state using Svelte 5 runes
	let selectedTeamId = $state('');
	let selectedPeriod = $state('this-month');
	let dashboardData = $state({
		teamStats: {
			totalEmployees: 0,
			activeEmployees: 0,
			departmentCount: 0,
			avgTenure: '0 years'
		},
		leaveRequests: {
			pending: 0,
			approved: 0,
			rejected: 0,
			thisWeek: 0
		},
		performanceReviews: {
			pending: 0,
			completed: 0,
			overdue: 0,
			avgRating: 0
		},
		goals: {
			active: 0,
			completed: 0,
			overdue: 0,
			atRisk: 0,
			avgProgress: 0
		},
		reports: {
			generated: 0,
			scheduled: 0,
			failed: 0,
			lastWeek: 0
		}
	});

	// Quick actions data
	let quickActions = $state([
		{
			title: 'Approve Leave Requests',
			description: 'Review and approve pending leave requests',
			icon: Calendar,
			href: '/dashboard/management/leave-approvals',
			count: 0,
			color: 'blue',
			testId: 'quick-leave-approvals'
		},
		{
			title: 'Performance Reviews',
			description: 'Complete pending performance reviews',
			icon: Award,
			href: '/dashboard/management/reviews',
			count: 0,
			color: 'green',
			testId: 'quick-reviews'
		},
		{
			title: 'Team Goals',
			description: 'Track team goals and OKRs',
			icon: Target,
			href: '/dashboard/management/goals',
			count: 0,
			color: 'purple',
			testId: 'quick-goals'
		},
		{
			title: 'Generate Reports',
			description: 'Create team analytics reports',
			icon: FileText,
			href: '/dashboard/management/reports',
			count: 0,
			color: 'orange',
			testId: 'quick-reports'
		}
	]);

	// Recent activities data
	let recentActivities = $state([]);

	// Queries for dashboard data
	const pendingLeaveRequests = queryStore({
		client: getOperationStore(),
		query: GET_PENDING_LEAVE_REQUESTS,
		variables: {
			managerId: data.user?.id,
			first: 10,
			filter: { status: 'pending' }
		}
	});

	const pendingReviews = queryStore({
		client: getOperationStore(),
		query: GET_PENDING_REVIEWS_FOR_MANAGER,
		variables: {
			managerId: data.user?.id,
			first: 10
		}
	});

	const teamGoals = queryStore({
		client: getOperationStore(),
		query: GET_TEAM_GOALS,
		variables: {
			first: 20,
			filter: {
				status: 'active'
			}
		}
	});

	const teamReports = queryStore({
		client: getOperationStore(),
		query: GET_TEAM_REPORTS,
		variables: {
			first: 10,
			orderBy: ['CREATED_AT_DESC']
		}
	});

	// Update dashboard data when queries complete
	$: if ($pendingLeaveRequests.data) {
		const requests = $pendingLeaveRequests.data.leaveRequests?.nodes || [];
		dashboardData.leaveRequests.pending = requests.length;
		quickActions[0].count = requests.length;

		// Update recent activities
		requests.slice(0, 3).forEach((request: any) => {
			recentActivities.push({
				id: `leave-${request.id}`,
				type: 'leave_request',
				title: `${request.employee?.displayName} requested ${request.leaveType} leave`,
				description: `${formatDateRange(request.startDate, request.endDate)} - ${request.daysRequested} days`,
				timestamp: request.createdAt,
				icon: Calendar,
				color: 'blue'
			});
		});
	}

	$: if ($pendingReviews.data) {
		const reviews = $pendingReviews.data.performanceReviews?.nodes || [];
		dashboardData.performanceReviews.pending = reviews.length;
		quickActions[1].count = reviews.length;

		// Update recent activities
		reviews.slice(0, 3).forEach((review: any) => {
			recentActivities.push({
				id: `review-${review.id}`,
				type: 'performance_review',
				title: `Performance review due for ${review.employee?.displayName}`,
				description: `Review period: ${review.reviewPeriodStart} to ${review.reviewPeriodEnd}`,
				timestamp: review.createdAt,
				icon: Award,
				color: 'green'
			});
		});
	}

	$: if ($teamGoals.data) {
		const goals = $teamGoals.data.teamGoals?.nodes || [];
		dashboardData.goals.active = goals.length;
		dashboardData.goals.overdue = goals.filter(isGoalOverdue).length;
		dashboardData.goals.atRisk = goals.filter(isGoalAtRisk).length;
		dashboardData.goals.avgProgress = goals.length > 0
			? Math.round(goals.reduce((sum, goal) => sum + calculateGoalCompletion(goal), 0) / goals.length)
			: 0;
		quickActions[2].count = goals.length;

		// Update recent activities
		goals.slice(0, 2).forEach((goal: any) => {
			const completion = calculateGoalCompletion(goal);
			recentActivities.push({
				id: `goal-${goal.id}`,
				type: 'goal_update',
				title: `Goal progress: ${goal.title}`,
				description: `${completion}% complete - Target: ${new Date(goal.targetDate).toLocaleDateString()}`,
				timestamp: goal.updatedAt,
				icon: Target,
				color: 'purple'
			});
		});
	}

	$: if ($teamReports.data) {
		const reports = $teamReports.data.teamReports?.nodes || [];
		dashboardData.reports.generated = reports.filter(r => r.status === 'completed').length;
		dashboardData.reports.scheduled = reports.filter(r => r.isScheduled).length;
		dashboardData.reports.failed = reports.filter(r => r.status === 'failed').length;
		quickActions[3].count = reports.length;

		// Update recent activities
		reports.slice(0, 2).forEach((report: any) => {
			recentActivities.push({
				id: `report-${report.id}`,
				type: 'report_generated',
				title: `Report generated: ${report.title}`,
				description: `${getReportTypeInfo(report.reportType).label} - ${getReportStatusInfo(report.status).label}`,
				timestamp: report.createdAt,
				icon: FileText,
				color: 'orange'
			});
		});
	}

	// Sort recent activities by timestamp
	$: recentActivities = recentActivities
		.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
		.slice(0, 8);

	// Performance metrics for charts
	$: performanceMetrics = [
		{
			label: 'Leave Approval Rate',
			value: dashboardData.leaveRequests.pending > 0 ?
				Math.round((dashboardData.leaveRequests.approved / (dashboardData.leaveRequests.approved + dashboardData.leaveRequests.rejected)) * 100) : 0,
			target: 85,
			color: 'blue'
		},
		{
			label: 'Review Completion',
			value: dashboardData.performanceReviews.pending > 0 ?
				Math.round((dashboardData.performanceReviews.completed / (dashboardData.performanceReviews.completed + dashboardData.performanceReviews.pending)) * 100) : 0,
			target: 95,
			color: 'green'
		},
		{
			label: 'Goal Progress',
			value: dashboardData.goals.avgProgress,
			target: 80,
			color: 'purple'
		},
		{
			label: 'Report Success Rate',
			value: dashboardData.reports.generated > 0 ?
				Math.round((dashboardData.reports.generated / (dashboardData.reports.generated + dashboardData.reports.failed)) * 100) : 0,
			target: 98,
			color: 'orange'
		}
	];

	// Alerts and notifications
	$: alerts = [
		...(dashboardData.goals.overdue > 0 ? [{
			type: 'warning' as const,
			title: `${dashboardData.goals.overdue} Overdue Goals`,
			message: 'Some team goals have passed their target date and need attention.',
			action: 'View Goals',
			href: '/dashboard/management/goals',
			testId: 'alert-overdue-goals'
		}] : []),
		...(dashboardData.performanceReviews.overdue > 0 ? [{
			type: 'error' as const,
			title: `${dashboardData.performanceReviews.overdue} Overdue Reviews`,
			message: 'Performance reviews are past due and require immediate attention.',
			action: 'View Reviews',
			href: '/dashboard/management/reviews',
			testId: 'alert-overdue-reviews'
		}] : []),
		...(dashboardData.leaveRequests.pending > 5 ? [{
			type: 'info' as const,
			title: `${dashboardData.leaveRequests.pending} Pending Leave Requests`,
			message: 'Multiple leave requests are waiting for your approval.',
			action: 'Review Requests',
			href: '/dashboard/management/leave-approvals',
			testId: 'alert-pending-leave'
		}] : [])
	];
</script>

<div class="container mx-auto px-4 py-8">
	<!-- Page Header -->
	<div class="mb-8">
		<div class="flex justify-between items-center mb-4">
			<div>
				<h1 class="text-3xl font-bold text-gray-900">Management Overview</h1>
				<p class="mt-2 text-gray-600">Your team management dashboard and key metrics</p>
			</div>
			<div class="flex items-center gap-4">
				<select
					bind:value={selectedPeriod}
					class="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
					data-testid="period-selector"
				>
					<option value="this-week">This Week</option>
					<option value="this-month">This Month</option>
					<option value="last-month">Last Month</option>
					<option value="this-quarter">This Quarter</option>
				</select>
				<select
					bind:value={selectedTeamId}
					class="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
					data-testid="team-selector"
				>
					<option value="">All Teams</option>
					<option value="engineering">Engineering</option>
					<option value="marketing">Marketing</option>
					<option value="sales">Sales</option>
					<option value="hr">Human Resources</option>
				</select>
			</div>
		</div>

		<!-- Alerts Section -->
		{#if alerts.length > 0}
			<div class="grid grid-cols-1 gap-3 mb-6">
				{#each alerts as alert}
					<div
						class="flex items-center justify-between p-3 rounded-lg {alert.type === 'error' ? 'bg-red-50 border border-red-200' :
						alert.type === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
						'bg-blue-50 border border-blue-200'}"
						data-testid={alert.testId}
					>
						<div class="flex items-center gap-3">
							<AlertCircle class="w-5 h-5 {alert.type === 'error' ? 'text-red-500' :
								alert.type === 'warning' ? 'text-yellow-500' : 'text-blue-500'}" />
							<div>
								<h4 class="font-medium {alert.type === 'error' ? 'text-red-900' :
									alert.type === 'warning' ? 'text-yellow-900' : 'text-blue-900'}">{alert.title}</h4>
								<p class="text-sm {alert.type === 'error' ? 'text-red-700' :
									alert.type === 'warning' ? 'text-yellow-700' : 'text-blue-700'}">{alert.message}</p>
							</div>
						</div>
						<a
							href={alert.href}
							class="px-3 py-1 text-sm font-medium rounded-md {alert.type === 'error' ? 'bg-red-100 text-red-800 hover:bg-red-200' :
							alert.type === 'warning' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' :
							'bg-blue-100 text-blue-800 hover:bg-blue-200'}"
						>
							{alert.action}
						</a>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Key Metrics Cards -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
		<!-- Team Overview -->
		<div class="bg-white rounded-lg shadow p-6" data-testid="team-overview">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-gray-600">Team Members</p>
					<p class="text-2xl font-bold text-gray-900">{dashboardData.teamStats.totalEmployees}</p>
					<p class="text-sm text-green-600 font-medium">
						{dashboardData.teamStats.activeEmployees} active
					</p>
				</div>
				<div class="p-3 bg-blue-100 rounded-full">
					<Users class="w-6 h-6 text-blue-600" />
				</div>
			</div>
		</div>

		<!-- Leave Requests -->
		<div class="bg-white rounded-lg shadow p-6" data-testid="leave-requests-summary">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-gray-600">Leave Requests</p>
					<p class="text-2xl font-bold text-gray-900">{dashboardData.leaveRequests.pending}</p>
					<p class="text-sm text-orange-600 font-medium">Pending approval</p>
				</div>
				<div class="p-3 bg-orange-100 rounded-full">
					<Calendar class="w-6 h-6 text-orange-600" />
				</div>
			</div>
		</div>

		<!-- Performance Reviews -->
		<div class="bg-white rounded-lg shadow p-6" data-testid="reviews-summary">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-gray-600">Reviews Due</p>
					<p class="text-2xl font-bold text-gray-900">{dashboardData.performanceReviews.pending}</p>
					<p class="text-sm text-green-600 font-medium">
						{dashboardData.performanceReviews.completed} completed
					</p>
				</div>
				<div class="p-3 bg-green-100 rounded-full">
					<Award class="w-6 h-6 text-green-600" />
				</div>
			</div>
		</div>

		<!-- Goals Progress -->
		<div class="bg-white rounded-lg shadow p-6" data-testid="goals-summary">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-gray-600">Team Goals</p>
					<p class="text-2xl font-bold text-gray-900">{dashboardData.goals.active}</p>
					<p class="text-sm text-purple-600 font-medium">
						{dashboardData.goals.avgProgress}% avg progress
					</p>
				</div>
				<div class="p-3 bg-purple-100 rounded-full">
					<Target class="w-6 h-6 text-purple-600" />
				</div>
			</div>
		</div>
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
		<!-- Performance Metrics -->
		<div class="lg:col-span-2">
			<div class="bg-white rounded-lg shadow p-6" data-testid="performance-metrics">
				<h3 class="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
				<div class="space-y-4">
					{#each performanceMetrics as metric}
						<div class="flex items-center justify-between">
							<div class="flex-1">
								<div class="flex items-center justify-between mb-1">
									<span class="text-sm font-medium text-gray-700">{metric.label}</span>
									<span class="text-sm text-gray-500">{metric.value}% / {metric.target}%</span>
								</div>
								<div class="w-full bg-gray-200 rounded-full h-2">
									<div
										class="h-2 rounded-full bg-{metric.color}-600"
										style="width: {Math.min(metric.value, 100)}%"
									></div>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- Recent Activities -->
		<div class="bg-white rounded-lg shadow p-6" data-testid="recent-activities">
			<h3 class="text-lg font-semibold text-gray-900 mb-4">Recent Activities</h3>
			<div class="space-y-3">
				{#each recentActivities as activity}
					<div class="flex items-start gap-3">
						<div class="p-2 bg-{activity.color}-100 rounded-full">
							<svelte:component this={activity.icon} class="w-4 h-4 text-{activity.color}-600" />
						</div>
						<div class="flex-1 min-w-0">
							<p class="text-sm font-medium text-gray-900 truncate">{activity.title}</p>
							<p class="text-xs text-gray-500 truncate">{activity.description}</p>
							<p class="text-xs text-gray-400">{new Date(activity.timestamp).toLocaleDateString()}</p>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<!-- Quick Actions -->
	<div class="bg-white rounded-lg shadow p-6" data-testid="quick-actions">
		<h3 class="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
			{#each quickActions as action}
				<a
					href={action.href}
					class="block p-4 border border-gray-200 rounded-lg hover:border-{action.color}-300 hover:bg-{action.color}-50 transition-colors"
					data-testid={action.testId}
				>
					<div class="flex items-center justify-between mb-2">
						<div class="p-2 bg-{action.color}-100 rounded-full">
							<svelte:component this={action.icon} class="w-5 h-5 text-{action.color}-600" />
						</div>
						{#if action.count > 0}
							<span class="px-2 py-1 bg-{action.color}-100 text-{action.color}-800 text-xs font-medium rounded-full">
								{action.count}
							</span>
						{/if}
					</div>
					<h4 class="font-medium text-gray-900 mb-1">{action.title}</h4>
					<p class="text-sm text-gray-600">{action.description}</p>
				</a>
			{/each}
		</div>
	</div>

	<!-- Team Performance Summary -->
	<div class="mt-8 bg-white rounded-lg shadow p-6" data-testid="team-performance">
		<h3 class="text-lg font-semibold text-gray-900 mb-4">Team Performance Summary</h3>
		<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
			<!-- Goals Status -->
			<div>
				<h4 class="font-medium text-gray-900 mb-3">Goals Status</h4>
				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<span class="text-sm text-gray-600">Active</span>
						<span class="text-sm font-medium text-blue-600">{dashboardData.goals.active}</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-sm text-gray-600">At Risk</span>
						<span class="text-sm font-medium text-orange-600">{dashboardData.goals.atRisk}</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-sm text-gray-600">Overdue</span>
						<span class="text-sm font-medium text-red-600">{dashboardData.goals.overdue}</span>
					</div>
				</div>
			</div>

			<!-- Review Status -->
			<div>
				<h4 class="font-medium text-gray-900 mb-3">Review Status</h4>
				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<span class="text-sm text-gray-600">Pending</span>
						<span class="text-sm font-medium text-orange-600">{dashboardData.performanceReviews.pending}</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-sm text-gray-600">Completed</span>
						<span class="text-sm font-medium text-green-600">{dashboardData.performanceReviews.completed}</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-sm text-gray-600">Avg Rating</span>
						<span class="text-sm font-medium text-blue-600">{dashboardData.performanceReviews.avgRating}/5</span>
					</div>
				</div>
			</div>

			<!-- Reports Status -->
			<div>
				<h4 class="font-medium text-gray-900 mb-3">Reports Status</h4>
				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<span class="text-sm text-gray-600">Generated</span>
						<span class="text-sm font-medium text-green-600">{dashboardData.reports.generated}</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-sm text-gray-600">Scheduled</span>
						<span class="text-sm font-medium text-blue-600">{dashboardData.reports.scheduled}</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-sm text-gray-600">Failed</span>
						<span class="text-sm font-medium text-red-600">{dashboardData.reports.failed}</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

<!-- Success/Error Notifications (handled by svelte-sonner toast) -->
<div data-testid="success-notification" class="hidden"></div>
<div data-testid="access-denied" class="hidden"></div>
<div data-testid="dashboard-metrics" class="hidden"></div>