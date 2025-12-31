<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { page } from '$app/stores';
	import { Card } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import {
		Select,
		SelectContent,
		SelectItem,
		SelectTrigger,
		SelectValue
	} from '$lib/components/ui/select';
	import {
		RotateCcw,
		AlertCircle,
		CheckCircle,
		Clock,
		User,
		XCircle,
		FileText,
		TrendingUp,
		RefreshCw,
		ChevronDown,
		ChevronUp
	} from '@lucide/svelte';

	let { data } = $props();

	let selectedStatus = $state(data.filters?.status || '');
	let refreshing = $state(false);
	let expandedRequests = $state<Set<string>>(new Set());

	let requests = $derived(data.requests || []);
	let statistics = $derived(data.statistics);
	let selectedRequest = $derived(data.selectedRequest);

	const statusOptions = [
		{ value: '', label: 'All Statuses' },
		{ value: 'pending', label: 'Pending' },
		{ value: 'approved', label: 'Approved' },
		{ value: 'rejected', label: 'Rejected' },
		{ value: 'executing', label: 'Executing' },
		{ value: 'completed', label: 'Completed' },
		{ value: 'failed', label: 'Failed' }
	];

	function getStatusVariant(
		status: string
	): 'default' | 'outline' | 'secondary' | 'destructive' {
		switch (status?.toLowerCase()) {
			case 'completed':
				return 'default';
			case 'approved':
				return 'default';
			case 'pending':
				return 'secondary';
			case 'executing':
				return 'secondary';
			case 'rejected':
			case 'failed':
				return 'destructive';
			default:
				return 'outline';
		}
	}

	function getVerificationVariant(
		status: string
	): 'default' | 'outline' | 'secondary' | 'destructive' {
		switch (status?.toLowerCase()) {
			case 'verified':
				return 'default';
			case 'pending':
				return 'secondary';
			case 'failed':
				return 'destructive';
			default:
				return 'outline';
		}
	}

	function formatDate(dateStr: string): string {
		if (!dateStr) return 'N/A';
		return new Date(dateStr).toLocaleString();
	}

	function formatDuration(ms: number): string {
		if (!ms) return 'N/A';
		if (ms < 1000) return `${ms}ms`;
		return `${(ms / 1000).toFixed(2)}s`;
	}

	async function handleRefresh() {
		refreshing = true;
		await invalidate('app:rollback-requests');
		refreshing = false;
	}

	function handleStatusChange(value: string | undefined) {
		if (value === undefined) return;
		const url = new URL($page.url);
		if (value) {
			url.searchParams.set('status', value);
		} else {
			url.searchParams.delete('status');
		}
		window.location.href = url.toString();
	}

	function toggleExpand(requestId: string) {
		const newSet = new Set(expandedRequests);
		if (newSet.has(requestId)) {
			newSet.delete(requestId);
		} else {
			newSet.add(requestId);
		}
		expandedRequests = newSet;
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Sync Rollback Operations</h1>
			<p class="text-muted-foreground">
				Manage and track data rollback requests for QuickBooks sync
			</p>
		</div>
		<Button onclick={handleRefresh} disabled={refreshing}>
			<RefreshCw class="h-4 w-4 mr-2 {refreshing ? 'animate-spin' : ''}" />
			Refresh
		</Button>
	</div>

	{#if data.error}
		<Alert variant="destructive">
			<AlertCircle class="h-4 w-4" />
			<AlertDescription>{data.error}</AlertDescription>
		</Alert>
	{/if}

	<!-- Statistics -->
	{#if statistics && !selectedRequest}
		<div class="grid gap-4 md:grid-cols-4">
			<Card class="p-4">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Total Requests</p>
						<p class="text-2xl font-bold">{statistics.totalRequests}</p>
					</div>
					<RotateCcw class="h-8 w-8 text-muted-foreground" />
				</div>
			</Card>

			<Card class="p-4">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Pending</p>
						<p class="text-2xl font-bold">{statistics.pendingRequests}</p>
					</div>
					<Clock class="h-8 w-8 text-yellow-500" />
				</div>
			</Card>

			<Card class="p-4">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Success Rate</p>
						<p class="text-2xl font-bold">{statistics.successRate?.toFixed(1)}%</p>
					</div>
					<TrendingUp class="h-8 w-8 text-green-500" />
				</div>
			</Card>

			<Card class="p-4">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Avg Execution</p>
						<p class="text-2xl font-bold">{formatDuration(statistics.avgExecutionTimeMs)}</p>
					</div>
					<Clock class="h-8 w-8 text-blue-500" />
				</div>
			</Card>
		</div>
	{/if}

	<!-- Single Request Detail View -->
	{#if selectedRequest}
		<Card class="p-6">
			<div class="space-y-6">
				<div class="flex items-start justify-between">
					<div>
						<div class="flex items-center gap-3 mb-2">
							<Badge variant={getStatusVariant(selectedRequest.status)}>
								{selectedRequest.status}
							</Badge>
							{#if selectedRequest.verificationStatus}
								<Badge variant={getVerificationVariant(selectedRequest.verificationStatus)}>
									Verification: {selectedRequest.verificationStatus}
								</Badge>
							{/if}
						</div>
						<h2 class="text-2xl font-bold">Rollback Request #{selectedRequest.id.slice(0, 8)}</h2>
						<p class="text-sm text-muted-foreground mt-1">
							{selectedRequest.entityType} - Entity ID: {selectedRequest.entityId}
						</p>
					</div>
					<RotateCcw class="h-8 w-8 text-muted-foreground" />
				</div>

				<div class="grid grid-cols-2 md:grid-cols-3 gap-4">
					<div>
						<p class="text-sm text-muted-foreground">Requested By</p>
						<p class="font-medium">{selectedRequest.requestedByEmail || 'Unknown'}</p>
					</div>
					<div>
						<p class="text-sm text-muted-foreground">Affected Records</p>
						<p class="font-medium">{selectedRequest.affectedRecordsCount || 0}</p>
					</div>
					<div>
						<p class="text-sm text-muted-foreground">Created</p>
						<p class="font-medium">{formatDate(selectedRequest.createdAt)}</p>
					</div>
					{#if selectedRequest.approvedBy}
						<div>
							<p class="text-sm text-muted-foreground">Approved By</p>
							<p class="font-medium">{selectedRequest.approvedByEmail || selectedRequest.approvedBy}</p>
						</div>
					{/if}
					{#if selectedRequest.rejectedBy}
						<div>
							<p class="text-sm text-muted-foreground">Rejected By</p>
							<p class="font-medium">{selectedRequest.rejectedByEmail || selectedRequest.rejectedBy}</p>
						</div>
					{/if}
					{#if selectedRequest.executedAt}
						<div>
							<p class="text-sm text-muted-foreground">Executed At</p>
							<p class="font-medium">{formatDate(selectedRequest.executedAt)}</p>
						</div>
					{/if}
					{#if selectedRequest.executionDurationMs}
						<div>
							<p class="text-sm text-muted-foreground">Execution Duration</p>
							<p class="font-medium">{formatDuration(selectedRequest.executionDurationMs)}</p>
						</div>
					{/if}
				</div>

				{#if selectedRequest.reason}
					<div>
						<h3 class="text-lg font-semibold mb-2">Reason</h3>
						<Alert>
							<AlertCircle class="h-4 w-4" />
							<AlertDescription>{selectedRequest.reason}</AlertDescription>
						</Alert>
					</div>
				{/if}

				{#if selectedRequest.rejectionReason}
					<div>
						<h3 class="text-lg font-semibold mb-2">Rejection Reason</h3>
						<Alert variant="destructive">
							<XCircle class="h-4 w-4" />
							<AlertDescription>{selectedRequest.rejectionReason}</AlertDescription>
						</Alert>
					</div>
				{/if}

				{#if selectedRequest.executionError}
					<div>
						<h3 class="text-lg font-semibold mb-2">Execution Error</h3>
						<Alert variant="destructive">
							<AlertCircle class="h-4 w-4" />
							<AlertDescription>{selectedRequest.executionError}</AlertDescription>
						</Alert>
					</div>
				{/if}

				{#if selectedRequest.verificationErrors && selectedRequest.verificationErrors.length > 0}
					<div>
						<h3 class="text-lg font-semibold mb-3">Verification Errors</h3>
						<div class="space-y-2">
							{#each selectedRequest.verificationErrors as error}
								<Alert variant="destructive">
									<AlertCircle class="h-4 w-4" />
									<AlertDescription>{error}</AlertDescription>
								</Alert>
							{/each}
						</div>
					</div>
				{/if}

				{#if selectedRequest.rollbackPlan}
					<div>
						<h3 class="text-lg font-semibold mb-3">Rollback Plan</h3>
						<pre
							class="bg-muted p-4 rounded-lg overflow-auto text-xs">{JSON.stringify(
								selectedRequest.rollbackPlan,
								null,
								2
							)}</pre>
					</div>
				{/if}

				{#if selectedRequest.rollbackSnapshot}
					<div>
						<h3 class="text-lg font-semibold mb-3">Rollback Snapshot</h3>
						<pre
							class="bg-muted p-4 rounded-lg overflow-auto text-xs">{JSON.stringify(
								selectedRequest.rollbackSnapshot,
								null,
								2
							)}</pre>
					</div>
				{/if}
			</div>
		</Card>
	{:else}
		<!-- Overview: Request List -->
		<Card class="p-4">
			<div class="flex items-center gap-4">
				<div class="flex-1">
					<Select
						type="single"
						value={selectedStatus as any}
						onValueChange={(v: any) => handleStatusChange(v)}
					>
						<SelectTrigger class="w-full">
							<SelectValue placeholder="Select status" />
						</SelectTrigger>
						<SelectContent>
							{#each statusOptions as option}
								<SelectItem value={option.value}>{option.label}</SelectItem>
							{/each}
						</SelectContent>
					</Select>
				</div>
			</div>
		</Card>

		{#if requests.length === 0}
			<Card class="p-8">
				<div class="text-center text-muted-foreground">
					<RotateCcw class="h-12 w-12 mx-auto mb-3 opacity-50" />
					<p>No rollback requests found</p>
				</div>
			</Card>
		{:else}
			<div class="space-y-3">
				{#each requests as request}
					{@const isExpanded = expandedRequests.has(request.id)}
					<Card class="p-4">
						<div class="space-y-4">
							<!-- Summary Row -->
							<div class="flex items-start justify-between gap-4">
								<div class="flex-1">
									<div class="flex items-center gap-2 mb-2">
										<Badge variant={getStatusVariant(request.status)}>
											{request.status}
										</Badge>
										<Badge variant="outline">{request.entityType}</Badge>
										{#if request.verificationStatus}
											<Badge variant={getVerificationVariant(request.verificationStatus)}>
												{request.verificationStatus}
											</Badge>
										{/if}
									</div>

									<div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
										<div>
											<p class="text-muted-foreground">Request ID</p>
											<p class="font-medium">#{request.id.slice(0, 8)}</p>
										</div>
										<div>
											<p class="text-muted-foreground flex items-center gap-1">
												<User class="h-3 w-3" />
												Requested By
											</p>
											<p class="font-medium">{request.requestedByEmail || 'Unknown'}</p>
										</div>
										<div>
											<p class="text-muted-foreground">Affected Records</p>
											<p class="font-medium">{request.affectedRecordsCount || 0}</p>
										</div>
										<div>
											<p class="text-muted-foreground">Created</p>
											<p class="font-medium">{formatDate(request.createdAt)}</p>
										</div>
									</div>
								</div>

								<Button variant="ghost" size="sm" onclick={() => toggleExpand(request.id)}>
									{#if isExpanded}
										<ChevronUp class="h-4 w-4" />
									{:else}
										<ChevronDown class="h-4 w-4" />
									{/if}
								</Button>
							</div>

							<!-- Expanded Details -->
							{#if isExpanded}
								<div class="border-t pt-4 space-y-4">
									{#if request.reason}
										<div>
											<p class="text-sm font-medium mb-1">Reason</p>
											<Alert>
												<FileText class="h-4 w-4" />
												<AlertDescription>{request.reason}</AlertDescription>
											</Alert>
										</div>
									{/if}

									{#if request.approvedBy}
										<div class="grid grid-cols-2 gap-4 text-sm">
											<div>
												<p class="text-muted-foreground">Approved By</p>
												<p class="font-medium">{request.approvedByEmail || request.approvedBy}</p>
											</div>
											{#if request.executedAt}
												<div>
													<p class="text-muted-foreground">Executed At</p>
													<p class="font-medium">{formatDate(request.executedAt)}</p>
												</div>
											{/if}
										</div>
									{/if}

									{#if request.rejectedBy}
										<Alert variant="destructive">
											<XCircle class="h-4 w-4" />
											<AlertDescription>
												<strong>Rejected by:</strong>
												{request.rejectedByEmail || request.rejectedBy}
												{#if request.rejectionReason}
													<br />
													<strong>Reason:</strong>
													{request.rejectionReason}
												{/if}
											</AlertDescription>
										</Alert>
									{/if}

									{#if request.executionError}
										<Alert variant="destructive">
											<AlertCircle class="h-4 w-4" />
											<AlertDescription>
												<strong>Execution Error:</strong>
												{request.executionError}
											</AlertDescription>
										</Alert>
									{/if}

									{#if request.verificationErrors && request.verificationErrors.length > 0}
										<div>
											<p class="text-sm font-medium mb-2">Verification Errors</p>
											<div class="space-y-2">
												{#each request.verificationErrors as error}
													<Alert variant="destructive">
														<AlertCircle class="h-4 w-4" />
														<AlertDescription>{error}</AlertDescription>
													</Alert>
												{/each}
											</div>
										</div>
									{/if}

									{#if request.status === 'pending'}
										<div class="flex gap-2">
											<Button variant="default" size="sm">
												<CheckCircle class="h-4 w-4 mr-2" />
												Approve
											</Button>
											<Button variant="destructive" size="sm">
												<XCircle class="h-4 w-4 mr-2" />
												Reject
											</Button>
										</div>
									{/if}
								</div>
							{/if}
						</div>
					</Card>
				{/each}
			</div>
		{/if}
	{/if}
</div>
