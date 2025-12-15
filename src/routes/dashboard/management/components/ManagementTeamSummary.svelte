<script lang="ts">
	interface Props {
		dashboardAnalytics: any;
	}

	const { dashboardAnalytics }: Props = $props();
</script>

<div class="rounded-lg border border bg-card p-6 shadow-sm">
	<h3 class="mb-4 text-lg font-semibold text-foreground">Team Performance Summary</h3>
	<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
		<!-- Goals Status -->
		<div>
			<h4 class="mb-3 font-medium text-foreground">Goals Status</h4>
			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<div class="h-3 w-3 rounded-full bg-blue-500"></div>
						<span class="text-sm text-muted-foreground">Active</span>
					</div>
					<span class="text-sm font-medium text-blue-600"
						>{dashboardAnalytics.teamGoals.active}</span
					>
				</div>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<div class="h-3 w-3 rounded-full bg-orange-500"></div>
						<span class="text-sm text-muted-foreground">At Risk</span>
					</div>
					<span class="text-sm font-medium text-orange-600"
						>{dashboardAnalytics.teamGoals.atRisk}</span
					>
				</div>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<div class="h-3 w-3 rounded-full bg-red-500"></div>
						<span class="text-sm text-muted-foreground">Overdue</span>
					</div>
					<span class="text-sm font-medium text-red-600"
						>{dashboardAnalytics.teamGoals.overdue}</span
					>
				</div>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<div class="h-3 w-3 rounded-full bg-green-500"></div>
						<span class="text-sm text-muted-foreground">Completed</span>
					</div>
					<span class="text-sm font-medium text-green-600"
						>{dashboardAnalytics.teamGoals.completed}</span
					>
				</div>
			</div>
		</div>

		<!-- Review Status -->
		<div>
			<h4 class="mb-3 font-medium text-foreground">Review Status</h4>
			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<div class="h-3 w-3 rounded-full bg-orange-500"></div>
						<span class="text-sm text-muted-foreground">Pending</span>
					</div>
					<span class="text-sm font-medium text-orange-600"
						>{dashboardAnalytics.performanceReviews.pending}</span
					>
				</div>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<div class="h-3 w-3 rounded-full bg-green-500"></div>
						<span class="text-sm text-muted-foreground">Completed</span>
					</div>
					<span class="text-sm font-medium text-green-600"
						>{dashboardAnalytics.performanceReviews.completed}</span
					>
				</div>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<div class="h-3 w-3 rounded-full bg-red-500"></div>
						<span class="text-sm text-muted-foreground">Overdue</span>
					</div>
					<span class="text-sm font-medium text-red-600"
						>{dashboardAnalytics.performanceReviews.overdue}</span
					>
				</div>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<div class="h-3 w-3 rounded-full bg-blue-500"></div>
						<span class="text-sm text-muted-foreground">Avg Rating</span>
					</div>
					<span class="text-sm font-medium text-blue-600"
						>{dashboardAnalytics.performanceReviews.avgRating}/5</span
					>
				</div>
			</div>
		</div>

		<!-- Reports Status -->
		<div>
			<h4 class="mb-3 font-medium text-foreground">Reports Status</h4>
			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<div class="h-3 w-3 rounded-full bg-green-500"></div>
						<span class="text-sm text-muted-foreground">Generated</span>
					</div>
					<span class="text-sm font-medium text-green-600"
						>{dashboardAnalytics.reports.generated}</span
					>
				</div>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<div class="h-3 w-3 rounded-full bg-blue-500"></div>
						<span class="text-sm text-muted-foreground">Scheduled</span>
					</div>
					<span class="text-sm font-medium text-blue-600"
						>{dashboardAnalytics.reports.scheduled}</span
					>
				</div>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<div class="h-3 w-3 rounded-full bg-red-500"></div>
						<span class="text-sm text-muted-foreground">Failed</span>
					</div>
					<span class="text-sm font-medium text-red-600">{dashboardAnalytics.reports.failed}</span>
				</div>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<div class="h-3 w-3 rounded-full bg-purple-500"></div>
						<span class="text-sm text-muted-foreground">This Month</span>
					</div>
					<span class="text-sm font-medium text-purple-600"
						>{dashboardAnalytics.reports.totalThisMonth}</span
					>
				</div>
			</div>
		</div>
	</div>
</div>
