<script lang="ts">
	import { onMount } from 'svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import {
		Activity,
		AlertTriangle,
		BarChart3,
		Building2,
		Database,
		Lock,
		Settings,
		Shield,
		TrendingUp,
		Users,
		ArrowRight
	} from '@lucide/svelte';

	// Admin dashboard metrics
	const adminMetrics = [
		{
			title: 'Total Users',
			value: '142',
			change: { value: '+12', type: 'increase', period: 'this month' },
			icon: Users,
			href: '/admin/users'
		},
		{
			title: 'Active Departments',
			value: '8',
			change: { value: '2 new', type: 'increase', period: 'this quarter' },
			icon: Building2,
			href: '/admin/departments'
		},
		{
			title: 'System Health',
			value: '98.5%',
			change: { value: 'Healthy', type: 'neutral', period: 'uptime' },
			icon: Activity,
			href: '/admin/monitoring'
		},
		{
			title: 'Security Alerts',
			value: '3',
			change: { value: '2 resolved', type: 'warning', period: 'this week' },
			icon: Shield,
			href: '/admin/security'
		}
	];

	// Quick admin actions
	const adminActions = [
		{
			title: 'User Management',
			description: 'Manage user accounts and permissions',
			icon: Users,
			href: '/admin/users'
		},
		{
			title: 'Role Management',
			description: 'Configure roles and permissions',
			icon: Lock,
			href: '/admin/roles'
		},
		{
			title: 'System Settings',
			description: 'Configure system-wide settings',
			icon: Settings,
			href: '/admin/settings'
		},
		{
			title: 'Audit Logs',
			description: 'Review system audit logs',
			icon: BarChart3,
			href: '/admin/audit'
		},
		{
			title: 'Data Management',
			description: 'Backup and data operations',
			icon: Database,
			href: '/admin/data'
		},
		{
			title: 'Security Center',
			description: 'Security policies and monitoring',
			icon: Shield,
			href: '/admin/security'
		}
	];
</script>

<svelte:head>
	<title>Admin Dashboard - MountainHR</title>
	<meta name="description" content="System administration dashboard for MountainHR" />
</svelte:head>

<div class="flex flex-col h-full overflow-hidden bg-background">
	<!-- Top Bar: Metrics Overview -->
	<div class="flex-shrink-0 border-b bg-background px-4 py-3 flex items-center justify-between">
		<div class="flex items-center gap-6">
			<h1 class="text-sm font-semibold tracking-tight text-foreground">Overview</h1>
			<div class="h-4 w-px bg-border"></div>
			<div class="flex items-center gap-6 text-sm">
				{#each adminMetrics as metric}
					{@const Icon = metric.icon}
					<div class="flex items-center gap-2">
						<Icon class="h-4 w-4 text-muted-foreground" />
						<span class="font-medium">{metric.value}</span>
						<span class="text-xs text-muted-foreground">{metric.title}</span>
					</div>
				{/each}
			</div>
		</div>
		<div>
			<Badge variant="outline" class="text-xs font-normal">
				<Shield class="mr-1 h-3 w-3" />
				Administrator
			</Badge>
		</div>
	</div>

	<!-- Main Content Grid -->
	<div class="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x">
		
		<!-- Left Pane: Quick Actions -->
		<div class="lg:col-span-2 flex flex-col bg-background">
			<div class="p-3 border-b bg-muted/5 font-medium text-xs uppercase tracking-wider text-muted-foreground">
				Tools & Configuration
			</div>
			<div class="flex-1 overflow-auto p-4">
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					{#each adminActions as action}
						{@const Icon = action.icon}
						<a
							href={action.href}
							class="group flex items-start gap-3 p-3 rounded-md border border-transparent hover:border-border hover:bg-muted/30 transition-all"
						>
							<div class="p-2 rounded-md bg-muted group-hover:bg-background transition-colors">
								<Icon class="h-5 w-5 text-foreground" />
							</div>
							<div class="flex-1 min-w-0">
								<div class="flex items-center justify-between mb-1">
									<span class="text-sm font-medium group-hover:text-primary transition-colors">{action.title}</span>
									<ArrowRight class="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
								</div>
								<p class="text-xs text-muted-foreground line-clamp-2">{action.description}</p>
							</div>
						</a>
					{/each}
				</div>
			</div>
		</div>

		<!-- Right Pane: Activity & Health -->
		<div class="flex flex-col bg-background">
			<div class="p-3 border-b bg-muted/5 font-medium text-xs uppercase tracking-wider text-muted-foreground">
				System Activity
			</div>
			<div class="flex-1 overflow-auto">
				<!-- Activity List -->
				<div class="divide-y">
					<div class="p-4 hover:bg-muted/10 transition-colors">
						<div class="flex items-start gap-3">
							<div class="mt-0.5 h-2 w-2 rounded-full bg-green-500"></div>
							<div>
								<p class="text-sm font-medium">New user registration</p>
								<p class="text-xs text-muted-foreground mt-0.5">john.doe@company.com</p>
								<p class="text-[10px] text-muted-foreground mt-1">2 minutes ago</p>
							</div>
						</div>
					</div>
					<div class="p-4 hover:bg-muted/10 transition-colors">
						<div class="flex items-start gap-3">
							<div class="mt-0.5 h-2 w-2 rounded-full bg-blue-500"></div>
							<div>
								<p class="text-sm font-medium">System config updated</p>
								<p class="text-xs text-muted-foreground mt-0.5">Email settings modified</p>
								<p class="text-[10px] text-muted-foreground mt-1">15 minutes ago</p>
							</div>
						</div>
					</div>
					<div class="p-4 hover:bg-muted/10 transition-colors">
						<div class="flex items-start gap-3">
							<div class="mt-0.5 h-2 w-2 rounded-full bg-orange-500"></div>
							<div>
								<p class="text-sm font-medium">Security alert resolved</p>
								<p class="text-xs text-muted-foreground mt-0.5">Failed login attempt blocked</p>
								<p class="text-[10px] text-muted-foreground mt-1">1 hour ago</p>
							</div>
						</div>
					</div>
				</div>

				<div class="p-3 border-t border-b bg-muted/5 font-medium text-xs uppercase tracking-wider text-muted-foreground mt-4">
					Health Metrics
				</div>
				<div class="p-4 space-y-4">
					<div class="space-y-1">
						<div class="flex items-center justify-between text-xs">
							<span>Server Uptime</span>
							<span class="font-mono">99.8%</span>
						</div>
						<div class="h-1.5 w-full rounded-full bg-muted">
							<div class="h-1.5 rounded-full bg-green-500" style="width: 99.8%"></div>
						</div>
					</div>
					<div class="space-y-1">
						<div class="flex items-center justify-between text-xs">
							<span>Database Load</span>
							<span class="font-mono">42%</span>
						</div>
						<div class="h-1.5 w-full rounded-full bg-muted">
							<div class="h-1.5 rounded-full bg-blue-500" style="width: 42%"></div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>