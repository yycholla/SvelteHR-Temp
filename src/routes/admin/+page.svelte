<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Server,
		Users,
		Database,
		Shield,
		Activity,
		AlertTriangle,
		CheckCircle,
		Clock
	} from 'lucide-svelte';
	import Card from '$lib/components/ui/card/card.svelte';
	import CardHeader from '$lib/components/ui/card/card-header.svelte';
	import CardTitle from '$lib/components/ui/card/card-title.svelte';
	import CardDescription from '$lib/components/ui/card/card-description.svelte';
	import CardContent from '$lib/components/ui/card/card-content.svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Progress from '$lib/components/ui/progress/progress.svelte';

	// System stats state
	let systemStats = $state({
		totalUsers: 1,
		activeUsers: 1,
		systemHealth: 98,
		uptime: '15 days',
		memoryUsage: 45,
		cpuUsage: 23,
		diskUsage: 67
	});

	let systemAlerts = $state([
		{
			id: 1,
			type: 'info',
			title: 'System Update Available',
			message: 'A new system update is available for installation',
			timestamp: new Date(),
			resolved: false
		}
	]);

	let recentActivities = $state([
		{
			id: 1,
			type: 'user',
			title: 'System Administrator logged in',
			description: 'Admin user accessed the system',
			timestamp: new Date(),
			icon: Users
		}
	]);

	// Quick stats cards data
	const quickStats = $derived([
		{
			title: 'Total Users',
			value: systemStats.totalUsers,
			change: '+0%',
			changeType: 'neutral',
			icon: Users,
			href: '/admin/users'
		},
		{
			title: 'System Health',
			value: `${systemStats.systemHealth}%`,
			change: 'Good',
			changeType: 'positive',
			icon: Activity,
			href: '/admin/monitoring'
		},
		{
			title: 'Database Status',
			value: 'Online',
			change: 'Connected',
			changeType: 'positive',
			icon: Database,
			href: '/admin/database'
		},
		{
			title: 'Security Status',
			value: 'Secure',
			change: 'No threats',
			changeType: 'positive',
			icon: Shield,
			href: '/admin/security'
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

	function getAlertIcon(type: string) {
		switch (type) {
			case 'error':
				return AlertTriangle;
			case 'warning':
				return Clock;
			case 'info':
				return CheckCircle;
			default:
				return CheckCircle;
		}
	}

	function getAlertVariant(type: string) {
		switch (type) {
			case 'error':
				return 'destructive';
			case 'warning':
				return 'secondary';
			case 'info':
				return 'outline';
			default:
				return 'outline';
		}
	}

	async function loadSystemData() {
		// In a real app, this would fetch from actual system APIs
		// For now, we'll use the mock data already set
	}

	onMount(() => {
		loadSystemData();
	});
</script>

<div class="space-y-6">
	<!-- Welcome Header -->
	<div class="mb-8">
		<h2 class="text-3xl font-bold tracking-tight">Welcome to Admin Portal</h2>
		<p class="mt-2 text-muted-foreground">
			Monitor and manage your system's infrastructure, users, and security.
		</p>
	</div>

	<!-- Quick Stats -->
	<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
		{#each quickStats as stat}
			{@const IconComponent = stat.icon}
			<Card
				class="cursor-pointer transition-shadow hover:shadow-md"
				onclick={() => (window.location.href = stat.href)}
			>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">
						{stat.title}
					</CardTitle>
					<IconComponent class="h-4 w-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">{stat.value}</div>
					<p class="text-xs text-muted-foreground">
						<span
							class="text-{stat.changeType === 'positive'
								? 'green'
								: stat.changeType === 'negative'
									? 'red'
									: 'muted'}-600"
						>
							{stat.change}
						</span>
					</p>
				</CardContent>
			</Card>
		{/each}
	</div>

	<div class="grid gap-6 md:grid-cols-2">
		<!-- System Performance -->
		<Card>
			<CardHeader>
				<CardTitle>System Performance</CardTitle>
				<CardDescription>Current system resource utilization</CardDescription>
			</CardHeader>
			<CardContent>
				<div class="space-y-4">
					<div>
						<div class="mb-2 flex items-center justify-between">
							<span class="text-sm font-medium">CPU Usage</span>
							<span class="text-sm text-muted-foreground">{systemStats.cpuUsage}%</span>
						</div>
						<Progress value={systemStats.cpuUsage} class="h-2" />
					</div>

					<div>
						<div class="mb-2 flex items-center justify-between">
							<span class="text-sm font-medium">Memory Usage</span>
							<span class="text-sm text-muted-foreground">{systemStats.memoryUsage}%</span>
						</div>
						<Progress value={systemStats.memoryUsage} class="h-2" />
					</div>

					<div>
						<div class="mb-2 flex items-center justify-between">
							<span class="text-sm font-medium">Disk Usage</span>
							<span class="text-sm text-muted-foreground">{systemStats.diskUsage}%</span>
						</div>
						<Progress value={systemStats.diskUsage} class="h-2" />
					</div>

					<div class="border-t pt-2">
						<div class="flex items-center justify-between">
							<span class="text-sm font-medium">System Uptime</span>
							<Badge variant="outline">{systemStats.uptime}</Badge>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>

		<!-- System Alerts -->
		<Card>
			<CardHeader>
				<CardTitle>System Alerts</CardTitle>
				<CardDescription>Important system notifications and warnings</CardDescription>
			</CardHeader>
			<CardContent>
				<div class="space-y-4">
					{#each systemAlerts as alert}
						{@const AlertIcon = getAlertIcon(alert.type)}
						<div class="flex items-start space-x-3">
							<div
								class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10"
							>
								<AlertIcon class="h-4 w-4 text-primary" />
							</div>
							<div class="min-w-0 flex-1">
								<div class="flex items-center justify-between">
									<p class="text-sm font-medium">{alert.title}</p>
									<Badge variant={getAlertVariant(alert.type)}>
										{alert.type}
									</Badge>
								</div>
								<p class="mt-1 text-sm text-muted-foreground">{alert.message}</p>
								<p class="mt-2 text-xs text-muted-foreground">
									{formatDate(alert.timestamp)}
								</p>
							</div>
						</div>
					{/each}
					{#if systemAlerts.length === 0}
						<div class="py-6 text-center">
							<CheckCircle class="mx-auto h-12 w-12 text-muted-foreground/50" />
							<p class="mt-2 text-sm text-muted-foreground">No system alerts</p>
						</div>
					{/if}
				</div>
			</CardContent>
		</Card>
	</div>

	<!-- Recent Activity -->
	<Card>
		<CardHeader>
			<CardTitle>Recent System Activity</CardTitle>
			<CardDescription>Latest administrative and system events</CardDescription>
		</CardHeader>
		<CardContent>
			<div class="space-y-4">
				{#each recentActivities as activity}
					{@const IconComponent = activity.icon}
					<div class="flex items-start space-x-3">
						<div
							class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10"
						>
							<IconComponent class="h-4 w-4 text-primary" />
						</div>
						<div class="min-w-0 flex-1">
							<p class="text-sm font-medium">{activity.title}</p>
							<p class="text-sm text-muted-foreground">{activity.description}</p>
							<p class="mt-1 text-xs text-muted-foreground">
								{formatDate(activity.timestamp)}
							</p>
						</div>
					</div>
				{/each}
				{#if recentActivities.length === 0}
					<div class="py-6 text-center">
						<Activity class="mx-auto h-12 w-12 text-muted-foreground/50" />
						<p class="mt-2 text-sm text-muted-foreground">No recent activity</p>
					</div>
				{/if}
			</div>
		</CardContent>
	</Card>

	<!-- Quick Actions -->
	<Card>
		<CardHeader>
			<CardTitle>Quick Actions</CardTitle>
			<CardDescription>Common administrative tasks and shortcuts</CardDescription>
		</CardHeader>
		<CardContent>
			<div class="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
				<Button
					variant="outline"
					class="h-auto justify-start p-4"
					onclick={() => (window.location.href = '/admin/users')}
				>
					<Users class="mr-3 h-5 w-5" />
					<div class="text-left">
						<p class="font-medium">Manage Users</p>
						<p class="text-xs text-muted-foreground">Add or edit user accounts</p>
					</div>
				</Button>

				<Button
					variant="outline"
					class="h-auto justify-start p-4"
					onclick={() => (window.location.href = '/admin/database')}
				>
					<Database class="mr-3 h-5 w-5" />
					<div class="text-left">
						<p class="font-medium">Database Backup</p>
						<p class="text-xs text-muted-foreground">Create system backup</p>
					</div>
				</Button>

				<Button
					variant="outline"
					class="h-auto justify-start p-4"
					onclick={() => (window.location.href = '/admin/security')}
				>
					<Shield class="mr-3 h-5 w-5" />
					<div class="text-left">
						<p class="font-medium">Security Audit</p>
						<p class="text-xs text-muted-foreground">Review security logs</p>
					</div>
				</Button>

				<Button
					variant="outline"
					class="h-auto justify-start p-4"
					onclick={() => (window.location.href = '/admin/monitoring')}
				>
					<Activity class="mr-3 h-5 w-5" />
					<div class="text-left">
						<p class="font-medium">System Health</p>
						<p class="text-xs text-muted-foreground">Monitor performance</p>
					</div>
				</Button>
			</div>
		</CardContent>
	</Card>
</div>
