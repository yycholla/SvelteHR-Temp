<script lang="ts">
	import type { ActivityFeedProps } from './activityFeed.types';
	import ActivityFeedEntry from './ActivityFeedEntry.svelte';
	import ActivityFeedSkeleton from './ActivityFeedSkeleton.svelte';
	import { Button } from '$lib/components/ui/button';

	let {
		logs,
		onLoadMore,
		hasMore = false,
		loading = false,
		selectedIds = new Set<string>(),
		onSelectionChange,
		userRole = 'employee',
		onLogClick,
		onRollback
	}: ActivityFeedProps = $props();

	let lastClickedIndex = $state<number | null>(null);

	function handleToggleSelect(id: string, index: number, shiftKey: boolean) {
		const newSelection = new Set(selectedIds);

		if (shiftKey && lastClickedIndex !== null) {
			// Shift+Click range selection
			const start = Math.min(lastClickedIndex, index);
			const end = Math.max(lastClickedIndex, index);

			for (let i = start; i <= end; i++) {
				newSelection.add(logs[i].id);
			}
		} else {
			// Regular toggle
			if (newSelection.has(id)) {
				newSelection.delete(id);
			} else {
				newSelection.add(id);
			}
		}

		lastClickedIndex = index;
		onSelectionChange?.(newSelection);
	}

	function handleScroll(event: Event) {
		const target = event.currentTarget as HTMLDivElement;
		const bottom = target.scrollHeight - target.scrollTop - target.clientHeight;

		if (bottom < 200 && hasMore && !loading && onLoadMore) {
			onLoadMore();
		}
	}

	// Track the current event for accessing shift key
	let currentEvent: MouseEvent | null = null;

	function handleCheckboxClick(event: MouseEvent) {
		currentEvent = event;
	}
</script>

<svelte:window
	onclick={(e) => {
		currentEvent = e;
	}}
/>

<div
	class="activity-feed max-h-[600px] overflow-y-auto"
	data-scroll-container
	onscroll={handleScroll}
	role="feed"
	aria-label="Audit log activity feed"
	aria-busy={loading}
>
	{#if logs.length === 0 && !loading}
		<div class="empty-state p-8 text-center text-gray-500" role="status">
			<svg
				class="mx-auto mb-4 h-12 w-12 text-gray-400"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
				aria-hidden="true"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
				/>
			</svg>
			<p class="font-medium">No audit logs found</p>
			<p class="text-sm">Try adjusting your filters.</p>
		</div>
	{:else}
		{#each logs as log, index (log.id)}
			<div onclick={handleCheckboxClick}>
				<ActivityFeedEntry
					{log}
					isSelected={selectedIds.has(log.id)}
					{userRole}
					onToggleSelect={(id) => handleToggleSelect(id, index, currentEvent?.shiftKey || false)}
					onRollbackComplete={onRollback ? () => onRollback(log.id) : undefined}
					{onLogClick}
				/>
			</div>
		{/each}

		{#if loading}
			<ActivityFeedSkeleton count={3} />
		{/if}

		{#if hasMore && !loading}
			<div class="p-4 text-center">
				<Button variant="outline" onclick={onLoadMore} aria-label="Load more audit logs">
					Load More
				</Button>
			</div>
		{/if}
	{/if}
</div>
