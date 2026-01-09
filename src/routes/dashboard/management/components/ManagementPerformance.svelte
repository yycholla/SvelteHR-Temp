<script lang="ts">
	import {
		Activity,
		ArrowRight,
		Award,
		BarChart,
		Calendar,
		Clock,
		FileText,
		Target,
		Users
	} from '@lucide/svelte';

	interface Props {
		performanceMetrics: any[];
		recentActivities: any[];
		selectedPeriod: string;
		selectedTeamId: string;
		onUpdateFilters: () => void;
	}

	let {
		performanceMetrics,
		recentActivities,
		selectedPeriod = $bindable(),
		selectedTeamId = $bindable(),
		onUpdateFilters
	}: Props = $props();

	// Icon mapping for dynamic icons
	const iconMap: Record<string, any> = {
		Calendar,
		Award,
		Target,
		FileText,
		Users,
		Activity,
		Clock,
		BarChart
	};

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getProgressColor(value: number, target: number) {
		const percentage = (value / target) * 100;
		if (percentage >= 90) return 'green';
		if (percentage >= 70) return 'yellow';
		return 'red';
	}
</script>

<div class="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
	<!-- Performance Metrics -->
	<div class="lg:col-span-2">
		<div class="rounded-lg border border bg-card p-6 shadow-sm">
			<div class="mb-4 flex items-center justify-between">
				<h3 class="text-lg font-semibold text-foreground">Performance Metrics</h3>
				<div class="flex items-center gap-3">
					<select
						bind:value={selectedPeriod}
						onchange={onUpdateFilters}
						class="rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
					>
						<option value="this-week">This Week</option>
						<option value="this-month">This Month</option>
						<option value="last-month">Last Month</option>
						<option value="this-quarter">This Quarter</option>
					</select>
					<select
						bind:value={selectedTeamId}
						onchange={onUpdateFilters}
						class="rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
					>
						<option value="">All Teams</option>
						<option value="engineering">Engineering</option>
						<option value="marketing">Marketing</option>
						<option value="sales">Sales</option>
						<option value="hr">Human Resources</option>
					</select>
				</div>
			</div>
			<div class="space-y-4">
				{#each performanceMetrics as metric}
					{@const progressColor = getProgressColor(metric.value, metric.target)}
					<div class="flex items-center justify-between">
						<div class="flex-1">
							<div class="mb-1 flex items-center justify-between">
								<span class="text-sm font-medium text-foreground">{metric.label}</span>
								<span class="text-sm text-muted-foreground">{metric.value}% / {metric.target}%</span
								>
							</div>
							<div class="h-2 w-full rounded-full bg-gray-200">
								<div
									class={`h-2 rounded-full bg-${metric.color}-600`}
									style="width: {Math.min(metric.value, 100)}%"
								></div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<!-- Recent Activities -->
	<div class="rounded-lg border border bg-card p-6 shadow-sm">
		<h3 class="mb-4 text-lg font-semibold text-foreground">Recent Activities</h3>
		<div class="space-y-3">
			{#each recentActivities as activity}
				{@const Icon = iconMap[activity.icon] || Activity}
				<a
					href={activity.href}
					class="-m-2 block rounded-lg p-2 transition-colors hover:bg-muted/50"
				>
					<div class="flex items-start gap-3">
						<div class={`p-2 bg-${activity.color}-100 rounded-full`}>
							<Icon class={`h-4 w-4 text-${activity.color}-600`} />
						</div>
						<div class="min-w-0 flex-1">
							<p class="truncate text-sm font-medium text-foreground">{activity.title}</p>
							<p class="truncate text-xs text-muted-foreground">{activity.description}</p>
							<p class="text-xs text-muted-foreground">{formatDate(activity.timestamp)}</p>
						</div>
						<ArrowRight class="h-4 w-4 flex-shrink-0 text-muted-foreground" />
					</div>
				</a>
			{/each}
		</div>
	</div>
</div>
