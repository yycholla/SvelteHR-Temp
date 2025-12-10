<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import {
		AlertTriangle,
		ArrowRight,
		Calendar,
		CheckCircle,
		CheckSquare,
		Clock,
		FileText,
		MapPin,
		Plus,
		Settings,
		Target,
		TrendingUp,
		User
	} from '@lucide/svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	const { data }: Props = $props();

	// Derived state from server data
	const user = $derived(data.user);

	// Determine appropriate tasks URL based on user role
	const tasksUrl = $derived(
		(user.roles || []).some((role: string) =>
			['hr_admin', 'system_admin', 'super_admin', 'Admin', 'admin'].includes(role)
		)
			? '/dashboard/tasks' // Admins see all tasks
			: (user.roles || []).some((role: string) =>
				role.toLowerCase() === 'manager' || role === 'Manager'
			)
				? '/dashboard/tasks/team-tasks' // Managers see team tasks
				: '/dashboard/tasks/my-tasks' // Employees see their own tasks
	);
	// NOTE: dashboardData is streamed via dashboardDataPromise, so we cannot access it directly here.
	// We will handle it in the template with #await.

	// Date formatting
	const currentDate = new Date().toLocaleDateString('en-US', {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});

	// Greeting logic
	const currentHour = new Date().getHours();
	const greeting = $derived(
		currentHour < 12 ? 'Good Morning' : currentHour < 18 ? 'Good Afternoon' : 'Good Evening'
	);

	// Status Badge Helper
	function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
		switch (status) {
			case 'DONE':
				return 'default';
			case 'IN_PROGRESS':
				return 'default';
			case 'TODO':
				return 'secondary';
			case 'BLOCKED':
				return 'destructive';
			default:
				return 'outline';
		}
	}
</script>

<svelte:head>
	<title>Dashboard - MountainHR</title>
</svelte:head>

<div class="max-w-7xl mx-auto space-y-8 p-8">
	<!-- Header Section -->
	<header class="flex justify-between items-center flex-wrap gap-4">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">
				{greeting}, {user.firstName || user.displayName || 'Team Member'}
			</h1>
			<p class="text-muted-foreground mt-1">Here's what's happening today, {currentDate}.</p>
		</div>
		<div class="flex gap-3">
			<Button variant="outline" href="/dashboard/events">
				<Calendar class="mr-2 h-4 w-4" />
				View Calendar
			</Button>
			<Button href="/dashboard/leave/request">
				<Plus class="mr-2 h-4 w-4" />
				Create Request
			</Button>
		</div>
	</header>

	{#await data.dashboardDataPromise}
		<!-- Loading Skeleton -->
		<div class="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
			<div class="md:col-span-2 space-y-6">
				<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
					<div class="h-32 bg-muted rounded-xl"></div>
					<div class="h-32 bg-muted rounded-xl"></div>
					<div class="h-32 bg-muted rounded-xl"></div>
				</div>
				<div class="h-64 bg-muted rounded-xl"></div>
				<div class="h-64 bg-muted rounded-xl"></div>
			</div>
			<div class="space-y-6">
				<div class="h-64 bg-muted rounded-xl"></div>
				<div class="h-64 bg-muted rounded-xl"></div>
			</div>
		</div>
	{:then resolvedData}
		{@const dashboardData = resolvedData?.dashboardData || {
			metrics: { taskCount: 0, remainingVacationDays: 0, pendingRequests: 0, attendanceRate: 0 },
			tasks: [],
			events: []
		}}
		{@const metrics = dashboardData.metrics}
		{@const tasks = dashboardData.tasks || []}
		{@const events = dashboardData.events || []}
		{@const recentActivities = resolvedData?.recentActivities || []}

		{@const metricsCards = [
			{
				title: 'Total Tasks',
				value: metrics.taskCount,
				subtext: `${tasks.filter((t: any) => t.priority === 'URGENT' || t.priority === 'HIGH').length} high priority`,
				icon: CheckSquare,
				color: 'text-emerald-600'
			},
			{
				title: 'Leave Balance',
				value: `${metrics.remainingVacationDays} Days`,
				subtext: `${metrics.pendingRequests} pending approval`,
				icon: Calendar,
				color: 'text-amber-600'
			},
			{
				title: 'Attendance',
				value: `${metrics.attendanceRate}%`,
				subtext: 'This month',
				icon: TrendingUp,
				color: 'text-blue-600'
			}
		]}

		<!-- Bento Grid Layout -->
		<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
			<!-- Left Column (Primary Content) -->
			<div class="md:col-span-2 space-y-6">
				<!-- Metrics Row -->
				<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
					{#each metricsCards as metric}
						<Card.Root>
							<Card.Content class="p-6">
								<div class="flex flex-row items-center justify-between space-y-0 pb-2">
									<h3 class="tracking-tight text-sm font-medium text-muted-foreground">
										{metric.title}
									</h3>
									<metric.icon class="h-4 w-4 text-muted-foreground" />
								</div>
								<div class="text-2xl font-bold">{metric.value}</div>
								<p class="text-xs text-muted-foreground mt-1">
									<span class="{metric.color} font-medium">{metric.subtext}</span>
								</p>
							</Card.Content>
						</Card.Root>
					{/each}
				</div>

				<!-- Task Board / List -->
				<Card.Root>
					<Card.Header class="flex flex-row items-center justify-between">
						<div>
							<Card.Title>Priority Tasks</Card.Title>
							<Card.Description>Tasks requiring your attention.</Card.Description>
						</div>
						<Button variant="ghost" size="sm" href={tasksUrl} class="text-primary">View All</Button>
					</Card.Header>
					<Card.Content class="pt-0 space-y-4">
						{#if tasks.length === 0}
							<div class="text-center py-8 text-muted-foreground text-sm">
								No pending tasks. Good job!
							</div>
						{:else}
							{#each tasks.slice(0, 5) as task}
								<a
									href="/dashboard/tasks/{task.id}"
									class="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer group"
								>
									<div class="flex items-center gap-4">
										<div
											class="h-2 w-2 rounded-full {task.priority === 'URGENT' ||
											task.priority === 'HIGH'
												? 'bg-red-500'
												: 'bg-blue-500'}"
										></div>
										<div>
											<p class="font-medium text-sm group-hover:text-primary transition-colors">
												{task.title}
											</p>
											<p class="text-xs text-muted-foreground">
												{#if task.dueDate}
													Due {new Date(task.dueDate).toLocaleDateString()}
												{:else}
													No due date
												{/if}
											</p>
										</div>
									</div>
									<Badge variant={getStatusVariant(task.status)}>
										{task.status.replace('_', ' ')}
									</Badge>
								</a>
							{/each}
						{/if}
					</Card.Content>
				</Card.Root>

				<!-- Recent Activity Feed -->
				<Card.Root>
					<Card.Header>
						<Card.Title>Recent Activity</Card.Title>
					</Card.Header>
					<Card.Content class="pt-0">
						<div class="space-y-4">
							{#each recentActivities.slice(0, 5) as activity}
								<div class="flex gap-4">
									<div class="relative mt-1">
										<div class="absolute top-4 left-2 h-full w-px bg-border -z-10"></div>
										<div
											class="flex h-4 w-4 items-center justify-center rounded-full border bg-background"
										>
											<div class="h-1.5 w-1.5 rounded-full bg-primary"></div>
										</div>
									</div>
									<div class="pb-4">
										<p class="text-sm font-medium leading-none">{activity.title}</p>
										<p class="text-sm text-muted-foreground mt-1">{activity.description}</p>
										<p class="text-xs text-muted-foreground mt-1">
											{new Date(activity.timestamp).toLocaleString()}
										</p>
									</div>
								</div>
							{/each}
						</div>
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Right Column (Sidebar) -->
			<div class="space-y-6">
				<!-- Upcoming Events -->
				<Card.Root>
					<Card.Header>
						<Card.Title>Upcoming Events</Card.Title>
					</Card.Header>
					<Card.Content class="pt-0 space-y-6">
						{#if events.length === 0}
							<div class="text-center py-4 text-muted-foreground text-sm">No upcoming events.</div>
						{:else}
							{#each events as event}
								<div class="flex gap-4">
									<div
										class="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-muted text-primary font-semibold text-xs border border-border"
									>
										<span class="uppercase"
											>{new Date(event.date).toLocaleString('default', { month: 'short' })}</span
										>
										<span class="text-lg">{new Date(event.date).getDate()}</span>
									</div>
									<div>
										<p class="text-sm font-medium line-clamp-1">{event.title}</p>
										<p class="text-xs text-muted-foreground">{event.time}</p>
										{#if event.location}
											<div class="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
												<MapPin class="h-3 w-3" />
												<span class="truncate max-w-[120px]">{event.location}</span>
											</div>
										{/if}
									</div>
								</div>
							{/each}
						{/if}
					</Card.Content>
				</Card.Root>

				<!-- Quick Links / Tools -->
				<Card.Root>
					<Card.Header>
						<Card.Title>Quick Access</Card.Title>
					</Card.Header>
					<Card.Content class="pt-0 grid grid-cols-2 gap-3">
						<a
							href="/dashboard/employees"
							class="flex flex-col items-center justify-center p-4 rounded-lg bg-card hover:bg-accent text-card-foreground hover:text-accent-foreground transition-colors text-center border border-border"
						>
							<User class="mb-2 h-5 w-5 text-primary" />
							<span class="text-xs font-medium">Directory</span>
						</a>
						<a
							href="/dashboard/documents"
							class="flex flex-col items-center justify-center p-4 rounded-lg bg-card hover:bg-accent text-card-foreground hover:text-accent-foreground transition-colors text-center border border-border"
						>
							<FileText class="mb-2 h-5 w-5 text-primary" />
							<span class="text-xs font-medium">Documents</span>
						</a>
						<a
							href="/dashboard/profile/attendance"
							class="flex flex-col items-center justify-center p-4 rounded-lg bg-card hover:bg-accent text-card-foreground hover:text-accent-foreground transition-colors text-center border border-border"
						>
							<Clock class="mb-2 h-5 w-5 text-primary" />
							<span class="text-xs font-medium">Timesheet</span>
						</a>
						<a
							href="/settings"
							class="flex flex-col items-center justify-center p-4 rounded-lg bg-card hover:bg-accent text-card-foreground hover:text-accent-foreground transition-colors text-center border border-border"
						>
							<Settings class="mb-2 h-5 w-5 text-primary" />
							<span class="text-xs font-medium">Settings</span>
						</a>
					</Card.Content>
				</Card.Root>
			</div>
		</div>
	{:catch error}
		<div class="p-8 text-center">
			<AlertTriangle class="h-12 w-12 text-red-500 mx-auto mb-4" />
			<h2 class="text-xl font-semibold text-red-600">Failed to load dashboard</h2>
			<p class="text-muted-foreground">{error.message}</p>
			<Button class="mt-4" onclick={() => window.location.reload()}>Retry</Button>
		</div>
	{/await}
</div>
