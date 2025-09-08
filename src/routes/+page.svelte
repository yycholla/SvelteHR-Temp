<!--
	Dashboard Home Page
	
	Main dashboard with analytics, quick actions, and overview cards
	Displays key HR metrics and provides navigation to main features
-->

<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import DataTable from '$lib/components/ui/DataTable.svelte';
	import type { PageData } from './$types';
	import { onMount } from 'svelte';

	// Props from page data
	export let data: PageData;

	// Dashboard state
	let quickStats = $state({
		totalEmployees: 247,
		activeEmployees: 235,
		pendingRequests: 8,
		upcomingReviews: 12
	});

	let recentActivity = $state([
		{
			id: '1',
			type: 'Employee Added',
			description: 'John Smith joined Engineering department',
			timestamp: '2 hours ago',
			user: 'HR Manager'
		},
		{
			id: '2',
			type: 'Leave Request',
			description: 'Sarah Johnson requested vacation leave',
			timestamp: '4 hours ago',
			user: 'Sarah Johnson'
		},
		{
			id: '3',
			type: 'Performance Review',
			description: 'Completed Q4 review for Marketing team',
			timestamp: '1 day ago',
			user: 'Lisa Chen'
		}
	]);

	// Activity table columns
	const activityColumns = [
		{
			key: 'type',
			label: 'Activity Type',
			sortable: true
		},
		{
			key: 'description',
			label: 'Description',
			sortable: false
		},
		{
			key: 'user',
			label: 'User',
			sortable: true
		},
		{
			key: 'timestamp',
			label: 'Time',
			sortable: true,
			align: 'right' as const
		}
	];

	// Quick actions based on user role
	$: quickActions = [
		{
			title: 'Add Employee',
			description: 'Register a new team member',
			href: '/employees/new',
			icon: '👤',
			color: 'primary',
			permission: 'employees:write'
		},
		{
			title: 'Send Communication',
			description: 'Send announcement or message',
			href: '/communications/new',
			icon: '📢',
			color: 'secondary',
			permission: 'communications:write'
		},
		{
			title: 'View Reports',
			description: 'Access HR analytics and reports',
			href: '/reports',
			icon: '📊',
			color: 'outline',
			permission: 'reports:read'
		},
		{
			title: 'Manage Departments',
			description: 'Organize team structure',
			href: '/departments',
			icon: '🏢',
			color: 'ghost',
			permission: 'departments:read'
		}
	];

	// Check if user has permission for action
	function hasPermission(permission: string): boolean {
		if (!data.user?.permissions) return false;
		return data.user.permissions.includes('*') || data.user.permissions.includes(permission);
	}

	// Filter actions based on permissions
	$: visibleActions = quickActions.filter(action => hasPermission(action.permission));

	onMount(() => {
		// Initialize dashboard data - in real app this would fetch from API
		console.log('Dashboard mounted for user:', data.user?.full_name);
	});
</script>

<svelte:head>
	<title>Dashboard - MountainHR</title>
	<meta name="description" content="MountainHR Dashboard - Overview of your HR system" />
</svelte:head>

<div class="space-y-8">
	<!-- Welcome Header -->
	<div class="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-lg p-6">
		<h1 class="text-3xl font-bold text-foreground mb-2">
			Welcome back, {data.user?.full_name || data.user?.email || 'User'}!
		</h1>
		<p class="text-muted-foreground">
			Here's what's happening in your organization today.
		</p>
	</div>

	<!-- Quick Stats -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
		<div class="bg-card border rounded-lg p-6">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Total Employees</p>
					<p class="text-3xl font-bold text-foreground">{quickStats.totalEmployees}</p>
				</div>
				<div class="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
					<span class="text-2xl">👥</span>
				</div>
			</div>
			<div class="mt-4">
				<span class="text-sm text-green-600">+12 this month</span>
			</div>
		</div>

		<div class="bg-card border rounded-lg p-6">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Active Employees</p>
					<p class="text-3xl font-bold text-foreground">{quickStats.activeEmployees}</p>
				</div>
				<div class="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
					<span class="text-2xl">✅</span>
				</div>
			</div>
			<div class="mt-4">
				<span class="text-sm text-green-600">95.1% active rate</span>
			</div>
		</div>

		<div class="bg-card border rounded-lg p-6">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Pending Requests</p>
					<p class="text-3xl font-bold text-foreground">{quickStats.pendingRequests}</p>
				</div>
				<div class="w-12 h-12 bg-yellow-500/10 rounded-lg flex items-center justify-center">
					<span class="text-2xl">⏳</span>
				</div>
			</div>
			<div class="mt-4">
				<span class="text-sm text-yellow-600">Needs attention</span>
			</div>
		</div>

		<div class="bg-card border rounded-lg p-6">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Upcoming Reviews</p>
					<p class="text-3xl font-bold text-foreground">{quickStats.upcomingReviews}</p>
				</div>
				<div class="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
					<span class="text-2xl">⭐</span>
				</div>
			</div>
			<div class="mt-4">
				<span class="text-sm text-blue-600">Next 30 days</span>
			</div>
		</div>
	</div>

	<!-- Quick Actions -->
	<div class="bg-card border rounded-lg p-6">
		<h2 class="text-xl font-semibold text-foreground mb-4">Quick Actions</h2>
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
			{#each visibleActions as action}
				<a
					href={action.href}
					class="group p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
				>
					<div class="flex items-start space-x-3">
						<div class="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
							<span class="text-lg">{action.icon}</span>
						</div>
						<div class="flex-1 min-w-0">
							<h3 class="font-medium text-foreground group-hover:text-primary transition-colors">
								{action.title}
							</h3>
							<p class="text-sm text-muted-foreground mt-1">
								{action.description}
							</p>
						</div>
					</div>
				</a>
			{/each}
		</div>
	</div>

	<!-- Recent Activity -->
	<div class="bg-card border rounded-lg p-6">
		<div class="flex items-center justify-between mb-4">
			<h2 class="text-xl font-semibold text-foreground">Recent Activity</h2>
			<Button variant="outline" size="sm" onclick={() => window.location.href = '/activity'}>
				View All
			</Button>
		</div>
		
		<DataTable
			data={recentActivity}
			columns={activityColumns}
			pagination={false}
			striped
			hover
			emptyMessage="No recent activity"
		/>
	</div>

	<!-- System Status (for admin users) -->
	{#if data.user?.roles?.some(role => role.name === 'Admin')}
		<div class="bg-card border rounded-lg p-6">
			<h2 class="text-xl font-semibold text-foreground mb-4">System Status</h2>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div class="flex items-center space-x-3">
					<div class="w-3 h-3 bg-green-500 rounded-full"></div>
					<span class="text-sm font-medium">API Status: Healthy</span>
				</div>
				<div class="flex items-center space-x-3">
					<div class="w-3 h-3 bg-green-500 rounded-full"></div>
					<span class="text-sm font-medium">Database: Connected</span>
				</div>
				<div class="flex items-center space-x-3">
					<div class="w-3 h-3 bg-yellow-500 rounded-full"></div>
					<span class="text-sm font-medium">Backup: Scheduled</span>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	/* Custom animations for dashboard cards */
	.bg-card {
		transition: all 0.2s ease-in-out;
	}

	.bg-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 8px 25px -6px rgba(0, 0, 0, 0.1);
	}

	/* Pulse animation for status indicators */
	.bg-green-500,
	.bg-yellow-500,
	.bg-blue-500 {
		animation: pulse 2s infinite;
	}

	@keyframes pulse {
		0%, 100% {
			opacity: 1;
		}
		50% {
			opacity: 0.8;
		}
	}
</style>
