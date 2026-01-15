<script lang="ts">
	import { Filter, Search } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { reviewPeriods, reviewStatusOptions } from '$lib/graphql/queries/performance-reviews';

	interface Props {
		searchQuery: string;
		statusFilter: string | undefined;
		periodFilter: string | undefined;
		onSearch: (query: string) => void;
		onStatusChange: (status: string | undefined) => void;
		onPeriodChange: (period: string | undefined) => void;
	}

	let {
		searchQuery = $bindable(),
		statusFilter = $bindable(),
		periodFilter = $bindable(),
		onSearch,
		onStatusChange,
		onPeriodChange
	}: Props = $props();

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			onSearch(searchQuery);
		}
	}
</script>

<Card>
	<CardHeader>
		<CardTitle class="flex items-center gap-2">
			<Filter class="h-5 w-5" />
			Filter Reviews
		</CardTitle>
	</CardHeader>
	<CardContent>
		<div class="flex flex-col gap-4 md:flex-row md:items-end">
			<!-- Search -->
			<div class="flex-1">
				<Label for="search">Search</Label>
				<div class="flex gap-2">
					<Input
						id="search"
						placeholder="Search by employee, reviewer, or department..."
						bind:value={searchQuery}
						onkeydown={handleKeyDown}
					/>
					<Button onclick={() => onSearch(searchQuery)} size="sm">
						<Search class="h-4 w-4" />
					</Button>
				</div>
			</div>

			<!-- Status Filter -->
			<div class="w-full md:w-48">
				<Label>Status</Label>
				<Select.Root type="single" value={statusFilter} onValueChange={onStatusChange}>
					<Select.Trigger>
						<Select.Value placeholder="All Statuses" />
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="">All Statuses</Select.Item>
						{#each reviewStatusOptions as status}
							<Select.Item value={status.value}>{status.label}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>

			<!-- Period Filter -->
			<div class="w-full md:w-48">
				<Label>Review Period</Label>
				<Select.Root type="single" value={periodFilter} onValueChange={onPeriodChange}>
					<Select.Trigger>
						<Select.Value placeholder="All Periods" />
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="">All Periods</Select.Item>
						{#each reviewPeriods as period}
							<Select.Item value={period.value}>{period.label}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
		</div>
	</CardContent>
</Card>
