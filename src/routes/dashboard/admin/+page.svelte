<script lang="ts">
	import { currentUser } from '$lib/stores/auth';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Progress } from '$lib/components/ui/progress';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert';
	import * as Table from '$lib/components/ui/table';
	import * as Card from '$lib/components/ui/card';
	import {
		UserCog,
		BarChart3,
		Settings,
		Database,
		ChevronRight,
		Users,
		Building,
		Activity,
		Shield,
		FileText,
		Clock,
		TrendingUp,
		ArrowUp,
		ArrowDown,
		Minus,
		CheckCircle,
		AlertTriangle,
		RefreshCw,
		Plus,
		Info,
		AlertCircle
	} from 'lucide-svelte';
	import type {
		BreadcrumbItem,
		NotificationItem,
		UserInfo
	} from '../../contracts/component-interface';
	// User info from auth store
	const user: UserInfo | null = $derived(
		$currentUser
			? {
					name: $currentUser.display_name || 'Admin User',
					role: 'Administrator',
					email: $currentUser.email || ''
				}
			: null
	);

	// System notifications
	let notifications: NotificationItem[] = $state([
		{
			id: 'maintenance',
			type: 'info',
			title: 'Scheduled Maintenance',
			message: 'System maintenance scheduled for this weekend'
		}
	]);

	// Admin sections data
	const adminSections = $state([
		{
			id: 'users',
			title: 'User & Role Management',
			subtitle: 'Manage user accounts, roles, and permissions',
			value: '42',
			icon: Users,
			href: '/dashboard/admin/users',
			color: 'blue' as const,
			available: true,
			trend: { direction: 'up' as const, percentage: 5, description: '+2 this week' }
		},
		{
			id: 'monitoring',
			title: 'Performance Monitoring',
			subtitle: 'Monitor application performance and metrics',
			value: 'Real-time',
			icon: BarChart3,
			href: '/dashboard/admin/monitoring',
			color: 'green' as const,
			available: true,
			trend: { direction: 'neutral' as const, description: 'All systems operational' }
		},
		{
			id: 'settings',
			title: 'System Configuration',
			subtitle: 'Configure system settings and parameters',
			value: 'v2.1.0',
			icon: Settings,
			href: '/dashboard/admin/settings',
			color: 'purple' as const,
			available: false
		},
		{
			id: 'audit',
			title: 'Audit & Logs',
			subtitle: 'View system audit logs and user activity',
			value: '1,284',
			icon: FileText,
			href: '/dashboard/admin/audit',
			color: 'yellow' as const,
			available: false,
			trend: { direction: 'up' as const, percentage: 12, description: 'Events today' }
		},
		{
			id: 'data',
			title: 'Data Management',
			subtitle: 'Manage departments and system data',
			value: '8',
			icon: Database,
			href: '/dashboard/admin/data',
			color: 'teal' as const,
			available: false,
			trend: { direction: 'neutral' as const, description: 'Departments' }
		},
		{
			id: 'security',
			title: 'Security Center',
			subtitle: 'Security policies and access control',
			value: '98%',
			icon: Shield,
			href: '/dashboard/admin/security',
			color: 'red' as const,
			available: false,
			trend: { direction: 'up' as const, percentage: 2, description: 'Security score' }
		}
	]);

	// System health metrics
	const systemHealth = $state({
		cpu: { value: 45, status: 'success' as const, label: 'CPU Usage' },
		memory: { value: 62, status: 'warning' as const, label: 'Memory Usage' },
		storage: { value: 38, status: 'success' as const, label: 'Storage Usage' },
		network: { value: 88, status: 'error' as const, label: 'Network Load' }
	});

	// Recent activity
	const recentActivity = $state([
		{
			icon: Users,
			message: 'New user Sarah Johnson registered',
			time: '2 hours ago',
			type: 'user'
		},
		{
			icon: Settings,
			message: 'System settings updated',
			time: '5 hours ago',
			type: 'system'
		},
		{
			icon: Shield,
			message: 'Security policy modified',
			time: '1 day ago',
			type: 'security'
		},
		{
			icon: Database,
			message: 'Database backup completed',
			time: '2 days ago',
			type: 'data'
		}
	]);

	// Quick actions
	const quickActions = $state([
		{
			label: 'Add User',
			icon: UserCog,
			href: '/dashboard/admin/users/new',
			variant: 'default' as const
		},
		{
			label: 'View Logs',
			icon: FileText,
			href: '/dashboard/admin/audit',
			variant: 'outline' as const
		},
		{
			label: 'System Settings',
			icon: Settings,
			href: '/dashboard/admin/settings',
			variant: 'outline' as const
		}
	]);

	// Data table for user overview
	const userTableHeaders = [
		{ key: 'name', value: 'Name' },
		{ key: 'email', value: 'Email' },
		{ key: 'role', value: 'Role' },
		{ key: 'status', value: 'Status' },
		{ key: 'lastActive', value: 'Last Active' }
	];

	const userTableRows = $state([
		{
			id: '1',
			name: 'John Doe',
			email: 'john.doe@example.com',
			role: 'Admin',
			status: 'Active',
			lastActive: '2 minutes ago'
		},
		{
			id: '2',
			name: 'Jane Smith',
			email: 'jane.smith@example.com',
			role: 'HR Manager',
			status: 'Active',
			lastActive: '1 hour ago'
		},
		{
			id: '3',
			name: 'Bob Wilson',
			email: 'bob.wilson@example.com',
			role: 'Employee',
			status: 'Inactive',
			lastActive: '3 days ago'
		}
	]);

	let loading = $state(false);

	function goBack() {
		goto('/dashboard');
	}

	// Refresh data
	function refreshData() {
		loading = true;
		// Simulate data refresh
		setTimeout(() => {
			loading = false;
			console.log('Admin dashboard data refreshed');
		}, 1000);
	}

	function getTrendIcon(direction: string) {
		switch (direction) {
			case 'up':
				return ArrowUp;
			case 'down':
				return ArrowDown;
			default:
				return Minus;
		}
	}

	function getStatusVariant(status: string) {
		switch (status) {
			case 'success':
				return 'default';
			case 'warning':
				return 'secondary';
			case 'error':
				return 'destructive';
			default:
				return 'outline';
		}
	}
</script>

<svelte:head>
	<title>Admin Dashboard - SvelteHR</title>
	<meta name="description" content="Administrative dashboard for SvelteHR system" />
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="flex items-center gap-3 text-3xl font-bold tracking-tight">
				<UserCog class="h-8 w-8" />
				Admin Dashboard
			</h1>
			<p class="text-muted-foreground">
				Manage system settings, user roles, and monitor system health
			</p>
		</div>
		<Button variant="outline" onclick={refreshData} disabled={loading}>
			{#if loading}
				<RefreshCw class="mr-2 h-4 w-4 animate-spin" />
			{:else}
				<RefreshCw class="mr-2 h-4 w-4" />
			{/if}
			Refresh
		</Button>
	</div>
	<!-- Quick Actions -->
	<div class="flex items-center gap-3 rounded-lg bg-muted/50 p-4">
		<span class="text-sm font-medium">Quick Actions:</span>
		{#each quickActions as action}
			<Button variant={action.variant} size="sm" href={action.href}>
				<svelte:component this={action.icon} class="mr-2 h-4 w-4" />
				{action.label}
			</Button>
		{/each}
	</div>

	<!-- Administrative Functions -->
	<div>
		<h2 class="mb-6 text-2xl font-bold">Administrative Functions</h2>
		<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
			{#each adminSections as section}
				<Card.Root
					class={`cursor-pointer transition-all hover:shadow-md ${section.available ? '' : 'opacity-60'}`}
				>
					<Card.Header class="pb-3">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-3">
								<div class="rounded-lg bg-primary/10 p-2">
									<svelte:component this={section.icon} class="h-6 w-6 text-primary" />
								</div>
								<div>
									<Card.Title class="text-lg">{section.title}</Card.Title>
								</div>
							</div>
							<Badge variant={section.available ? 'default' : 'secondary'}>
								{section.available ? 'Available' : 'Coming Soon'}
							</Badge>
						</div>
					</Card.Header>
					<Card.Content>
						<p class="mb-4 text-sm text-muted-foreground">{section.subtitle}</p>
						<div class="flex items-center justify-between">
							<div class="text-2xl font-bold">{section.value}</div>
							{#if section.trend}
								<div class="flex items-center gap-1 text-sm text-muted-foreground">
									{#if section.trend.direction !== 'neutral'}
										<svelte:component
											this={getTrendIcon(section.trend.direction)}
											class="h-3 w-3"
										/>
									{/if}
									<span>{section.trend.description}</span>
								</div>
							{/if}
						</div>
						{#if section.available}
							<Button class="mt-4 w-full" variant="outline" href={section.href}>
								View Details
								<ChevronRight class="ml-2 h-4 w-4" />
							</Button>
						{/if}
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	</div>

	<!-- System Health -->
	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<Activity class="h-5 w-5" />
				System Health
			</Card.Title>
		</Card.Header>
		<Card.Content>
			<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
				{#each Object.entries(systemHealth) as [key, metric]}
					<div class="space-y-3">
						<div class="flex items-center justify-between">
							<span class="text-sm font-medium">{metric.label}</span>
							<Badge variant={getStatusVariant(metric.status)}>
								{metric.value}%
							</Badge>
						</div>
						<Progress value={metric.value} class="h-2" />
					</div>
				{/each}
			</div>
		</Card.Content>
	</Card.Root>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<!-- Recent Activity -->
		<Card.Root>
			<Card.Header>
				<div class="flex items-center justify-between">
					<Card.Title class="flex items-center gap-2">
						<Clock class="h-5 w-5" />
						Recent Activity
					</Card.Title>
					<Button variant="ghost" size="sm" href="/dashboard/admin/audit">
						View All
						<ChevronRight class="ml-1 h-4 w-4" />
					</Button>
				</div>
			</Card.Header>
			<Card.Content>
				<div class="space-y-4">
					{#each recentActivity as activity}
						<div class="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
							<div class="rounded-full bg-primary/10 p-2">
								<svelte:component this={activity.icon} class="h-4 w-4 text-primary" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-sm font-medium">{activity.message}</p>
								<p class="text-xs text-muted-foreground">{activity.time}</p>
							</div>
						</div>
					{/each}
				</div>
			</Card.Content>
		</Card.Root>

		<!-- System Alerts -->
		<Card.Root>
			<Card.Header>
				<div class="flex items-center justify-between">
					<Card.Title class="flex items-center gap-2">
						<AlertTriangle class="h-5 w-5" />
						System Alerts
					</Card.Title>
					<Badge variant="default">3 Active</Badge>
				</div>
			</Card.Header>
			<Card.Content>
				<div class="space-y-4">
					<Alert>
						<Info class="h-4 w-4" />
						<AlertTitle>Scheduled Maintenance</AlertTitle>
						<AlertDescription>System maintenance scheduled for this weekend</AlertDescription>
					</Alert>

					<Alert>
						<CheckCircle class="h-4 w-4" />
						<AlertTitle>Backup Complete</AlertTitle>
						<AlertDescription>Daily backup completed successfully at 3:00 AM</AlertDescription>
					</Alert>

					<Alert variant="destructive">
						<AlertCircle class="h-4 w-4" />
						<AlertTitle>High Memory Usage</AlertTitle>
						<AlertDescription>Memory usage at 62% - consider optimization</AlertDescription>
					</Alert>
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- User Overview Table -->
	<Card.Root>
		<Card.Header>
			<div class="flex items-center justify-between">
				<Card.Title class="flex items-center gap-2">
					<Users class="h-5 w-5" />
					Recent Users
				</Card.Title>
				<Button href="/dashboard/admin/users">
					<UserCog class="mr-2 h-4 w-4" />
					Manage Users
				</Button>
			</div>
		</Card.Header>
		<Card.Content>
			{#if loading}
				<div class="space-y-4">
					{#each Array(3) as _}
						<div class="h-12 animate-pulse rounded bg-muted"></div>
					{/each}
				</div>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Name</Table.Head>
							<Table.Head>Email</Table.Head>
							<Table.Head>Role</Table.Head>
							<Table.Head>Status</Table.Head>
							<Table.Head>Last Active</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each userTableRows as user}
							<Table.Row>
								<Table.Cell class="font-medium">{user.name}</Table.Cell>
								<Table.Cell>{user.email}</Table.Cell>
								<Table.Cell>
									<Badge variant="outline">{user.role}</Badge>
								</Table.Cell>
								<Table.Cell>
									<Badge variant={user.status === 'Active' ? 'default' : 'secondary'}>
										{user.status}
									</Badge>
								</Table.Cell>
								<Table.Cell class="text-muted-foreground">{user.lastActive}</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
