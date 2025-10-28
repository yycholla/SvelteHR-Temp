<script lang="ts">
	// Server-loaded data imports
	import type {
		DashboardMetric,
		ActivityItem,
		UpcomingEvent
	} from '$lib/graphql/dashboard-operations';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import {
		Calendar,
		TrendingUp,
		CheckCircle,
		Clock,
		AlertTriangle,
		MapPin,
		Target,
		Award,
		User,
		ChevronRight,
		FileText,
		Settings,
		UserCheck
	} from '@lucide/svelte';
	// Feature 020: Audit logging widgets
	import RecentAuditActivity from '$lib/components/activities/RecentAuditActivity.svelte';
	import RollbackRequestsWidget from '$lib/components/activities/RollbackRequestsWidget.svelte';
	import QuickAddTask from '$lib/components/tasks/QuickAddTask.svelte';
	import { invalidateAll } from '$app/navigation';
	import * as Chart from '$lib/components/ui/chart';
	import { ArcChart } from 'layerchart';

	// Props from server-side load function
	interface Props {
		data: {
			user: any;
			userSession: any;
			dashboardDataPromise: Promise<any>; // Streaming promise for dashboard data
			permissions: string[];
			isAdmin?: boolean;
			isSuperAdmin?: boolean;
			assignees?: any[];
			taskTypes?: any[];
			loadedAt: string;
			weather?: string;
		};
	}

	let { data }: Props = $props();

	// Extract server-loaded data
	const user = $derived(data.user);

	// Helper function to build employee metrics from dashboard data
	function buildEmployeeMetrics(dashboardData: any): DashboardMetric[] {
		return [
		{
			title: 'My Attendance Rate',
			value: `${dashboardData?.metrics?.attendanceRate ?? 0}%`,
			change: {
				value: (dashboardData?.metrics?.attendanceRate ?? 0) >= 95 ? '+2%' : '-1%',
				type: (dashboardData?.metrics?.attendanceRate ?? 0) >= 95 ? 'increase' : 'warning',
				period: 'this month'
			},
			icon: TrendingUp,
			href: `/dashboard/profile/attendance`
		},
		{
			title: 'Pending Requests',
			value: `${dashboardData?.metrics?.pendingRequests ?? 0}`,
			change: {
				value:
					(dashboardData?.metrics?.pendingRequests ?? 0) > 0
						? `${dashboardData?.metrics?.pendingRequests ?? 0} pending`
						: 'None pending',
				type: (dashboardData?.metrics?.pendingRequests ?? 0) > 0 ? 'warning' : 'neutral',
				period: (dashboardData?.metrics?.pendingRequests ?? 0) > 0 ? 'requests' : ''
			},
			icon: Clock,
			href: `/dashboard/users/${user.id}/leave/requests`
		},
		{
			title: 'My Tasks',
			value: `${dashboardData?.metrics?.taskCount ?? 0}`,
			change: {
				value: `${Math.floor((dashboardData?.metrics?.taskCount ?? 0) / 2)} due soon`,
				type: 'warning',
				period: 'this week'
			},
			icon: CheckCircle,
			href: `/dashboard/users/${user.id}/tasks`
		},
		{
			title: 'Days Off Remaining',
			value: `${dashboardData?.metrics?.remainingVacationDays ?? 0}`,
			change: {
				value: `${(dashboardData?.metrics?.remainingVacationDays ?? 0) + 6} total`,
				type: 'neutral',
				period: 'this year'
			},
			icon: Calendar,
			href: `/dashboard/users/${user.id}/leave/new`
		}
		];
	}

	// Helper function to build activity items
	function buildActivityItems(dashboardData: any): ActivityItem[] {
		return (dashboardData.activities || []).map((activity: any, index: number) => ({
			...activity,
			id: index + 1,
			icon:
				activity.type === 'success'
					? CheckCircle
					: activity.type === 'warning'
						? AlertTriangle
						: Target
		}));
	}

	// Helper function to get upcoming events
	function getUpcomingEvents(dashboardData: any): UpcomingEvent[] {
		return dashboardData.events || [];
	}

	// Helper function to sort tasks
	const priorityOrder = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
	function sortTasks(dashboardData: any): any[] {
		const tasks = dashboardData.tasks || [];
		return [...tasks].sort((a, b) => {
			// First, sort by priority (URGENT > HIGH > MEDIUM > LOW)
			const priorityA = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 4;
			const priorityB = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 4;
			const priorityDiff = priorityA - priorityB;
			if (priorityDiff !== 0) return priorityDiff;

			// Then by due date (ascending - soonest first)
			if (a.dueDate && b.dueDate) {
				return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
			}
			if (a.dueDate) return -1;
			if (b.dueDate) return 1;

			// Finally by title
			return a.title.localeCompare(b.title);
		});
	}

	// Helper function to calculate task completion
	function getTaskCompletionData(dashboardData: any) {
		const completedTaskCount = dashboardData.metrics?.completedTaskCount || 0;
		const totalTaskCount = dashboardData.metrics?.totalTaskCount || 0;
		const taskCompletionPercentage =
			totalTaskCount === 0 ? 0 : Math.round((completedTaskCount / totalTaskCount) * 100);

		const taskChartData = [
			{
				status: 'completed',
				count: completedTaskCount,
				color: 'var(--color-completed)'
			},
			{
				status: 'incomplete',
				count: totalTaskCount - completedTaskCount,
				color: 'var(--color-incomplete)'
			}
		];

		return { completedTaskCount, totalTaskCount, taskCompletionPercentage, taskChartData };
	}

	const taskChartConfig = {
		count: { label: 'Tasks' },
		completed: { label: 'Completed', color: 'hsl(var(--chart-2))' },
		incomplete: { label: 'Incomplete', color: 'hsl(var(--chart-5))' }
	} satisfies Chart.ChartConfig;

	// Random greeting generator
	const greetings = [
		'Welcome back',
		'Good to see you',
		'Hello',
		'Hi there',
		'Greetings',
		'Hey',
		'Good day'
	];
	const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
</script>

<svelte:head>
	<title>Dashboard - SvelteHR</title>
	<meta name="description" content="HR management dashboard overview" />
</svelte:head>

<!-- Page Header -->
<div class="space-y-6">
	<div class="flex items-center justify-between">
		<h1 class="text-3xl font-bold tracking-tight">
			{randomGreeting}, {user?.firstName || user?.displayName || user?.email || 'User'}!
		</h1>
		{#if data.weather}
			<div class="flex items-center gap-2 text-sm text-muted-foreground">
				<span class="whitespace-pre">{data.weather}</span>
			</div>
		{/if}
	</div>

	<!-- Personal Metrics Cards -->
	<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
		{#await data.dashboardDataPromise}
			<!-- Loading skeleton for metrics -->
			{#each Array(4) as _, index}
				<Card.Root class="animate-pulse">
					<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
						<div class="h-4 w-24 rounded bg-muted"></div>
						<div class="h-4 w-4 rounded bg-muted"></div>
					</Card.Header>
					<Card.Content>
						<div class="h-8 w-16 rounded bg-muted"></div>
						<div class="mt-2 h-4 w-32 rounded bg-muted"></div>
					</Card.Content>
				</Card.Root>
			{/each}
		{:then resolvedData}
			{@const employeeMetrics = buildEmployeeMetrics(resolvedData.dashboardData)}
			{#each employeeMetrics as metric, index}
				<Card.Root
					class="cursor-pointer transition-shadow hover:shadow-md"
					data-testid={index === 0
						? 'dashboard-attendance-metric'
						: index === 1
							? 'dashboard-leave-requests-metric'
							: index === 2
								? 'dashboard-tasks-metric'
								: 'dashboard-days-off-metric'}
				>
					<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
						<Card.Title class="text-sm font-medium">{metric.title}</Card.Title>
						{@const IconComponent = metric.icon}
						<IconComponent class="h-4 w-4 text-muted-foreground" />
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold">{metric.value}</div>
						<div class="flex items-center text-xs text-muted-foreground">
							{#if metric.change.type === 'increase'}
								<Badge variant="secondary" class="bg-green-50 text-green-600">
									{metric.change.value}
								</Badge>
							{:else if metric.change.type === 'warning'}
								<Badge variant="outline" class="border-orange-200 text-orange-600">
									{metric.change.value}
								</Badge>
							{:else}
								<Badge variant="secondary" class="text-gray-600">
									{metric.change.value}
								</Badge>
							{/if}
							{#if metric.change.period}
								<span class="ml-1">{metric.change.period}</span>
							{/if}
						</div>
					</Card.Content>
				</Card.Root>
			{/each}
		{:catch error}
			<!-- Error state for metrics -->
			<Card.Root class="col-span-4">
				<Card.Content class="p-6 text-center text-muted-foreground">
					<p>Failed to load metrics. Please refresh the page.</p>
				</Card.Content>
			</Card.Root>
		{/await}
	</div>

	<!-- Personal Activity and Tasks -->
	<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
		<!-- My Recent Activity -->
		<Card.Root data-testid="dashboard-recent-activity">
			<Card.Header>
				<div class="flex items-center justify-between">
					<Card.Title>My Recent Activity</Card.Title>
					<Button variant="ghost" size="sm">View All</Button>
				</div>
				<Card.Description>Your personal updates and notifications</Card.Description>
			</Card.Header>
			<Card.Content>
				{#await data.dashboardDataPromise}
					<!-- Loading skeleton -->
					<div class="space-y-4">
						{#each Array(3) as _}
							<div class="flex items-start space-x-3 animate-pulse">
								<div class="h-6 w-6 rounded-full bg-muted"></div>
								<div class="flex-1 space-y-2">
									<div class="h-4 w-3/4 rounded bg-muted"></div>
									<div class="h-3 w-1/2 rounded bg-muted"></div>
								</div>
							</div>
						{/each}
					</div>
				{:then resolvedData}
					{@const myActivity = buildActivityItems(resolvedData.dashboardData)}
					<div class="space-y-4">
						{#each myActivity as activity, index}
							{@const ActivityIcon = activity.icon}
							<div class="flex items-start space-x-3">
								<div
									class="flex h-6 w-6 items-center justify-center rounded-full {activity.type ===
									'success'
										? 'bg-green-100'
										: activity.type === 'warning'
											? 'bg-orange-100'
											: 'bg-blue-100'}"
								>
									<ActivityIcon
										class="h-3 w-3 {activity.type === 'success'
											? 'text-green-600'
											: activity.type === 'warning'
												? 'text-orange-600'
												: 'text-blue-600'}"
									/>
								</div>
								<div class="flex-1 space-y-1">
									<p class="text-sm font-medium">{activity.message}</p>
									<p class="text-xs text-muted-foreground">{activity.timestamp}</p>
								</div>
							</div>
						{/each}
					</div>
				{:catch}
					<div class="p-4 text-center text-muted-foreground">
						<p>Failed to load activity</p>
					</div>
				{/await}
			</Card.Content>
		</Card.Root>

		<!-- My Tasks -->
		<Card.Root>
			<Card.Header>
				<div class="flex items-center justify-between">
					<Card.Title>My Tasks</Card.Title>
					<QuickAddTask
						currentUser={{
							id: user.id,
							displayName: user.displayName || user.firstName || user.email || 'User',
							role: user.role || 'employee'
						}}
						assignees={data.assignees || []}
						taskTypes={data.taskTypes || []}
						canAssign={false}
						onSuccess={() => invalidateAll()}
					/>
				</div>
				<Card.Description>Pending items requiring your attention</Card.Description>
			</Card.Header>
			<Card.Content>
				{#await data.dashboardDataPromise}
					<!-- Loading skeleton -->
					<div class="space-y-3">
						{#each Array(3) as _}
							<div class="flex items-start space-x-3 rounded-lg p-2 animate-pulse">
								<div class="h-5 w-5 rounded-full bg-muted"></div>
								<div class="flex-1 space-y-2">
									<div class="h-4 w-3/4 rounded bg-muted"></div>
									<div class="h-3 w-1/2 rounded bg-muted"></div>
								</div>
							</div>
						{/each}
					</div>
				{:then resolvedData}
					{@const myTasks = sortTasks(resolvedData.dashboardData)}
					{#if myTasks.length > 0}
						<div class="space-y-3">
							{#each myTasks as task}
								<a
									href="/dashboard/tasks/{task.id}"
									class="flex items-start space-x-3 rounded-lg p-2 transition-colors hover:bg-accent"
								>
									<div class="flex h-5 w-5 items-center justify-center">
										{#if task.status === 'TODO'}
											<div class="h-2 w-2 rounded-full bg-amber-500"></div>
										{:else if task.status === 'IN_PROGRESS'}
											<div class="h-2 w-2 rounded-full bg-blue-500"></div>
										{:else}
											<div class="h-2 w-2 rounded-full bg-gray-400"></div>
										{/if}
									</div>
									<div class="flex-1 space-y-1">
										<p class="text-sm font-medium leading-none">{task.title}</p>
										{#if task.dueDate}
											<p class="text-xs text-muted-foreground">
												Due {new Date(task.dueDate).toLocaleDateString()}
											</p>
										{/if}
									</div>
									{#if task.priority === 'HIGH' || task.priority === 'URGENT'}
										<Badge variant="destructive" class="text-xs">
											{task.priority === 'URGENT' ? 'Urgent' : 'High'}
										</Badge>
									{/if}
								</a>
							{/each}
						</div>
					{:else}
						<div class="flex flex-col items-center justify-center py-8 text-center">
						<CheckCircle class="mb-2 h-12 w-12 text-muted-foreground opacity-50" />
						<p class="text-sm font-medium">All caught up!</p>
						<p class="text-xs text-muted-foreground">No pending tasks</p>
					</div>
					{/if}
					{@const taskCompletion = getTaskCompletionData(resolvedData.dashboardData)}
					{#if taskCompletion.totalTaskCount > 0}
						<div class="mt-4 pt-4 border-t">
							<div class="flex items-center justify-between w-full">
								<div class="flex flex-col gap-1">
									<div class="text-sm font-medium">Task Completion</div>
									<div class="text-xs text-muted-foreground">
										{taskCompletion.completedTaskCount} of {taskCompletion.totalTaskCount} tasks completed
									</div>
								</div>
								<div class="relative h-20 w-20">
									<Chart.Container config={taskChartConfig} class="aspect-square h-full">
										<ArcChart
											label="status"
											value="count"
											outerRadius={-5}
											innerRadius={-2.5}
											padding={0}
											range={[90, -270]}
											maxValue={taskCompletion.totalTaskCount}
											series={taskCompletion.taskChartData.map((d) => ({
												key: d.status,
												color: d.color,
												data: [d]
											}))}
											props={{
												arc: { track: { fill: 'var(--muted)' }, motion: 'tween' },
												tooltip: { context: { hideDelay: 350 } }
											}}
										>
											{#snippet tooltip()}
												<Chart.Tooltip hideLabel nameKey="status" />
											{/snippet}
										</ArcChart>
									</Chart.Container>
									<div
										class="absolute inset-0 flex items-center justify-center text-lg font-bold"
									>
										{taskCompletion.taskCompletionPercentage}%
									</div>
								</div>
							</div>
						</div>
					{/if}
				{:catch}
					<div class="p-4 text-center text-muted-foreground">
						<p>Failed to load tasks</p>
					</div>
				{/await}
			</Card.Content>
		</Card.Root>

		<!-- Upcoming Events -->
		<Card.Root data-testid="dashboard-upcoming-events">
			<Card.Header>
				<div class="flex items-center justify-between">
					<Card.Title>Upcoming Events</Card.Title>
					<Button variant="ghost" size="sm" href="/calendar">View Calendar</Button>
				</div>
				<Card.Description>Your scheduled meetings and events</Card.Description>
			</Card.Header>
			<Card.Content>
				{#await data.dashboardDataPromise}
					<!-- Loading skeleton -->
					<div class="space-y-4">
						{#each Array(3) as _}
							<div class="flex items-center space-x-3 animate-pulse">
								<div class="h-8 w-8 rounded-full bg-muted"></div>
								<div class="flex-1 space-y-2">
									<div class="h-4 w-3/4 rounded bg-muted"></div>
									<div class="h-3 w-1/2 rounded bg-muted"></div>
								</div>
							</div>
						{/each}
					</div>
				{:then resolvedData}
					{@const upcomingEvents = getUpcomingEvents(resolvedData.dashboardData)}
					<div class="space-y-4">
						{#each upcomingEvents as event, index}
							<div class="flex items-center space-x-3">
								<div
									class="flex h-8 w-8 items-center justify-center rounded-full {event.type ===
									'meeting'
										? 'bg-blue-100'
										: event.type === 'review'
											? 'bg-orange-100'
											: 'bg-green-100'}"
								>
									{#if event.type === 'meeting'}
										<User class="h-4 w-4 text-blue-600" />
									{:else if event.type === 'review'}
										<Target class="h-4 w-4 text-orange-600" />
									{:else}
										<Award class="h-4 w-4 text-green-600" />
									{/if}
								</div>
								<div class="flex-1">
									<p class="text-sm font-medium">{event.title}</p>
									<p class="text-xs text-muted-foreground">{event.time}</p>
								</div>
							</div>
						{/each}
					</div>
				{:catch}
					<div class="p-4 text-center text-muted-foreground">
						<p>Failed to load events</p>
					</div>
				{/await}
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Quick Actions -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Quick Actions</Card.Title>
			<Card.Description>Common personal tasks and self-service options</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
				<Button
					variant="outline"
					class="flex h-auto flex-col items-center gap-2 p-4"
					href="/dashboard/profile/leave/new"
				>
					<Calendar class="h-5 w-5" />
					<div class="text-center">
						<div class="font-medium">Request Leave</div>
						<div class="text-xs text-muted-foreground">Apply for time off</div>
					</div>
				</Button>

				<Button
					variant="outline"
					class="flex h-auto flex-col items-center gap-2 p-4"
					href="/dashboard/profile/attendance"
				>
					<Clock class="h-5 w-5" />
					<div class="text-center">
						<div class="font-medium">View Attendance</div>
						<div class="text-xs text-muted-foreground">Check my hours</div>
					</div>
				</Button>

				<Button
					variant="outline"
					class="flex h-auto flex-col items-center gap-2 p-4"
					href="/dashboard/employees/directory"
				>
					<User class="h-5 w-5" />
					<div class="text-center">
						<div class="font-medium">Employee Directory</div>
						<div class="text-xs text-muted-foreground">Find colleagues</div>
					</div>
				</Button>

				<Button
					variant="outline"
					class="flex h-auto flex-col items-center gap-2 p-4"
					href="/dashboard/profile"
				>
					<Settings class="h-5 w-5" />
					<div class="text-center">
						<div class="font-medium">My Profile</div>
						<div class="text-xs text-muted-foreground">Update information</div>
					</div>
				</Button>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Admin-Only Audit Logging Widgets (Feature 020) -->
	{#if data.isAdmin}
		{#await data.dashboardDataPromise}
			<!-- Loading skeleton for admin widgets -->
			<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
				{#each Array(2) as _}
					<Card.Root class="animate-pulse">
						<Card.Header>
							<div class="h-6 w-48 rounded bg-muted"></div>
						</Card.Header>
						<Card.Content>
							<div class="space-y-3">
								{#each Array(3) as _}
									<div class="h-16 rounded bg-muted"></div>
								{/each}
							</div>
						</Card.Content>
					</Card.Root>
				{/each}
			</div>
		{:then resolvedData}
			{#if resolvedData.systemAuditLogs}
				<div
					class="grid grid-cols-1 gap-6 {data.isSuperAdmin && resolvedData.rollbackRequests
						? 'lg:grid-cols-2'
						: ''}"
				>
					<!-- Recent Audit Activity Widget -->
					<RecentAuditActivity
						logs={resolvedData.systemAuditLogs}
						maxItems={5}
						showRollbackIndicators={true}
					/>

					<!-- Rollback Requests Widget (super_admin only) -->
					{#if data.isSuperAdmin && resolvedData.rollbackRequests && resolvedData.rollbackStats}
						<RollbackRequestsWidget
							requests={resolvedData.rollbackRequests}
							statistics={resolvedData.rollbackStats}
							maxItems={3}
						/>
					{/if}
				</div>
			{/if}
		{:catch}
			<Card.Root>
				<Card.Content class="p-6 text-center text-muted-foreground">
					<p>Failed to load admin widgets</p>
				</Card.Content>
			</Card.Root>
		{/await}
	{/if}
</div>
