<script lang="ts">
	interface Props {
		reportAnalytics: any;
	}

	const { reportAnalytics }: Props = $props();

	function formatDate(dateString: string | null) {
		if (!dateString) return 'Never';
		return new Date(dateString).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<div class="space-y-8">
	<!-- Performance Metrics -->
	<div class="rounded-lg border bg-card p-6 shadow-sm">
		<h3 class="mb-6 text-lg font-semibold text-foreground">Performance Metrics</h3>
		<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
			<div class="text-center">
				<div class="text-2xl font-bold text-green-600">
					{reportAnalytics.performanceMetrics.successRate}%
				</div>
				<div class="text-sm text-muted-foreground">Success Rate</div>
			</div>
			<div class="text-center">
				<div class="text-2xl font-bold text-blue-600">
					{reportAnalytics.performanceMetrics.avgExecutionTime ?? 0}s
				</div>
				<div class="text-sm text-muted-foreground">Avg Execution Time</div>
			</div>
			<div class="text-center">
				<div class="text-2xl font-bold text-purple-600">
					{reportAnalytics.performanceMetrics.totalExecutionTime ?? 0}s
				</div>
				<div class="text-sm text-muted-foreground">Total Execution Time</div>
			</div>
		</div>
	</div>

	<!-- Type Breakdown -->
	<div class="rounded-lg border bg-card p-6 shadow-sm">
		<h3 class="mb-6 text-lg font-semibold text-foreground">Report Type Distribution</h3>
		<div class="space-y-4">
			{#each reportAnalytics.typeBreakdown as type}
				<div class="flex items-center justify-between">
					<span class="text-sm font-medium text-foreground capitalize">{type.type}</span>
					<div class="flex items-center gap-4">
						<div class="h-2 w-32 rounded-full bg-gray-200">
							<div class="h-2 rounded-full bg-primary" style="width: {type.percentage}%"></div>
						</div>
						<span class="w-12 text-right text-sm text-muted-foreground">{type.count}</span>
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Popular Reports -->
	{#if reportAnalytics.popularReports && reportAnalytics.popularReports.length > 0}
		<div class="rounded-lg border bg-card p-6 shadow-sm">
			<h3 class="mb-6 text-lg font-semibold text-foreground">Most Popular Reports</h3>
			<div class="space-y-4">
				{#each reportAnalytics.popularReports as report}
					<div class="flex items-center justify-between rounded-lg bg-muted p-4 dark:bg-muted">
						<div>
							<div class="font-medium text-foreground">{report.title}</div>
							<div class="text-sm text-muted-foreground">
								Last run: {formatDate(report.lastRun)}
							</div>
						</div>
						<div class="text-right">
							<div class="text-lg font-semibold text-blue-600">{report.runCount}</div>
							<div class="text-sm text-muted-foreground">runs</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Department Usage -->
	{#if reportAnalytics.departmentUsage && reportAnalytics.departmentUsage.length > 0}
		<div class="rounded-lg border bg-card p-6 shadow-sm">
			<h3 class="mb-6 text-lg font-semibold text-foreground">Department Usage</h3>
			<div class="space-y-4">
				{#each reportAnalytics.departmentUsage as dept}
					<div class="flex items-center justify-between">
						<span class="text-sm font-medium text-foreground">{dept.department}</span>
						<div class="flex items-center gap-4">
							<span class="text-sm text-muted-foreground">{dept.reportCount} reports</span>
							<span class="text-xs text-muted-foreground"
								>Last: {formatDate(dept.lastActivity)}</span
							>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
