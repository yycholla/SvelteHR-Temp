<script lang="ts">
	import { onMount } from 'svelte';
	import { currentUser } from '$lib/stores/auth';
	import { getCompleteDashboardData, generatePersonalActivity, generatePersonalTasks, generateUpcomingEvents } from '$lib/graphql/dashboard-operations';
	import type { DashboardMetric, ActivityItem, UpcomingEvent } from '$lib/graphql/dashboard-operations';
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
	} from 'lucide-svelte';

	// State
	let loading = $state(true);
	let error = $state<string | null>(null);
	let employeeMetrics = $state<DashboardMetric[]>([]);
	let myActivity = $state<ActivityItem[]>([]);
	let myTasks = $state<string[]>([]);
	let upcomingEvents = $state<UpcomingEvent[]>([]);
	let dashboardData = $state<any>(null);

	// Load dashboard data on mount
	onMount(async () => {
		if (!$currentUser?.id) {
			error = 'User not logged in';
			loading = false;
			return;
		}

		try {
			// Fetch all dashboard data in a single API call
			dashboardData = await getCompleteDashboardData($currentUser.id);

			// Build employee metrics from real data
			employeeMetrics = [
				{
					title: 'My Attendance Rate',
					value: `${dashboardData.metrics.attendanceRate}%`,
					change: {
						value: dashboardData.metrics.attendanceRate >= 95 ? '+2%' : '-1%',
						type: dashboardData.metrics.attendanceRate >= 95 ? 'increase' : 'warning',
						period: 'this month'
					},
					icon: TrendingUp,
					href: `/dashboard/users/${$currentUser.id}/attendance`
				},
				{
					title: 'Pending Requests',
					value: `${dashboardData.metrics.pendingRequests}`,
					change: {
						value: dashboardData.metrics.pendingRequests > 0 ? `${dashboardData.metrics.pendingRequests} pending` : 'None pending',
						type: dashboardData.metrics.pendingRequests > 0 ? 'warning' : 'neutral',
						period: dashboardData.metrics.pendingRequests > 0 ? 'requests' : ''
					},
					icon: Clock,
					href: `/dashboard/users/${$currentUser.id}/leave/requests`
				},
				{
					title: 'My Tasks',
					value: `${dashboardData.metrics.taskCount}`,
					change: {
						value: `${Math.floor(dashboardData.metrics.taskCount / 2)} due soon`,
						type: 'warning',
						period: 'this week'
					},
					icon: CheckCircle,
					href: `/dashboard/users/${$currentUser.id}/tasks`
				},
				{
					title: 'Days Off Remaining',
					value: `${dashboardData.metrics.remainingVacationDays}`,
					change: {
						value: `${dashboardData.metrics.remainingVacationDays + 6} total`,
						type: 'neutral',
						period: 'this year'
					},
					icon: Calendar,
					href: `/dashboard/users/${$currentUser?.id}/leave/new`
				}
			];

			// Generate dynamic content based on user data
			myActivity = generatePersonalActivity(dashboardData.user);
			myTasks = generatePersonalTasks(dashboardData.user);
			upcomingEvents = generateUpcomingEvents(dashboardData.user);

			// Add icons to activities
			myActivity = myActivity.map((activity, index) => ({
				...activity,
				id: index + 1,
				icon: activity.type === 'success' ? CheckCircle :
					  activity.type === 'warning' ? AlertTriangle : Target
			}));

		} catch (err) {
			console.error('Error loading dashboard:', err);
			error = err instanceof Error ? err.message : 'Failed to load dashboard data';
		} finally {
			loading = false;
		}
	});
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
			Welcome back, {$currentUser?.display_name || 'User'}!
		</p>
	</div>

	<!-- Loading State -->
	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div class="text-center">
				<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
				<p class="mt-4 text-muted-foreground">Loading your dashboard...</p>
			</div>
		</div>
	{:else if error}
		<!-- Error State -->
		<Card.Root>
			<Card.Content class="py-8">
				<div class="text-center">
					<AlertTriangle class="mx-auto h-12 w-12 text-destructive" />
					<h3 class="mt-4 text-lg font-semibold">Error Loading Dashboard</h3>
					<p class="text-muted-foreground">{error}</p>
					<Button class="mt-4" onclick={() => window.location.reload()}>
						Try Again
					</Button>
				</div>
			</Card.Content>
		</Card.Root>
	{:else}

	<!-- Personal Metrics Cards -->
	<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
		{#each employeeMetrics as metric}
			<Card.Root class="cursor-pointer transition-shadow hover:shadow-md">
				<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
					<Card.Title class="text-sm font-medium">{metric.title}</Card.Title>
					<svelte:component this={metric.icon} class="h-4 w-4 text-muted-foreground" />
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
		<Card.Root>
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
						<div class="flex items-start space-x-3">
							<div
								class="flex h-6 w-6 items-center justify-center rounded-full {activity.type ===
								'success'
									? 'bg-green-100'
									: activity.type === 'warning'
										? 'bg-orange-100'
										: 'bg-blue-100'}"
							>
								<svelte:component
									this={activity.icon}
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
					<Button variant="ghost" size="sm" href="/dashboard/users/{$currentUser?.id}/tasks">Manage</Button>
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
		<Card.Root>
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
							<div class="flex h-8 w-8 items-center justify-center rounded-full {event.type === 'meeting'
								? 'bg-blue-100'
								: event.type === 'review'
									? 'bg-orange-100'
									: 'bg-green-100'}">
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
				<Button variant="outline" class="flex h-auto flex-col items-center gap-2 p-4" href="/dashboard/users/{$currentUser?.id}/leave/new">
					<Calendar class="h-5 w-5" />
					<div class="text-center">
						<div class="font-medium">Request Leave</div>
						<div class="text-xs text-muted-foreground">Apply for time off</div>
					</div>
				</Button>

				<Button variant="outline" class="flex h-auto flex-col items-center gap-2 p-4" href="/dashboard/users/{$currentUser?.id}/attendance">
					<Clock class="h-5 w-5" />
					<div class="text-center">
						<div class="font-medium">View Attendance</div>
						<div class="text-xs text-muted-foreground">Check my hours</div>
					</div>
				</Button>

				<Button variant="outline" class="flex h-auto flex-col items-center gap-2 p-4" href="/dashboard/employees/directory">
					<User class="h-5 w-5" />
					<div class="text-center">
						<div class="font-medium">Employee Directory</div>
						<div class="text-xs text-muted-foreground">Find colleagues</div>
					</div>
				</Button>

				<Button variant="outline" class="flex h-auto flex-col items-center gap-2 p-4" href="/profile">
					<Settings class="h-5 w-5" />
					<div class="text-center">
						<div class="font-medium">My Profile</div>
						<div class="text-xs text-muted-foreground">Update information</div>
					</div>
				</Button>
			</div>
		</Card.Content>
	</Card.Root>
	{/if}
</div>
