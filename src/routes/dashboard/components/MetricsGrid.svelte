<script lang="ts">
	import DashboardCard from '$lib/components/ui/layout/DashboardCard.svelte';
	import type { ComponentType } from 'svelte';

	interface Metric {
		title: string;
		value: string | number;
		subtext?: string;
		icon: any;
		color: string;
	}

	interface Props {
		metrics: Metric[];
	}

	const { metrics }: Props = $props();
</script>

<div class="grid grid-cols-1 gap-6 sm:grid-cols-3">
	{#each metrics as metric}
		<DashboardCard class="bg-card">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">{metric.title}</p>
					<h3 class="mt-2 text-2xl font-bold">{metric.value}</h3>
					{#if metric.subtext}
						<p class="mt-1 text-xs text-muted-foreground">{metric.subtext}</p>
					{/if}
				</div>
				<div class={`rounded-full bg-muted p-3 ${metric.color}`}>
					<metric.icon class="h-5 w-5" />
				</div>
			</div>
		</DashboardCard>
	{/each}
</div>
