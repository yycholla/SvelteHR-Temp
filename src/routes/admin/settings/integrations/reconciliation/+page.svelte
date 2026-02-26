<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog';
	import { Label } from '$lib/components/ui/label';
	import {
		AlertTriangle,
		ArrowLeft,
		CheckCircle2,
		Database,
		Eye,
		FileText,
		Play,
		RefreshCw,
		TrendingUp
	} from '@lucide/svelte';
	import { goto, invalidate } from '$app/navigation';
	import { createUrqlClient } from '$lib/graphql/client';

	let { data } = $props();
	let reports = $derived(data.reports);
	let selectedReport = $derived(data.selectedReport);
	let discrepancies = $derived(data.discrepancies);

	interface Discrepancy {
		id: string;
		severity: string;
		discrepancyType: string;
		description: string;
		entityType: string;
		entityId: string;
		fieldName?: string;
		localValue?: string;
		remoteValue?: string;
		suggestedAction?: string;
		isResolved: boolean;
		resolvedAt?: string;
		resolvedBy?: string;
		resolutionNotes?: string;
	}

	let refreshing = $state(false);
	let runningReconciliation = $state(false);
	let selectedDiscrepancies = $state<Set<string>>(new Set());
	let showDetailModal = $state(false);
	let detailDiscrepancy = $state<Discrepancy | null>(null);
	let resolvingDiscrepancy = $state(false);

	const RECONCILE_MUTATION = `
		mutation ReconcileEmployees {
			intuit {
				reconciliation {
					reconcileEmployees {
						reportId
						totalLocal
						totalRemote
						totalMatched
						totalDiscrepancies
						missingInLocal
						missingInRemote
						dataMismatches
						durationMs
					}
				}
			}
		}
	`;

	const RESOLVE_MUTATION = `
		mutation ResolveDiscrepancy($discrepancyId: String!, $resolutionNotes: String!) {
			intuit {
				reconciliation {
					resolveDiscrepancy(discrepancyId: $discrepancyId, resolutionNotes: $resolutionNotes)
				}
			}
		}
	`;

	async function runReconciliation() {
		runningReconciliation = true;
		try {
			const client = createUrqlClient(fetch);
			const result = await client.mutation(RECONCILE_MUTATION, {}).toPromise();

			if (result.error) {
				const errorMessage = result.error.message;
				console.error('Reconciliation failed:', result.error);

				// Show user-friendly error messages
				if (errorMessage.includes('No active Intuit connection')) {
					alert('Please configure your QuickBooks connection first in the Integration Settings.');
				} else if (errorMessage.includes('Failed to fetch QuickBooks')) {
					alert('Unable to connect to QuickBooks. Please check your connection and try again.');
				} else if (errorMessage.includes('permission')) {
					alert('You do not have permission to run reconciliation.');
				} else {
					alert('Failed to run reconciliation: ' + errorMessage);
				}
			} else {
				const reportData = result.data?.intuit?.reconciliation?.reconcileEmployees;
				const reportId = reportData?.reportId;

				if (reportId) {
					console.log('Reconciliation report created:', {
						reportId,
						totalLocal: reportData.totalLocal,
						totalRemote: reportData.totalRemote,
						totalMatched: reportData.totalMatched,
						totalDiscrepancies: reportData.totalDiscrepancies
					});

					await invalidate('app:reconciliation');
					goto(`?reportId=${reportId}`);
				} else {
					console.error('No report ID returned from mutation');
					alert(
						'Reconciliation completed but no report was generated. Please check the server logs.'
					);
				}
			}
		} catch (error) {
			console.error('Error running reconciliation:', error);
			alert('An unexpected error occurred while running reconciliation. Please try again.');
		} finally {
			runningReconciliation = false;
		}
	}

	async function refreshData() {
		refreshing = true;
		await invalidate('app:reconciliation');
		refreshing = false;
	}

	function viewReport(reportId: string) {
		goto(`?reportId=${reportId}`);
	}

	function backToList() {
		goto('/admin/settings/integrations/reconciliation');
	}

	function toggleDiscrepancy(id: string) {
		const newSet = new Set(selectedDiscrepancies);
		if (newSet.has(id)) {
			newSet.delete(id);
		} else {
			newSet.add(id);
		}
		selectedDiscrepancies = newSet;
	}

	function selectAll() {
		selectedDiscrepancies = new Set(discrepancies.map((d: { id: string }) => d.id));
	}

	function deselectAll() {
		selectedDiscrepancies = new Set();
	}

	function openDetailModal(discrepancy: Discrepancy) {
		detailDiscrepancy = discrepancy;
		showDetailModal = true;
	}

	async function resolveSelected() {
		if (selectedDiscrepancies.size === 0) {
			alert('No discrepancies selected');
			return;
		}

		if (
			!confirm(
				`Are you sure you want to mark ${selectedDiscrepancies.size} discrepancies as resolved?`
			)
		) {
			return;
		}

		resolvingDiscrepancy = true;
		const client = createUrqlClient(fetch);

		for (const discrepancyId of selectedDiscrepancies) {
			try {
				await client
					.mutation(RESOLVE_MUTATION, {
						discrepancyId,
						resolutionNotes: 'Batch resolved from reconciliation dashboard'
					})
					.toPromise();
			} catch (error) {
				console.error(`Failed to resolve ${discrepancyId}:`, error);
			}
		}

		resolvingDiscrepancy = false;
		selectedDiscrepancies = new Set();
		await invalidate('app:reconciliation');
	}

	async function resolveDiscrepancy(discrepancyId: string, notes: string) {
		resolvingDiscrepancy = true;
		try {
			const client = createUrqlClient(fetch);
			await client
				.mutation(RESOLVE_MUTATION, {
					discrepancyId,
					resolutionNotes: notes
				})
				.toPromise();

			showDetailModal = false;
			await invalidate('app:reconciliation');
		} catch (error) {
			console.error('Failed to resolve discrepancy:', error);
			alert('Failed to resolve discrepancy');
		} finally {
			resolvingDiscrepancy = false;
		}
	}

	function getStatusColor(status: string): string {
		switch (status.toLowerCase()) {
			case 'completed':
				return 'bg-green-100 text-green-700';
			case 'running':
			case 'in_progress':
				return 'bg-blue-100 text-blue-700';
			case 'failed':
				return 'bg-red-100 text-red-700';
			default:
				return 'bg-gray-100 text-gray-700';
		}
	}

	function getSeverityVariant(
		severity: string
	): 'default' | 'outline' | 'secondary' | 'destructive' {
		switch (severity.toLowerCase()) {
			case 'critical':
				return 'destructive';
			case 'high':
				return 'destructive';
			case 'medium':
				return 'secondary';
			case 'low':
				return 'outline';
			default:
				return 'outline';
		}
	}

	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toLocaleString();
	}

	function calculateConsistencyScore(report: {
		totalMatched: number;
		totalLocal: number;
		totalRemote: number;
	}): number {
		const total = Math.max(report.totalLocal, report.totalRemote);
		if (total === 0) return 100;
		return (report.totalMatched / total) * 100;
	}
</script>

<div class="flex flex-col h-full overflow-hidden bg-background">
	<!-- Toolbar -->
	<header
		class="flex-shrink-0 flex items-center justify-between h-14 px-4 border-b bg-background z-20"
	>
		<div class="flex items-center gap-4">
			{#if selectedReport}
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
				{selectedReport ? 'Report Details' : 'Data Reconciliation'}
			</h1>
			<div class="h-4 w-px bg-border"></div>
			<div class="flex items-center gap-2 text-xs text-muted-foreground">
				<Database class="h-3.5 w-3.5" />
				<span>QuickBooks Sync Validation</span>
			</div>
		</div>
		<div class="flex gap-2">
			{#if !selectedReport}
				<button
					onclick={runReconciliation}
					disabled={runningReconciliation}
					class="flex items-center gap-1.5 h-8 px-3 rounded-sm border border-input bg-primary text-primary-foreground text-xs hover:bg-primary/90 transition-colors disabled:opacity-50"
				>
					{#if runningReconciliation}
						<RefreshCw class="h-3.5 w-3.5 animate-spin" />
						Running...
					{:else}
						<Play class="h-3.5 w-3.5" />
						Run Reconciliation
					{/if}
				</button>
			{/if}
			<button
				onclick={refreshData}
				disabled={refreshing}
				class="flex items-center gap-1.5 h-8 px-3 rounded-sm border border-input bg-background text-xs hover:bg-accent transition-colors"
			>
				<RefreshCw class="h-3.5 w-3.5 {refreshing ? 'animate-spin' : ''}" />
				Refresh
			</button>
		</div>
	</header>

	{#if data.error}
		<div class="flex-shrink-0 p-4 pb-0">
			<div
				class="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium border border-destructive/20"
			>
				{data.error}
			</div>
		</div>
	{/if}

	<div class="flex-1 overflow-auto bg-muted/5">
		{#if !selectedReport}
			<!-- KPI Grid -->
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border-b">
				<!-- Consistency Score -->
				<div class="p-6 border-r last:border-r-0 bg-background flex flex-col justify-between h-32">
					<div class="flex items-center justify-between">
						<span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
							>Consistency Score</span
						>
						<TrendingUp class="h-4 w-4 text-muted-foreground" />
					</div>
					{#if reports.length > 0}
						{#each [calculateConsistencyScore(reports[0])] as score}
							<div>
								<div
									class="text-3xl font-bold tracking-tight {score >= 90
										? 'text-green-600'
										: score >= 70
											? 'text-yellow-600'
											: 'text-red-600'}"
								>
									{score.toFixed(1)}%
								</div>
								<div class="mt-1 text-xs text-muted-foreground">Based on latest report</div>
							</div>
						{/each}
					{:else}
						<div>
							<div class="text-3xl font-bold tracking-tight text-muted-foreground">—</div>
							<div class="mt-1 text-xs text-muted-foreground">No data</div>
						</div>
					{/if}
				</div>

				<!-- Active Discrepancies -->
				<div class="p-6 border-r last:border-r-0 bg-background flex flex-col justify-between h-32">
					<div class="flex items-center justify-between">
						<span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
							>Discrepancies</span
						>
						<AlertTriangle class="h-4 w-4 text-muted-foreground" />
					</div>
					<div>
						{#if reports.length > 0}
							<div class="text-3xl font-bold tracking-tight text-red-600">
								{reports[0].totalDiscrepancies}
							</div>
							<div class="mt-1 text-xs text-muted-foreground">Require attention</div>
						{:else}
							<div class="text-3xl font-bold tracking-tight text-muted-foreground">—</div>
							<div class="mt-1 text-xs text-muted-foreground">No data</div>
						{/if}
					</div>
				</div>

				<!-- Last Check -->
				<div class="p-6 border-r last:border-r-0 bg-background flex flex-col justify-between h-32">
					<div class="flex items-center justify-between">
						<span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
							>Last Check</span
						>
						<FileText class="h-4 w-4 text-muted-foreground" />
					</div>
					<div>
						{#if reports.length > 0}
							<div class="text-lg font-bold tracking-tight">
								{new Date(reports[0].createdAt).toLocaleDateString()}
							</div>
							<div class="mt-1 text-xs text-muted-foreground">
								{new Date(reports[0].createdAt).toLocaleTimeString()}
							</div>
						{:else}
							<div class="text-lg font-bold tracking-tight text-muted-foreground">Never</div>
							<div class="mt-1 text-xs text-muted-foreground">Run first check</div>
						{/if}
					</div>
				</div>

				<!-- Total Records -->
				<div class="p-6 bg-background flex flex-col justify-between h-32">
					<div class="flex items-center justify-between">
						<span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
							>Total Records</span
						>
						<Database class="h-4 w-4 text-muted-foreground" />
					</div>
					<div>
						{#if reports.length > 0}
							<div class="text-3xl font-bold tracking-tight">{reports[0].totalLocal}</div>
							<div class="mt-1 text-xs text-muted-foreground">
								Local • {reports[0].totalRemote} Remote
							</div>
						{:else}
							<div class="text-3xl font-bold tracking-tight text-muted-foreground">—</div>
							<div class="mt-1 text-xs text-muted-foreground">No data</div>
						{/if}
					</div>
				</div>
			</div>

			<!-- Reports Table -->
			<div class="bg-background border-t">
				<div class="px-4 py-3 border-b">
					<h2 class="text-sm font-semibold">Recent Reports</h2>
					<p class="text-xs text-muted-foreground mt-0.5">Historical data consistency checks</p>
				</div>
				<div class="relative">
					{#if reports.length === 0}
						<div class="px-4 py-12 text-center text-muted-foreground">
							<FileText class="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
							<p class="font-medium text-xs">No reconciliation reports</p>
							<p class="text-[10px] mt-1">Click "Run Reconciliation" to start</p>
						</div>
					{:else}
						<table class="w-full text-sm text-left border-collapse">
							<thead class="sticky top-0 z-10 bg-muted/40 backdrop-blur-sm border-b">
								<tr>
									<th
										class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0"
										>Entity</th
									>
									<th
										class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0"
										>Date</th
									>
									<th
										class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0"
										>Status</th
									>
									<th
										class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0 text-right"
										>Consistency</th
									>
									<th
										class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0 text-right"
										>Matched</th
									>
									<th
										class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0 text-right"
										>Issues</th
									>
									<th
										class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0 text-right"
										>Missing</th
									>
									<th
										class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground text-right"
										>Actions</th
									>
								</tr>
							</thead>
							<tbody class="divide-y">
								{#each reports as report}
									<tr
										class="hover:bg-muted/30 cursor-pointer transition-colors group"
										onclick={() => viewReport(report.id)}
									>
										<td class="px-3 py-1.5 border-r last:border-r-0">
											<span
												class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-secondary text-secondary-foreground capitalize"
											>
												{report.entityType}
											</span>
										</td>
										<td class="px-3 py-1.5 border-r last:border-r-0 text-xs text-muted-foreground">
											<div>{new Date(report.createdAt).toLocaleDateString()}</div>
											<div class="text-[10px]">
												{new Date(report.createdAt).toLocaleTimeString()}
											</div>
										</td>
										<td class="px-3 py-1.5 border-r last:border-r-0">
											<span
												class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium {getStatusColor(
													report.status
												)}"
											>
												{report.status}
											</span>
										</td>
										{#each [calculateConsistencyScore(report)] as score}
											<td class="px-3 py-1.5 border-r last:border-r-0 text-right">
												<span
													class="font-bold text-xs {score >= 90
														? 'text-green-600'
														: score >= 70
															? 'text-yellow-600'
															: 'text-red-600'}"
												>
													{score.toFixed(0)}%
												</span>
											</td>
										{/each}
										<td class="px-3 py-1.5 border-r last:border-r-0 text-right">
											<span class="font-medium text-xs text-green-600">{report.totalMatched}</span>
										</td>
										<td class="px-3 py-1.5 border-r last:border-r-0 text-right">
											<span class="font-medium text-xs text-red-600"
												>{report.totalDiscrepancies}</span
											>
										</td>
										<td class="px-3 py-1.5 border-r last:border-r-0 text-right text-xs">
											{report.missingInLocal + report.missingInRemote}
										</td>
										<td class="px-3 py-1.5 text-right">
											<button
												onclick={(e) => {
													e.stopPropagation();
													viewReport(report.id);
												}}
												class="p-1 rounded hover:bg-background border border-transparent hover:border-border text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
												title="View Details"
											>
												<Eye class="h-3.5 w-3.5" />
											</button>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					{/if}
				</div>
			</div>
		{:else}
			<!-- Report Details View -->
			<div class="bg-background p-6 border-b">
				<div class="flex items-center justify-between mb-4">
					<div>
						<h2 class="text-sm font-semibold">Report Summary</h2>
						<p class="text-xs text-muted-foreground mt-0.5">
							{formatDate(selectedReport.createdAt)}
						</p>
					</div>
					<span
						class="inline-flex items-center px-2 py-1 rounded text-[10px] font-medium {getStatusColor(
							selectedReport.status
						)}"
					>
						{selectedReport.status}
					</span>
				</div>

				<div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
					<div>
						<p class="text-xs text-muted-foreground uppercase tracking-wider">Entity Type</p>
						<p class="text-lg font-bold capitalize mt-1">{selectedReport.entityType}</p>
					</div>
					<div>
						<p class="text-xs text-muted-foreground uppercase tracking-wider">Matched</p>
						<p class="text-lg font-bold text-green-600 mt-1">{selectedReport.totalMatched}</p>
					</div>
					<div>
						<p class="text-xs text-muted-foreground uppercase tracking-wider">Discrepancies</p>
						<p class="text-lg font-bold text-red-600 mt-1">
							{selectedReport.totalDiscrepancies}
						</p>
					</div>
					{#each [calculateConsistencyScore(selectedReport)] as score}
						<div>
							<p class="text-xs text-muted-foreground uppercase tracking-wider">Consistency</p>
							<p
								class="text-lg font-bold mt-1 {score >= 90
									? 'text-green-600'
									: score >= 70
										? 'text-yellow-600'
										: 'text-red-600'}"
							>
								{score.toFixed(1)}%
							</p>
						</div>
					{/each}
				</div>
			</div>

			<!-- Batch Actions Bar -->
			{#if discrepancies.length > 0 && discrepancies.some((d: { isResolved: boolean }) => !d.isResolved)}
				<div class="p-2 border-b bg-muted/5 flex items-center gap-2">
					<button
						onclick={selectAll}
						class="h-8 px-3 rounded-sm border border-input bg-background text-xs hover:bg-accent transition-colors"
					>
						Select All
					</button>
					<button
						onclick={deselectAll}
						class="h-8 px-3 rounded-sm border border-input bg-background text-xs hover:bg-accent transition-colors"
					>
						Deselect All
					</button>
					{#if selectedDiscrepancies.size > 0}
						<span class="text-xs text-muted-foreground">{selectedDiscrepancies.size} selected</span>
						<button
							onclick={resolveSelected}
							disabled={resolvingDiscrepancy}
							class="h-8 px-3 rounded-sm border border-input bg-primary text-primary-foreground text-xs hover:bg-primary/90 transition-colors ml-auto disabled:opacity-50"
						>
							{#if resolvingDiscrepancy}
								<RefreshCw class="h-3.5 w-3.5 animate-spin inline mr-1" />
								Resolving...
							{:else}
								<CheckCircle2 class="h-3.5 w-3.5 inline mr-1" />
								Mark Resolved
							{/if}
						</button>
					{/if}
				</div>
			{/if}

			<!-- Discrepancies Table -->
			<div class="relative">
				{#if discrepancies.length === 0}
					<div class="px-4 py-12 text-center text-muted-foreground">
						<CheckCircle2 class="h-12 w-12 mx-auto mb-3 text-green-500/50" />
						<p class="font-medium text-xs">No discrepancies found</p>
						<p class="text-[10px] mt-1">All data is in sync</p>
					</div>
				{:else}
					<table class="w-full text-sm text-left border-collapse">
						<thead class="sticky top-0 z-10 bg-muted/40 backdrop-blur-sm border-b">
							<tr>
								<th
									class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground w-12"
								></th>
								<th
									class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0"
									>Severity</th
								>
								<th
									class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0"
									>Type</th
								>
								<th
									class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0"
									>Description</th
								>
								<th
									class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0"
									>Entity</th
								>
								<th
									class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0"
									>Values</th
								>
								<th
									class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground text-right"
									>Actions</th
								>
							</tr>
						</thead>
						<tbody class="divide-y">
							{#each discrepancies as discrepancy}
								<tr class="hover:bg-muted/30 group {discrepancy.isResolved ? 'bg-muted/20' : ''}">
									<td class="px-3 py-1.5">
										{#if !discrepancy.isResolved}
											<Checkbox
												checked={selectedDiscrepancies.has(discrepancy.id)}
												onCheckedChange={() => toggleDiscrepancy(discrepancy.id)}
											/>
										{/if}
									</td>
									<td class="px-3 py-1.5 border-r last:border-r-0">
										<Badge variant={getSeverityVariant(discrepancy.severity)} class="text-[10px]">
											{discrepancy.severity}
										</Badge>
									</td>
									<td class="px-3 py-1.5 border-r last:border-r-0">
										<span class="text-xs capitalize"
											>{discrepancy.discrepancyType.replace(/_/g, ' ')}</span
										>
									</td>
									<td class="px-3 py-1.5 border-r last:border-r-0">
										<div class="max-w-md">
											<p class="text-xs font-medium">{discrepancy.description}</p>
											{#if discrepancy.fieldName}
												<p class="text-[10px] text-muted-foreground mt-0.5">
													Field: {discrepancy.fieldName}
												</p>
											{/if}
										</div>
									</td>
									<td class="px-3 py-1.5 border-r last:border-r-0">
										<div class="capitalize text-xs">{discrepancy.entityType}</div>
										<div class="text-[10px] text-muted-foreground font-mono">
											{discrepancy.entityId.slice(0, 8)}...
										</div>
									</td>
									<td class="px-3 py-1.5 border-r last:border-r-0">
										{#if discrepancy.localValue || discrepancy.remoteValue}
											<div class="text-[10px] space-y-0.5 max-w-xs">
												{#if discrepancy.localValue}
													<div class="truncate">
														<span class="text-muted-foreground">L:</span>
														<code class="ml-1 bg-muted px-1 rounded"
															>{discrepancy.localValue.slice(0, 15)}</code
														>
													</div>
												{/if}
												{#if discrepancy.remoteValue}
													<div class="truncate">
														<span class="text-muted-foreground">R:</span>
														<code class="ml-1 bg-muted px-1 rounded"
															>{discrepancy.remoteValue.slice(0, 15)}</code
														>
													</div>
												{/if}
											</div>
										{:else}
											<span class="text-[10px] text-muted-foreground">—</span>
										{/if}
									</td>
									<td class="px-3 py-1.5 text-right">
										<div class="flex gap-1 justify-end items-center">
											{#if discrepancy.isResolved}
												<span class="text-[10px] text-green-600 font-medium flex items-center mr-2">
													<CheckCircle2 class="h-3 w-3 mr-0.5" />
													Resolved
												</span>
											{/if}
											<button
												onclick={() => openDetailModal(discrepancy)}
												class="p-1 rounded hover:bg-background border border-transparent hover:border-border text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
												title="View Details"
											>
												<Eye class="h-3.5 w-3.5" />
											</button>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{/if}
			</div>
		{/if}
	</div>
</div>

<!-- Discrepancy Detail Modal -->
<Dialog open={showDetailModal} onOpenChange={(open) => (showDetailModal = open)}>
	<DialogContent class="max-w-2xl">
		<DialogHeader>
			<DialogTitle>Discrepancy Details</DialogTitle>
			<DialogDescription>Full comparison and resolution options</DialogDescription>
		</DialogHeader>

		{#if detailDiscrepancy}
			<div class="space-y-4">
				<div class="flex items-center gap-2">
					<Badge variant={getSeverityVariant(detailDiscrepancy.severity)}>
						{detailDiscrepancy.severity}
					</Badge>
					<Badge variant="outline" class="capitalize">
						{detailDiscrepancy.discrepancyType.replace(/_/g, ' ')}
					</Badge>
				</div>

				<div>
					<Label class="text-sm font-medium">Description</Label>
					<p class="text-sm mt-1">{detailDiscrepancy.description}</p>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div>
						<Label class="text-sm font-medium">Entity Type</Label>
						<p class="text-sm mt-1 capitalize">{detailDiscrepancy.entityType}</p>
					</div>
					<div>
						<Label class="text-sm font-medium">Entity ID</Label>
						<p class="text-sm mt-1 font-mono">{detailDiscrepancy.entityId}</p>
					</div>
				</div>

				{#if detailDiscrepancy.fieldName}
					<div>
						<Label class="text-sm font-medium">Field</Label>
						<p class="text-sm mt-1">{detailDiscrepancy.fieldName}</p>
					</div>
				{/if}

				{#if detailDiscrepancy.localValue || detailDiscrepancy.remoteValue}
					<div class="border-t pt-4">
						<Label class="text-sm font-medium mb-2 block">Value Comparison</Label>
						<div class="grid grid-cols-2 gap-4">
							<div>
								<p class="text-xs text-muted-foreground mb-2">Local Value</p>
								<div class="p-3 bg-muted rounded font-mono text-sm">
									{detailDiscrepancy.localValue || '(none)'}
								</div>
							</div>
							<div>
								<p class="text-xs text-muted-foreground mb-2">Remote Value (QuickBooks)</p>
								<div class="p-3 bg-muted rounded font-mono text-sm">
									{detailDiscrepancy.remoteValue || '(none)'}
								</div>
							</div>
						</div>
					</div>
				{/if}

				{#if detailDiscrepancy.suggestedAction}
					<div class="p-4 bg-blue-50 border border-blue-200 rounded">
						<Label class="text-sm font-medium text-blue-900">Suggested Action</Label>
						<p class="text-sm text-blue-800 mt-1">{detailDiscrepancy.suggestedAction}</p>
					</div>
				{/if}

				{#if detailDiscrepancy.isResolved}
					<div class="p-4 bg-green-50 border border-green-200 rounded">
						<div class="flex items-center gap-2 mb-2">
							<CheckCircle2 class="h-4 w-4 text-green-600" />
							<Label class="text-sm font-medium text-green-900">Resolved</Label>
						</div>
						<p class="text-sm text-green-800">
							{#if detailDiscrepancy.resolvedAt}
								Resolved {formatDate(detailDiscrepancy.resolvedAt)} by {detailDiscrepancy.resolvedBy ||
									'System'}
							{/if}
						</p>
						{#if detailDiscrepancy.resolutionNotes}
							<p class="text-sm text-green-800 mt-2">{detailDiscrepancy.resolutionNotes}</p>
						{/if}
					</div>
				{/if}
			</div>

			<DialogFooter>
				{#if detailDiscrepancy && !detailDiscrepancy.isResolved}
					<Button
						onclick={() =>
							detailDiscrepancy &&
							resolveDiscrepancy(detailDiscrepancy.id, 'Manually resolved from detail view')}
						disabled={resolvingDiscrepancy}
					>
						{#if resolvingDiscrepancy}
							<RefreshCw class="h-4 w-4 mr-2 animate-spin" />
							Resolving...
						{:else}
							<CheckCircle2 class="h-4 w-4 mr-2" />
							Mark as Resolved
						{/if}
					</Button>
				{/if}
				<Button variant="outline" onclick={() => (showDetailModal = false)}>Close</Button>
			</DialogFooter>
		{/if}
	</DialogContent>
</Dialog>
