<svelte:head>
	<title>Analytics Dashboard - SvelteHR Admin</title>
	<meta name="description" content="System-wide analytics and insights for administrators. Monitor user activity, department metrics, and organizational performance." />
	<meta property="og:title" content="Analytics Dashboard - SvelteHR Admin" />
	<meta property="og:description" content="Comprehensive administrative analytics dashboard for system monitoring and insights" />
</svelte:head>

<script lang="ts">
	import {
		Users,
		UserCheck,
		Building2,
		Shield,
		TrendingUp,
		TrendingDown,
		Activity,
		BarChart3
	} from 'lucide-svelte';

	let { data } = $props();

	const { analytics, chartData } = data;
</script>

<div class="space-y-6 p-6">
	<!-- Header -->
	<div>
		<h1 class="text-3xl font-bold">Analytics Dashboard</h1>
		<p class="text-muted-foreground">System-wide insights and performance metrics</p>
	</div>

	<!-- Error message -->
	{#if data.error}
		<div class="rounded-md bg-destructive/10 p-4 text-destructive">
			<div class="font-medium">{data.error.message || data.error}</div>
			{#if data.error.details && typeof data.error === 'object'}
				<div class="mt-1 text-sm opacity-75">{data.error.details}</div>
			{/if}
			{#if data.error.retryable}
				<button
					class="mt-2 text-sm underline hover:no-underline"
					onclick={() => window.location.reload()}
				>
					Try again
				</button>
			{/if}
		</div>
	{/if}

	<!-- Overview Stats -->
	<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
		<!-- Total Users -->
		<div class="rounded-lg border bg-card p-6">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm text-muted-foreground">Total Users</p>
					<p class="text-3xl font-bold">{analytics.overview.totalUsers}</p>
				</div>
				<div class="rounded-full bg-blue-100 p-3 dark:bg-blue-900">
					<Users class="h-6 w-6 text-blue-600 dark:text-blue-400" />
				</div>
			</div>
			<div class="mt-4 flex items-center gap-1 text-sm">
				<TrendingUp class="h-4 w-4 text-green-600" />
				<span class="text-green-600">{analytics.growth.userGrowthPercent}%</span>
				<span class="text-muted-foreground">from last month</span>
			</div>
		</div>

		<!-- Active Users -->
		<div class="rounded-lg border bg-card p-6">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm text-muted-foreground">Active Users</p>
					<p class="text-3xl font-bold">{analytics.overview.activeUsers}</p>
				</div>
				<div class="rounded-full bg-green-100 p-3 dark:bg-green-900">
					<UserCheck class="h-6 w-6 text-green-600 dark:text-green-400" />
				</div>
			</div>
			<div class="mt-4 text-sm text-muted-foreground">
				{Math.round((analytics.overview.activeUsers / analytics.overview.totalUsers) * 100)}% of total
				users
			</div>
		</div>

		<!-- Departments -->
		<div class="rounded-lg border bg-card p-6">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm text-muted-foreground">Departments</p>
					<p class="text-3xl font-bold">{analytics.overview.totalDepartments}</p>
				</div>
				<div class="rounded-full bg-purple-100 p-3 dark:bg-purple-900">
					<Building2 class="h-6 w-6 text-purple-600 dark:text-purple-400" />
				</div>
			</div>
			<div class="mt-4 text-sm text-muted-foreground">
				Avg {analytics.departments.avgSize} users per dept
			</div>
		</div>

		<!-- Roles -->
		<div class="rounded-lg border bg-card p-6">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm text-muted-foreground">Total Roles</p>
					<p class="text-3xl font-bold">{analytics.overview.totalRoles}</p>
				</div>
				<div class="rounded-full bg-orange-100 p-3 dark:bg-orange-900">
					<Shield class="h-6 w-6 text-orange-600 dark:text-orange-400" />
				</div>
			</div>
			<div class="mt-4 text-sm text-muted-foreground">Active permission levels</div>
		</div>
	</div>

	<!-- Activity Metrics -->
	<div class="rounded-lg border bg-card p-6">
		<h2 class="mb-4 text-xl font-semibold">User Activity</h2>
		<div class="grid gap-4 md:grid-cols-3">
			<div class="rounded-lg border bg-muted/50 p-4">
				<div class="flex items-center gap-2">
					<Activity class="h-5 w-5 text-primary" />
					<p class="text-sm font-medium">Daily Active</p>
				</div>
				<p class="mt-2 text-2xl font-bold">{analytics.activity.dailyActiveUsers}</p>
				<p class="text-sm text-muted-foreground">
					{Math.round((analytics.activity.dailyActiveUsers / analytics.overview.totalUsers) * 100)}%
					of total
				</p>
			</div>

			<div class="rounded-lg border bg-muted/50 p-4">
				<div class="flex items-center gap-2">
					<Activity class="h-5 w-5 text-primary" />
					<p class="text-sm font-medium">Weekly Active</p>
				</div>
				<p class="mt-2 text-2xl font-bold">{analytics.activity.weeklyActiveUsers}</p>
				<p class="text-sm text-muted-foreground">
					{Math.round((analytics.activity.weeklyActiveUsers / analytics.overview.totalUsers) * 100)}%
					of total
				</p>
			</div>

			<div class="rounded-lg border bg-muted/50 p-4">
				<div class="flex items-center gap-2">
					<Activity class="h-5 w-5 text-primary" />
					<p class="text-sm font-medium">Monthly Active</p>
				</div>
				<p class="mt-2 text-2xl font-bold">{analytics.activity.monthlyActiveUsers}</p>
				<p class="text-sm text-muted-foreground">
					{Math.round((analytics.activity.monthlyActiveUsers / analytics.overview.totalUsers) * 100)}%
					of total
				</p>
			</div>
		</div>
	</div>

	<!-- Charts Row -->
	<div class="grid gap-4 lg:grid-cols-2">
		<!-- User Growth Chart -->
		<div class="rounded-lg border bg-card p-6">
			<h2 class="mb-4 flex items-center gap-2 text-xl font-semibold">
				<BarChart3 class="h-5 w-5" />
				User Growth (Last 6 Months)
			</h2>
			<div class="space-y-3">
				{#each chartData.userGrowth as dataPoint}
					{@const maxUsers = Math.max(...chartData.userGrowth.map((d) => d.users))}
					{@const percentage = (dataPoint.users / maxUsers) * 100}
					<div>
						<div class="mb-1 flex items-center justify-between text-sm">
							<span class="font-medium">{dataPoint.month}</span>
							<span class="text-muted-foreground">{dataPoint.users} users</span>
						</div>
						<div class="h-2 w-full overflow-hidden rounded-full bg-muted">
							<div
								class="h-full bg-primary transition-all"
								style="width: {percentage}%"
							></div>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Role Distribution Chart -->
		<div class="rounded-lg border bg-card p-6">
			<h2 class="mb-4 flex items-center gap-2 text-xl font-semibold">
				<Shield class="h-5 w-5" />
				Role Distribution
			</h2>
			<div class="space-y-3">
				{#each chartData.roleDistribution as role}
					{@const percentage = (role.count / analytics.overview.totalUsers) * 100}
					<div>
						<div class="mb-1 flex items-center justify-between text-sm">
							<span class="font-medium">{role.role}</span>
							<span class="text-muted-foreground"
								>{role.count} ({Math.round(percentage)}%)</span
							>
						</div>
						<div class="h-2 w-full overflow-hidden rounded-full bg-muted">
							<div
								class="h-full transition-all"
								class:bg-blue-600={role.role === 'Employee'}
								class:bg-green-600={role.role === 'Manager'}
								class:bg-purple-600={role.role === 'HR Manager'}
								class:bg-orange-600={role.role === 'Admin'}
								style="width: {percentage}%"
							></div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<!-- Department Distribution -->
	<div class="rounded-lg border bg-card p-6">
		<h2 class="mb-4 flex items-center gap-2 text-xl font-semibold">
			<Building2 class="h-5 w-5" />
			Department Distribution
		</h2>
		<div class="space-y-3">
			{#each chartData.departmentDistribution as dept}
				{@const totalDeptUsers = chartData.departmentDistribution.reduce(
					(sum, d) => sum + d.count,
					0
				)}
				{@const percentage = (dept.count / totalDeptUsers) * 100}
				<div>
					<div class="mb-1 flex items-center justify-between text-sm">
						<span class="font-medium">{dept.department}</span>
						<span class="text-muted-foreground"
							>{dept.count} users ({Math.round(percentage)}%)</span
						>
					</div>
					<div class="h-2 w-full overflow-hidden rounded-full bg-muted">
						<div class="h-full bg-primary transition-all" style="width: {percentage}%"></div>
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Department Insights -->
	<div class="grid gap-4 md:grid-cols-2">
		<div class="rounded-lg border bg-card p-6">
			<h3 class="mb-2 text-lg font-semibold">Largest Department</h3>
			<p class="text-2xl font-bold text-primary">{analytics.departments.largest.name}</p>
			<p class="text-muted-foreground">{analytics.departments.largest.count} employees</p>
		</div>

		<div class="rounded-lg border bg-card p-6">
			<h3 class="mb-2 text-lg font-semibold">Smallest Department</h3>
			<p class="text-2xl font-bold text-orange-600">{analytics.departments.smallest.name}</p>
			<p class="text-muted-foreground">{analytics.departments.smallest.count} employees</p>
		</div>
	</div>
</div>
