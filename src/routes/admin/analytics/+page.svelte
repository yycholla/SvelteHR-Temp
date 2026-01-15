<script lang="ts">
	import {
		Activity,
		BarChart3,
		Building2,
		Shield,
		TrendingDown,
		TrendingUp,
		UserCheck,
		Users,
		RefreshCw
	} from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';

	const { data } = $props();
	const { analytics, chartData } = data;

	function refresh() {
		window.location.reload();
	}
</script>

<svelte:head>
	<title>Analytics - MountainHR Admin</title>
</svelte:head>

<div class="flex flex-col h-full overflow-hidden bg-background">
	<!-- Toolbar -->
	<header
		class="flex-shrink-0 flex items-center justify-between h-14 px-4 border-b bg-background z-20"
	>
		<div class="flex items-center gap-4">
			<h1 class="text-sm font-semibold tracking-tight">Analytics Dashboard</h1>
			<div class="h-4 w-px bg-border"></div>
			<div class="flex items-center gap-2 text-xs text-muted-foreground">
				<Activity class="h-3.5 w-3.5" />
				<span>System Performance & Insights</span>
			</div>
		</div>
		<Button variant="ghost" size="sm" onclick={refresh} class="h-8 w-8 p-0">
			<RefreshCw class="h-4 w-4" />
		</Button>
	</header>

	<div class="flex-1 overflow-auto bg-muted/5">
		<!-- KPI Grid -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border-b">
			<!-- Total Users -->
			<div class="p-6 border-r last:border-r-0 bg-background flex flex-col justify-between h-32">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
						>Total Users</span
					>
					<Users class="h-4 w-4 text-muted-foreground" />
				</div>
				<div>
					<div class="text-3xl font-bold tracking-tight">{analytics.overview.totalUsers}</div>
					<div class="flex items-center gap-1 mt-1 text-xs">
						<span class="text-green-600 font-medium flex items-center">
							<TrendingUp class="h-3 w-3 mr-0.5" />
							{analytics.growth.userGrowthPercent}%
						</span>
						<span class="text-muted-foreground">growth</span>
					</div>
				</div>
			</div>

			<!-- Active Users -->
			<div class="p-6 border-r last:border-r-0 bg-background flex flex-col justify-between h-32">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
						>Active</span
					>
					<UserCheck class="h-4 w-4 text-muted-foreground" />
				</div>
				<div>
					<div class="text-3xl font-bold tracking-tight">{analytics.overview.activeUsers}</div>
					<div class="mt-1 text-xs text-muted-foreground">
						{Math.round((analytics.overview.activeUsers / analytics.overview.totalUsers) * 100)}%
						usage rate
					</div>
				</div>
			</div>

			<!-- Departments -->
			<div class="p-6 border-r last:border-r-0 bg-background flex flex-col justify-between h-32">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
						>Departments</span
					>
					<Building2 class="h-4 w-4 text-muted-foreground" />
				</div>
				<div>
					<div class="text-3xl font-bold tracking-tight">{analytics.overview.totalDepartments}</div>
					<div class="mt-1 text-xs text-muted-foreground">
						Avg {analytics.departments.avgSize} users / dept
					</div>
				</div>
			</div>

			<!-- Roles -->
			<div class="p-6 bg-background flex flex-col justify-between h-32">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
						>Roles</span
					>
					<Shield class="h-4 w-4 text-muted-foreground" />
				</div>
				<div>
					<div class="text-3xl font-bold tracking-tight">{analytics.overview.totalRoles}</div>
					<div class="mt-1 text-xs text-muted-foreground">Permission levels</div>
				</div>
			</div>
		</div>

		<!-- Activity & Insights Split -->
		<div class="grid grid-cols-1 lg:grid-cols-3 border-b h-auto lg:h-64">
			<!-- Activity Metrics (Left 1/3) -->
			<div class="border-r bg-background p-6 flex flex-col">
				<h3 class="text-sm font-semibold mb-6 flex items-center gap-2">
					<Activity class="h-4 w-4 text-primary" />
					Activity Pulse
				</h3>
				<div class="flex-1 flex flex-col justify-between gap-4">
					<div>
						<div class="flex justify-between text-sm mb-1">
							<span class="text-muted-foreground">Daily Active</span>
							<span class="font-medium">{analytics.activity.dailyActiveUsers}</span>
						</div>
						<div class="h-1.5 w-full bg-muted rounded-full overflow-hidden">
							<div
								class="h-full bg-primary"
								style="width: {(analytics.activity.dailyActiveUsers /
									analytics.overview.totalUsers) *
									100}%"
							></div>
						</div>
					</div>
					<div>
						<div class="flex justify-between text-sm mb-1">
							<span class="text-muted-foreground">Weekly Active</span>
							<span class="font-medium">{analytics.activity.weeklyActiveUsers}</span>
						</div>
						<div class="h-1.5 w-full bg-muted rounded-full overflow-hidden">
							<div
								class="h-full bg-primary"
								style="width: {(analytics.activity.weeklyActiveUsers /
									analytics.overview.totalUsers) *
									100}%"
							></div>
						</div>
					</div>
					<div>
						<div class="flex justify-between text-sm mb-1">
							<span class="text-muted-foreground">Monthly Active</span>
							<span class="font-medium">{analytics.activity.monthlyActiveUsers}</span>
						</div>
						<div class="h-1.5 w-full bg-muted rounded-full overflow-hidden">
							<div
								class="h-full bg-primary"
								style="width: {(analytics.activity.monthlyActiveUsers /
									analytics.overview.totalUsers) *
									100}%"
							></div>
						</div>
					</div>
				</div>
			</div>

			<!-- Department Insights (Middle 1/3) -->
			<div class="border-r bg-background p-6">
				<h3 class="text-sm font-semibold mb-6 flex items-center gap-2">
					<Building2 class="h-4 w-4 text-primary" />
					Structure Analysis
				</h3>
				<div class="grid grid-cols-2 gap-4 h-full">
					<div class="flex flex-col justify-center p-4 bg-muted/10 rounded border border-dashed">
						<span class="text-xs text-muted-foreground uppercase tracking-wider mb-1">Largest</span>
						<span class="text-lg font-bold truncate" title={analytics.departments.largest.name}
							>{analytics.departments.largest.name}</span
						>
						<span class="text-sm text-primary font-medium"
							>{analytics.departments.largest.count} members</span
						>
					</div>
					<div class="flex flex-col justify-center p-4 bg-muted/10 rounded border border-dashed">
						<span class="text-xs text-muted-foreground uppercase tracking-wider mb-1">Smallest</span
						>
						<span class="text-lg font-bold truncate" title={analytics.departments.smallest.name}
							>{analytics.departments.smallest.name}</span
						>
						<span class="text-sm text-muted-foreground font-medium"
							>{analytics.departments.smallest.count} members</span
						>
					</div>
				</div>
			</div>

			<!-- Role Distribution (Right 1/3 - Compact Chart) -->
			<div class="bg-background p-6 overflow-y-auto">
				<h3 class="text-sm font-semibold mb-4 flex items-center gap-2">
					<Shield class="h-4 w-4 text-primary" />
					Role Distribution
				</h3>
				<div class="space-y-3">
					{#each chartData.roleDistribution as role}
						{@const percentage = (role.count / analytics.overview.totalUsers) * 100}
						<div class="flex items-center gap-3 text-xs">
							<div class="w-24 truncate text-muted-foreground" title={role.role}>{role.role}</div>
							<div class="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
								<div
									class="h-full"
									class:bg-blue-500={role.role === 'Employee'}
									class:bg-green-500={role.role === 'Manager'}
									class:bg-purple-500={role.role === 'HR Manager'}
									class:bg-orange-500={role.role === 'Admin'}
									style="width: {percentage}%"
								></div>
							</div>
							<div class="w-8 text-right font-mono">{role.count}</div>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- Charts Section (Full Width Split) -->
		<div class="grid grid-cols-1 lg:grid-cols-2 h-auto lg:h-96">
			<!-- User Growth -->
			<div class="border-r bg-background p-6">
				<h3 class="text-sm font-semibold mb-6 flex items-center gap-2">
					<BarChart3 class="h-4 w-4 text-primary" />
					Growth Trend (6 Months)
				</h3>
				<div class="flex items-end justify-between h-64 gap-2 pt-4 px-2">
					{#each chartData.userGrowth as dataPoint}
						{@const maxUsers = Math.max(...chartData.userGrowth.map((d) => d.users))}
						{@const heightPercent = (dataPoint.users / (maxUsers * 1.1)) * 100}
						<!-- Scale to max + 10% -->
						<div class="flex flex-col items-center flex-1 gap-2 group">
							<div class="relative w-full flex justify-center">
								<span
									class="absolute bottom-full mb-1 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity"
								>
									{dataPoint.users}
								</span>
								<div
									class="w-full max-w-[40px] bg-primary/80 group-hover:bg-primary transition-colors rounded-t-sm"
									style="height: {heightPercent}%"
								></div>
							</div>
							<span class="text-[10px] text-muted-foreground uppercase">{dataPoint.month}</span>
						</div>
					{/each}
				</div>
			</div>

			<!-- Department Distribution Table/Chart -->
			<div class="bg-background p-6 flex flex-col">
				<h3 class="text-sm font-semibold mb-4 flex items-center gap-2">
					<Building2 class="h-4 w-4 text-primary" />
					Department Breakdown
				</h3>
				<div class="flex-1 overflow-auto">
					<table class="w-full text-sm text-left">
						<thead class="text-xs uppercase text-muted-foreground bg-muted/20">
							<tr>
								<th class="px-3 py-2 font-medium">Department</th>
								<th class="px-3 py-2 font-medium text-right">Count</th>
								<th class="px-3 py-2 font-medium w-1/3">Share</th>
							</tr>
						</thead>
						<tbody class="divide-y">
							{#each chartData.departmentDistribution as dept}
								{@const totalDeptUsers = chartData.departmentDistribution.reduce(
									(sum, d) => sum + d.count,
									0
								)}
								{@const percentage = (dept.count / totalDeptUsers) * 100}
								<tr class="hover:bg-muted/10">
									<td class="px-3 py-2 font-medium">{dept.department}</td>
									<td class="px-3 py-2 text-right font-mono">{dept.count}</td>
									<td class="px-3 py-2">
										<div class="flex items-center gap-2">
											<div class="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
												<div class="h-full bg-slate-500" style="width: {percentage}%"></div>
											</div>
											<span class="text-[10px] text-muted-foreground w-8 text-right"
												>{Math.round(percentage)}%</span
											>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	</div>
</div>
