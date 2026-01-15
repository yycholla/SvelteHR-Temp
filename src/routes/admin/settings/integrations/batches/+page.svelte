<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Progress } from '$lib/components/ui/progress';
	import {
		Select,
		SelectContent,
		SelectItem,
		SelectTrigger,
		SelectValue
	} from '$lib/components/ui/select';
	import {
		AlertCircle,
		CheckCircle2,
		RefreshCw,
		ArrowLeft,
		Layers,
		TrendingUp,
		Zap,
		Clock,
		Package,
		ArrowDownToLine,
		ArrowUpFromLine
	} from '@lucide/svelte';
	import { invalidate, goto } from '$app/navigation';
	import { page } from '$app/stores';

	let { data } = $props();
	let batches = $derived(data.batches);
	let efficiency = $derived(data.efficiency);
	let selectedBatch = $derived(data.selectedBatch);
	let filters = $derived(data.filters || {});

	let refreshing = $state(false);
	let selectedEntityType = $state('all');

	$effect(() => {
		if ((filters as any).entityType) selectedEntityType = (filters as any).entityType;
	});

	const entityTypes = [
		{ value: 'all', label: 'All Entity Types' },
		{ value: 'employee', label: 'Employee' },
		{ value: 'department', label: 'Department' }
	];

	async function refreshData() {
		refreshing = true;
		await invalidate('app:batch-operations');
		refreshing = false;
	}

	function viewBatch(batchId: string) {
		goto(`?batchId=${batchId}`);
	}

	function backToList() {
		goto('/admin/settings/integrations/batches');
	}

	function applyFilters() {
		const params = new URLSearchParams();
		if (selectedEntityType !== 'all') params.set('entityType', selectedEntityType);
		goto(`?${params.toString()}`);
	}

	function getStatusColor(status: string): string {
		switch (status.toLowerCase()) {
			case 'completed':
				return 'text-green-600 bg-green-50 border-green-200';
			case 'in_progress':
			case 'processing':
				return 'text-blue-600 bg-blue-50 border-blue-200';
			case 'pending':
				return 'text-yellow-600 bg-yellow-50 border-yellow-200';
			case 'failed':
			case 'partial':
				return 'text-red-600 bg-red-50 border-red-200';
			default:
				return 'text-gray-600 bg-gray-50 border-gray-200';
		}
	}

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return 'N/A';
		const date = new Date(dateStr);
		return date.toLocaleString();
	}

	function formatDuration(ms: number | null): string {
		if (!ms) return 'N/A';
		if (ms < 1000) return `${ms}ms`;
		const seconds = Math.floor(ms / 1000);
		if (seconds < 60) return `${seconds}s`;
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return `${minutes}m ${remainingSeconds}s`;
	}

	function parseProgress(progressStr: string): number {
		return parseFloat(progressStr) || 0;
	}
</script>

<!-- Toolbar -->
<div class="flex h-14 items-center justify-between gap-4 border-b px-4">
	<div class="flex items-center gap-4">
		{#if selectedBatch}
			<Button onclick={backToList} variant="outline" size="sm">
				<ArrowLeft class="h-4 w-4 mr-2" />
				Back
			</Button>
		{/if}
		<div class="flex items-center gap-2">
			<Layers class="h-5 w-5" />
			<h1 class="text-lg font-semibold">
				{selectedBatch ? 'Batch Details' : 'Batch Operations'}
			</h1>
		</div>
	</div>
	<Button onclick={refreshData} disabled={refreshing} variant="ghost" size="sm">
		<RefreshCw class="h-4 w-4 {refreshing ? 'animate-spin' : ''}" />
	</Button>
</div>

<div class="container mx-auto py-6 px-4">
	{#if data.error}
		<Alert variant="destructive" class="mb-6">
			<AlertCircle class="h-4 w-4" />
			<AlertDescription>{data.error}</AlertDescription>
		</Alert>
	{/if}

	{#if selectedBatch}
		<!-- Batch Detail View -->
		<div class="space-y-6">
			<!-- Batch Summary KPIs -->
			<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
				<div class="rounded-lg border bg-background p-4">
					<p class="text-sm text-muted-foreground mb-1">Operation</p>
					<p class="text-lg font-semibold capitalize">
						{selectedBatch.operationType.replace(/_/g, ' ')}
					</p>
				</div>
				<div class="rounded-lg border bg-background p-4">
					<p class="text-sm text-muted-foreground mb-1">Entity Type</p>
					<p class="text-lg font-semibold capitalize">{selectedBatch.entityType}</p>
				</div>
				<div class="rounded-lg border bg-background p-4">
					<p class="text-sm text-muted-foreground mb-1">Direction</p>
					<div class="flex items-center gap-1 mt-1">
						{#if selectedBatch.direction.toLowerCase() === 'to_quickbooks'}
							<ArrowUpFromLine class="h-4 w-4 text-blue-500" />
							<span class="text-sm">To QuickBooks</span>
						{:else}
							<ArrowDownToLine class="h-4 w-4 text-green-500" />
							<span class="text-sm">From QuickBooks</span>
						{/if}
					</div>
				</div>
				<div class="rounded-lg border bg-background p-4">
					<p class="text-sm text-muted-foreground mb-1">Total Items</p>
					<p class="text-2xl font-bold">{selectedBatch.totalItems}</p>
				</div>
			</div>

			<!-- Status and Progress -->
			<div class="rounded-lg border bg-background p-6">
				<div class="flex items-center justify-between mb-4">
					<div>
						<h3 class="text-lg font-semibold">Batch Operation</h3>
						<p class="text-sm text-muted-foreground">{formatDate(selectedBatch.createdAt)}</p>
					</div>
					<div
						class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border {getStatusColor(
							selectedBatch.status
						)}"
					>
						{selectedBatch.status}
					</div>
				</div>

				<!-- Progress Bar -->
				<div class="mb-6">
					<div class="flex items-center justify-between mb-2">
						<span class="text-sm font-medium">Progress</span>
						<span class="text-sm font-bold">{selectedBatch.progressPercentage}%</span>
					</div>
					<Progress value={parseProgress(selectedBatch.progressPercentage)} class="h-2" />
				</div>

				<!-- Stats Grid -->
				<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
					<div class="p-3 bg-muted rounded-lg">
						<p class="text-xs text-muted-foreground">Processed</p>
						<p class="text-2xl font-bold">{selectedBatch.processedItems}</p>
					</div>
					<div class="p-3 bg-green-50 rounded-lg">
						<p class="text-xs text-green-700">Successful</p>
						<p class="text-2xl font-bold text-green-600">{selectedBatch.successfulItems}</p>
					</div>
					<div class="p-3 bg-red-50 rounded-lg">
						<p class="text-xs text-red-700">Failed</p>
						<p class="text-2xl font-bold text-red-600">{selectedBatch.failedItems}</p>
					</div>
					<div class="p-3 bg-yellow-50 rounded-lg">
						<p class="text-xs text-yellow-700">Skipped</p>
						<p class="text-2xl font-bold text-yellow-600">{selectedBatch.skippedItems}</p>
					</div>
				</div>

				<!-- Timing Info -->
				<div class="mt-6 pt-6 border-t">
					<div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
						{#if selectedBatch.startedAt}
							<div>
								<span class="text-muted-foreground">Started:</span>
								<p class="font-medium mt-1">{formatDate(selectedBatch.startedAt)}</p>
							</div>
						{/if}
						{#if selectedBatch.completedAt}
							<div>
								<span class="text-muted-foreground">Completed:</span>
								<p class="font-medium mt-1">{formatDate(selectedBatch.completedAt)}</p>
							</div>
						{/if}
						{#if selectedBatch.durationMs}
							<div>
								<span class="text-muted-foreground">Duration:</span>
								<p class="font-medium mt-1">{formatDuration(selectedBatch.durationMs)}</p>
							</div>
						{/if}
						{#if selectedBatch.estimatedTimeRemaining}
							<div>
								<span class="text-muted-foreground">Est. Remaining:</span>
								<p class="font-medium mt-1">
									{formatDuration(selectedBatch.estimatedTimeRemaining)}
								</p>
							</div>
						{/if}
					</div>
				</div>

				{#if selectedBatch.triggeredByEmail}
					<div class="mt-4 text-sm text-muted-foreground">
						Triggered by: {selectedBatch.triggeredByEmail}
					</div>
				{/if}

				{#if selectedBatch.errorMessage}
					<Alert variant="destructive" class="mt-4">
						<AlertCircle class="h-4 w-4" />
						<AlertDescription>{selectedBatch.errorMessage}</AlertDescription>
					</Alert>
				{/if}

				{#if selectedBatch.configuration}
					<details class="mt-4">
						<summary class="cursor-pointer text-sm font-medium">View Configuration</summary>
						<pre
							class="text-xs bg-muted border rounded p-3 mt-2 overflow-auto max-h-48">{JSON.stringify(
								selectedBatch.configuration,
								null,
								2
							)}</pre>
					</details>
				{/if}

				{#if selectedBatch.metadata}
					<details class="mt-2">
						<summary class="cursor-pointer text-sm font-medium">View Metadata</summary>
						<pre
							class="text-xs bg-muted border rounded p-3 mt-2 overflow-auto max-h-48">{JSON.stringify(
								selectedBatch.metadata,
								null,
								2
							)}</pre>
					</details>
				{/if}
			</div>
		</div>
	{:else}
		<!-- Overview -->
		<div class="space-y-6">
			<!-- Efficiency Metrics KPI Grid -->
			{#if efficiency}
				<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
					<div class="rounded-lg border bg-background p-4">
						<div class="flex items-center gap-2 mb-2">
							<Package class="h-5 w-5 text-blue-500" />
							<p class="text-sm text-muted-foreground">Total Batches</p>
						</div>
						<p class="text-3xl font-bold">{efficiency.totalBatches}</p>
					</div>

					<div class="rounded-lg border bg-background p-4">
						<p class="text-sm text-muted-foreground mb-2">Total Items</p>
						<p class="text-3xl font-bold">{efficiency.totalItems}</p>
					</div>

					<div class="rounded-lg border bg-background p-4">
						<div class="flex items-center gap-2 mb-2">
							<CheckCircle2 class="h-5 w-5 text-green-500" />
							<p class="text-sm text-muted-foreground">Successful</p>
						</div>
						<p class="text-3xl font-bold text-green-600">{efficiency.totalSuccessful}</p>
					</div>

					<div class="rounded-lg border bg-background p-4">
						<div class="flex items-center gap-2 mb-2">
							<AlertCircle class="h-5 w-5 text-red-500" />
							<p class="text-sm text-muted-foreground">Failed</p>
						</div>
						<p class="text-3xl font-bold text-red-600">{efficiency.totalFailed}</p>
					</div>

					<div class="rounded-lg border bg-background p-4">
						<div class="flex items-center gap-2 mb-2">
							<TrendingUp class="h-5 w-5 text-purple-500" />
							<p class="text-sm text-muted-foreground">Avg Batch Size</p>
						</div>
						<p class="text-3xl font-bold">{efficiency.avgBatchSize.toFixed(0)}</p>
					</div>

					<div class="rounded-lg border-2 border-green-200 bg-green-50 p-4">
						<div class="flex items-center gap-2 mb-2">
							<Zap class="h-5 w-5 text-green-600" />
							<p class="text-sm text-green-700">API Calls Saved</p>
						</div>
						<p class="text-3xl font-bold text-green-600">{efficiency.apiCallsSaved}</p>
						<p class="text-xs text-green-600 mt-1">
							{efficiency.apiCallReductionPercentage.toFixed(1)}% reduction
						</p>
					</div>
				</div>
			{/if}

			<!-- Filters Toolbar -->
			<div class="rounded-lg border bg-background">
				<div class="flex h-14 items-center gap-4 px-4">
					<p class="text-sm font-medium">Filter:</p>
					<Select
						type="single"
						value={selectedEntityType as any}
						onValueChange={(value: any) => {
							selectedEntityType = value;
							applyFilters();
						}}
					>
						<SelectTrigger class="w-64 h-9">
							<SelectValue placeholder="Select entity type" />
						</SelectTrigger>
						<SelectContent>
							{#each entityTypes as type}
								<SelectItem value={type.value}>{type.label}</SelectItem>
							{/each}
						</SelectContent>
					</Select>
				</div>
			</div>

			<!-- Batch Operations Table -->
			<div class="rounded-lg border bg-background">
				<div class="px-4 py-3 border-b">
					<h2 class="text-base font-semibold">Recent Batch Operations</h2>
					<p class="text-sm text-muted-foreground">Bulk sync operations with progress tracking</p>
				</div>

				{#if batches.length === 0}
					<div class="text-center py-12 text-muted-foreground">
						<Layers class="h-12 w-12 mx-auto mb-3" />
						<p class="font-medium">No batch operations</p>
						<p class="text-sm">Batch operations will appear here when bulk syncs are performed</p>
					</div>
				{:else}
					<div class="overflow-auto max-h-[600px]">
						<table class="w-full">
							<thead class="sticky top-0 z-10 bg-muted/40 backdrop-blur-sm">
								<tr class="border-b">
									<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
										Operation
									</th>
									<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
										Entity
									</th>
									<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
										Direction
									</th>
									<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
										Status
									</th>
									<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
										Progress
									</th>
									<th class="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
										Items
									</th>
									<th class="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
										Success
									</th>
									<th class="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
										Failed
									</th>
									<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
										Started
									</th>
									<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
										Actions
									</th>
								</tr>
							</thead>
							<tbody>
								{#each batches as batch}
									<tr class="border-b hover:bg-muted/30 transition-colors">
										<td class="px-4 py-3">
											<p class="text-sm font-medium capitalize">
												{batch.operationType.replace(/_/g, ' ')}
											</p>
										</td>
										<td class="px-4 py-3">
											<p class="text-sm capitalize">{batch.entityType}</p>
										</td>
										<td class="px-4 py-3">
											{#if batch.direction.toLowerCase() === 'to_quickbooks'}
												<div class="flex items-center gap-1">
													<ArrowUpFromLine class="h-4 w-4 text-blue-500" />
													<span class="text-xs">To QB</span>
												</div>
											{:else}
												<div class="flex items-center gap-1">
													<ArrowDownToLine class="h-4 w-4 text-green-500" />
													<span class="text-xs">From QB</span>
												</div>
											{/if}
										</td>
										<td class="px-4 py-3">
											<div
												class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border {getStatusColor(
													batch.status
												)}"
											>
												{batch.status}
											</div>
										</td>
										<td class="px-4 py-3">
											<div class="flex items-center gap-2">
												<Progress
													value={parseProgress(batch.progressPercentage)}
													class="h-2 w-20"
												/>
												<span class="text-xs font-medium">{batch.progressPercentage}%</span>
											</div>
											{#if batch.estimatedTimeRemaining}
												<p class="text-xs text-muted-foreground flex items-center gap-1 mt-1">
													<Clock class="h-3 w-3" />
													{formatDuration(batch.estimatedTimeRemaining)} left
												</p>
											{/if}
										</td>
										<td class="px-4 py-3 text-right">
											<span class="text-sm font-medium">{batch.totalItems}</span>
										</td>
										<td class="px-4 py-3 text-right">
											<span class="text-sm font-medium text-green-600">{batch.successfulItems}</span
											>
										</td>
										<td class="px-4 py-3 text-right">
											<span class="text-sm font-medium text-red-600">{batch.failedItems}</span>
										</td>
										<td class="px-4 py-3">
											<p class="text-xs text-muted-foreground">
												{formatDate(batch.startedAt)}
											</p>
										</td>
										<td class="px-4 py-3">
											<Button
												onclick={() => viewBatch(batch.id)}
												variant="ghost"
												size="sm"
												class="h-8"
											>
												View
											</Button>
										</td>
									</tr>
									{#if batch.errorMessage}
										<tr class="border-b bg-red-50/50">
											<td colspan="10" class="px-4 py-2">
												<div class="flex items-start gap-2 text-sm">
													<AlertCircle class="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
													<span class="text-red-800">{batch.errorMessage}</span>
												</div>
											</td>
										</tr>
									{/if}
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
