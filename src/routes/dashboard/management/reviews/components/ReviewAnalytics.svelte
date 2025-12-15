<script lang="ts">
	import { BarChart3 } from '@lucide/svelte';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Progress } from '$lib/components/ui/progress';

	interface Props {
		averageRatings: {
			overall: number;
			goalsAchievement: number;
			collaboration: number;
			communication: number;
			leadership: number;
		};
	}

	const { averageRatings }: Props = $props();

	// Rating categories for analytics display
	const ratingCategories = $derived([
		{
			label: 'Overall Performance',
			value: averageRatings.overall,
			color: 'bg-blue-500'
		},
		{
			label: 'Goal Achievement',
			value: averageRatings.goalsAchievement,
			color: 'bg-green-500'
		},
		{
			label: 'Collaboration',
			value: averageRatings.collaboration,
			color: 'bg-purple-500'
		},
		{
			label: 'Communication',
			value: averageRatings.communication,
			color: 'bg-indigo-500'
		},
		{
			label: 'Leadership',
			value: averageRatings.leadership,
			color: 'bg-cyan-500'
		}
	]);
</script>

{#if averageRatings.overall > 0}
	<Card>
		<CardHeader>
			<CardTitle class="flex items-center gap-2">
				<BarChart3 class="h-5 w-5" />
				Performance Analytics
			</CardTitle>
			<CardDescription>Average ratings across different performance categories</CardDescription>
		</CardHeader>
		<CardContent>
			<div class="space-y-4">
				{#each ratingCategories as category}
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-3">
							<div class={`h-3 w-3 rounded-full ${category.color}`}></div>
							<span class="text-sm font-medium">{category.label}</span>
						</div>
						<div class="flex items-center gap-2">
							<Progress value={category.value * 20} class="w-24" />
							<span class="w-8 text-sm text-muted-foreground">{category.value.toFixed(1)}</span>
						</div>
					</div>
				{/each}
			</div>
		</CardContent>
	</Card>
{/if}
