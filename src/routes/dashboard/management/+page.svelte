<!--
T043: Fix management index page with standardized error handling
Modern Svelte 5 implementation with server-side data loading and comprehensive management dashboard
-->

<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import {
		Users, Calendar, Award, Target, FileText, TrendingUp, AlertCircle,
		CheckCircle, BarChart, Activity, Clock, MapPin, ArrowRight, Plus
	} from 'lucide-svelte';

	// Define props interface
	interface Props {
		data: {
			user: any;
			userSession: any;
			dashboardAnalytics: {
				leaveRequests: {
					pending: number;
					approved: number;
					rejected: number;
					totalThisMonth: number;
				};
				performanceReviews: {
					pending: number;
					overdue: number;
					completed: number;
					avgRating: number;
				};
				teamGoals: {
					active: number;
					overdue: number;
					atRisk: number;
					avgProgress: number;
					completed: number;
				};
				reports: {
					generated: number;
					scheduled: number;
					failed: number;
					totalThisMonth: number;
				};
				teamStats: {
					totalEmployees: number;
					activeEmployees: number;
					departmentCount: number;
					avgTenure: string;
				};
			};
			recentActivities: Array<{
				id: string;
				type: string;
				title: string;
				description: string;
				timestamp: string;
				icon: string;
				color: string;
				href: string;
			}>;
			performanceMetrics: Array<{
				label: string;
				value: number;
				target: number;
				color: string;
			}>;
			alerts: Array<{
				type: 'error' | 'warning' | 'info';
				title: string;
				message: string;
				action: string;
				href: string;
			}>;
			quickActions: Array<{
				title: string;
				description: string;
				icon: string;
				href: string;
				count: number;
				color: string;
			}>;
			filters: {
				selectedPeriod: string;
				selectedTeamId: string;
			};
			permissions: string[];
			canManageLeave: boolean;
			canManageReviews: boolean;
			canManageGoals: boolean;
			canGenerateReports: boolean;
			loadedAt: string;
		};
	}

	// Destructure props using Svelte 5 runes
	let { data }: Props = $props();

	// Derived state from server-side data
	const dashboardAnalytics = $derived(data.dashboardAnalytics);
	const recentActivities = $derived(data.recentActivities);
	const performanceMetrics = $derived(data.performanceMetrics);
	const alerts = $derived(data.alerts);
	const quickActions = $derived(data.quickActions);
	const filters = $derived(data.filters);

	// Local reactive state using Svelte 5 runes
	let selectedPeriod = $state(filters.selectedPeriod || 'this-month');
	let selectedTeamId = $state(filters.selectedTeamId || '');

	// Icon mapping for dynamic icons
	const iconMap = {
		Calendar,
		Award,
		Target,
		FileText,
		Users,
		Activity,
		Clock,
		BarChart
	};

	// Functions
	function updateFilters() {
		const searchParams = new URLSearchParams($page.url.searchParams);

		if (selectedPeriod !== 'this-month') searchParams.set('period', selectedPeriod);
		else searchParams.delete('period');

		if (selectedTeamId) searchParams.set('team', selectedTeamId);
		else searchParams.delete('team');

		goto(`${$page.url.pathname}?${searchParams.toString()}`, { invalidateAll: true });
	}

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getProgressColor(value: number, target: number) {
		const percentage = (value / target) * 100;
		if (percentage >= 90) return 'green';
		if (percentage >= 70) return 'yellow';
		return 'red';
	}

	function getAlertIcon(type: string) {
		switch (type) {
			case 'error': return AlertCircle;
			case 'warning': return AlertCircle;
			case 'info': return AlertCircle;
			default: return AlertCircle;
		}
	}

	function getAlertColors(type: string) {
		switch (type) {
			case 'error': return {
				bg: 'bg-red-50',
				border: 'border-red-200',
				icon: 'text-red-500',
				title: 'text-red-900',
				message: 'text-red-700',
				button: 'bg-red-100 text-red-800 hover:bg-red-200'
			};
			case 'warning': return {
				bg: 'bg-yellow-50',
				border: 'border-yellow-200',
				icon: 'text-yellow-500',
				title: 'text-yellow-900',
				message: 'text-yellow-700',
				button: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
			};
			case 'info': return {
				bg: 'bg-blue-50',
				border: 'border-blue-200',
				icon: 'text-blue-500',
				title: 'text-blue-900',
				message: 'text-blue-700',
				button: 'bg-blue-100 text-blue-800 hover:bg-blue-200'
			};
			default: return {
				bg: 'bg-gray-50',
				border: 'border-gray-200',
				icon: 'text-gray-500',
				title: 'text-gray-900',
				message: 'text-gray-700',
				button: 'bg-gray-100 text-gray-800 hover:bg-gray-200'
			};
		}
	}
</script>

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
				onchange={updateFilters}
				class="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
			>
				<option value="this-week">This Week</option>
				<option value="this-month">This Month</option>
				<option value="last-month">Last Month</option>
				<option value="this-quarter">This Quarter</option>
			</select>
			<select
				bind:value={selectedTeamId}
				onchange={updateFilters}
				class="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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
				{@const colors = getAlertColors(alert.type)}
				{@const AlertIcon = getAlertIcon(alert.type)}
				<div class="flex items-center justify-between p-3 rounded-lg {colors.bg} {colors.border}">
					<div class="flex items-center gap-3">
						<AlertIcon class="w-5 h-5 {colors.icon}" />
						<div>
							<h4 class="font-medium {colors.title}">{alert.title}</h4>
							<p class="text-sm {colors.message}">{alert.message}</p>
						</div>
					</div>
					<a href={alert.href} class="px-3 py-1 text-sm font-medium rounded-md {colors.button}">
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
	<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
		<div class="flex items-center justify-between">
			<div>
				<p class="text-sm font-medium text-gray-600">Team Members</p>
				<p class="text-2xl font-bold text-gray-900">{dashboardAnalytics.teamStats.totalEmployees}</p>
				<p class="text-sm text-green-600 font-medium">
					{dashboardAnalytics.teamStats.activeEmployees} active
				</p>
			</div>
			<div class="p-3 bg-blue-100 rounded-lg">
				<Users class="w-6 h-6 text-blue-600" />
			</div>
		</div>
	</div>

	<!-- Leave Requests -->
	<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
		<div class="flex items-center justify-between">
			<div>
				<p class="text-sm font-medium text-gray-600">Leave Requests</p>
				<p class="text-2xl font-bold text-gray-900">{dashboardAnalytics.leaveRequests.pending}</p>
				<p class="text-sm text-orange-600 font-medium">Pending approval</p>
			</div>
			<div class="p-3 bg-orange-100 rounded-lg">
				<Calendar class="w-6 h-6 text-orange-600" />
			</div>
		</div>
	</div>

	<!-- Performance Reviews -->
	<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
		<div class="flex items-center justify-between">
			<div>
				<p class="text-sm font-medium text-gray-600">Reviews Due</p>
				<p class="text-2xl font-bold text-gray-900">{dashboardAnalytics.performanceReviews.pending}</p>
				<p class="text-sm text-green-600 font-medium">
					{dashboardAnalytics.performanceReviews.completed} completed
				</p>
			</div>
			<div class="p-3 bg-green-100 rounded-lg">
				<Award class="w-6 h-6 text-green-600" />
			</div>
		</div>
	</div>

	<!-- Goals Progress -->
	<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
		<div class="flex items-center justify-between">
			<div>
				<p class="text-sm font-medium text-gray-600">Team Goals</p>
				<p class="text-2xl font-bold text-gray-900">{dashboardAnalytics.teamGoals.active}</p>
				<p class="text-sm text-purple-600 font-medium">
					{dashboardAnalytics.teamGoals.avgProgress}% avg progress
				</p>
			</div>
			<div class="p-3 bg-purple-100 rounded-lg">
				<Target class="w-6 h-6 text-purple-600" />
			</div>
		</div>
	</div>
</div>

<div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
	<!-- Performance Metrics -->
	<div class="lg:col-span-2">
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
			<h3 class="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
			<div class="space-y-4">
				{#each performanceMetrics as metric}
					{@const progressColor = getProgressColor(metric.value, metric.target)}
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
	<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
		<h3 class="text-lg font-semibold text-gray-900 mb-4">Recent Activities</h3>
		<div class="space-y-3">
			{#each recentActivities as activity}
				{@const Icon = iconMap[activity.icon as keyof typeof iconMap] || Activity}
				<a href={activity.href} class="block hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors">
					<div class="flex items-start gap-3">
						<div class="p-2 bg-{activity.color}-100 rounded-full">
							<Icon class="w-4 h-4 text-{activity.color}-600" />
						</div>
						<div class="flex-1 min-w-0">
							<p class="text-sm font-medium text-gray-900 truncate">{activity.title}</p>
							<p class="text-xs text-gray-500 truncate">{activity.description}</p>
							<p class="text-xs text-gray-400">{formatDate(activity.timestamp)}</p>
						</div>
						<ArrowRight class="w-4 h-4 text-gray-400 flex-shrink-0" />
					</div>
				</a>
			{/each}
		</div>
	</div>
</div>

<!-- Quick Actions -->
<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
	<h3 class="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
		{#each quickActions as action}
			{@const Icon = iconMap[action.icon as keyof typeof iconMap] || Activity}
			<a
				href={action.href}
				class="block p-4 border border-gray-200 rounded-lg hover:border-{action.color}-300 hover:bg-{action.color}-50 transition-colors group"
			>
				<div class="flex items-center justify-between mb-2">
					<div class="p-2 bg-{action.color}-100 rounded-lg group-hover:bg-{action.color}-200 transition-colors">
						<Icon class="w-5 h-5 text-{action.color}-600" />
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
<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
	<h3 class="text-lg font-semibold text-gray-900 mb-4">Team Performance Summary</h3>
	<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
		<!-- Goals Status -->
		<div>
			<h4 class="font-medium text-gray-900 mb-3">Goals Status</h4>
			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<div class="w-3 h-3 bg-blue-500 rounded-full"></div>
						<span class="text-sm text-gray-600">Active</span>
					</div>
					<span class="text-sm font-medium text-blue-600">{dashboardAnalytics.teamGoals.active}</span>
				</div>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<div class="w-3 h-3 bg-orange-500 rounded-full"></div>
						<span class="text-sm text-gray-600">At Risk</span>
					</div>
					<span class="text-sm font-medium text-orange-600">{dashboardAnalytics.teamGoals.atRisk}</span>
				</div>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<div class="w-3 h-3 bg-red-500 rounded-full"></div>
						<span class="text-sm text-gray-600">Overdue</span>
					</div>
					<span class="text-sm font-medium text-red-600">{dashboardAnalytics.teamGoals.overdue}</span>
				</div>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<div class="w-3 h-3 bg-green-500 rounded-full"></div>
						<span class="text-sm text-gray-600">Completed</span>
					</div>
					<span class="text-sm font-medium text-green-600">{dashboardAnalytics.teamGoals.completed}</span>
				</div>
			</div>
		</div>

		<!-- Review Status -->
		<div>
			<h4 class="font-medium text-gray-900 mb-3">Review Status</h4>
			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<div class="w-3 h-3 bg-orange-500 rounded-full"></div>
						<span class="text-sm text-gray-600">Pending</span>
					</div>
					<span class="text-sm font-medium text-orange-600">{dashboardAnalytics.performanceReviews.pending}</span>
				</div>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<div class="w-3 h-3 bg-green-500 rounded-full"></div>
						<span class="text-sm text-gray-600">Completed</span>
					</div>
					<span class="text-sm font-medium text-green-600">{dashboardAnalytics.performanceReviews.completed}</span>
				</div>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<div class="w-3 h-3 bg-red-500 rounded-full"></div>
						<span class="text-sm text-gray-600">Overdue</span>
					</div>
					<span class="text-sm font-medium text-red-600">{dashboardAnalytics.performanceReviews.overdue}</span>
				</div>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<div class="w-3 h-3 bg-blue-500 rounded-full"></div>
						<span class="text-sm text-gray-600">Avg Rating</span>
					</div>
					<span class="text-sm font-medium text-blue-600">{dashboardAnalytics.performanceReviews.avgRating}/5</span>
				</div>
			</div>
		</div>

		<!-- Reports Status -->
		<div>
			<h4 class="font-medium text-gray-900 mb-3">Reports Status</h4>
			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<div class="w-3 h-3 bg-green-500 rounded-full"></div>
						<span class="text-sm text-gray-600">Generated</span>
					</div>
					<span class="text-sm font-medium text-green-600">{dashboardAnalytics.reports.generated}</span>
				</div>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<div class="w-3 h-3 bg-blue-500 rounded-full"></div>
						<span class="text-sm text-gray-600">Scheduled</span>
					</div>
					<span class="text-sm font-medium text-blue-600">{dashboardAnalytics.reports.scheduled}</span>
				</div>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<div class="w-3 h-3 bg-red-500 rounded-full"></div>
						<span class="text-sm text-gray-600">Failed</span>
					</div>
					<span class="text-sm font-medium text-red-600">{dashboardAnalytics.reports.failed}</span>
				</div>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<div class="w-3 h-3 bg-purple-500 rounded-full"></div>
						<span class="text-sm text-gray-600">This Month</span>
					</div>
					<span class="text-sm font-medium text-purple-600">{dashboardAnalytics.reports.totalThisMonth}</span>
				</div>
			</div>
		</div>
	</div>
</div>