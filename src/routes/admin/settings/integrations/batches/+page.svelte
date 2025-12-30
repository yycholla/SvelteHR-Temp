<script lang="ts">
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
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

<div class="container mx-auto py-8 px-4">
	<!-- Header -->
	<div class="mb-6 flex items-center justify-between">
		<div class="flex items-center gap-4">
			{#if selectedBatch}
				<Button onclick={backToList} variant="outline" size="sm">
					<ArrowLeft class="h-4 w-4 mr-2" />
					Back to Batches
				</Button>
			{/if}
			<div>
				<h1 class="text-2xl font-bold flex items-center gap-2">
					<Layers class="h-6 w-6" />
					{selectedBatch ? 'Batch Operation Details' : 'Batch Operations'}
				</h1>
				<p class="text-sm text-muted-foreground mt-1">
					{selectedBatch
						? 'Detailed batch processing information'
						: 'Bulk sync operations with API optimization tracking'}
				</p>
			</div>
		</div>
		<Button onclick={refreshData} disabled={refreshing} variant="outline" size="sm">
			<RefreshCw class="h-4 w-4 mr-2 {refreshing ? 'animate-spin' : ''}" />
			Refresh
		</Button>
	</div>

	{#if data.error}
		<Alert variant="destructive" class="mb-6">
			<AlertCircle class="h-4 w-4" />
			<AlertDescription>{data.error}</AlertDescription>
		</Alert>
	{/if}

	{#if selectedBatch}
		<!-- Batch Detail View -->
		<div class="space-y-6">
			<!-- Batch Summary -->
			<Card>
				<CardHeader>
					<div class="flex items-start justify-between">
						<div>
							<CardTitle>Batch Operation</CardTitle>
							<CardDescription>{formatDate(selectedBatch.createdAt)}</CardDescription>
						</div>
						<div
							class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border {getStatusColor(
								selectedBatch.status
							)}"
						>
							{selectedBatch.status}
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div class="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
						<div>
							<p class="text-sm text-muted-foreground">Operation</p>
							<p class="text-lg font-medium capitalize">
								{selectedBatch.operationType.replace(/_/g, ' ')}
							</p>
						</div>
						<div>
							<p class="text-sm text-muted-foreground">Entity Type</p>
							<p class="text-lg font-medium capitalize">{selectedBatch.entityType}</p>
						</div>
						<div>
							<p class="text-sm text-muted-foreground">Direction</p>
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
						<div>
							<p class="text-sm text-muted-foreground">Total Items</p>
							<p class="text-2xl font-bold">{selectedBatch.totalItems}</p>
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
				</CardContent>
			</Card>
		</div>
	{:else}
		<!-- Overview -->
		<div class="space-y-6">
			<!-- Efficiency Metrics -->
			{#if efficiency}
				<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
					<Card>
						<CardHeader class="pb-2">
							<CardDescription>Total Batches</CardDescription>
						</CardHeader>
						<CardContent>
							<div class="flex items-center gap-2">
								<Package class="h-8 w-8 text-blue-500" />
								<p class="text-3xl font-bold">{efficiency.totalBatches}</p>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader class="pb-2">
							<CardDescription>Total Items</CardDescription>
						</CardHeader>
						<CardContent>
							<p class="text-3xl font-bold">{efficiency.totalItems}</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader class="pb-2">
							<CardDescription>Successful</CardDescription>
						</CardHeader>
						<CardContent>
							<div class="flex items-center gap-2">
								<CheckCircle2 class="h-8 w-8 text-green-500" />
								<p class="text-3xl font-bold">{efficiency.totalSuccessful}</p>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader class="pb-2">
							<CardDescription>Failed</CardDescription>
						</CardHeader>
						<CardContent>
							<div class="flex items-center gap-2">
								<AlertCircle class="h-8 w-8 text-red-500" />
								<p class="text-3xl font-bold">{efficiency.totalFailed}</p>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader class="pb-2">
							<CardDescription>Avg Batch Size</CardDescription>
						</CardHeader>
						<CardContent>
							<div class="flex items-center gap-2">
								<TrendingUp class="h-8 w-8 text-purple-500" />
								<p class="text-3xl font-bold">{efficiency.avgBatchSize.toFixed(0)}</p>
							</div>
						</CardContent>
					</Card>

					<Card class="border-2 border-green-200 bg-green-50/50">
						<CardHeader class="pb-2">
							<CardDescription class="text-green-700">API Calls Saved</CardDescription>
						</CardHeader>
						<CardContent>
							<div class="flex items-center gap-2">
								<Zap class="h-8 w-8 text-green-600" />
								<div>
									<p class="text-3xl font-bold text-green-600">{efficiency.apiCallsSaved}</p>
									<p class="text-xs text-green-600">
										{efficiency.apiCallReductionPercentage.toFixed(1)}% reduction
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			{/if}

			<!-- Filters -->
			<Card>
				<CardHeader>
					<CardTitle>Filter Batches</CardTitle>
				</CardHeader>
				<CardContent>
					<Select
						value={selectedEntityType as any}
						onValueChange={(value: any) => {
							selectedEntityType = value;
							applyFilters();
						}}
					>
						<SelectTrigger class="w-full md:w-64">
							<SelectValue placeholder="Select entity type" />
						</SelectTrigger>
						<SelectContent>
							{#each entityTypes as type}
								<SelectItem value={type.value}>{type.label}</SelectItem>
							{/each}
						</SelectContent>
					</Select>
				</CardContent>
			</Card>

			<!-- Batch Operations List -->
			<Card>
				<CardHeader>
					<CardTitle>Recent Batch Operations</CardTitle>
					<CardDescription>Bulk sync operations with progress tracking</CardDescription>
				</CardHeader>
				<CardContent>
					{#if batches.length === 0}
						<div class="text-center py-12 text-muted-foreground">
							<Layers class="h-12 w-12 mx-auto mb-3" />
							<p class="font-medium">No batch operations</p>
							<p class="text-sm">Batch operations will appear here when bulk syncs are performed</p>
						</div>
					{:else}
						<div class="space-y-3">
							{#each batches as batch}
								<button
									onclick={() => viewBatch(batch.id)}
									class="w-full text-left border rounded-lg p-4 hover:bg-muted/30 transition-colors"
								>
									<div class="flex items-start justify-between mb-3">
										<div class="flex-1">
											<div class="flex items-center gap-2 mb-1">
												<p class="font-medium capitalize">
													{batch.operationType.replace(/_/g, ' ')} • {batch.entityType}
												</p>
												<div
													class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border {getStatusColor(
														batch.status
													)}"
												>
													{batch.status}
												</div>
												{#if batch.direction.toLowerCase() === 'to_quickbooks'}
													<ArrowUpFromLine class="h-4 w-4 text-blue-500" />
												{:else}
													<ArrowDownToLine class="h-4 w-4 text-green-500" />
												{/if}
											</div>
											<p class="text-sm text-muted-foreground">
												{batch.totalItems} items • Started {formatDate(batch.startedAt)}
											</p>
										</div>
										<div class="text-right">
											<p class="text-sm font-bold">{batch.progressPercentage}%</p>
											{#if batch.estimatedTimeRemaining}
												<p class="text-xs text-muted-foreground flex items-center gap-1">
													<Clock class="h-3 w-3" />
													{formatDuration(batch.estimatedTimeRemaining)} left
												</p>
											{/if}
										</div>
									</div>

									<Progress value={parseProgress(batch.progressPercentage)} class="h-2 mb-3" />

									<div class="grid grid-cols-4 gap-2 text-xs">
										<div>
											<span class="text-muted-foreground">Processed:</span>
											<span class="ml-1 font-medium">{batch.processedItems}</span>
										</div>
										<div>
											<span class="text-green-600">Success:</span>
											<span class="ml-1 font-medium text-green-600">{batch.successfulItems}</span>
										</div>
										<div>
											<span class="text-red-600">Failed:</span>
											<span class="ml-1 font-medium text-red-600">{batch.failedItems}</span>
										</div>
										<div>
											<span class="text-yellow-600">Skipped:</span>
											<span class="ml-1 font-medium text-yellow-600">{batch.skippedItems}</span>
										</div>
									</div>

									{#if batch.errorMessage}
										<div class="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm">
											<AlertCircle class="inline h-4 w-4 mr-1 text-red-600" />
											<span class="text-red-800">{batch.errorMessage}</span>
										</div>
									{/if}
								</button>
							{/each}
						</div>
					{/if}
				</CardContent>
			</Card>
		</div>
	{/if}
</div>
