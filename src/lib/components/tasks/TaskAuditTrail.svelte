<!--
  TaskAuditTrail Component
  Feature: 028-task-system-expansion - Task T031
  
  Timeline visualization of task change history
  - Chronological list of audit entries (newest first)
  - User attribution with avatars
  - Changed fields with before/after values
  - Action type indicators (created, edited, reassigned, deleted, status_changed, org_change)
  - Relative timestamp formatting
  - Pagination support
-->

<script lang="ts">
	import type { TaskAuditEntry, AuditActionType } from '$lib/types/task';
	import { formatAuditAction } from '$lib/graphql/tasks-operations';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import {
		History,
		Plus,
		Edit,
		UserCog,
		Trash2,
		CheckCircle,
		Building,
		Clock,
		ChevronDown
	} from 'lucide-svelte';
	import { formatDistance } from 'date-fns';

	interface Props {
		entries: TaskAuditEntry[];
		totalCount: number;
		hasMore: boolean;
		onLoadMore?: () => Promise<void>;
		loading?: boolean;
	}

	let { entries, totalCount, hasMore, onLoadMore, loading = false }: Props = $props();

	// State
	let expandedEntries = $state<Set<string>>(new Set());

	// Toggle entry expansion
	function toggleEntry(entryId: string) {
		const newSet = new Set(expandedEntries);
		if (newSet.has(entryId)) {
			newSet.delete(entryId);
		} else {
			newSet.add(entryId);
		}
		expandedEntries = newSet;
	}

	// Get action icon
	function getActionIcon(actionType: AuditActionType) {
		switch (actionType) {
			case 'created':
				return Plus;
			case 'edited':
				return Edit;
			case 'reassigned':
				return UserCog;
			case 'deleted':
				return Trash2;
			case 'status_changed':
				return CheckCircle;
			case 'org_change':
				return Building;
			default:
				return Edit;
		}
	}

	// Get action color
	function getActionColor(actionType: AuditActionType) {
		switch (actionType) {
			case 'created':
				return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
			case 'edited':
				return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30';
			case 'reassigned':
				return 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30';
			case 'deleted':
				return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
			case 'status_changed':
				return 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30';
			case 'org_change':
				return 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30';
			default:
				return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30';
		}
	}

	// Format relative time
	function formatRelativeTime(timestamp: Date | string): string {
		const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
		return formatDistance(date, new Date(), { addSuffix: true });
	}

	// Format changed fields for display
	function formatFieldName(field: string): string {
		return field
			.split('_')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	}

	// Handle load more
	async function handleLoadMore() {
		if (onLoadMore && !loading) {
			await onLoadMore();
		}
	}
</script>

<div class="task-audit-trail space-y-4">
	<!-- Header -->
	<div class="flex items-center justify-between border-b pb-4">
		<div class="flex items-center gap-3">
			<History class="h-5 w-5 text-primary" />
			<h3 class="text-lg font-semibold">Activity History</h3>
			<Badge variant="secondary">{totalCount} {totalCount === 1 ? 'entry' : 'entries'}</Badge>
		</div>
	</div>

	<!-- Timeline -->
	{#if entries.length === 0}
		<div class="rounded-lg border border-dashed bg-muted/30 p-12 text-center">
			<History class="mx-auto mb-3 h-12 w-12 text-muted-foreground opacity-50" />
			<p class="text-lg font-medium text-muted-foreground mb-1">No Activity Yet</p>
			<p class="text-sm text-muted-foreground">
				Changes to this task will appear here
			</p>
		</div>
	{:else}
		<div class="space-y-4">
			{#each entries as entry (entry.id)}
				{@const isExpanded = expandedEntries.has(entry.id)}
				{@const ActionIcon = getActionIcon(entry.actionType)}
				{@const hasChangedFields = entry.changedFields && entry.changedFields.length > 0}

				<div class="flex gap-4">
					<!-- Timeline connector line -->
					<div class="relative flex flex-col items-center">
						<!-- Icon -->
						<div class="flex h-10 w-10 items-center justify-center rounded-full {getActionColor(entry.actionType)}">
							<svelte:component this={ActionIcon} class="h-5 w-5" />
						</div>
						<!-- Vertical line (not shown for last item) -->
						{#if entry !== entries[entries.length - 1]}
							<div class="w-px flex-1 bg-border mt-2"></div>
						{/if}
					</div>

					<!-- Entry content -->
					<div class="flex-1 pb-6">
						<div class="rounded-lg border bg-card p-4 space-y-3">
							<!-- Entry header -->
							<div class="flex items-start justify-between gap-3">
								<div class="flex-1">
									<div class="flex items-center gap-2 flex-wrap">
										<Badge variant="outline">
											{formatAuditAction(entry.actionType)}
										</Badge>
										{#if entry.userByUserId}
											<span class="text-sm text-muted-foreground">by</span>
											<span class="text-sm font-medium">{entry.userByUserId.displayName}</span>
										{/if}
									</div>
									<div class="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
										<Clock class="h-3 w-3" />
										<span>{formatRelativeTime(entry.timestamp)}</span>
									</div>
								</div>

								<!-- Expand/Collapse button -->
								{#if hasChangedFields}
									<Button
										size="sm"
										variant="ghost"
										onclick={() => toggleEntry(entry.id)}
										class="flex-shrink-0"
									>
										<ChevronDown 
											class="h-4 w-4 transition-transform {isExpanded ? 'rotate-180' : ''}"
										/>
									</Button>
								{/if}
							</div>

							<!-- Changed fields (expanded) -->
							{#if isExpanded && hasChangedFields}
								<div class="border-t pt-3 space-y-2">
									<p class="text-sm font-medium mb-2">Changed Fields:</p>
									{#each entry.changedFields as field}
										{@const oldValue = entry.newValues?.[field]?.old}
										{@const newValue = entry.newValues?.[field]?.new}
										<div class="rounded-lg bg-muted/50 p-3 text-sm">
											<p class="font-medium text-foreground mb-1">{formatFieldName(field)}</p>
											<div class="flex items-center gap-2 flex-wrap">
												{#if oldValue !== undefined && oldValue !== null}
													<span class="text-muted-foreground">
														<span class="line-through">{String(oldValue)}</span>
													</span>
													<span class="text-muted-foreground">→</span>
												{/if}
												<span class="text-foreground font-medium">
													{newValue !== undefined && newValue !== null ? String(newValue) : '(empty)'}
												</span>
											</div>
										</div>
									{/each}
								</div>
							{:else if hasChangedFields}
								<div class="text-xs text-muted-foreground">
									{entry.changedFields.length} field{entry.changedFields.length > 1 ? 's' : ''} changed
									<span class="text-primary cursor-pointer hover:underline" onclick={() => toggleEntry(entry.id)}>
										(show details)
									</span>
								</div>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>

		<!-- Load More Button -->
		{#if hasMore}
			<div class="flex justify-center pt-4">
				<Button
					variant="outline"
					onclick={handleLoadMore}
					disabled={loading}
					class="w-full sm:w-auto"
				>
					{#if loading}
						<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
					{/if}
					Load More Activity
				</Button>
			</div>
		{/if}
	{/if}
</div>

<style>
	.task-audit-trail {
		@apply p-6 rounded-lg border bg-card;
	}
</style>
