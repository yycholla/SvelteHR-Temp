<script lang="ts">
	import { Award, Calendar, Target, Users } from '@lucide/svelte';

	interface Props {
		dashboardAnalytics: any;
	}

	const { dashboardAnalytics }: Props = $props();
</script>

<div class="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
	<!-- Team Overview -->
	<div class="rounded-lg border border bg-card p-6 shadow-sm">
		<div class="flex items-center justify-between">
			<div>
				<p class="text-sm font-medium text-muted-foreground">Team Members</p>
				<p class="text-2xl font-bold text-foreground">
					{dashboardAnalytics.teamStats.totalEmployees}
				</p>
				<p class="text-sm font-medium text-green-600">
					{dashboardAnalytics.teamStats.activeEmployees} active
				</p>
			</div>
			<div class="rounded-lg bg-blue-100 p-3">
				<Users class="h-6 w-6 text-blue-600" />
			</div>
		</div>
	</div>

	<!-- Leave Requests -->
	<div class="rounded-lg border border bg-card p-6 shadow-sm">
		<div class="flex items-center justify-between">
			<div>
				<p class="text-sm font-medium text-muted-foreground">Leave Requests</p>
				<p class="text-2xl font-bold text-foreground">{dashboardAnalytics.leaveRequests.pending}</p>
				<p class="text-sm font-medium text-orange-600">Pending approval</p>
			</div>
			<div class="rounded-lg bg-orange-100 p-3">
				<Calendar class="h-6 w-6 text-orange-600" />
			</div>
		</div>
	</div>

	<!-- Performance Reviews -->
	<div class="rounded-lg border border bg-card p-6 shadow-sm">
		<div class="flex items-center justify-between">
			<div>
				<p class="text-sm font-medium text-muted-foreground">Reviews Due</p>
				<p class="text-2xl font-bold text-foreground">
					{dashboardAnalytics.performanceReviews.pending}
				</p>
				<p class="text-sm font-medium text-green-600">
					{dashboardAnalytics.performanceReviews.completed} completed
				</p>
			</div>
			<div class="rounded-lg bg-green-100 p-3">
				<Award class="h-6 w-6 text-green-600" />
			</div>
		</div>
	</div>

	<!-- Goals Progress -->
	<div class="rounded-lg border border bg-card p-6 shadow-sm">
		<div class="flex items-center justify-between">
			<div>
				<p class="text-sm font-medium text-muted-foreground">Team Goals</p>
				<p class="text-2xl font-bold text-foreground">{dashboardAnalytics.teamGoals.active}</p>
				<p class="text-sm font-medium text-purple-600">
					{dashboardAnalytics.teamGoals.avgProgress}% avg progress
				</p>
			</div>
			<div class="rounded-lg bg-purple-100 p-3">
				<Target class="h-6 w-6 text-purple-600" />
			</div>
		</div>
	</div>
</div>
