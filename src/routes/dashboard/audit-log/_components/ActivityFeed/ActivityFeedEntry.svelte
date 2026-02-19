<script lang="ts">
	import type { ActivityLogEntry } from './activityFeed.types';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import RollbackButton from '../RollbackButton/RollbackButton.svelte';

	interface EntryProps {
		log: ActivityLogEntry;
		isSelected: boolean;
		userRole: string;
		onToggleSelect: (id: string) => void;
		onRollbackComplete?: () => void;
		onConflict?: (conflicts: unknown) => void;
		onLogClick?: (logId: string) => void;
	}

	let {
		log,
		isSelected,
		userRole,
		onToggleSelect,
		onRollbackComplete,
		onConflict,
		onLogClick
	}: EntryProps = $props();

	let isExpanded = $state(false);
	let showDiff = $state(true);

	const actionColors: Record<string, string> = {
		CREATE: 'bg-blue-100 text-blue-800',
		READ: 'bg-green-100 text-green-800',
		UPDATE: 'bg-yellow-100 text-yellow-800',
		DELETE: 'bg-red-100 text-red-800'
	};

	const actionIcons: Record<string, string> = {
		CREATE: '+',
		READ: '👁',
		UPDATE: '✏',
		DELETE: '×'
	};

	let hasSnapshots = $derived(
		log.beforeSnapshot !== null ||
			log.beforeSnapshot !== undefined ||
			log.afterSnapshot !== null ||
			log.afterSnapshot !== undefined
	);

	function getChangedFields(): string[] {
		if (!log.beforeSnapshot || !log.afterSnapshot) return [];
		const fields = new Set([...Object.keys(log.beforeSnapshot), ...Object.keys(log.afterSnapshot)]);
		return Array.from(fields).filter(
			(field) =>
				JSON.stringify(log.beforeSnapshot?.[field]) !== JSON.stringify(log.afterSnapshot?.[field])
		);
	}

	function handleResourceClick() {
		onLogClick?.(log.id);
	}

	function handleRolledBackLogClick() {
		if (log.rolledBackLogId) {
			onLogClick?.(log.rolledBackLogId);
		}
	}
</script>

<div
	class="activity-feed-entry border-b p-4 hover:bg-gray-50 transition-colors"
	class:bg-purple-50={log.isRollback}
	role="article"
	aria-label="Audit log entry for {log.action} on {log.resourceType}"
>
	<div class="flex items-start gap-3">
		<Checkbox checked={isSelected} onCheckedChange={() => onToggleSelect(log.id)} />

		<div class="flex-1">
			<div class="mb-2 flex flex-wrap items-start justify-between gap-2">
				<div class="flex items-center gap-2 flex-wrap">
					<Badge class={actionColors[log.action] || 'bg-gray-100 text-gray-800'}>
						<span class="mr-1" aria-hidden="true">{actionIcons[log.action] || ''}</span>
						{log.action}
					</Badge>
					<span class="font-medium">{log.action}</span>
					<span class="text-gray-600">on</span>
					<button
						class="font-medium text-blue-600 hover:underline"
						onclick={handleResourceClick}
						aria-label="View {log.resourceType} details"
					>
						{log.resourceType}
					</button>
					<span class="text-sm text-gray-400">#{log.resourceId}</span>

					{#if log.isRollback}
						<Badge variant="secondary" class="bg-purple-100 text-purple-800">
							<svg
								class="mr-1 h-3 w-3"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								aria-hidden="true"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
								/>
							</svg>
							Rollback
						</Badge>
					{/if}
				</div>

				<div class="flex items-center gap-2">
					{#if log.rollbackStatus === 'completed'}
						<Badge variant="secondary">Rolled Back</Badge>
					{:else if log.rollbackStatus === 'pending'}
						<Badge variant="outline">Rollback Pending</Badge>
					{/if}
					<span class="text-sm text-gray-500">
						{new Date(log.timestamp || log.createdAt || '').toLocaleString()}
					</span>
				</div>
			</div>

			{#if log.rolledBackLogId}
				<div class="mb-2 text-sm">
					<span class="text-gray-600">Rollback of:</span>
					<Tooltip.Root>
						<Tooltip.Trigger asChild let:builder>
							<button
								class="ml-1 text-blue-600 hover:underline"
								onclick={handleRolledBackLogClick}
								builders={[builder]}
								aria-label="View original log entry"
							>
								Log #{log.rolledBackLogId}
							</button>
						</Tooltip.Trigger>
						<Tooltip.Content>
							<p>Log ID: {log.rolledBackLogId}</p>
						</Tooltip.Content>
					</Tooltip.Root>
				</div>
			{/if}

			<div class="mb-2 text-sm text-gray-600">
				Performed by: {log.performedBy || log.employeeName || 'Unknown'}
			</div>

			{#if log.reason}
				<div class="mb-2 text-sm">
					<span class="font-medium text-gray-700">Reason:</span>
					<span class="text-gray-600">
						{#if log.reason.length > 100}
							{log.reason.substring(0, 100)}...
							<button class="text-blue-600 hover:underline ml-1">Read more</button>
						{:else}
							{log.reason}
						{/if}
					</span>
				</div>
			{/if}

			{#if hasSnapshots}
				<Button variant="ghost" size="sm" onclick={() => (isExpanded = !isExpanded)}>
					{isExpanded ? 'Hide' : 'Show'} Details
				</Button>
			{/if}

			{#if isExpanded}
				<div class="mt-3 rounded bg-gray-50 p-3">
					{#if log.action === 'UPDATE' && log.beforeSnapshot && log.afterSnapshot}
						<div class="mb-2 flex items-center justify-between">
							<h4 class="font-medium">Changes:</h4>
							<Button
								variant="ghost"
								size="sm"
								onclick={() => (showDiff = !showDiff)}
								aria-label="Toggle between diff and raw JSON view"
							>
								{showDiff ? 'Show Raw JSON' : 'Show Diff'}
							</Button>
						</div>

						{#if showDiff}
							<div class="space-y-2">
								{#each getChangedFields() as field}
									<div class="rounded border p-2">
										<div class="mb-1 font-medium text-sm">{field}</div>
										<div class="grid grid-cols-2 gap-2">
											<div>
												<div class="mb-1 text-xs text-gray-600">Before:</div>
												<pre class="overflow-x-auto rounded bg-red-50 p-2 text-xs text-red-800">
{JSON.stringify(log.beforeSnapshot[field], null, 2)}
												</pre>
											</div>
											<div>
												<div class="mb-1 text-xs text-gray-600">After:</div>
												<pre class="overflow-x-auto rounded bg-green-50 p-2 text-xs text-green-800">
{JSON.stringify(log.afterSnapshot[field], null, 2)}
												</pre>
											</div>
										</div>
									</div>
								{/each}
								{#each Object.keys(log.beforeSnapshot || {}).filter((k) => !getChangedFields().includes(k)) as field}
									<div class="rounded border border-gray-200 bg-gray-100 p-2 opacity-60">
										<div class="mb-1 text-xs font-medium text-gray-500">{field} (unchanged)</div>
										<pre class="overflow-x-auto rounded bg-white p-2 text-xs text-gray-600">
{JSON.stringify(log.beforeSnapshot?.[field], null, 2)}
										</pre>
									</div>
								{/each}
							</div>
						{:else}
							<div class="grid grid-cols-2 gap-4">
								<div>
									<h4 class="mb-2 font-medium">Before:</h4>
									<pre class="overflow-x-auto rounded bg-white p-2 text-xs">
{JSON.stringify(log.beforeSnapshot, null, 2)}
									</pre>
								</div>
								<div>
									<h4 class="mb-2 font-medium">After:</h4>
									<pre class="overflow-x-auto rounded bg-white p-2 text-xs">
{JSON.stringify(log.afterSnapshot, null, 2)}
									</pre>
								</div>
							</div>
						{/if}
					{:else}
						<div class="grid grid-cols-2 gap-4">
							{#if log.beforeSnapshot}
								<div>
									<h4 class="mb-2 font-medium">Before:</h4>
									<pre class="overflow-x-auto rounded bg-white p-2 text-xs">
{JSON.stringify(log.beforeSnapshot, null, 2)}
									</pre>
								</div>
							{/if}
							{#if log.afterSnapshot}
								<div>
									<h4 class="mb-2 font-medium">After:</h4>
									<pre class="overflow-x-auto rounded bg-white p-2 text-xs">
{JSON.stringify(log.afterSnapshot, null, 2)}
									</pre>
								</div>
							{/if}
						</div>
					{/if}

					<div class="mt-3">
						<RollbackButton {log} {userRole} {onRollbackComplete} {onConflict} />
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
