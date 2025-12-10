<script lang="ts">
	import { BarChart3, CheckCircle, Target, TrendingUp } from '@lucide/svelte';

	interface Props {
		goalsAnalytics: any;
	}

	const { goalsAnalytics }: Props = $props();

	// Statistics cards from server-side analytics
	const statsCards = $derived([
		{
			title: 'Total Goals',
			value: goalsAnalytics.summary.totalGoals,
			change: '+12%',
			trend: 'up' as const,
			icon: Target,
			color: 'blue',
			testId: 'total-goals-stat'
		},
		{
			title: 'Active Goals',
			value: goalsAnalytics.summary.activeGoals,
			change: '+8%',
			trend: 'up' as const,
			icon: TrendingUp,
			color: 'green',
			testId: 'active-goals-stat'
		},
		{
			title: 'Avg Completion',
			value: `${goalsAnalytics.summary.avgCompletion}%`,
			change: '+5%',
			trend: 'up' as const,
			icon: BarChart3,
			color: 'purple',
			testId: 'completion-stat'
		},
		{
			title: 'Health Score',
			value: goalsAnalytics.healthScore,
			change: '+15%',
			trend: 'up' as const,
			icon: CheckCircle,
			color: 'indigo',
			testId: 'health-score-stat'
		}
	]);
</script>

<div class="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
	{#each statsCards as stat}
		<div class="rounded-lg border bg-card p-6 shadow-sm" data-testid={stat.testId}>
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">{stat.title}</p>
					<h3 class="mt-2 text-2xl font-bold">{stat.value}</h3>
				</div>
				<div class={`rounded-full bg-${stat.color}-100 p-3 text-${stat.color}-600`}>
					<stat.icon class="h-5 w-5" />
				</div>
			</div>
			<div class="mt-4 flex items-center text-sm">
				<span
					class={stat.trend === 'up'
						? 'text-green-600'
						: stat.trend === 'down'
							? 'text-red-600'
							: 'text-gray-600'}
				>
					{stat.change}
				</span>
				<span class="ml-2 text-muted-foreground">vs last month</span>
			</div>
		</div>
	{/each}
</div>
