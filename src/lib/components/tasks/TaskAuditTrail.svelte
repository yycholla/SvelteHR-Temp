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
	import type { TaskAuditEntry } from '$lib/types/task';
	import type { AuditActionType } from '$lib/utils/audit';
	import { formatAuditAction, getAuditActionColor, getAuditActionIcon } from '$lib/utils/audit';

	// Convert old action types to new ones for backward compatibility
	function convertAuditActionType(actionType: string): AuditActionType {
		const mapping: Record<string, AuditActionType> = {
			created: 'task_created',
			edited: 'task_updated',
			reassigned: 'task_reassigned',
			deleted: 'task_deleted',
			status_changed: 'status_changed',
			org_change: 'parent_changed'
		};
		return mapping[actionType] || (actionType as AuditActionType);
	}
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import {
		AlertTriangle,
		Building,
		Calendar,
		CheckCircle,
		ChevronDown,
		Clock,
		Edit,
		FileText,
		GitBranch,
		History,
		Link,
		MessageCircle,
		Paperclip,
		Plus,
		Trash2,
		Unlink,
		UserCog
	} from '@lucide/svelte';
	import { formatDistance } from 'date-fns';

	interface Props {
		entries: TaskAuditEntry[];
		totalCount: number;
		hasMore: boolean;
		onLoadMore?: () => Promise<void>;
		loading?: boolean;
	}

	const { entries, totalCount, hasMore, onLoadMore, loading = false }: Props = $props();

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

	// Get action icon component
	function getActionIcon(actionType: string) {
		const convertedType = convertAuditActionType(actionType);
		const iconName = getAuditActionIcon(convertedType as AuditActionType);
		switch (iconName) {
			case 'plus':
				return Plus;
			case 'edit':
				return Edit;
			case 'user-check':
				return UserCog;
			case 'trash':
				return Trash2;
			case 'refresh-cw':
				return CheckCircle;
			case 'alert-triangle':
				return AlertTriangle;
			case 'link':
				return Link;
			case 'unlink':
				return Unlink;
			case 'paperclip':
				return Paperclip;
			case 'message-circle':
				return MessageCircle;
			case 'calendar':
				return Calendar;
			case 'file-text':
				return FileText;
			case 'git-branch':
				return GitBranch;
			default:
				return Edit;
		}
	}

	// Get action color classes
	function getActionColor(actionType: string) {
		const convertedType = convertAuditActionType(actionType);
		const color = getAuditActionColor(convertedType as AuditActionType);
		switch (color) {
			case 'green':
				return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
			case 'blue':
				return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30';
			case 'red':
				return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
			case 'purple':
				return 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30';
			case 'orange':
				return 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30';
			case 'yellow':
				return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30';
			case 'indigo':
				return 'text-indigo-600 bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-900/30';
			case 'gray':
				return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30';
			case 'cyan':
				return 'text-cyan-600 bg-cyan-100 dark:text-cyan-400 dark:bg-cyan-900/30';
			case 'pink':
				return 'text-pink-600 bg-pink-100 dark:text-pink-400 dark:bg-pink-900/30';
			case 'lime':
				return 'text-lime-600 bg-lime-100 dark:text-lime-400 dark:bg-lime-900/30';
			case 'teal':
				return 'text-teal-600 bg-teal-100 dark:text-teal-400 dark:bg-teal-900/30';
			case 'violet':
				return 'text-violet-600 bg-violet-100 dark:text-violet-400 dark:bg-violet-900/30';
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
			<p class="mb-1 text-lg font-medium text-muted-foreground">No Activity Yet</p>
			<p class="text-sm text-muted-foreground">Changes to this task will appear here</p>
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
						<div
							class="flex h-10 w-10 items-center justify-center rounded-full {getActionColor(
								entry.actionType
							)}"
						>
							<ActionIcon class="h-5 w-5" />
						</div>
						<!-- Vertical line (not shown for last item) -->
						{#if entry !== entries[entries.length - 1]}
							<div class="mt-2 w-px flex-1 bg-border"></div>
						{/if}
					</div>

					<!-- Entry content -->
					<div class="flex-1 pb-6">
						<div class="space-y-3 rounded-lg border bg-card p-4">
							<!-- Entry header -->
							<div class="flex items-start justify-between gap-3">
								<div class="flex-1">
									<div class="flex flex-wrap items-center gap-2">
										<Badge variant="outline">
											{formatAuditAction(
												convertAuditActionType(entry.actionType) as AuditActionType
											)}
										</Badge>
										{#if entry.user}
											<span class="text-sm text-muted-foreground">by</span>
											<span class="text-sm font-medium">{entry.user.display_name}</span>
										{/if}
									</div>
									<div class="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
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
								<div class="space-y-2 border-t pt-3">
									<p class="mb-2 text-sm font-medium">Changed Fields:</p>
									{#each entry.changedFields as field}
										{@const oldValue = entry.newValues?.[field]?.old}
										{@const newValue = entry.newValues?.[field]?.new}
										<div class="rounded-lg bg-muted/50 p-3 text-sm">
											<p class="mb-1 font-medium text-foreground">{formatFieldName(field)}</p>
											<div class="flex flex-wrap items-center gap-2">
												{#if oldValue !== undefined && oldValue !== null}
													<span class="text-muted-foreground">
														<span class="line-through">{String(oldValue)}</span>
													</span>
													<span class="text-muted-foreground">→</span>
												{/if}
												<span class="font-medium text-foreground">
													{newValue !== undefined && newValue !== null
														? String(newValue)
														: '(empty)'}
												</span>
											</div>
										</div>
									{/each}
								</div>
							{:else if hasChangedFields}
								<div class="text-xs text-muted-foreground">
									{entry.changedFields.length} field{entry.changedFields.length > 1 ? 's' : ''} changed
									<span
										class="cursor-pointer text-primary hover:underline"
										role="button"
										tabindex="0"
										onclick={() => toggleEntry(entry.id)}
										onkeydown={(e) => {
											if (e.key === 'Enter' || e.key === ' ') {
												e.preventDefault();
												toggleEntry(entry.id);
											}
										}}
									>
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
						<div class="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-primary"></div>
					{/if}
					Load More Activity
				</Button>
			</div>
		{/if}
	{/if}
</div>
