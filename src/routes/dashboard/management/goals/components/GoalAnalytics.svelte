<!-- Extra imports needed for this component -->
<script module>
	import { Users } from '@lucide/svelte';
</script>

<script lang="ts">
	import { BarChart3, TrendingUp, Target, Calendar } from '@lucide/svelte';

	interface Props {
		analytics: any;
	}

	const { analytics }: Props = $props();

	function getDepartmentColor(deptName: string): string {
		const colors = [
			'bg-blue-500',
			'bg-green-500',
			'bg-purple-500',
			'bg-orange-500',
			'bg-indigo-500',
			'bg-pink-500'
		];
		const index = deptName.length % colors.length;
		return colors[index];
	}
</script>

<div class="space-y-6">
	<!-- Completion Trend Chart -->
	<div class="rounded-lg border bg-card p-6 shadow-sm">
		<div class="mb-4 flex items-center justify-between">
			<div>
				<h3 class="text-lg font-semibold">Completion Trend</h3>
				<p class="text-sm text-muted-foreground">Goal completion rate over time</p>
			</div>
			<div class="rounded-lg bg-primary/10 p-2">
				<TrendingUp class="h-5 w-5 text-primary" />
			</div>
		</div>
		<div class="flex h-64 items-end justify-between gap-2">
			{#each analytics.trends.completionHistory as point}
				<div class="group relative flex w-full flex-col items-center gap-2">
					<div
						class="w-full rounded-t bg-primary/20 transition-all hover:bg-primary/40"
						style="height: {point.value}%"
					></div>
					<span class="text-xs text-muted-foreground">{point.date}</span>
					<!-- Tooltip -->
					<div
						class="absolute -top-10 left-1/2 hidden -translate-x-1/2 rounded bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md group-hover:block"
					>
						{point.value}%
					</div>
				</div>
			{/each}
		</div>
	</div>

	<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
		<!-- Goals by Type -->
		<div class="rounded-lg border bg-card p-6 shadow-sm">
			<div class="mb-4 flex items-center justify-between">
				<div>
					<h3 class="text-lg font-semibold">Goals by Type</h3>
					<p class="text-sm text-muted-foreground">Distribution of goal types</p>
				</div>
				<div class="rounded-lg bg-blue-100 p-2">
					<Target class="h-5 w-5 text-blue-600" />
				</div>
			</div>
			<div class="space-y-4">
				{#each analytics.distribution.byType as type}
					<div>
						<div class="mb-1 flex justify-between text-sm">
							<span class="font-medium">{type.name}</span>
							<span class="text-muted-foreground">{type.count} ({type.percentage}%)</span>
						</div>
						<div class="h-2 w-full rounded-full bg-muted">
							<div class="h-2 rounded-full bg-blue-500" style="width: {type.percentage}%"></div>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Goals by Status -->
		<div class="rounded-lg border bg-card p-6 shadow-sm">
			<div class="mb-4 flex items-center justify-between">
				<div>
					<h3 class="text-lg font-semibold">Goal Status</h3>
					<p class="text-sm text-muted-foreground">Current status overview</p>
				</div>
				<div class="rounded-lg bg-green-100 p-2">
					<BarChart3 class="h-5 w-5 text-green-600" />
				</div>
			</div>
			<div class="space-y-4">
				{#each analytics.distribution.byStatus as status}
					<div>
						<div class="mb-1 flex justify-between text-sm">
							<span class="font-medium">{status.name}</span>
							<span class="text-muted-foreground">{status.count} ({status.percentage}%)</span>
						</div>
						<div class="h-2 w-full rounded-full bg-muted">
							<div class="h-2 rounded-full bg-green-500" style="width: {status.percentage}%"></div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<!-- Department Performance -->
	<div class="rounded-lg border bg-card p-6 shadow-sm">
		<div class="mb-6 flex items-center justify-between">
			<div>
				<h3 class="text-lg font-semibold">Department Performance</h3>
				<p class="text-sm text-muted-foreground">Goal completion by department</p>
			</div>
			<div class="rounded-lg bg-purple-100 p-2">
				<Users class="h-5 w-5 text-purple-600" />
			</div>
		</div>
		<div class="space-y-6">
			{#each analytics.departmentPerformance as dept}
				<div class="flex items-center gap-4">
					<div class="w-32 truncate text-sm font-medium" title={dept.name}>
						{dept.name}
					</div>
					<div class="flex-1">
						<div class="relative h-4 w-full rounded-full bg-muted">
							<div
								class="absolute top-0 left-0 h-full rounded-full {getDepartmentColor(
									dept.name
								)} opacity-20"
								style="width: 100%"
							></div>
							<div
								class="absolute top-0 left-0 h-full rounded-full {getDepartmentColor(dept.name)}"
								style="width: {dept.completionRate}%"
							></div>
						</div>
					</div>
					<div class="w-12 text-right text-sm font-medium">
						{dept.completionRate}%
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>
