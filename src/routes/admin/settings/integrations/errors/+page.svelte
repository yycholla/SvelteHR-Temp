<script lang="ts">
	import {
		AlertCircle,
		CheckCircle2,
		RefreshCw,
		ArrowLeft,
		Clock,
		RotateCw,
		Skull,
		Activity,
		TrendingUp
	} from '@lucide/svelte';
	import { invalidate, goto } from '$app/navigation';

	let { data } = $props();
	let statistics = $derived(data.statistics);
	let pendingRetries = $derived(data.pendingRetries);
	let deadLetterQueue = $derived(data.deadLetterQueue);
	let selectedOperation = $derived(data.selectedOperation);
	let retryHistory = $derived(data.retryHistory);

	let refreshing = $state(false);
	let activeTab = $state<'pending' | 'dead-letter'>('pending');

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
				return 'bg-green-100 text-green-700';
			case 'pending':
			case 'retrying':
				return 'bg-blue-100 text-blue-700';
			case 'failed':
			case 'dead_letter':
				return 'bg-red-100 text-red-700';
			default:
				return 'bg-gray-100 text-gray-700';
		}
	}

	function getPriorityColor(priority: number): string {
		if (priority >= 8) return 'bg-red-100 text-red-700';
		if (priority >= 5) return 'bg-orange-100 text-orange-700';
		return 'bg-gray-100 text-gray-700';
	}

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return '—';
		const date = new Date(dateStr);
		return date.toLocaleString();
	}

	function formatDuration(ms: number | null): string {
		if (!ms) return '—';
		if (ms < 1000) return `${ms}ms`;
		const seconds = Math.floor(ms / 1000);
		if (seconds < 60) return `${seconds}s`;
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return `${minutes}m ${remainingSeconds}s`;
	}
</script>

<div class="flex flex-col h-full overflow-hidden bg-background">
	<!-- Toolbar -->
	<header class="flex-shrink-0 flex items-center justify-between h-14 px-4 border-b bg-background z-20">
		<div class="flex items-center gap-4 flex-1">
			{#if selectedOperation}
				<button
					onclick={backToList}
					class="flex items-center gap-1.5 h-8 px-3 rounded-sm border border-input bg-background text-xs hover:bg-accent transition-colors"
				>
					<ArrowLeft class="h-3.5 w-3.5" />
					Back
				</button>
				<div class="h-4 w-px bg-border"></div>
			{/if}
			<h1 class="text-sm font-semibold tracking-tight">
				{selectedOperation ? 'Operation Details' : 'Error Recovery & Retry Management'}
			</h1>
		</div>
		<button
			onclick={refreshData}
			disabled={refreshing}
			class="flex items-center gap-1.5 h-8 px-3 rounded-sm border border-input bg-background text-xs hover:bg-accent transition-colors disabled:opacity-50"
		>
			<RefreshCw class="h-3.5 w-3.5 {refreshing ? 'animate-spin' : ''}" />
			Refresh
		</button>
	</header>

	<!-- Error message -->
	{#if data.error}
		<div class="flex-shrink-0 p-4 pb-0">
			<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium border border-destructive/20">
				{data.error}
			</div>
		</div>
	{/if}

	{#if selectedOperation}
		<!-- Operation Detail View -->
		<div class="flex-1 overflow-auto min-h-0 relative bg-background p-4 space-y-4">
			<!-- Operation Summary -->
			<div class="border rounded-sm bg-background">
				<div class="flex items-start justify-between p-3 border-b">
					<div>
						<h2 class="text-xs font-semibold">Operation Summary</h2>
						<p class="text-[10px] text-muted-foreground mt-0.5">{formatDate(selectedOperation.createdAt)}</p>
					</div>
					<span
						class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium {getStatusColor(
							selectedOperation.status
						)}"
					>
						{#if selectedOperation.movedToDeadLetter}
							<Skull class="h-3 w-3 mr-1" />
							Dead Letter
						{:else if selectedOperation.resolvedAt}
							<CheckCircle2 class="h-3 w-3 mr-1" />
							Resolved
						{:else}
							<RotateCw class="h-3 w-3 mr-1" />
							{selectedOperation.status}
						{/if}
					</span>
				</div>
				<div class="p-3">
					<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
						<div>
							<p class="text-[10px] text-muted-foreground">Operation Type</p>
							<p class="text-xs font-medium capitalize mt-0.5">
								{selectedOperation.operationType.replace(/_/g, ' ')}
							</p>
						</div>
						<div>
							<p class="text-[10px] text-muted-foreground">Entity Type</p>
							<p class="text-xs font-medium capitalize mt-0.5">{selectedOperation.entityType}</p>
						</div>
						<div>
							<p class="text-[10px] text-muted-foreground">Retry Count</p>
							<p class="text-xs font-bold mt-0.5">
								{selectedOperation.retryCount} / {selectedOperation.maxRetries}
							</p>
						</div>
						<div>
							<p class="text-[10px] text-muted-foreground">Priority</p>
							<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium mt-0.5 {getPriorityColor(selectedOperation.priority)}">
								{selectedOperation.priority}
							</span>
						</div>
					</div>

					<div class="mt-3 pt-3 border-t">
						<div class="grid grid-cols-2 gap-2 text-xs">
							{#if selectedOperation.entityId}
								<div>
									<span class="text-muted-foreground">Entity ID:</span>
									<span class="ml-2 font-mono text-[10px]">{selectedOperation.entityId}</span>
								</div>
							{/if}
							{#if selectedOperation.quickbooksId}
								<div>
									<span class="text-muted-foreground">QuickBooks ID:</span>
									<span class="ml-2 font-mono text-[10px]">{selectedOperation.quickbooksId}</span>
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
					<div class="mt-3">
						<div class="rounded-md bg-destructive/10 p-2 text-xs text-destructive border border-destructive/20">
							<div class="flex items-start gap-2">
								<AlertCircle class="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
								<div>
									<span class="font-medium">
										{selectedOperation.errorType}
										{#if selectedOperation.errorCode}
											({selectedOperation.errorCode})
										{/if}:
									</span>
									<span class="block mt-0.5">{selectedOperation.errorMessage}</span>
								</div>
							</div>
						</div>
					</div>

					{#if selectedOperation.errorDetails}
						<div class="mt-3">
							<p class="text-[10px] font-medium mb-1">Error Details:</p>
							<pre
								class="text-[10px] bg-muted border rounded p-2 overflow-auto max-h-32">{JSON.stringify(
									selectedOperation.errorDetails,
									null,
									2
								)}</pre>
						</div>
					{/if}

					{#if selectedOperation.movedToDeadLetter && selectedOperation.deadLetterReason}
						<div class="mt-3 p-2 bg-red-50 border border-red-200 rounded">
							<p class="text-[10px] font-medium text-red-900">Dead Letter Queue Reason:</p>
							<p class="text-xs text-red-800 mt-0.5">{selectedOperation.deadLetterReason}</p>
						</div>
					{/if}

					{#if selectedOperation.resolvedAt}
						<div class="mt-3 p-2 bg-green-50 border border-green-200 rounded">
							<p class="text-[10px] font-medium text-green-900">Resolved</p>
							<p class="text-xs text-green-800 mt-0.5">
								By: {selectedOperation.resolvedBy || 'System'} •
								{formatDate(selectedOperation.resolvedAt)}
							</p>
							{#if selectedOperation.resolutionNotes}
								<p class="text-xs text-green-800 mt-0.5">{selectedOperation.resolutionNotes}</p>
							{/if}
						</div>
					{/if}
				</div>
			</div>

			<!-- Retry History -->
			<div class="border rounded-sm bg-background">
				<div class="p-3 border-b">
					<h2 class="text-xs font-semibold">Retry History</h2>
					<p class="text-[10px] text-muted-foreground mt-0.5">
						{retryHistory.length} retry attempt{retryHistory.length !== 1 ? 's' : ''}
					</p>
				</div>
				<div class="p-3">
					{#if retryHistory.length === 0}
						<div class="text-center py-8 text-muted-foreground">
							<Clock class="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
							<p class="text-xs">No retry attempts yet</p>
						</div>
					{:else}
						<div class="space-y-2">
							{#each retryHistory as retry}
								<div class="border rounded p-2">
									<div class="flex items-start justify-between mb-1">
										<div class="flex-1">
											<div class="flex items-center gap-1.5 mb-0.5">
												<p class="font-medium text-xs">Retry #{retry.retryNumber}</p>
												<span
													class="inline-flex items-center px-1 py-0.5 rounded text-[10px] font-medium {getStatusColor(
														retry.status
													)}"
												>
													{retry.status}
												</span>
											</div>
											<p class="text-[10px] text-muted-foreground">
												{formatDate(retry.createdAt)}
											</p>
										</div>
										{#if retry.durationMs}
											<div class="text-right">
												<p class="text-xs font-medium">{formatDuration(retry.durationMs)}</p>
												{#if retry.backoffDuration}
													<p class="text-[10px] text-muted-foreground">
														Backoff: {formatDuration(retry.backoffDuration)}
													</p>
												{/if}
											</div>
										{/if}
									</div>

									{#if retry.errorMessage}
										<div class="mt-1 p-1.5 bg-red-50 border border-red-200 rounded text-xs">
											<p class="text-red-800">{retry.errorMessage}</p>
										</div>
									{/if}

									{#if retry.errorDetails}
										<details class="mt-1">
											<summary class="text-[10px] cursor-pointer text-muted-foreground hover:text-foreground">
												View error details
											</summary>
											<pre
												class="text-[10px] bg-muted border rounded p-1.5 mt-1 overflow-auto max-h-24">{JSON.stringify(
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
				</div>
			</div>
		</div>
	{:else}
		<!-- Overview -->
		<!-- KPI Grid -->
		{#if statistics}
			<div class="flex-shrink-0 p-4 pb-0">
				<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
					<div class="border rounded-sm bg-background p-3 h-32 flex flex-col justify-between">
						<p class="text-[10px] text-muted-foreground uppercase tracking-wider">Total Failed</p>
						<p class="text-2xl font-bold">{statistics.totalFailedOperations}</p>
					</div>

					<div class="border rounded-sm bg-background p-3 h-32 flex flex-col justify-between">
						<p class="text-[10px] text-muted-foreground uppercase tracking-wider">Pending Retries</p>
						<div class="flex items-end gap-2">
							<Clock class="h-6 w-6 text-yellow-500" />
							<p class="text-2xl font-bold">{statistics.pendingRetries}</p>
						</div>
					</div>

					<div class="border rounded-sm bg-background p-3 h-32 flex flex-col justify-between">
						<p class="text-[10px] text-muted-foreground uppercase tracking-wider">Currently Retrying</p>
						<div class="flex items-end gap-2">
							<Activity class="h-6 w-6 text-blue-500 animate-pulse" />
							<p class="text-2xl font-bold">{statistics.currentlyRetrying}</p>
						</div>
					</div>

					<div class="border rounded-sm bg-background p-3 h-32 flex flex-col justify-between">
						<p class="text-[10px] text-muted-foreground uppercase tracking-wider">Succeeded</p>
						<div class="flex items-end gap-2">
							<CheckCircle2 class="h-6 w-6 text-green-500" />
							<p class="text-2xl font-bold">{statistics.succeededOperations}</p>
						</div>
					</div>

					<div class="border rounded-sm bg-background p-3 h-32 flex flex-col justify-between">
						<p class="text-[10px] text-muted-foreground uppercase tracking-wider">Dead Letter</p>
						<div class="flex items-end gap-2">
							<Skull class="h-6 w-6 text-red-500" />
							<p class="text-2xl font-bold">{statistics.deadLetterOperations}</p>
						</div>
					</div>

					<div class="border rounded-sm bg-background p-3 h-32 flex flex-col justify-between">
						<p class="text-[10px] text-muted-foreground uppercase tracking-wider">Avg Retries</p>
						<div class="flex items-end gap-2">
							<TrendingUp class="h-6 w-6 text-purple-500" />
							<p class="text-2xl font-bold">{statistics.averageRetryCount.toFixed(1)}</p>
						</div>
					</div>
				</div>
			</div>
		{/if}

			<!-- Tab Bar -->
		<div class="flex-shrink-0 border-b bg-muted/5">
			<div class="flex">
				<button
					onclick={() => (activeTab = 'pending')}
					class="px-4 py-2 text-xs font-medium border-b-2 transition-colors {activeTab === 'pending'
						? 'border-primary text-foreground'
						: 'border-transparent text-muted-foreground hover:text-foreground'}"
				>
					Pending Retries ({pendingRetries.length})
				</button>
				<button
					onclick={() => (activeTab = 'dead-letter')}
					class="px-4 py-2 text-xs font-medium border-b-2 transition-colors {activeTab === 'dead-letter'
						? 'border-primary text-foreground'
						: 'border-transparent text-muted-foreground hover:text-foreground'}"
				>
					Dead Letter Queue ({deadLetterQueue.length})
				</button>
			</div>
		</div>

		<!-- Table Content -->
		<div class="flex-1 overflow-auto min-h-0 relative bg-background">
			{#if activeTab === 'pending'}
				<!-- Pending Retries Table -->
				<table class="w-full text-sm text-left border-collapse">
					<thead class="sticky top-0 z-10 bg-muted/40 backdrop-blur-sm border-b">
						<tr>
							<th class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0">Operation</th>
							<th class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0">Error</th>
							<th class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0">Retries</th>
							<th class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0">Priority</th>
							<th class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Next Retry</th>
						</tr>
					</thead>
					<tbody class="divide-y">
						{#if pendingRetries.length === 0}
							<tr>
								<td colspan="5" class="px-4 py-12 text-center">
									<CheckCircle2 class="h-10 w-10 mx-auto mb-2 text-green-500" />
									<p class="text-xs font-medium">No pending retries</p>
									<p class="text-[10px] text-muted-foreground mt-0.5">All operations are being processed successfully</p>
								</td>
							</tr>
						{:else}
							{#each pendingRetries as operation}
								<tr
									class="hover:bg-muted/30 cursor-pointer transition-colors group"
									onclick={() => viewOperation(operation.id)}
								>
									<td class="px-3 py-1.5 border-r last:border-r-0">
										<div class="truncate max-w-[200px]">
											<span class="font-medium text-xs block capitalize">
												{operation.operationType.replace(/_/g, ' ')}
											</span>
											<span class="text-[10px] text-muted-foreground block truncate capitalize">
												{operation.entityType}
											</span>
										</div>
									</td>
									<td class="px-3 py-1.5 border-r last:border-r-0 text-xs">
										<div class="truncate max-w-xs">
											<span class="block truncate">{operation.errorMessage}</span>
											<span class="text-[10px] text-muted-foreground block">
												{operation.errorType}
												{#if operation.errorCode}
													({operation.errorCode})
												{/if}
											</span>
										</div>
									</td>
									<td class="px-3 py-1.5 border-r last:border-r-0 text-xs font-bold">
										{operation.retryCount} / {operation.maxRetries}
									</td>
									<td class="px-3 py-1.5 border-r last:border-r-0">
										<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium {getPriorityColor(operation.priority)}">
											{operation.priority}
										</span>
									</td>
									<td class="px-3 py-1.5 text-xs text-muted-foreground">
										{formatDate(operation.nextRetryAt)}
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			{:else}
				<!-- Dead Letter Queue Table -->
				<table class="w-full text-sm text-left border-collapse">
					<thead class="sticky top-0 z-10 bg-muted/40 backdrop-blur-sm border-b">
						<tr>
							<th class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0">Operation</th>
							<th class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0">Error</th>
							<th class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0">Attempts</th>
							<th class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0">Reason</th>
							<th class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Status</th>
						</tr>
					</thead>
					<tbody class="divide-y">
						{#if deadLetterQueue.length === 0}
							<tr>
								<td colspan="5" class="px-4 py-12 text-center">
									<CheckCircle2 class="h-10 w-10 mx-auto mb-2 text-green-500" />
									<p class="text-xs font-medium">No dead letter operations</p>
									<p class="text-[10px] text-muted-foreground mt-0.5">No operations have been moved to dead letter queue</p>
								</td>
							</tr>
						{:else}
							{#each deadLetterQueue as operation}
								<tr
									class="hover:bg-muted/30 cursor-pointer transition-colors group"
									onclick={() => viewOperation(operation.id)}
								>
									<td class="px-3 py-1.5 border-r last:border-r-0">
										<div class="truncate max-w-[200px]">
											<div class="flex items-center gap-1.5">
												<Skull class="h-3 w-3 text-red-600 flex-shrink-0" />
												<span class="font-medium text-xs capitalize truncate">
													{operation.operationType.replace(/_/g, ' ')}
												</span>
											</div>
											<span class="text-[10px] text-muted-foreground block truncate capitalize">
												{operation.entityType}
											</span>
										</div>
									</td>
									<td class="px-3 py-1.5 border-r last:border-r-0 text-xs">
										<div class="truncate max-w-xs">
											<span class="block truncate text-red-800">{operation.errorMessage}</span>
											<span class="text-[10px] text-muted-foreground block">
												{operation.errorType}
												{#if operation.errorCode}
													({operation.errorCode})
												{/if}
											</span>
										</div>
									</td>
									<td class="px-3 py-1.5 border-r last:border-r-0 text-xs font-bold text-red-600">
										{operation.retryCount}
									</td>
									<td class="px-3 py-1.5 border-r last:border-r-0 text-xs">
										<div class="truncate max-w-xs text-red-900">
											{operation.deadLetterReason || '—'}
										</div>
									</td>
									<td class="px-3 py-1.5 text-xs">
										{#if operation.resolvedAt}
											<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700">
												Resolved
											</span>
										{:else}
											<span class="text-[10px] text-muted-foreground">
												{formatDate(operation.createdAt)}
											</span>
										{/if}
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			{/if}
		</div>
	{/if}
</div>
