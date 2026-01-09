<script lang="ts">
	import { Filter, Search, X } from '@lucide/svelte';
	import {
		REPORT_CATEGORIES,
		REPORT_STATUSES,
		REPORT_TYPES
	} from '$lib/graphql/reports-operations';

	interface Props {
		searchQuery: string;
		typeFilter: string;
		categoryFilter: string;
		statusFilter: string;
		selectedReportsCount: number;
		canRunReports: boolean;
		onApplyFilters: () => void;
		onClearFilters: () => void;
		onRunSelected: () => void;
		onDeleteSelected: () => void;
	}

	let {
		searchQuery = $bindable(),
		typeFilter = $bindable(),
		categoryFilter = $bindable(),
		statusFilter = $bindable(),
		selectedReportsCount,
		canRunReports,
		onApplyFilters,
		onClearFilters,
		onRunSelected,
		onDeleteSelected
	}: Props = $props();
</script>

<div class="mb-8 rounded-lg border bg-card p-6 shadow-sm">
	<div class="mb-4 flex items-center gap-4">
		<div class="flex-1">
			<label for="search" class="sr-only">Search reports</label>
			<div class="relative">
				<Search
					class="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 transform text-muted-foreground"
				/>
				<input
					id="search"
					type="text"
					bind:value={searchQuery}
					placeholder="Search reports..."
					class="w-full rounded-md border border-input bg-background py-2 pr-4 pl-10 text-sm focus:border-primary focus:outline-none"
				/>
			</div>
		</div>
		<select
			bind:value={typeFilter}
			class="rounded-md border border-input bg-background px-4 py-2 text-sm focus:border-primary focus:outline-none"
		>
			<option value="">All Types</option>
			{#each REPORT_TYPES as type}
				<option value={type.value}>{type.label}</option>
			{/each}
		</select>
		<select
			bind:value={categoryFilter}
			class="rounded-md border border-input bg-background px-4 py-2 text-sm focus:border-primary focus:outline-none"
		>
			<option value="">All Categories</option>
			{#each REPORT_CATEGORIES as category}
				<option value={category.value}>{category.label}</option>
			{/each}
		</select>
		<select
			bind:value={statusFilter}
			class="rounded-md border border-input bg-background px-4 py-2 text-sm focus:border-primary focus:outline-none"
		>
			<option value="">All Statuses</option>
			{#each REPORT_STATUSES as status}
				<option value={status.value}>{status.label}</option>
			{/each}
		</select>
	</div>

	<div class="flex items-center justify-between">
		<div class="flex gap-2">
			<button
				onclick={onApplyFilters}
				class="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
			>
				<Filter class="h-4 w-4" />
				Apply Filters
			</button>
			<button
				onclick={onClearFilters}
				class="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-foreground hover:bg-gray-200"
			>
				<X class="h-4 w-4" />
				Clear
			</button>
		</div>

		{#if selectedReportsCount > 0}
			<div class="flex items-center gap-4">
				<span class="text-sm text-muted-foreground">{selectedReportsCount} selected</span>
				<div class="flex gap-2">
					{#if canRunReports}
						<button
							onclick={onRunSelected}
							class="rounded bg-primary px-3 py-1 text-sm text-primary-foreground hover:bg-primary/90"
						>
							Run Selected
						</button>
					{/if}
					<button
						onclick={onDeleteSelected}
						class="rounded bg-destructive px-3 py-1 text-sm text-destructive-foreground hover:bg-destructive/90"
					>
						Delete Selected
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>
