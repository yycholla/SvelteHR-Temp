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

	// Props from server-side load function
	interface Props {
		data: {
			user: any;
			userSession: any;
			dashboardData: any;
			permissions: string[];
			isAdmin?: boolean;
			isSuperAdmin?: boolean;
			systemAuditLogs?: any[];
			rollbackRequests?: any[];
			rollbackStats?: {
				pendingCount: number;
				approvedCount: number;
				rejectedCount: number;
			} | null;
			loadedAt: string;
		};
	}

	let { data }: Props = $props();

	// Extract server-loaded data
	const user = $derived(data.user);
	const dashboardData = $derived(data.dashboardData);

	// Build employee metrics from server-loaded data with defensive programming
	const employeeMetrics = $derived<DashboardMetric[]>([
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
	]);

	// Use server-loaded data instead of calling async functions
	const myActivity = $derived<ActivityItem[]>(
		(dashboardData.activities || []).map((activity, index) => ({
			...activity,
			id: index + 1,
			icon:
				activity.type === 'success'
					? CheckCircle
					: activity.type === 'warning'
						? AlertTriangle
						: Target
		}))
	);

	const myTasks = $derived<string[]>(dashboardData.tasks || []);
	const upcomingEvents = $derived<UpcomingEvent[]>(dashboardData.events || []);
</script>

<svelte:head>
	<title>Dashboard - SvelteHR</title>
	<meta name="description" content="HR management dashboard overview" />
</svelte:head>

<!-- Page Header -->
<div class="space-y-6">
	<div>
		<h1 class="text-3xl font-bold tracking-tight">Dashboard</h1>
		<p class="text-muted-foreground">
			Welcome back, {user?.display_name || user?.email || 'User'}!
		</p>
	</div>

	<!-- Personal Metrics Cards -->
	<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
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
			</Card.Content>
		</Card.Root>

		<!-- My Tasks -->
		<Card.Root>
			<Card.Header>
				<div class="flex items-center justify-between">
					<Card.Title>My Tasks</Card.Title>
					<Button variant="ghost" size="sm" href="/dashboard/profile/tasks">Manage</Button>
				</div>
				<Card.Description>Pending items requiring your attention</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="space-y-3">
					{#each myTasks as task, index}
						<div class="flex items-center space-x-3">
							<div class="h-2 w-2 rounded-full bg-primary"></div>
							<span class="text-sm">{task}</span>
						</div>
					{/each}
				</div>

				<Separator class="my-4" />

				<div class="space-y-2">
					<div class="flex items-center justify-between text-sm">
						<span class="font-medium">Task Completion</span>
						<span class="text-muted-foreground">60%</span>
					</div>
					<div class="h-2 w-full rounded-full bg-secondary">
						<div class="h-2 rounded-full bg-primary" style="width: 60%"></div>
					</div>
				</div>
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
	{#if data.isAdmin && data.systemAuditLogs}
		<div class="grid grid-cols-1 gap-6 {data.isSuperAdmin && data.rollbackRequests ? 'lg:grid-cols-2' : ''}">
			<!-- Recent Audit Activity Widget -->
			<RecentAuditActivity
				logs={data.systemAuditLogs}
				maxItems={5}
				showRollbackIndicators={true}
			/>

			<!-- Rollback Requests Widget (super_admin only) -->
			{#if data.isSuperAdmin && data.rollbackRequests && data.rollbackStats}
				<RollbackRequestsWidget
					requests={data.rollbackRequests}
					statistics={data.rollbackStats}
					maxItems={3}
				/>
			{/if}
		</div>
	{/if}
</div>
