<script lang="ts">
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import {
		AlertCircle,
		CheckCircle2,
		RefreshCw,
		ArrowLeft,
		Clock,
		XCircle,
		RotateCw,
		Skull,
		Activity,
		TrendingUp,
		Zap
	} from '@lucide/svelte';
	import { invalidate, goto } from '$app/navigation';

	let { data } = $props();
	let statistics = $derived(data.statistics);
	let pendingRetries = $derived(data.pendingRetries);
	let deadLetterQueue = $derived(data.deadLetterQueue);
	let selectedOperation = $derived(data.selectedOperation);
	let retryHistory = $derived(data.retryHistory);

	let refreshing = $state(false);

	async function refreshData() {
		refreshing = true;
		await invalidate('app:error-recovery');
		refreshing = false;
	}

	function viewOperation(operationId: string) {
		goto(`?operationId=${operationId}`);
	}

	function backToList() {
		goto('/admin/settings/integrations/errors');
	}

	function getStatusColor(status: string): string {
		switch (status.toLowerCase()) {
			case 'succeeded':
			case 'resolved':
				return 'text-green-600 bg-green-50 border-green-200';
			case 'pending':
			case 'retrying':
				return 'text-blue-600 bg-blue-50 border-blue-200';
			case 'failed':
			case 'dead_letter':
				return 'text-red-600 bg-red-50 border-red-200';
			default:
				return 'text-gray-600 bg-gray-50 border-gray-200';
		}
	}

	function getPriorityVariant(priority: number): 'default' | 'outline' | 'secondary' | 'destructive' {
		if (priority >= 8) return 'destructive';
		if (priority >= 5) return 'secondary';
		return 'outline';
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
</script>

<div class="container mx-auto py-8 px-4">
	<!-- Header -->
	<div class="mb-6 flex items-center justify-between">
		<div class="flex items-center gap-4">
			{#if selectedOperation}
				<Button onclick={backToList} variant="outline" size="sm">
					<ArrowLeft class="h-4 w-4 mr-2" />
					Back to Overview
				</Button>
			{/if}
			<div>
				<h1 class="text-2xl font-bold flex items-center gap-2">
					<RotateCw class="h-6 w-6" />
					{selectedOperation ? 'Operation Details' : 'Error Recovery & Retry Management'}
				</h1>
				<p class="text-sm text-muted-foreground mt-1">
					{selectedOperation
						? 'Detailed retry history and error information'
						: 'Automatic retry system for failed sync operations'}
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

	{#if selectedOperation}
		<!-- Operation Detail View -->
		<div class="space-y-6">
			<!-- Operation Summary -->
			<Card>
				<CardHeader>
					<div class="flex items-start justify-between">
						<div>
							<CardTitle>Operation Summary</CardTitle>
							<CardDescription>{formatDate(selectedOperation.createdAt)}</CardDescription>
						</div>
						<div
							class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border {getStatusColor(
								selectedOperation.status
							)}"
						>
							{#if selectedOperation.movedToDeadLetter}
								<Skull class="h-4 w-4 mr-2" />
								Dead Letter
							{:else if selectedOperation.resolvedAt}
								<CheckCircle2 class="h-4 w-4 mr-2" />
								Resolved
							{:else}
								<RotateCw class="h-4 w-4 mr-2" />
								{selectedOperation.status}
							{/if}
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div class="grid grid-cols-2 md:grid-cols-4 gap-6">
						<div>
							<p class="text-sm text-muted-foreground">Operation Type</p>
							<p class="text-lg font-medium capitalize">
								{selectedOperation.operationType.replace(/_/g, ' ')}
							</p>
						</div>
						<div>
							<p class="text-sm text-muted-foreground">Entity Type</p>
							<p class="text-lg font-medium capitalize">{selectedOperation.entityType}</p>
						</div>
						<div>
							<p class="text-sm text-muted-foreground">Retry Count</p>
							<p class="text-lg font-bold">
								{selectedOperation.retryCount} / {selectedOperation.maxRetries}
							</p>
						</div>
						<div>
							<p class="text-sm text-muted-foreground">Priority</p>
							<Badge variant={getPriorityVariant(selectedOperation.priority)}>
								{selectedOperation.priority}
							</Badge>
						</div>
					</div>

					<div class="mt-6 pt-6 border-t">
						<div class="grid grid-cols-2 gap-4 text-sm">
							{#if selectedOperation.entityId}
								<div>
									<span class="text-muted-foreground">Entity ID:</span>
									<span class="ml-2 font-mono text-xs">{selectedOperation.entityId}</span>
								</div>
							{/if}
							{#if selectedOperation.quickbooksId}
								<div>
									<span class="text-muted-foreground">QuickBooks ID:</span>
									<span class="ml-2 font-mono text-xs">{selectedOperation.quickbooksId}</span>
								</div>
							{/if}
							{#if selectedOperation.nextRetryAt}
								<div>
									<span class="text-muted-foreground">Next Retry:</span>
									<span class="ml-2 font-medium">{formatDate(selectedOperation.nextRetryAt)}</span>
								</div>
							{/if}
							{#if selectedOperation.recoveryStrategy}
								<div>
									<span class="text-muted-foreground">Strategy:</span>
									<span class="ml-2 font-medium capitalize">
										{selectedOperation.recoveryStrategy.replace(/_/g, ' ')}
									</span>
								</div>
							{/if}
						</div>
					</div>

					<!-- Error Details -->
					<div class="mt-6">
						<Alert variant="destructive">
							<AlertCircle class="h-4 w-4" />
							<AlertDescription>
								<div>
									<span class="font-medium">
										{selectedOperation.errorType}
										{#if selectedOperation.errorCode}
											({selectedOperation.errorCode})
										{/if}:
									</span>
									{selectedOperation.errorMessage}
								</div>
							</AlertDescription>
						</Alert>
					</div>

					{#if selectedOperation.errorDetails}
						<div class="mt-4">
							<p class="text-sm font-medium mb-2">Error Details:</p>
							<pre
								class="text-xs bg-muted border rounded p-3 overflow-auto max-h-48">{JSON.stringify(
									selectedOperation.errorDetails,
									null,
									2
								)}</pre>
						</div>
					{/if}

					{#if selectedOperation.movedToDeadLetter && selectedOperation.deadLetterReason}
						<div class="mt-4 p-3 bg-red-50 border border-red-200 rounded">
							<p class="text-sm font-medium text-red-900">Dead Letter Queue Reason:</p>
							<p class="text-sm text-red-800 mt-1">{selectedOperation.deadLetterReason}</p>
						</div>
					{/if}

					{#if selectedOperation.resolvedAt}
						<div class="mt-4 p-3 bg-green-50 border border-green-200 rounded">
							<p class="text-sm font-medium text-green-900">Resolved</p>
							<p class="text-sm text-green-800 mt-1">
								By: {selectedOperation.resolvedBy || 'System'} •
								{formatDate(selectedOperation.resolvedAt)}
							</p>
							{#if selectedOperation.resolutionNotes}
								<p class="text-sm text-green-800 mt-1">{selectedOperation.resolutionNotes}</p>
							{/if}
						</div>
					{/if}
				</CardContent>
			</Card>

			<!-- Retry History -->
			<Card>
				<CardHeader>
					<CardTitle>Retry History</CardTitle>
					<CardDescription>
						{retryHistory.length} retry attempt{retryHistory.length !== 1 ? 's' : ''}
					</CardDescription>
				</CardHeader>
				<CardContent>
					{#if retryHistory.length === 0}
						<div class="text-center py-8 text-muted-foreground">
							<Clock class="h-10 w-10 mx-auto mb-2" />
							<p>No retry attempts yet</p>
						</div>
					{:else}
						<div class="space-y-3">
							{#each retryHistory as retry}
								<div class="border rounded-lg p-4">
									<div class="flex items-start justify-between mb-2">
										<div class="flex-1">
											<div class="flex items-center gap-2 mb-1">
												<p class="font-medium">Retry #{retry.retryNumber}</p>
												<div
													class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border {getStatusColor(
														retry.status
													)}"
												>
													{retry.status}
												</div>
											</div>
											<p class="text-sm text-muted-foreground">
												{formatDate(retry.createdAt)}
											</p>
										</div>
										{#if retry.durationMs}
											<div class="text-right">
												<p class="text-sm font-medium">{formatDuration(retry.durationMs)}</p>
												{#if retry.backoffDuration}
													<p class="text-xs text-muted-foreground">
														Backoff: {formatDuration(retry.backoffDuration)}
													</p>
												{/if}
											</div>
										{/if}
									</div>

									{#if retry.errorMessage}
										<div class="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm">
											<p class="text-red-800">{retry.errorMessage}</p>
										</div>
									{/if}

									{#if retry.errorDetails}
										<details class="mt-2">
											<summary class="text-sm cursor-pointer text-muted-foreground hover:text-foreground">
												View error details
											</summary>
											<pre
												class="text-xs bg-muted border rounded p-2 mt-2 overflow-auto max-h-32">{JSON.stringify(
													retry.errorDetails,
													null,
													2
												)}</pre>
										</details>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</CardContent>
			</Card>
		</div>
	{:else}
		<!-- Overview -->
		<div class="space-y-6">
			<!-- Statistics -->
			{#if statistics}
				<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
					<Card>
						<CardHeader class="pb-2">
							<CardDescription>Total Failed</CardDescription>
						</CardHeader>
						<CardContent>
							<p class="text-3xl font-bold">{statistics.totalFailedOperations}</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader class="pb-2">
							<CardDescription>Pending Retries</CardDescription>
						</CardHeader>
						<CardContent>
							<div class="flex items-center gap-2">
								<Clock class="h-8 w-8 text-yellow-500" />
								<p class="text-3xl font-bold">{statistics.pendingRetries}</p>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader class="pb-2">
							<CardDescription>Currently Retrying</CardDescription>
						</CardHeader>
						<CardContent>
							<div class="flex items-center gap-2">
								<Activity class="h-8 w-8 text-blue-500 animate-pulse" />
								<p class="text-3xl font-bold">{statistics.currentlyRetrying}</p>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader class="pb-2">
							<CardDescription>Succeeded</CardDescription>
						</CardHeader>
						<CardContent>
							<div class="flex items-center gap-2">
								<CheckCircle2 class="h-8 w-8 text-green-500" />
								<p class="text-3xl font-bold">{statistics.succeededOperations}</p>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader class="pb-2">
							<CardDescription>Dead Letter</CardDescription>
						</CardHeader>
						<CardContent>
							<div class="flex items-center gap-2">
								<Skull class="h-8 w-8 text-red-500" />
								<p class="text-3xl font-bold">{statistics.deadLetterOperations}</p>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader class="pb-2">
							<CardDescription>Avg Retries</CardDescription>
						</CardHeader>
						<CardContent>
							<div class="flex items-center gap-2">
								<TrendingUp class="h-8 w-8 text-purple-500" />
								<p class="text-3xl font-bold">{statistics.averageRetryCount.toFixed(1)}</p>
							</div>
						</CardContent>
					</Card>
				</div>
			{/if}

			<!-- Tabs for Pending and Dead Letter -->
			<Tabs value="pending" class="w-full">
				<TabsList class="grid w-full grid-cols-2">
					<TabsTrigger value="pending">
						Pending Retries ({pendingRetries.length})
					</TabsTrigger>
					<TabsTrigger value="dead-letter">
						Dead Letter Queue ({deadLetterQueue.length})
					</TabsTrigger>
				</TabsList>

				<!-- Pending Retries Tab -->
				<TabsContent value="pending">
					<Card>
						<CardHeader>
							<CardTitle>Pending Retry Operations</CardTitle>
							<CardDescription>Operations waiting for automatic retry</CardDescription>
						</CardHeader>
						<CardContent>
							{#if pendingRetries.length === 0}
								<div class="text-center py-12 text-muted-foreground">
									<CheckCircle2 class="h-12 w-12 mx-auto mb-3 text-green-500" />
									<p class="font-medium">No pending retries</p>
									<p class="text-sm">All operations are being processed successfully</p>
								</div>
							{:else}
								<div class="space-y-3">
									{#each pendingRetries as operation}
										<button
											onclick={() => viewOperation(operation.id)}
											class="w-full text-left border rounded-lg p-4 hover:bg-muted/30 transition-colors"
										>
											<div class="flex items-start justify-between mb-2">
												<div class="flex-1">
													<div class="flex items-center gap-2 mb-1">
														<p class="font-medium capitalize">
															{operation.operationType.replace(/_/g, ' ')} •
															{operation.entityType}
														</p>
														<Badge variant={getPriorityVariant(operation.priority)}>
															Priority {operation.priority}
														</Badge>
													</div>
													<p class="text-sm text-muted-foreground">{operation.errorMessage}</p>
												</div>
												<div class="text-right">
													<p class="text-sm font-medium">
														{operation.retryCount} / {operation.maxRetries} attempts
													</p>
													{#if operation.nextRetryAt}
														<p class="text-xs text-muted-foreground">
															Next: {formatDate(operation.nextRetryAt)}
														</p>
													{/if}
												</div>
											</div>

											<div class="flex items-center gap-4 text-xs text-muted-foreground mt-2">
												<span>
													{operation.errorType}
													{#if operation.errorCode}
														({operation.errorCode})
													{/if}
												</span>
												{#if operation.recoveryStrategy}
													<span>Strategy: {operation.recoveryStrategy.replace(/_/g, ' ')}</span>
												{/if}
											</div>
										</button>
									{/each}
								</div>
							{/if}
						</CardContent>
					</Card>
				</TabsContent>

				<!-- Dead Letter Queue Tab -->
				<TabsContent value="dead-letter">
					<Card>
						<CardHeader>
							<CardTitle>Dead Letter Queue</CardTitle>
							<CardDescription>Operations that exceeded maximum retry attempts</CardDescription>
						</CardHeader>
						<CardContent>
							{#if deadLetterQueue.length === 0}
								<div class="text-center py-12 text-muted-foreground">
									<CheckCircle2 class="h-12 w-12 mx-auto mb-3 text-green-500" />
									<p class="font-medium">No dead letter operations</p>
									<p class="text-sm">No operations have been moved to dead letter queue</p>
								</div>
							{:else}
								<div class="space-y-3">
									{#each deadLetterQueue as operation}
										<button
											onclick={() => viewOperation(operation.id)}
											class="w-full text-left border border-red-200 rounded-lg p-4 bg-red-50/50 hover:bg-red-50 transition-colors"
										>
											<div class="flex items-start justify-between mb-2">
												<div class="flex-1">
													<div class="flex items-center gap-2 mb-1">
														<Skull class="h-4 w-4 text-red-600" />
														<p class="font-medium capitalize">
															{operation.operationType.replace(/_/g, ' ')} •
															{operation.entityType}
														</p>
													</div>
													<p class="text-sm text-red-800">{operation.errorMessage}</p>
												</div>
												<div class="text-right">
													<p class="text-sm font-medium text-red-600">
														{operation.retryCount} attempts
													</p>
													{#if operation.resolvedAt}
														<p class="text-xs text-green-600">Resolved</p>
													{/if}
												</div>
											</div>

											{#if operation.deadLetterReason}
												<div class="mt-2 p-2 bg-red-100 border border-red-300 rounded text-sm">
													<p class="text-red-900">{operation.deadLetterReason}</p>
												</div>
											{/if}

											<div class="flex items-center gap-4 text-xs text-muted-foreground mt-2">
												<span>Failed: {formatDate(operation.createdAt)}</span>
												{#if operation.resolvedAt}
													<span class="text-green-600">
														Resolved: {formatDate(operation.resolvedAt)}
													</span>
												{/if}
											</div>
										</button>
									{/each}
								</div>
							{/if}
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	{/if}
</div>
