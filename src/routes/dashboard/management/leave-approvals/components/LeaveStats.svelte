<script lang="ts">
	import { Calendar, Check, Clock, TrendingUp } from '@lucide/svelte';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Tabs, TabsList, TabsTrigger } from '$lib/components/ui/tabs';

	interface Props {
		totalRequests: number;
		leaveStats: any;
	}

	const { totalRequests, leaveStats }: Props = $props();

	let timePeriod = $state<'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'all'>('all');

	// Get metrics for selected time period
	const currentMetrics = $derived.by(() => {
		if (timePeriod === 'all') {
			return {
				total: totalRequests,
				pending: leaveStats.pendingCount,
				approved: leaveStats.approvedCount,
				rejected: leaveStats.rejectedCount,
				approvalRate: leaveStats.approvalRate,
				totalDaysRequested: leaveStats.totalDaysRequested
			};
		}
		return (
			leaveStats[timePeriod] || {
				total: 0,
				pending: 0,
				approved: 0,
				rejected: 0,
				approvalRate: 0,
				totalDaysRequested: 0
			}
		);
	});

	// Get period label for descriptions
	const periodLabel = $derived.by(() => {
		switch (timePeriod) {
			case 'weekly':
				return 'this week';
			case 'monthly':
				return 'this month';
			case 'quarterly':
				return 'this quarter';
			case 'yearly':
				return 'this year';
			default:
				return 'all time';
		}
	});

	// Statistics cards data
	const statsCards = $derived([
		{
			title: 'Pending Requests',
			value: timePeriod === 'all' ? leaveStats.pendingCount : currentMetrics.pending,
			description: `Awaiting your approval`,
			icon: Clock,
			color: 'bg-yellow-50 text-yellow-700 border-yellow-200',
			iconColor: 'text-yellow-600'
		},
		{
			title: `Approved ${periodLabel === 'all time' ? '(All Time)' : ''}`,
			value: currentMetrics.approved,
			description: `Approved ${periodLabel}`,
			icon: Check,
			color: 'bg-green-50 text-green-700 border-green-200',
			iconColor: 'text-green-600'
		},
		{
			title: 'Days Requested',
			value: currentMetrics.totalDaysRequested,
			description: `Days ${periodLabel}`,
			icon: Calendar,
			color: 'bg-blue-50 text-blue-700 border-blue-200',
			iconColor: 'text-blue-600'
		},
		{
			title: 'Approval Rate',
			value: `${currentMetrics.approvalRate}%`,
			description: `Approval rate ${periodLabel}`,
			icon: TrendingUp,
			color: 'bg-purple-50 text-purple-700 border-purple-200',
			iconColor: 'text-purple-600'
		}
	]);
</script>

<!-- Time Period Selector -->
<Card>
	<CardContent class="p-4">
		<div class="flex items-center justify-between">
			<h3 class="text-sm font-medium text-muted-foreground">Statistics Period</h3>
			<Tabs
				value={timePeriod}
				onValueChange={(value) => {
					timePeriod = value as typeof timePeriod;
				}}
				class="w-auto"
			>
				<TabsList class="grid grid-cols-5">
					<TabsTrigger value="weekly" class="text-xs">Weekly</TabsTrigger>
					<TabsTrigger value="monthly" class="text-xs">Monthly</TabsTrigger>
					<TabsTrigger value="quarterly" class="text-xs">Quarterly</TabsTrigger>
					<TabsTrigger value="yearly" class="text-xs">Yearly</TabsTrigger>
					<TabsTrigger value="all" class="text-xs">All Time</TabsTrigger>
				</TabsList>
			</Tabs>
		</div>
	</CardContent>
</Card>

<!-- Statistics Cards -->
<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
	{#each statsCards as stat}
		{@const StatIcon = stat.icon}
		<Card class={`${stat.color} border`}>
			<CardContent class="p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium opacity-75">{stat.title}</p>
						<p class="mt-2 text-2xl font-bold">{stat.value}</p>
						<p class="mt-1 text-xs opacity-75">{stat.description}</p>
					</div>
					<div class={`${stat.iconColor} opacity-75`}>
						<StatIcon class="h-8 w-8" />
					</div>
				</div>
			</CardContent>
		</Card>
	{/each}
</div>
