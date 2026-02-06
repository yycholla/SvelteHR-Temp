<script lang="ts">
	import {
		Card,
		CardContent,
		CardHeader,
		CardTitle,
		CardDescription
	} from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as RadioGroup from '$lib/components/ui/radio-group';
	import * as Dialog from '$lib/components/ui/dialog';
	import {
		GitMerge,
		Home,
		Cloud,
		Clock,
		Check,
		X,
		AlertTriangle,
		ChevronDown,
		ChevronUp,
		Info
	} from 'lucide-svelte';
	import type { ConflictStrategy } from '$lib/types/sync';

	interface ConflictData {
		id: string;
		entityType: 'EMPLOYEE' | 'DEPARTMENT';
		entityId: string;
		entityName: string;
		localVersion: Record<string, unknown>;
		remoteVersion: Record<string, unknown>;
		conflictingFields: string[];
		lastLocalUpdate: string;
		lastRemoteUpdate: string;
		detectedAt: string;
	}

	interface Props {
		/** Array of unresolved conflicts */
		conflicts: ConflictData[];
		/** Loading state */
		loading?: boolean;
		/** Callback when conflict is resolved */
		onResolve?: (conflictId: string, strategy: ConflictStrategy) => void;
		/** Callback when bulk resolve is clicked */
		onBulkResolve?: (conflictIds: string[], strategy: ConflictStrategy) => void;
		/** Optional className */
		class?: string;
	}

	let {
		conflicts,
		loading = false,
		onResolve,
		onBulkResolve,
		class: className = ''
	}: Props = $props();

	// Selection state
	let selectedConflicts = $state<Set<string>>(new Set());
	let bulkStrategy = $state<ConflictStrategy>('LAST_WRITE_WINS');
	let expandedConflicts = $state<Set<string>>(new Set());
	let bulkDialogOpen = $state(false);

	// Toggle conflict expansion
	function toggleExpand(conflictId: string) {
		const newSet = new Set(expandedConflicts);
		if (newSet.has(conflictId)) {
			newSet.delete(conflictId);
		} else {
			newSet.add(conflictId);
		}
		expandedConflicts = newSet;
	}

	// Toggle selection
	function toggleSelection(conflictId: string) {
		const newSet = new Set(selectedConflicts);
		if (newSet.has(conflictId)) {
			newSet.delete(conflictId);
		} else {
			newSet.add(conflictId);
		}
		selectedConflicts = newSet;
	}

	// Select all
	function selectAll() {
		selectedConflicts = new Set(conflicts.map((c) => c.id));
	}

	// Deselect all
	function deselectAll() {
		selectedConflicts = new Set();
	}

	// Resolve single conflict
	function resolveSingle(conflictId: string, strategy: ConflictStrategy) {
		onResolve?.(conflictId, strategy);
		// Remove from selection after resolution
		const newSet = new Set(selectedConflicts);
		newSet.delete(conflictId);
		selectedConflicts = newSet;
	}

	// Open bulk resolve dialog
	function openBulkResolve() {
		if (selectedConflicts.size === 0) return;
		bulkDialogOpen = true;
	}

	// Confirm bulk resolve
	function confirmBulkResolve() {
		onBulkResolve?.(Array.from(selectedConflicts), bulkStrategy);
		bulkDialogOpen = false;
		deselectAll();
	}

	// Format date
	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}

	// Get strategy description
	function getStrategyDescription(strategy: ConflictStrategy): string {
		switch (strategy) {
			case 'LOCAL_WINS':
				return 'Keep your local changes and discard QuickBooks changes';
			case 'REMOTE_WINS':
				return 'Keep QuickBooks changes and discard your local changes';
			case 'LAST_WRITE_WINS':
				return 'Keep the most recently updated version';
			case 'MANUAL':
				return 'Review changes manually and decide field-by-field';
			default:
				return '';
		}
	}

	// Determine which version is newer
	function getNewerVersion(conflict: ConflictData): 'local' | 'remote' | 'same' {
		const localTime = new Date(conflict.lastLocalUpdate).getTime();
		const remoteTime = new Date(conflict.lastRemoteUpdate).getTime();
		if (localTime > remoteTime) return 'local';
		if (remoteTime > localTime) return 'remote';
		return 'same';
	}
</script>

<div class="space-y-4 {className}">
	<!-- Header with bulk actions -->
	{#if conflicts.length > 0}
		<Card>
			<CardHeader>
				<div class="flex items-center justify-between">
					<div>
						<CardTitle class="flex items-center gap-2">
							<GitMerge class="h-5 w-5" />
							Sync Conflicts ({conflicts.length})
						</CardTitle>
						<CardDescription class="mt-1">
							These items have conflicting changes in both systems. Choose how to resolve them.
						</CardDescription>
					</div>
					<Badge variant="destructive" class="text-sm">
						{conflicts.length} Unresolved
					</Badge>
				</div>
			</CardHeader>
			<CardContent>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						{#if selectedConflicts.size === 0}
							<Button size="sm" variant="outline" onclick={selectAll}>Select All</Button>
						{:else}
							<Button size="sm" variant="outline" onclick={deselectAll}>Deselect All</Button>
							<span class="text-sm text-muted-foreground">
								{selectedConflicts.size} selected
							</span>
						{/if}
					</div>
					{#if selectedConflicts.size > 0}
						<Button size="sm" onclick={openBulkResolve} disabled={loading}>
							<GitMerge class="h-3.5 w-3.5 mr-1.5" />
							Bulk Resolve ({selectedConflicts.size})
						</Button>
					{/if}
				</div>
			</CardContent>
		</Card>
	{/if}

	<!-- Conflict list -->
	<div class="space-y-3">
		{#each conflicts as conflict}
			{@const isExpanded = expandedConflicts.has(conflict.id)}
			{@const isSelected = selectedConflicts.has(conflict.id)}
			{@const newerVersion = getNewerVersion(conflict)}

			<Card class={isSelected ? 'border-primary' : ''}>
				<CardHeader class="pb-3">
					<div class="flex items-start gap-3">
						<!-- Selection checkbox -->
						<input
							type="checkbox"
							checked={isSelected}
							onchange={() => toggleSelection(conflict.id)}
							class="mt-1 h-4 w-4 rounded border-input"
						/>

						<!-- Conflict info -->
						<div class="flex-1">
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-2">
									<AlertTriangle class="h-4 w-4 text-orange-600" />
									<h3 class="font-semibold text-sm">{conflict.entityName}</h3>
									<Badge variant="secondary" class="text-xs">
										{conflict.entityType}
									</Badge>
								</div>
								<Button size="sm" variant="ghost" onclick={() => toggleExpand(conflict.id)}>
									{#if isExpanded}
										<ChevronUp class="h-4 w-4" />
									{:else}
										<ChevronDown class="h-4 w-4" />
									{/if}
								</Button>
							</div>

							<div class="mt-2 grid grid-cols-2 gap-2 text-xs">
								<div class="flex items-center gap-1 text-muted-foreground">
									<Home class="h-3 w-3" />
									<span>Local: {formatDate(conflict.lastLocalUpdate)}</span>
									{#if newerVersion === 'local'}
										<Badge variant="default" class="text-[10px] h-4 px-1">Newer</Badge>
									{/if}
								</div>
								<div class="flex items-center gap-1 text-muted-foreground">
									<Cloud class="h-3 w-3" />
									<span>Remote: {formatDate(conflict.lastRemoteUpdate)}</span>
									{#if newerVersion === 'remote'}
										<Badge variant="default" class="text-[10px] h-4 px-1">Newer</Badge>
									{/if}
								</div>
							</div>

							<div class="mt-2 flex flex-wrap gap-1">
								{#each conflict.conflictingFields as field}
									<Badge variant="outline" class="text-[10px] h-5">{field}</Badge>
								{/each}
							</div>
						</div>
					</div>
				</CardHeader>

				{#if isExpanded}
					<CardContent class="space-y-4">
						<!-- Comparison table -->
						<div class="rounded-lg border overflow-hidden">
							<table class="w-full text-sm">
								<thead class="bg-muted/50">
									<tr>
										<th class="text-left p-2 font-medium">Field</th>
										<th class="text-left p-2 font-medium flex items-center gap-1">
											<Home class="h-3 w-3" />
											Local Value
										</th>
										<th class="text-left p-2 font-medium flex items-center gap-1">
											<Cloud class="h-3 w-3" />
											Remote Value
										</th>
									</tr>
								</thead>
								<tbody>
									{#each conflict.conflictingFields as field}
										{@const localValue = conflict.localVersion[field]}
										{@const remoteValue = conflict.remoteVersion[field]}
										<tr class="border-t">
											<td class="p-2 font-medium text-muted-foreground">{field}</td>
											<td class="p-2 font-mono text-xs">
												{localValue !== null && localValue !== undefined
													? String(localValue)
													: 'null'}
											</td>
											<td class="p-2 font-mono text-xs">
												{remoteValue !== null && remoteValue !== undefined
													? String(remoteValue)
													: 'null'}
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>

						<!-- Resolution options -->
						<div class="border-t pt-4">
							<h4 class="text-sm font-semibold mb-3 flex items-center gap-2">
								<Info class="h-4 w-4" />
								Resolve this conflict
							</h4>
							<div class="grid grid-cols-2 md:grid-cols-4 gap-2">
								<Button
									size="sm"
									variant="outline"
									onclick={() => resolveSingle(conflict.id, 'LOCAL_WINS')}
									disabled={loading}
									class="justify-start"
								>
									<Home class="h-3.5 w-3.5 mr-1.5" />
									Keep Local
								</Button>
								<Button
									size="sm"
									variant="outline"
									onclick={() => resolveSingle(conflict.id, 'REMOTE_WINS')}
									disabled={loading}
									class="justify-start"
								>
									<Cloud class="h-3.5 w-3.5 mr-1.5" />
									Keep Remote
								</Button>
								<Button
									size="sm"
									variant="outline"
									onclick={() => resolveSingle(conflict.id, 'LAST_WRITE_WINS')}
									disabled={loading}
									class="justify-start"
								>
									<Clock class="h-3.5 w-3.5 mr-1.5" />
									Use Newer
								</Button>
								<Button
									size="sm"
									variant="outline"
									onclick={() => resolveSingle(conflict.id, 'MANUAL')}
									disabled={loading}
									class="justify-start"
								>
									<GitMerge class="h-3.5 w-3.5 mr-1.5" />
									Manual
								</Button>
							</div>
						</div>
					</CardContent>
				{/if}
			</Card>
		{/each}
	</div>

	<!-- Empty state -->
	{#if conflicts.length === 0 && !loading}
		<Card>
			<CardContent class="py-8">
				<div class="text-center">
					<Check class="h-12 w-12 text-green-600 mx-auto mb-3" />
					<h3 class="font-semibold mb-1">No Conflicts</h3>
					<p class="text-sm text-muted-foreground">
						All sync conflicts have been resolved. Great job!
					</p>
				</div>
			</CardContent>
		</Card>
	{/if}

	<!-- Loading state -->
	{#if loading}
		<Card>
			<CardContent class="py-8">
				<div class="text-center">
					<div
						class="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3"
					></div>
					<p class="text-sm text-muted-foreground">Loading conflicts...</p>
				</div>
			</CardContent>
		</Card>
	{/if}
</div>

<!-- Bulk Resolve Dialog -->
<Dialog.Root bind:open={bulkDialogOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Bulk Resolve Conflicts</Dialog.Title>
			<Dialog.Description>
				Apply the same resolution strategy to {selectedConflicts.size} selected conflict{selectedConflicts.size !==
				1
					? 's'
					: ''}.
			</Dialog.Description>
		</Dialog.Header>

		<div class="py-4">
			<RadioGroup.Root bind:value={bulkStrategy}>
				<div class="space-y-3">
					<div
						class="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer"
					>
						<RadioGroup.Item value="LOCAL_WINS" id="local-wins" />
						<label for="local-wins" class="flex-1 cursor-pointer">
							<div class="flex items-center gap-2 mb-1">
								<Home class="h-4 w-4" />
								<span class="font-medium text-sm">Keep Local Changes</span>
							</div>
							<p class="text-xs text-muted-foreground">
								{getStrategyDescription('LOCAL_WINS')}
							</p>
						</label>
					</div>

					<div
						class="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer"
					>
						<RadioGroup.Item value="REMOTE_WINS" id="remote-wins" />
						<label for="remote-wins" class="flex-1 cursor-pointer">
							<div class="flex items-center gap-2 mb-1">
								<Cloud class="h-4 w-4" />
								<span class="font-medium text-sm">Keep Remote Changes</span>
							</div>
							<p class="text-xs text-muted-foreground">
								{getStrategyDescription('REMOTE_WINS')}
							</p>
						</label>
					</div>

					<div
						class="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer bg-accent/30"
					>
						<RadioGroup.Item value="LAST_WRITE_WINS" id="last-write-wins" />
						<label for="last-write-wins" class="flex-1 cursor-pointer">
							<div class="flex items-center gap-2 mb-1">
								<Clock class="h-4 w-4" />
								<span class="font-medium text-sm">Last Write Wins (Recommended)</span>
							</div>
							<p class="text-xs text-muted-foreground">
								{getStrategyDescription('LAST_WRITE_WINS')}
							</p>
						</label>
					</div>
				</div>
			</RadioGroup.Root>
		</div>

		<Dialog.Footer class="gap-2">
			<Button variant="outline" onclick={() => (bulkDialogOpen = false)}>Cancel</Button>
			<Button onclick={confirmBulkResolve} disabled={loading}>
				<Check class="h-4 w-4 mr-1.5" />
				Resolve {selectedConflicts.size} Conflict{selectedConflicts.size !== 1 ? 's' : ''}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
