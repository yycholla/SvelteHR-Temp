<script lang="ts">
	import { Filter, Search } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import { leaveStatusOptions, leaveTypeOptions } from '$lib/graphql/queries/leave-requests';

	interface Props {
		searchQuery: string;
		statusFilter: string;
		leaveTypeFilter: string;
		onSearch: () => void;
		onStatusChange: (status: string | string[]) => void;
		onLeaveTypeChange: (type: string | string[]) => void;
	}

	let {
		searchQuery = $bindable(),
		statusFilter = $bindable(),
		leaveTypeFilter = $bindable(),
		onSearch,
		onStatusChange,
		onLeaveTypeChange
	}: Props = $props();

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			onSearch();
		}
	}
</script>

<Card>
	<CardHeader>
		<CardTitle class="flex items-center gap-2">
			<Filter class="h-5 w-5" />
			Filter Requests
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
						placeholder="Search by employee name, leave type, or reason..."
						bind:value={searchQuery}
						onkeydown={handleKeyDown}
					/>
					<Button onclick={onSearch} size="sm">
						<Search class="h-4 w-4" />
					</Button>
				</div>
			</div>

			<!-- Status Filter -->
			<div class="w-full md:w-48">
				<Label>Status</Label>
				<Select type="single" value={statusFilter} onValueChange={onStatusChange}>
					<SelectTrigger placeholder="All Statuses" />
					<SelectContent>
						<SelectItem value="all">All Statuses</SelectItem>
						{#each leaveStatusOptions as status}
							<SelectItem value={status.value}>{status.label}</SelectItem>
						{/each}
					</SelectContent>
				</Select>
			</div>

			<!-- Leave Type Filter -->
			<div class="w-full md:w-48">
				<Label>Leave Type</Label>
				<Select type="single" value={leaveTypeFilter} onValueChange={onLeaveTypeChange}>
					<SelectTrigger placeholder="All Types" />
					<SelectContent>
						<SelectItem value="">All Types</SelectItem>
						{#each leaveTypeOptions as type}
							<SelectItem value={type.value}>{type.label}</SelectItem>
						{/each}
					</SelectContent>
				</Select>
			</div>
		</div>
	</CardContent>
</Card>
