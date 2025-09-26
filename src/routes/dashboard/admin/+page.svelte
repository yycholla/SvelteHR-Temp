<script lang="ts">
	import { onMount } from 'svelte';
	import { currentUser } from '$lib/stores/auth';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import {
		Shield,
		Users,
		Building2,
		Settings,
		TrendingUp,
		AlertTriangle,
		Activity,
		Database,
		Lock,
		BarChart3
	} from 'lucide-svelte';

	// Admin dashboard metrics
	let adminMetrics = [
		{
			title: 'Total Users',
			value: '142',
			change: { value: '+12', type: 'increase', period: 'this month' },
			icon: Users,
			href: '/dashboard/admin/users'
		},
		{
			title: 'Active Departments',
			value: '8',
			change: { value: '2 new', type: 'increase', period: 'this quarter' },
			icon: Building2,
			href: '/dashboard/admin/departments'
		},
		{
			title: 'System Health',
			value: '98.5%',
			change: { value: 'Healthy', type: 'neutral', period: 'uptime' },
			icon: Activity,
			href: '/dashboard/admin/monitoring'
		},
		{
			title: 'Security Alerts',
			value: '3',
			change: { value: '2 resolved', type: 'warning', period: 'this week' },
			icon: Shield,
			href: '/dashboard/admin/security'
		}
	];

	// Quick admin actions
	let adminActions = [
		{
			title: 'User Management',
			description: 'Manage user accounts and permissions',
			icon: Users,
			href: '/dashboard/admin/users'
		},
		{
			title: 'Role Management',
			description: 'Configure roles and permissions',
			icon: Lock,
			href: '/dashboard/admin/roles'
		},
		{
			title: 'System Settings',
			description: 'Configure system-wide settings',
			icon: Settings,
			href: '/dashboard/admin/settings'
		},
		{
			title: 'Audit Logs',
			description: 'Review system audit logs',
			icon: BarChart3,
			href: '/dashboard/admin/audit'
		},
		{
			title: 'Data Management',
			description: 'Backup and data operations',
			icon: Database,
			href: '/dashboard/admin/data'
		},
		{
			title: 'Security Center',
			description: 'Security policies and monitoring',
			icon: Shield,
			href: '/dashboard/admin/security'
		}
	];
</script>

<svelte:head>
	<title>Admin Dashboard - SvelteHR</title>
	<meta name="description" content="System administration dashboard for SvelteHR" />
</svelte:head>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
			<p class="text-muted-foreground">System administration and management</p>
		</div>
		<Badge variant="secondary" class="bg-blue-50 text-blue-600">
			<Shield class="mr-1 h-3 w-3" />
			Administrator
		</Badge>
	</div>

	<!-- Admin Metrics Cards -->
	<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
		{#each adminMetrics as metric}
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

	<!-- Quick Admin Actions -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Administration Tools</Card.Title>
			<Card.Description>Quick access to common administrative tasks</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				{#each adminActions as action}
					<Button
						variant="outline"
						class="flex h-auto flex-col items-start gap-2 p-4 text-left"
						href={action.href}
					>
						<div class="flex items-center gap-2">
							<svelte:component this={action.icon} class="h-5 w-5 text-primary" />
							<span class="font-medium">{action.title}</span>
						</div>
						<p class="text-xs text-muted-foreground">{action.description}</p>
					</Button>
				{/each}
			</div>
		</Card.Content>
	</Card.Root>

	<!-- System Status -->
	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<!-- Recent System Activity -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Recent System Activity</Card.Title>
				<Card.Description>Latest system events and activities</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="space-y-4">
					<div class="flex items-start space-x-3">
						<div class="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
							<Users class="h-3 w-3 text-green-600" />
						</div>
						<div class="flex-1 space-y-1">
							<p class="text-sm font-medium">New user registration</p>
							<p class="text-xs text-muted-foreground">john.doe@company.com - 2 minutes ago</p>
						</div>
					</div>
					<div class="flex items-start space-x-3">
						<div class="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100">
							<Settings class="h-3 w-3 text-blue-600" />
						</div>
						<div class="flex-1 space-y-1">
							<p class="text-sm font-medium">System configuration updated</p>
							<p class="text-xs text-muted-foreground">Email settings modified - 15 minutes ago</p>
						</div>
					</div>
					<div class="flex items-start space-x-3">
						<div class="flex h-6 w-6 items-center justify-center rounded-full bg-orange-100">
							<AlertTriangle class="h-3 w-3 text-orange-600" />
						</div>
						<div class="flex-1 space-y-1">
							<p class="text-sm font-medium">Security alert resolved</p>
							<p class="text-xs text-muted-foreground">Failed login attempt blocked - 1 hour ago</p>
						</div>
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- System Health -->
		<Card.Root>
			<Card.Header>
				<Card.Title>System Health</Card.Title>
				<Card.Description>Current system performance metrics</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="space-y-4">
					<div class="space-y-2">
						<div class="flex items-center justify-between text-sm">
							<span class="font-medium">Server Uptime</span>
							<span class="text-muted-foreground">99.8%</span>
						</div>
						<div class="h-2 w-full rounded-full bg-secondary">
							<div class="h-2 rounded-full bg-green-500" style="width: 99.8%"></div>
						</div>
					</div>
					<div class="space-y-2">
						<div class="flex items-center justify-between text-sm">
							<span class="font-medium">Database Performance</span>
							<span class="text-muted-foreground">95.2%</span>
						</div>
						<div class="h-2 w-full rounded-full bg-secondary">
							<div class="h-2 rounded-full bg-green-500" style="width: 95.2%"></div>
						</div>
					</div>
					<div class="space-y-2">
						<div class="flex items-center justify-between text-sm">
							<span class="font-medium">API Response Time</span>
							<span class="text-muted-foreground">142ms avg</span>
						</div>
						<div class="h-2 w-full rounded-full bg-secondary">
							<div class="h-2 rounded-full bg-yellow-500" style="width: 75%"></div>
						</div>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</div>
