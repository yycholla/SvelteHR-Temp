<script lang="ts">
	import { onMount } from 'svelte';
	import { Users, CheckSquare, Shield, AlertCircle, TrendingUp, Calendar } from 'lucide-svelte';
	import Card from '$lib/components/ui/card/card.svelte';
	import CardHeader from '$lib/components/ui/card/card-header.svelte';
	import CardTitle from '$lib/components/ui/card/card-title.svelte';
	import CardDescription from '$lib/components/ui/card/card-description.svelte';
	import CardContent from '$lib/components/ui/card/card-content.svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import Button from '$lib/components/ui/button/button.svelte';

	// Mock data - in a real app this would come from the MCP server
	let dashboardData = $state({
		totalEmployees: 1,
		activeEmployees: 1,
		pendingTasks: 0,
		overdueTasks: 0,
		complianceRate: 100,
		onboardingInProgress: 0,
		departmentBreakdown: [
			{ department: 'Information Technology', count: 1 }
		]
	});

	let recentActivities = $state([
		{
			id: 1,
			type: 'employee',
			title: 'System Administrator created',
			description: 'Admin user account was established',
			timestamp: new Date(),
			icon: Users
		}
	]);

	let upcomingTasks = $state([
		{
			id: 1,
			title: 'Setup employee onboarding process',
			dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
			priority: 'high',
			type: 'Onboarding'
		},
		{
			id: 2,
			title: 'Configure compliance tracking',
			dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
			priority: 'medium',
			type: 'Compliance'
		}
	]);

	// Quick stats cards data
	const quickStats = $derived([
		{
			title: 'Total Employees',
			value: dashboardData.totalEmployees,
			change: '+0%',
			changeType: 'neutral',
			icon: Users,
			href: '/hr/employees'
		},
		{
			title: 'Active Tasks',
			value: dashboardData.pendingTasks,
			change: '0 pending',
			changeType: 'neutral',
			icon: CheckSquare,
			href: '/hr/tasks'
		},
		{
			title: 'Compliance Rate',
			value: `${dashboardData.complianceRate}%`,
			change: '+0%',
			changeType: 'positive',
			icon: Shield,
			href: '/hr/compliance'
		},
		{
			title: 'Onboarding',
			value: dashboardData.onboardingInProgress,
			change: '0 in progress',
			changeType: 'neutral',
			icon: Calendar,
			href: '/hr/onboarding'
		}
	]);

	function formatDate(date: Date): string {
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		}).format(date);
	}

	function getPriorityColor(priority: string): string {
		switch (priority) {
			case 'high': return 'destructive';
			case 'medium': return 'secondary';
			case 'low': return 'outline';
			default: return 'secondary';
		}
	}
</script>

<div class="space-y-6">

	<!-- Quick Stats -->
	<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
		{#each quickStats as stat}
			{@const IconComponent = stat.icon}
			<Card class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-lg shadow-xl hover:shadow-2xl transition-all cursor-pointer" onclick={() => window.location.href = stat.href}>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">
						{stat.title}
					</CardTitle>
					<IconComponent class="h-4 w-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{stat.value}</div>
					<p class="text-xs text-muted-foreground">
						<span class="text-{stat.changeType === 'positive' ? 'green' : stat.changeType === 'negative' ? 'red' : 'muted'}-600">
							{stat.change}
						</span>
					</p>
				</CardContent>
			</Card>
		{/each}
	</div>

	<div class="grid gap-6 md:grid-cols-2">
		<!-- Recent Activity -->
		<Card class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-lg shadow-xl">
			<CardHeader>
				<CardTitle>Recent Activity</CardTitle>
				<CardDescription>
					Latest updates across your HR system
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div class="space-y-4">
					{#each recentActivities as activity}
						{@const IconComponent = activity.icon}
						<div class="flex items-start space-x-3">
							<div class="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
								<IconComponent class="h-4 w-4 text-primary" />
							</div>
							<div class="flex-1 min-w-0">
								<p class="text-sm font-medium">{activity.title}</p>
								<p class="text-sm text-muted-foreground">{activity.description}</p>
								<p class="text-xs text-muted-foreground mt-1">
									{formatDate(activity.timestamp)}
								</p>
							</div>
						</div>
					{/each}
					{#if recentActivities.length === 0}
						<div class="text-center py-6">
							<AlertCircle class="mx-auto h-12 w-12 text-muted-foreground/50" />
							<p class="mt-2 text-sm text-muted-foreground">No recent activity</p>
						</div>
					{/if}
				</div>
			</CardContent>
		</Card>

		<!-- Upcoming Tasks -->
		<Card class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-lg shadow-xl">
			<CardHeader>
				<CardTitle>Upcoming Tasks</CardTitle>
				<CardDescription>
					Tasks that need your attention
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div class="space-y-3">
					{#each upcomingTasks as task}
						<div class="flex items-center justify-between p-3 border border-border/50 rounded-lg">
							<div class="flex-1">
								<p class="text-sm font-medium">{task.title}</p>
								<div class="flex items-center space-x-2 mt-1">
									<Badge variant="outline" class="text-xs">
										{task.type}
									</Badge>
									<Badge variant={getPriorityColor(task.priority)} class="text-xs">
										{task.priority}
									</Badge>
								</div>
								<p class="text-xs text-muted-foreground mt-1">
									Due: {formatDate(task.dueDate)}
								</p>
							</div>
						</div>
					{/each}
					{#if upcomingTasks.length === 0}
						<div class="text-center py-6">
							<CheckSquare class="mx-auto h-12 w-12 text-muted-foreground/50" />
							<p class="mt-2 text-sm text-muted-foreground">No upcoming tasks</p>
						</div>
					{/if}
				</div>
				<div class="mt-4">
					<Button variant="outline" class="w-full" onclick={() => window.location.href = '/hr/tasks'}>
						View All Tasks
					</Button>
				</div>
			</CardContent>
		</Card>
	</div>

	<!-- Department Overview -->
	<Card class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-lg shadow-xl">
		<CardHeader>
			<CardTitle>Department Overview</CardTitle>
			<CardDescription>
				Employee distribution across departments
			</CardDescription>
		</CardHeader>
		<CardContent>
			<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{#each dashboardData.departmentBreakdown as dept}
					<div class="p-4 border border-border/50 rounded-lg">
						<div class="flex items-center justify-between">
							<h4 class="font-medium text-sm">{dept.department}</h4>
							<Badge variant="secondary">{dept.count}</Badge>
						</div>
						<div class="mt-2 w-full bg-secondary rounded-full h-2">
							<div 
								class="bg-primary h-2 rounded-full transition-all duration-300"
								style="width: {(dept.count / dashboardData.totalEmployees) * 100}%"
							></div>
						</div>
						<p class="text-xs text-muted-foreground mt-2">
							{((dept.count / dashboardData.totalEmployees) * 100).toFixed(0)}% of total
						</p>
					</div>
				{/each}
			</div>
		</CardContent>
	</Card>

	<!-- Quick Actions -->
	<Card>
		<CardHeader>
			<CardTitle>Quick Actions</CardTitle>
			<CardDescription>
				Common HR tasks and shortcuts
			</CardDescription>
		</CardHeader>
		<CardContent>
			<div class="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
				<Button 
					variant="outline" 
					class="justify-start h-auto p-4"
					onclick={() => window.location.href = '/hr/employees/new'}
				>
					<Users class="h-5 w-5 mr-3" />
					<div class="text-left">
						<p class="font-medium">Add Employee</p>
						<p class="text-xs text-muted-foreground">Create new employee record</p>
					</div>
				</Button>

				<Button 
					variant="outline" 
					class="justify-start h-auto p-4"
					onclick={() => window.location.href = '/hr/tasks/new'}
				>
					<CheckSquare class="h-5 w-5 mr-3" />
					<div class="text-left">
						<p class="font-medium">Create Task</p>
						<p class="text-xs text-muted-foreground">Add new HR task</p>
					</div>
				</Button>

				<Button 
					variant="outline" 
					class="justify-start h-auto p-4"
					onclick={() => window.location.href = '/hr/onboarding'}
				>
					<Calendar class="h-5 w-5 mr-3" />
					<div class="text-left">
						<p class="font-medium">Start Onboarding</p>
						<p class="text-xs text-muted-foreground">Begin new hire process</p>
					</div>
				</Button>

				<Button 
					variant="outline" 
					class="justify-start h-auto p-4"
					onclick={() => window.location.href = '/hr/compliance'}
				>
					<Shield class="h-5 w-5 mr-3" />
					<div class="text-left">
						<p class="font-medium">Check Compliance</p>
						<p class="text-xs text-muted-foreground">Review compliance status</p>
					</div>
				</Button>
			</div>
		</CardContent>
	</Card>

	<!-- Fixed position add button in bottom right corner -->
	<div class="fixed bottom-6 right-6 z-50">
		<Button class="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200" onclick={() => window.location.href = '/hr/employees/new'}>
			<Users class="h-5 w-5" />
		</Button>
	</div>
</div>