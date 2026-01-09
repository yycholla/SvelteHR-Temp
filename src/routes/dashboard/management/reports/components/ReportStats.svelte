<script lang="ts">
	import { BarChart3, Calendar, Clock, FileText } from '@lucide/svelte';

	interface Props {
		reportAnalytics: any;
	}

	const { reportAnalytics }: Props = $props();

	// Statistics cards derived from analytics
	const statsCards = $derived([
		{
			title: 'Total Reports',
			value: reportAnalytics.summary.totalReports,
			icon: FileText,
			color: 'blue',
			description: 'All reports in system'
		},
		{
			title: 'Active Reports',
			value: reportAnalytics.summary.activeReports,
			icon: BarChart3,
			color: 'green',
			description: 'Currently active reports'
		},
		{
			title: 'Generated Today',
			value: reportAnalytics.summary.generatedToday,
			icon: Calendar,
			color: 'purple',
			description: 'Reports generated today'
		},
		{
			title: 'Avg Run Time',
			value: `${reportAnalytics.summary.avgRunTime}s`,
			icon: Clock,
			color: 'orange',
			description: 'Average execution time'
		}
	]);
</script>

<div class="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
	{#each statsCards as card}
		{@const CardIcon = card.icon}
		<div class="rounded-lg border bg-card p-6 shadow-sm">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">{card.title}</p>
					<p class="text-2xl font-bold text-foreground">{card.value}</p>
					<p class="mt-1 text-xs text-muted-foreground">{card.description}</p>
				</div>
				<div class={`p-3 bg-${card.color}-100 rounded-lg`}>
					<CardIcon class={`h-6 w-6 text-${card.color}-600`} />
				</div>
			</div>
		</div>
	{/each}
</div>
