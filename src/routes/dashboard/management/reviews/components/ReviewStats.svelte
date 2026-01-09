<script lang="ts">
	import {
		AlertTriangle,
		CheckCircle,
		TrendingUp,
		Users
	} from '@lucide/svelte';
	import {
		Card,
		CardContent
	} from '$lib/components/ui/card';

	interface Props {
		reviewAnalytics: {
			totalReviews: number;
			completedReviews: number;
			overdueReviews: number;
			completionRate: number;
		};
	}

	const { reviewAnalytics }: Props = $props();

	// Statistics cards data
	const statsCards = $derived([
		{
			title: 'Total Reviews',
			value: reviewAnalytics.totalReviews,
			description: 'All performance reviews',
			icon: Users,
			color: 'bg-blue-50 text-blue-700 border-blue-200',
			iconColor: 'text-blue-600'
		},
		{
			title: 'Completed Reviews',
			value: reviewAnalytics.completedReviews,
			description: 'Reviews finished',
			icon: CheckCircle,
			color: 'bg-green-50 text-green-700 border-green-200',
			iconColor: 'text-green-600'
		},
		{
			title: 'Overdue Reviews',
			value: reviewAnalytics.overdueReviews,
			description: 'Need immediate attention',
			icon: AlertTriangle,
			color: 'bg-orange-50 text-orange-700 border-orange-200',
			iconColor: 'text-orange-600'
		},
		{
			title: 'Completion Rate',
			value: `${reviewAnalytics.completionRate}%`,
			description: 'Reviews completed on time',
			icon: TrendingUp,
			color: 'bg-purple-50 text-purple-700 border-purple-200',
			iconColor: 'text-purple-600'
		}
	]);
</script>

<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
	{#each statsCards as stat}
		{@const Icon = stat.icon}
		<Card class={`${stat.color} border`}>
			<CardContent class="p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium opacity-75">{stat.title}</p>
						<p class="mt-2 text-2xl font-bold">{stat.value}</p>
						<p class="mt-1 text-xs opacity-75">{stat.description}</p>
					</div>
					<div class={`${stat.iconColor} opacity-75`}>
						<Icon class="h-8 w-8" />
					</div>
				</div>
			</CardContent>
		</Card>
	{/each}
</div>
