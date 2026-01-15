<script lang="ts">
	import {
		AlertCircle,
		CheckCircle2,
		Eye,
		ArrowRight,
		ArrowLeft,
		ArrowLeftRight,
		Plus,
		Edit,
		Trash2,
		Clock,
		AlertTriangle,
		FileWarning,
		Info,
		Play
	} from '@lucide/svelte';
	import { createUrqlClient } from '$lib/graphql/client';
	import { PREVIEW_SYNC } from '$lib/graphql/operations/sync-preview';
	import { browser } from '$app/environment';
	import { SvelteSet } from 'svelte/reactivity';

	let { data } = $props();

	let entityType = $state('Employee');
	let syncDirection = $state('Pull');
	let includeFieldChanges = $state(true);
	let loading = $state(false);
	let previewData = $state<any>(null);
	let error = $state<string | null>(null);
	let selectedTab = $state<'creates' | 'updates' | 'deletes'>('updates');
	let expandedChanges = new SvelteSet<string>();

	// Entity types
	const entityTypes = [
		{ value: 'Employee', label: 'Employees' },
		{ value: 'Department', label: 'Departments' },
		{ value: 'Both', label: 'Both' }
	];

	// Sync directions
	const syncDirections = [
		{ value: 'Pull', label: 'Pull from QuickBooks', icon: ArrowLeft },
		{ value: 'Push', label: 'Push to QuickBooks', icon: ArrowRight },
		{ value: 'Bidirectional', label: 'Bidirectional Sync', icon: ArrowLeftRight }
	];

	async function runPreview() {
		if (!browser) return;

		loading = true;
		error = null;
		previewData = null;

		try {
			const client = createUrqlClient(fetch);
			const result = await client
				.mutation(PREVIEW_SYNC, {
					input: {
						entity_type: entityType,
						sync_direction: syncDirection,
						entity_ids: null,
						include_field_changes: includeFieldChanges
					}
				})
				.toPromise();

			if (result.error) {
				error = result.error.message;
			} else {
				previewData = result.data?.sync_preview?.preview_sync;
				// Auto-select the tab with the most changes
				if (previewData) {
					if (previewData.updates.length > 0) {
						selectedTab = 'updates';
					} else if (previewData.creates.length > 0) {
						selectedTab = 'creates';
					} else if (previewData.deletes.length > 0) {
						selectedTab = 'deletes';
					}
				}
			}
		} catch (e: any) {
			error = e.message || 'An error occurred while generating preview';
		} finally {
			loading = false;
		}
	}

	function toggleExpanded(id: string) {
		if (expandedChanges.has(id)) {
			expandedChanges.delete(id);
		} else {
			expandedChanges.add(id);
		}
	}

	function getChangeIcon(changeType: string) {
		switch (changeType) {
			case 'create':
				return Plus;
			case 'update':
				return Edit;
			case 'delete':
				return Trash2;
			default:
				return Info;
		}
	}

	function getChangeColor(changeType: string) {
		switch (changeType) {
			case 'create':
				return 'text-green-600 bg-green-50 border-green-200';
			case 'update':
				return 'text-blue-600 bg-blue-50 border-blue-200';
			case 'delete':
				return 'text-red-600 bg-red-50 border-red-200';
			default:
				return 'text-gray-600 bg-gray-50 border-gray-200';
		}
	}

	function formatDuration(seconds: number | null): string {
		if (!seconds) return 'Unknown';
		if (seconds < 60) return `${seconds}s`;
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return `${minutes}m ${remainingSeconds}s`;
	}
</script>

<div class="flex flex-col h-full overflow-hidden bg-background">
	<!-- Toolbar -->
	<header
		class="flex-shrink-0 flex items-center justify-between h-14 px-4 border-b bg-background z-20"
	>
		<div class="flex items-center gap-4 flex-1">
			<h1 class="text-sm font-semibold tracking-tight">Sync Preview / Dry Run</h1>
			<div class="h-4 w-px bg-border"></div>
			<span class="text-xs text-muted-foreground"
				>Preview synchronization changes before executing them</span
			>
		</div>
		<button
			onclick={runPreview}
			disabled={loading}
			class="flex items-center gap-1.5 h-8 px-3 rounded-sm border border-input bg-background text-xs hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
		>
			{#if loading}
				<Clock class="h-3.5 w-3.5 animate-spin" />
				Generating...
			{:else}
				<Play class="h-3.5 w-3.5" />
				Run Preview
			{/if}
		</button>
	</header>

	<!-- Configuration Bar -->
	<div class="flex-shrink-0 p-2 border-b bg-muted/5 flex items-center gap-2 overflow-x-auto">
		<div class="flex items-center gap-2">
			<label for="entityType" class="text-xs text-muted-foreground whitespace-nowrap"
				>Entity Type:</label
			>
			<select
				id="entityType"
				bind:value={entityType}
				class="h-8 rounded-sm border border-input bg-background px-2 text-xs focus:border-primary focus:outline-none min-w-[140px]"
			>
				{#each entityTypes as type}
					<option value={type.value}>{type.label}</option>
				{/each}
			</select>
		</div>

		<div class="flex items-center gap-2">
			<label for="syncDirection" class="text-xs text-muted-foreground whitespace-nowrap"
				>Sync Direction:</label
			>
			<select
				id="syncDirection"
				bind:value={syncDirection}
				class="h-8 rounded-sm border border-input bg-background px-2 text-xs focus:border-primary focus:outline-none min-w-[180px]"
			>
				{#each syncDirections as direction}
					<option value={direction.value}>{direction.label}</option>
				{/each}
			</select>
		</div>

		<label class="flex items-center gap-2 ml-4">
			<input
				type="checkbox"
				bind:checked={includeFieldChanges}
				class="h-4 w-4 rounded border-input text-primary focus:ring-primary"
			/>
			<span class="text-xs text-muted-foreground whitespace-nowrap"
				>Include field-level changes</span
			>
		</label>
	</div>

	<!-- Error message -->
	{#if error}
		<div class="flex-shrink-0 p-4 pb-0">
			<div
				class="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium border border-destructive/20 flex items-center gap-2"
			>
				<AlertCircle class="h-4 w-4 flex-shrink-0" />
				{error}
			</div>
		</div>
	{/if}

	{#if previewData}
		<!-- KPI Metrics -->
		<div class="flex-shrink-0 border-b bg-muted/5 p-4">
			<div class="grid grid-cols-5 gap-4">
				<!-- Total Changes -->
				<div class="flex flex-col h-32 p-4 bg-background border rounded-sm">
					<span
						class="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-auto"
						>Total Changes</span
					>
					<div class="flex items-end justify-between">
						<span class="text-3xl font-bold tabular-nums">{previewData.totalChanges}</span>
					</div>
				</div>

				<!-- Creates -->
				<div class="flex flex-col h-32 p-4 bg-background border rounded-sm">
					<span
						class="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-auto"
						>Creates</span
					>
					<div class="flex items-end justify-between">
						<span class="text-3xl font-bold tabular-nums">{previewData.summary.totalCreates}</span>
						<Plus class="h-8 w-8 text-green-500 mb-1" />
					</div>
				</div>

				<!-- Updates -->
				<div class="flex flex-col h-32 p-4 bg-background border rounded-sm">
					<span
						class="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-auto"
						>Updates</span
					>
					<div class="flex items-end justify-between">
						<span class="text-3xl font-bold tabular-nums">{previewData.summary.totalUpdates}</span>
						<Edit class="h-8 w-8 text-blue-500 mb-1" />
					</div>
				</div>

				<!-- Deletes -->
				<div class="flex flex-col h-32 p-4 bg-background border rounded-sm">
					<span
						class="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-auto"
						>Deletes</span
					>
					<div class="flex items-end justify-between">
						<span class="text-3xl font-bold tabular-nums">{previewData.summary.totalDeletes}</span>
						<Trash2 class="h-8 w-8 text-red-500 mb-1" />
					</div>
				</div>

				<!-- Conflicts -->
				<div class="flex flex-col h-32 p-4 bg-background border rounded-sm">
					<span
						class="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-auto"
						>Conflicts</span
					>
					<div class="flex items-end justify-between">
						<span class="text-3xl font-bold tabular-nums">{previewData.summary.totalConflicts}</span
						>
						<AlertTriangle class="h-8 w-8 text-orange-500 mb-1" />
					</div>
				</div>
			</div>

			<!-- Warnings and Duration -->
			<div class="mt-4 flex items-center justify-between">
				{#if previewData.summary.totalWarnings > 0}
					<div class="flex items-center gap-2 text-xs text-orange-600">
						<FileWarning class="h-4 w-4" />
						<span
							>{previewData.summary.totalWarnings} warning{previewData.summary.totalWarnings > 1
								? 's'
								: ''} detected</span
						>
					</div>
				{:else}
					<div></div>
				{/if}
				{#if previewData.summary.estimatedDurationSeconds}
					<div class="text-xs text-muted-foreground flex items-center gap-2">
						<Clock class="h-3.5 w-3.5" />
						Estimated duration: {formatDuration(previewData.summary.estimatedDurationSeconds)}
					</div>
				{/if}
			</div>
		</div>

		<!-- Tabs -->
		<div class="flex-shrink-0 border-b bg-background">
			<div class="flex gap-0 px-4">
				<button
					onclick={() => {
						selectedTab = 'creates';
					}}
					class="px-4 py-3 text-xs font-medium transition-colors {selectedTab === 'creates'
						? 'border-b-2 border-primary text-foreground'
						: 'text-muted-foreground hover:text-foreground'}"
				>
					Creates ({previewData.creates.length})
				</button>
				<button
					onclick={() => {
						selectedTab = 'updates';
					}}
					class="px-4 py-3 text-xs font-medium transition-colors {selectedTab === 'updates'
						? 'border-b-2 border-primary text-foreground'
						: 'text-muted-foreground hover:text-foreground'}"
				>
					Updates ({previewData.updates.length})
				</button>
				<button
					onclick={() => {
						selectedTab = 'deletes';
					}}
					class="px-4 py-3 text-xs font-medium transition-colors {selectedTab === 'deletes'
						? 'border-b-2 border-primary text-foreground'
						: 'text-muted-foreground hover:text-foreground'}"
				>
					Deletes ({previewData.deletes.length})
				</button>
			</div>
		</div>

		<!-- Changes List -->
		<div class="flex-1 overflow-auto min-h-0 relative bg-background">
			{#if selectedTab === 'creates'}
				{#if previewData.creates.length === 0}
					<div class="text-center py-12 text-muted-foreground">
						<Plus class="h-12 w-12 mx-auto mb-3" />
						<p class="font-medium text-xs">No records to create</p>
					</div>
				{:else}
					<table class="w-full text-sm text-left border-collapse">
						<thead class="sticky top-0 z-10 bg-muted/40 backdrop-blur-sm border-b">
							<tr>
								<th
									class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r w-12"
								></th>
								<th
									class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r"
									>Display Name</th
								>
								<th
									class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r w-32"
									>Entity Type</th
								>
								<th
									class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r w-48"
									>QuickBooks ID</th
								>
								<th
									class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground w-24"
									>Fields</th
								>
							</tr>
						</thead>
						<tbody class="divide-y">
							{#each previewData.creates as change, idx}
								{@const changeId = `create-${idx}`}
								<tr class="hover:bg-muted/30 transition-colors group">
									<td class="px-3 py-1.5 border-r">
										<Plus class="h-4 w-4 text-green-600" />
									</td>
									<td class="px-3 py-1.5 border-r">
										<span class="font-medium text-xs">{change.displayName}</span>
										{#if change.warnings && change.warnings.length > 0}
											<div class="flex items-center gap-1 mt-1 text-[10px] text-orange-600">
												<AlertTriangle class="h-3 w-3" />
												<span>{change.warnings.join(', ')}</span>
											</div>
										{/if}
									</td>
									<td class="px-3 py-1.5 border-r">
										<span
											class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-700"
										>
											{change.entityType}
										</span>
									</td>
									<td class="px-3 py-1.5 border-r">
										{#if change.quickbooksId}
											<code class="text-xs font-mono">{change.quickbooksId}</code>
										{:else}
											<span class="text-xs text-muted-foreground">—</span>
										{/if}
									</td>
									<td class="px-3 py-1.5">
										{#if change.fieldChanges && includeFieldChanges}
											<button
												onclick={() => toggleExpanded(changeId)}
												class="text-xs text-primary hover:underline"
											>
												{expandedChanges.has(changeId) ? 'Hide' : 'Show'} ({change.fieldChanges
													.length})
											</button>
										{:else}
											<span class="text-xs text-muted-foreground">—</span>
										{/if}
									</td>
								</tr>
								{#if expandedChanges.has(changeId) && change.fieldChanges}
									<tr>
										<td colspan="5" class="px-3 py-2 bg-muted/20">
											<div class="space-y-1">
												{#each change.fieldChanges as field}
													<div class="text-xs flex items-center gap-2">
														<span class="font-medium min-w-32">{field.fieldName}:</span>
														<span class="text-green-600">{field.newValue || '(empty)'}</span>
													</div>
												{/each}
											</div>
										</td>
									</tr>
								{/if}
							{/each}
						</tbody>
					</table>
				{/if}
			{:else if selectedTab === 'updates'}
				{#if previewData.updates.length === 0}
					<div class="text-center py-12 text-muted-foreground">
						<Edit class="h-12 w-12 mx-auto mb-3" />
						<p class="font-medium text-xs">No records to update</p>
					</div>
				{:else}
					<table class="w-full text-sm text-left border-collapse">
						<thead class="sticky top-0 z-10 bg-muted/40 backdrop-blur-sm border-b">
							<tr>
								<th
									class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r w-12"
								></th>
								<th
									class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r"
									>Display Name</th
								>
								<th
									class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r w-32"
									>Entity Type</th
								>
								<th
									class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r w-32"
									>Local ID</th
								>
								<th
									class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r w-32"
									>QB ID</th
								>
								<th
									class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground w-24"
									>Fields</th
								>
							</tr>
						</thead>
						<tbody class="divide-y">
							{#each previewData.updates as change, idx}
								{@const changeId = `update-${idx}`}
								<tr class="hover:bg-muted/30 transition-colors group">
									<td class="px-3 py-1.5 border-r">
										<Edit class="h-4 w-4 text-blue-600" />
									</td>
									<td class="px-3 py-1.5 border-r">
										<span class="font-medium text-xs">{change.displayName}</span>
										{#if change.warnings && change.warnings.length > 0}
											<div class="flex items-center gap-1 mt-1 text-[10px] text-orange-600">
												<AlertTriangle class="h-3 w-3" />
												<span>{change.warnings.join(', ')}</span>
											</div>
										{/if}
									</td>
									<td class="px-3 py-1.5 border-r">
										<span
											class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-700"
										>
											{change.entityType}
										</span>
									</td>
									<td class="px-3 py-1.5 border-r">
										{#if change.localId}
											<code class="text-xs font-mono">{change.localId.slice(0, 8)}</code>
										{:else}
											<span class="text-xs text-muted-foreground">—</span>
										{/if}
									</td>
									<td class="px-3 py-1.5 border-r">
										{#if change.quickbooksId}
											<code class="text-xs font-mono">{change.quickbooksId}</code>
										{:else}
											<span class="text-xs text-muted-foreground">—</span>
										{/if}
									</td>
									<td class="px-3 py-1.5">
										{#if change.fieldChanges && includeFieldChanges}
											<button
												onclick={() => toggleExpanded(changeId)}
												class="text-xs text-primary hover:underline"
											>
												{expandedChanges.has(changeId) ? 'Hide' : 'Show'} ({change.fieldChanges
													.length})
											</button>
										{:else}
											<span class="text-xs text-muted-foreground">—</span>
										{/if}
									</td>
								</tr>
								{#if expandedChanges.has(changeId) && change.fieldChanges}
									<tr>
										<td colspan="6" class="px-3 py-2 bg-muted/20">
											<div class="space-y-1">
												{#each change.fieldChanges as field}
													<div class="text-xs flex items-start gap-2">
														<span class="font-medium min-w-32 flex items-center gap-2">
															{field.fieldName}:
															{#if field.hasConflict}
																<span
																	class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700"
																	>Conflict</span
																>
															{/if}
														</span>
														<div class="flex items-center gap-2">
															<span class="text-red-600 line-through"
																>{field.currentValue || '(empty)'}</span
															>
															<ArrowRight class="h-3 w-3" />
															<span class="text-green-600">{field.newValue || '(empty)'}</span>
														</div>
													</div>
												{/each}
											</div>
										</td>
									</tr>
								{/if}
							{/each}
						</tbody>
					</table>
				{/if}
			{:else if selectedTab === 'deletes'}
				{#if previewData.deletes.length === 0}
					<div class="text-center py-12 text-muted-foreground">
						<Trash2 class="h-12 w-12 mx-auto mb-3" />
						<p class="font-medium text-xs">No records to delete</p>
					</div>
				{:else}
					<table class="w-full text-sm text-left border-collapse">
						<thead class="sticky top-0 z-10 bg-muted/40 backdrop-blur-sm border-b">
							<tr>
								<th
									class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r w-12"
								></th>
								<th
									class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r"
									>Display Name</th
								>
								<th
									class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r w-32"
									>Entity Type</th
								>
								<th
									class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground"
									>Status</th
								>
							</tr>
						</thead>
						<tbody class="divide-y">
							{#each previewData.deletes as change}
								<tr class="hover:bg-muted/30 transition-colors group bg-red-50/50">
									<td class="px-3 py-1.5 border-r">
										<Trash2 class="h-4 w-4 text-red-600" />
									</td>
									<td class="px-3 py-1.5 border-r">
										<span class="font-medium text-xs">{change.displayName}</span>
										{#if change.warnings && change.warnings.length > 0}
											<div class="flex items-center gap-1 mt-1 text-[10px] text-orange-600">
												<AlertTriangle class="h-3 w-3" />
												<span>{change.warnings.join(', ')}</span>
											</div>
										{/if}
									</td>
									<td class="px-3 py-1.5 border-r">
										<span
											class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-700"
										>
											{change.entityType}
										</span>
									</td>
									<td class="px-3 py-1.5">
										<span class="text-xs text-red-600 font-medium">Will be deleted</span>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{/if}
			{/if}
		</div>

		<!-- Action Footer -->
		<footer class="flex-shrink-0 border-t bg-muted/20 px-4 py-3 flex items-center justify-between">
			<button
				onclick={runPreview}
				class="flex items-center gap-1.5 h-8 px-3 rounded-sm border border-input bg-background text-xs hover:bg-accent transition-colors"
			>
				<Eye class="h-3.5 w-3.5" />
				Run Preview Again
			</button>
			<button
				disabled={previewData.totalChanges === 0}
				class="flex items-center gap-1.5 h-8 px-3 rounded-sm bg-primary text-primary-foreground text-xs hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
			>
				<CheckCircle2 class="h-3.5 w-3.5" />
				Proceed with Sync
			</button>
		</footer>
	{/if}

	<!-- Empty State -->
	{#if !previewData && !loading && !error}
		<div class="flex-1 flex items-center justify-center bg-background">
			<div class="text-center text-muted-foreground max-w-md">
				<Eye class="h-16 w-16 mx-auto mb-4 opacity-50" />
				<h3 class="text-sm font-semibold mb-2">Ready to Preview</h3>
				<p class="text-xs">
					Configure your sync options above and click "Run Preview" to see what changes will be made
				</p>
			</div>
		</div>
	{/if}
</div>
