<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { ChevronDown, Filter, X } from '@lucide/svelte';

	interface Props {
		hasActiveFilters: boolean;
		activeFilterCount: number;
		compact: boolean;
		isExpanded: boolean;
		onClearAll: () => void;
		onToggleExpanded: () => void;
	}

	let {
		hasActiveFilters,
		activeFilterCount,
		compact,
		isExpanded,
		onClearAll,
		onToggleExpanded
	}: Props = $props();
</script>

<div class="flex items-center justify-between">
	<div class="flex items-center gap-2">
		<Filter class="h-4 w-4 text-primary" />
		<span class="font-medium">Filters</span>
		{#if hasActiveFilters}
			<Badge variant="secondary">{activeFilterCount}</Badge>
		{/if}
	</div>

	<div class="flex items-center gap-2">
		{#if hasActiveFilters}
			<Button size="sm" variant="ghost" onclick={onClearAll}>
				<X class="mr-1 h-3 w-3" />
				Clear All
			</Button>
		{/if}
		{#if compact}
			<Button size="sm" variant="ghost" onclick={onToggleExpanded}>
				<ChevronDown class="h-4 w-4 transition-transform {isExpanded ? 'rotate-180' : ''}" />
			</Button>
		{/if}
	</div>
</div>
