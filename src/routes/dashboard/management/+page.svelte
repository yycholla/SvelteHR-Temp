<!--
T043: Fix management index page with standardized error handling
Modern Svelte 5 implementation with server-side data loading and comprehensive management dashboard
-->

<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import {
		Users,
		Calendar,
		Award,
		Target,
		FileText,
		TrendingUp,
		AlertCircle,
		CheckCircle,
		BarChart,
		Activity,
		Clock,
		MapPin,
		ArrowRight,
		Plus
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
	let selectedPeriod = $state('this-month');
	let selectedTeamId = $state('');

	// Sync with filters data using effects
	$effect(() => {
		selectedPeriod = filters.selectedPeriod || 'this-month';
	});
	$effect(() => {
		selectedTeamId = filters.selectedTeamId || '';
	});

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
			case 'error':
				return AlertCircle;
			case 'warning':
				return AlertCircle;
			case 'info':
				return AlertCircle;
			default:
				return AlertCircle;
		}
	}

	function getAlertColors(type: string) {
		switch (type) {
			case 'error':
				return {
					bg: 'bg-red-50',
					border: 'border-red-200',
					icon: 'text-red-500',
					title: 'text-red-900',
					message: 'text-red-700',
					button: 'bg-red-100 text-red-800 hover:bg-red-200'
				};
			case 'warning':
				return {
					bg: 'bg-yellow-50',
					border: 'border-yellow-200',
					icon: 'text-yellow-500',
					title: 'text-yellow-900',
					message: 'text-yellow-700',
					button: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
				};
			case 'info':
				return {
					bg: 'bg-blue-50',
					border: 'border-blue-200',
					icon: 'text-blue-500',
					title: 'text-blue-900',
					message: 'text-blue-700',
					button: 'bg-blue-100 text-blue-800 hover:bg-blue-200'
				};
			default:
				return {
					bg: 'bg-muted dark:bg-muted',
					border: 'border',
					icon: 'text-muted-foreground',
					title: 'text-foreground',
					message: 'text-foreground',
					button: 'bg-gray-100 text-foreground hover:bg-gray-200'
				};
		}
	}
</script>

<!-- Page Header -->
<div class="mb-8">
	<div class="mb-4 flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-foreground">Management Overview</h1>
			<p class="mt-2 text-muted-foreground">Your team management dashboard and key metrics</p>
		</div>
		<div class="flex items-center gap-4">
			<select
				bind:value={selectedPeriod}
				onchange={updateFilters}
				class="rounded-md border border-input px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
			>
				<option value="this-week">This Week</option>
				<option value="this-month">This Month</option>
				<option value="last-month">Last Month</option>
				<option value="this-quarter">This Quarter</option>
			</select>
			<select
				bind:value={selectedTeamId}
				onchange={updateFilters}
				class="rounded-md border border-input px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
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
		<div class="mb-6 grid grid-cols-1 gap-3">
			{#each alerts as alert}
				{@const colors = getAlertColors(alert.type)}
				{@const AlertIcon = getAlertIcon(alert.type)}
				<div class="flex items-center justify-between rounded-lg p-3 {colors.bg} {colors.border}">
					<div class="flex items-center gap-3">
						<AlertIcon class="h-5 w-5 {colors.icon}" />
						<div>
							<h4 class="font-medium {colors.title}">{alert.title}</h4>
							<p class="text-sm {colors.message}">{alert.message}</p>
						</div>
					</div>
					<a href={alert.href} class="rounded-md px-3 py-1 text-sm font-medium {colors.button}">
						{alert.action}
					</a>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Key Metrics Cards -->
<div class="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
	<!-- Team Overview -->
	<div class="rounded-lg border border bg-card p-6 shadow-sm">
		<div class="flex items-center justify-between">
			<div>
				<p class="text-sm font-medium text-muted-foreground">Team Members</p>
				<p class="text-2xl font-bold text-foreground">
					{dashboardAnalytics.teamStats.totalEmployees}
				</p>
				<p class="text-sm font-medium text-green-600">
					{dashboardAnalytics.teamStats.activeEmployees} active
				</p>
			</div>
			<div class="rounded-lg bg-blue-100 p-3">
				<Users class="h-6 w-6 text-blue-600" />
			</div>
		</div>
	</div>

	<!-- Leave Requests -->
	<div class="rounded-lg border border bg-card p-6 shadow-sm">
		<div class="flex items-center justify-between">
			<div>
				<p class="text-sm font-medium text-muted-foreground">Leave Requests</p>
				<p class="text-2xl font-bold text-foreground">{dashboardAnalytics.leaveRequests.pending}</p>
				<p class="text-sm font-medium text-orange-600">Pending approval</p>
			</div>
			<div class="rounded-lg bg-orange-100 p-3">
				<Calendar class="h-6 w-6 text-orange-600" />
			</div>
		</div>
	</div>

	<!-- Performance Reviews -->
	<div class="rounded-lg border border bg-card p-6 shadow-sm">
		<div class="flex items-center justify-between">
			<div>
				<p class="text-sm font-medium text-muted-foreground">Reviews Due</p>
				<p class="text-2xl font-bold text-foreground">
					{dashboardAnalytics.performanceReviews.pending}
				</p>
				<p class="text-sm font-medium text-green-600">
					{dashboardAnalytics.performanceReviews.completed} completed
				</p>
			</div>
			<div class="rounded-lg bg-green-100 p-3">
				<Award class="h-6 w-6 text-green-600" />
			</div>
		</div>
	</div>

	<!-- Goals Progress -->
	<div class="rounded-lg border border bg-card p-6 shadow-sm">
		<div class="flex items-center justify-between">
			<div>
				<p class="text-sm font-medium text-muted-foreground">Team Goals</p>
				<p class="text-2xl font-bold text-foreground">{dashboardAnalytics.teamGoals.active}</p>
				<p class="text-sm font-medium text-purple-600">
					{dashboardAnalytics.teamGoals.avgProgress}% avg progress
				</p>
			</div>
			<div class="rounded-lg bg-purple-100 p-3">
				<Target class="h-6 w-6 text-purple-600" />
			</div>
		</div>
	</div>
</div>

<div class="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
	<!-- Performance Metrics -->
	<div class="lg:col-span-2">
		<div class="rounded-lg border border bg-card p-6 shadow-sm">
			<h3 class="mb-4 text-lg font-semibold text-foreground">Performance Metrics</h3>
			<div class="space-y-4">
				{#each performanceMetrics as metric}
					{@const progressColor = getProgressColor(metric.value, metric.target)}
					<div class="flex items-center justify-between">
						<div class="flex-1">
							<div class="mb-1 flex items-center justify-between">
								<span class="text-sm font-medium text-foreground">{metric.label}</span>
								<span class="text-sm text-muted-foreground">{metric.value}% / {metric.target}%</span>
							</div>
							<div class="h-2 w-full rounded-full bg-gray-200">
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
	<div class="rounded-lg border border bg-card p-6 shadow-sm">
		<h3 class="mb-4 text-lg font-semibold text-foreground">Recent Activities</h3>
		<div class="space-y-3">
			{#each recentActivities as activity}
				{@const Icon = iconMap[activity.icon as keyof typeof iconMap] || Activity}
				<a
					href={activity.href}
					class="-m-2 block rounded-lg p-2 transition-colors hover:bg-muted dark:bg-muted"
				>
					<div class="flex items-start gap-3">
						<div class="p-2 bg-{activity.color}-100 rounded-full">
							<Icon class="h-4 w-4 text-{activity.color}-600" />
						</div>
						<div class="min-w-0 flex-1">
							<p class="truncate text-sm font-medium text-foreground">{activity.title}</p>
							<p class="truncate text-xs text-muted-foreground">{activity.description}</p>
							<p class="text-xs text-muted-foreground">{formatDate(activity.timestamp)}</p>
						</div>
						<ArrowRight class="h-4 w-4 flex-shrink-0 text-muted-foreground" />
					</div>
				</a>
			{/each}
		</div>
	</div>
</div>

<!-- Quick Actions -->
<div class="mb-8 rounded-lg border border bg-card p-6 shadow-sm">
	<h3 class="mb-4 text-lg font-semibold text-foreground">Quick Actions</h3>
	<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
		{#each quickActions as action}
			{@const Icon = iconMap[action.icon as keyof typeof iconMap] || Activity}
			<a
				href={action.href}
				class="block rounded-lg border border p-4 hover:border-{action.color}-300 hover:bg-{action.color}-50 group transition-colors"
			>
				<div class="mb-2 flex items-center justify-between">
					<div
						class="p-2 bg-{action.color}-100 rounded-lg group-hover:bg-{action.color}-200 transition-colors"
					>
						<Icon class="h-5 w-5 text-{action.color}-600" />
					</div>
					{#if action.count > 0}
						<span
							class="px-2 py-1 bg-{action.color}-100 text-{action.color}-800 rounded-full text-xs font-medium"
						>
							{action.count}
						</span>
					{/if}
				</div>
				<h4 class="mb-1 font-medium text-foreground">{action.title}</h4>
				<p class="text-sm text-muted-foreground">{action.description}</p>
			</a>
		{/each}
	</div>
</div>

<!-- Team Performance Summary -->
<div class="rounded-lg border border bg-card p-6 shadow-sm">
	<h3 class="mb-4 text-lg font-semibold text-foreground">Team Performance Summary</h3>
	<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
		<!-- Goals Status -->
		<div>
			<h4 class="mb-3 font-medium text-foreground">Goals Status</h4>
			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<div class="h-3 w-3 rounded-full bg-blue-500"></div>
						<span class="text-sm text-muted-foreground">Active</span>
					</div>
					<span class="text-sm font-medium text-blue-600"
						>{dashboardAnalytics.teamGoals.active}</span
					>
				</div>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<div class="h-3 w-3 rounded-full bg-orange-500"></div>
						<span class="text-sm text-muted-foreground">At Risk</span>
					</div>
					<span class="text-sm font-medium text-orange-600"
						>{dashboardAnalytics.teamGoals.atRisk}</span
					>
				</div>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<div class="h-3 w-3 rounded-full bg-red-500"></div>
						<span class="text-sm text-muted-foreground">Overdue</span>
					</div>
					<span class="text-sm font-medium text-red-600"
						>{dashboardAnalytics.teamGoals.overdue}</span
					>
				</div>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<div class="h-3 w-3 rounded-full bg-green-500"></div>
						<span class="text-sm text-muted-foreground">Completed</span>
					</div>
					<span class="text-sm font-medium text-green-600"
						>{dashboardAnalytics.teamGoals.completed}</span
					>
				</div>
			</div>
		</div>

		<!-- Review Status -->
		<div>
			<h4 class="mb-3 font-medium text-foreground">Review Status</h4>
			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<div class="h-3 w-3 rounded-full bg-orange-500"></div>
						<span class="text-sm text-muted-foreground">Pending</span>
					</div>
					<span class="text-sm font-medium text-orange-600"
						>{dashboardAnalytics.performanceReviews.pending}</span
					>
				</div>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<div class="h-3 w-3 rounded-full bg-green-500"></div>
						<span class="text-sm text-muted-foreground">Completed</span>
					</div>
					<span class="text-sm font-medium text-green-600"
						>{dashboardAnalytics.performanceReviews.completed}</span
					>
				</div>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<div class="h-3 w-3 rounded-full bg-red-500"></div>
						<span class="text-sm text-muted-foreground">Overdue</span>
					</div>
					<span class="text-sm font-medium text-red-600"
						>{dashboardAnalytics.performanceReviews.overdue}</span
					>
				</div>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<div class="h-3 w-3 rounded-full bg-blue-500"></div>
						<span class="text-sm text-muted-foreground">Avg Rating</span>
					</div>
					<span class="text-sm font-medium text-blue-600"
						>{dashboardAnalytics.performanceReviews.avgRating}/5</span
					>
				</div>
			</div>
		</div>

		<!-- Reports Status -->
		<div>
			<h4 class="mb-3 font-medium text-foreground">Reports Status</h4>
			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<div class="h-3 w-3 rounded-full bg-green-500"></div>
						<span class="text-sm text-muted-foreground">Generated</span>
					</div>
					<span class="text-sm font-medium text-green-600"
						>{dashboardAnalytics.reports.generated}</span
					>
				</div>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<div class="h-3 w-3 rounded-full bg-blue-500"></div>
						<span class="text-sm text-muted-foreground">Scheduled</span>
					</div>
					<span class="text-sm font-medium text-blue-600"
						>{dashboardAnalytics.reports.scheduled}</span
					>
				</div>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<div class="h-3 w-3 rounded-full bg-red-500"></div>
						<span class="text-sm text-muted-foreground">Failed</span>
					</div>
					<span class="text-sm font-medium text-red-600">{dashboardAnalytics.reports.failed}</span>
				</div>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<div class="h-3 w-3 rounded-full bg-purple-500"></div>
						<span class="text-sm text-muted-foreground">This Month</span>
					</div>
					<span class="text-sm font-medium text-purple-600"
						>{dashboardAnalytics.reports.totalThisMonth}</span
					>
				</div>
			</div>
		</div>
	</div>
</div>
