<script lang="ts">
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '$lib/components/ui/dialog';
	import { Label } from '$lib/components/ui/label';
	import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '$lib/components/ui/select';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import {
		AlertCircle,
		CheckCircle2,
		RefreshCw,
		ArrowLeft,
		Clock,
		Database,
		AlertTriangle,
		FileText,
		XCircle,
		TrendingUp,
		Play,
		CheckSquare,
		Eye,
		Trash2
	} from '@lucide/svelte';
	import { invalidate, goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { createUrqlClient } from '$lib/graphql/client';

	let { data } = $props();
	let reports = $derived(data.reports);
	let selectedReport = $derived(data.selectedReport);
	let discrepancies = $derived(data.discrepancies);
	let stats = $derived(data.stats);

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
	let selectedEntityType = $state<'EMPLOYEE' | 'DEPARTMENT' | 'ALL'>('EMPLOYEE');
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
				console.error('Reconciliation failed:', result.error);
				alert('Failed to run reconciliation: ' + result.error.message);
			} else {
				const reportId = result.data?.intuit?.reconciliation?.reconcileEmployees?.reportId;
				if (reportId) {
					await invalidate('app:reconciliation');
					goto(`?reportId=${reportId}`);
				}
			}
		} catch (error) {
			console.error('Error running reconciliation:', error);
			alert('Failed to run reconciliation');
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

		if (!confirm(`Are you sure you want to mark ${selectedDiscrepancies.size} discrepancies as resolved?`)) {
			return;
		}

		resolvingDiscrepancy = true;
		const client = createUrqlClient(fetch);

		for (const discrepancyId of selectedDiscrepancies) {
			try {
				await client.mutation(RESOLVE_MUTATION, {
					discrepancyId,
					resolutionNotes: 'Batch resolved from reconciliation dashboard'
				}).toPromise();
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
			await client.mutation(RESOLVE_MUTATION, {
				discrepancyId,
				resolutionNotes: notes
			}).toPromise();

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
				return 'text-green-600 bg-green-50 border-green-200';
			case 'running':
			case 'in_progress':
				return 'text-blue-600 bg-blue-50 border-blue-200';
			case 'failed':
				return 'text-red-600 bg-red-50 border-red-200';
			default:
				return 'text-gray-600 bg-gray-50 border-gray-200';
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

	function formatDuration(ms: number | null): string {
		if (!ms) return 'N/A';
		if (ms < 1000) return `${ms}ms`;
		const seconds = Math.floor(ms / 1000);
		if (seconds < 60) return `${seconds}s`;
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return `${minutes}m ${remainingSeconds}s`;
	}

	function calculateMatchRate(matched: number, total: number): number {
		if (total === 0) return 0;
		return (matched / total) * 100;
	}

	function calculateConsistencyScore(report: { totalMatched: number; totalLocal: number; totalRemote: number }): number {
		const total = Math.max(report.totalLocal, report.totalRemote);
		if (total === 0) return 100;
		return (report.totalMatched / total) * 100;
	}
</script>

<div class="container mx-auto py-8 px-4">
	<!-- Header -->
	<div class="mb-6 flex items-center justify-between">
		<div class="flex items-center gap-4">
			{#if selectedReport}
				<Button onclick={backToList} variant="outline" size="sm">
					<ArrowLeft class="h-4 w-4 mr-2" />
					Back to Reports
				</Button>
			{/if}
			<div>
				<h1 class="text-2xl font-bold">
					{selectedReport ? 'Reconciliation Report Details' : 'Data Reconciliation'}
				</h1>
				<p class="text-sm text-muted-foreground mt-1">
					{selectedReport
						? 'Detailed discrepancy analysis and resolution'
						: 'Compare local and remote data for consistency'}
				</p>
			</div>
		</div>
		<div class="flex gap-2">
			{#if !selectedReport}
				<Button onclick={runReconciliation} disabled={runningReconciliation}>
					{#if runningReconciliation}
						<RefreshCw class="h-4 w-4 mr-2 animate-spin" />
						Running...
					{:else}
						<Play class="h-4 w-4 mr-2" />
						Run Reconciliation
					{/if}
				</Button>
			{/if}
			<Button onclick={refreshData} disabled={refreshing} variant="outline" size="sm">
				<RefreshCw class="h-4 w-4 mr-2 {refreshing ? 'animate-spin' : ''}" />
				Refresh
			</Button>
		</div>
	</div>

	{#if data.error}
		<Alert variant="destructive" class="mb-6">
			<AlertCircle class="h-4 w-4" />
			<AlertDescription>{data.error}</AlertDescription>
		</Alert>
	{/if}

	{#if !selectedReport}
		<!-- Summary Cards -->
		<div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
			<Card>
				<CardHeader class="pb-2">
					<CardDescription>Consistency Score</CardDescription>
				</CardHeader>
				<CardContent>
					{#if reports.length > 0}
						{@const latestReport = reports[0]}
						{@const score = calculateConsistencyScore(latestReport)}
						<p class="text-3xl font-bold {score >= 90 ? 'text-green-600' : score >= 70 ? 'text-yellow-600' : 'text-red-600'}">
							{score.toFixed(1)}%
						</p>
						<p class="text-xs text-muted-foreground mt-1">
							Based on latest report
						</p>
					{:else}
						<p class="text-3xl font-bold text-muted-foreground">--</p>
						<p class="text-xs text-muted-foreground mt-1">No data</p>
					{/if}
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="pb-2">
					<CardDescription>Active Discrepancies</CardDescription>
				</CardHeader>
				<CardContent>
					{#if reports.length > 0}
						<p class="text-3xl font-bold text-red-600">
							{reports[0].totalDiscrepancies}
						</p>
						<p class="text-xs text-muted-foreground mt-1">
							Requires attention
						</p>
					{:else}
						<p class="text-3xl font-bold text-muted-foreground">--</p>
						<p class="text-xs text-muted-foreground mt-1">No data</p>
					{/if}
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="pb-2">
					<CardDescription>Last Check</CardDescription>
				</CardHeader>
				<CardContent>
					{#if reports.length > 0}
						<p class="text-sm font-medium">
							{new Date(reports[0].createdAt).toLocaleDateString()}
						</p>
						<p class="text-xs text-muted-foreground mt-1">
							{new Date(reports[0].createdAt).toLocaleTimeString()}
						</p>
					{:else}
						<p class="text-sm font-medium text-muted-foreground">Never</p>
						<p class="text-xs text-muted-foreground mt-1">Run first check</p>
					{/if}
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="pb-2">
					<CardDescription>Total Records</CardDescription>
				</CardHeader>
				<CardContent>
					{#if reports.length > 0}
						<p class="text-3xl font-bold">
							{reports[0].totalLocal}
						</p>
						<p class="text-xs text-muted-foreground mt-1">
							Local • {reports[0].totalRemote} Remote
						</p>
					{:else}
						<p class="text-3xl font-bold text-muted-foreground">--</p>
						<p class="text-xs text-muted-foreground mt-1">No data</p>
					{/if}
				</CardContent>
			</Card>
		</div>
	{/if}

	{#if selectedReport}
		<!-- Report Details View -->
		<div class="space-y-6">
			<!-- Report Summary -->
			<Card>
				<CardHeader>
					<div class="flex items-start justify-between">
						<div>
							<CardTitle>Report Summary</CardTitle>
							<CardDescription>
								{formatDate(selectedReport.createdAt)}
							</CardDescription>
						</div>
						<div
							class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border {getStatusColor(
								selectedReport.status
							)}"
						>
							{selectedReport.status}
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div class="grid grid-cols-2 md:grid-cols-4 gap-6">
						<div>
							<p class="text-sm text-muted-foreground">Entity Type</p>
							<p class="text-2xl font-bold capitalize">{selectedReport.entityType}</p>
						</div>
						<div>
							<p class="text-sm text-muted-foreground">Local Records</p>
							<p class="text-2xl font-bold">{selectedReport.totalLocal}</p>
						</div>
						<div>
							<p class="text-sm text-muted-foreground">Remote Records</p>
							<p class="text-2xl font-bold">{selectedReport.totalRemote}</p>
						</div>
						<div>
							<p class="text-sm text-muted-foreground">Consistency Score</p>
							{#if selectedReport}
								{@const score = calculateConsistencyScore(selectedReport)}
								<p class="text-2xl font-bold {score >= 90 ? 'text-green-600' : score >= 70 ? 'text-yellow-600' : 'text-red-600'}">
									{score.toFixed(1)}%
								</p>
							{/if}
						</div>
					</div>

					<div class="mt-6 pt-6 border-t">
						<div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
							<div>
								<span class="text-muted-foreground">Matched:</span>
								<span class="ml-2 font-medium text-green-600"
									>{selectedReport.totalMatched}</span
								>
							</div>
							<div>
								<span class="text-muted-foreground">Discrepancies:</span>
								<span class="ml-2 font-medium text-red-600"
									>{selectedReport.totalDiscrepancies}</span
								>
							</div>
							<div>
								<span class="text-muted-foreground">Missing Locally:</span>
								<span class="ml-2 font-medium text-orange-600"
									>{selectedReport.missingInLocal}</span
								>
							</div>
							<div>
								<span class="text-muted-foreground">Missing Remotely:</span>
								<span class="ml-2 font-medium text-orange-600"
									>{selectedReport.missingInRemote}</span
								>
							</div>
						</div>
					</div>

					{#if selectedReport.triggeredByEmail}
						<div class="mt-4 text-sm text-muted-foreground">
							Triggered by: {selectedReport.triggeredByEmail}
							• Duration: {formatDuration(selectedReport.durationMs)}
						</div>
					{/if}

					{#if selectedReport.errorMessage}
						<Alert variant="destructive" class="mt-4">
							<AlertCircle class="h-4 w-4" />
							<AlertDescription>{selectedReport.errorMessage}</AlertDescription>
						</Alert>
					{/if}
				</CardContent>
			</Card>

			<!-- Discrepancy Statistics -->
			{#if stats}
				<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
					<Card>
						<CardHeader class="pb-2">
							<CardDescription>Total Discrepancies</CardDescription>
						</CardHeader>
						<CardContent>
							<p class="text-3xl font-bold">{stats.total}</p>
							<p class="text-sm text-muted-foreground mt-1">
								{stats.resolved} resolved • {stats.unresolved} pending
							</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader class="pb-2">
							<CardDescription>By Type</CardDescription>
						</CardHeader>
						<CardContent>
							<div class="space-y-2">
								{#each stats.byType.slice(0, 3) as typeCount}
									<div class="flex justify-between text-sm">
										<span class="capitalize">{typeCount.typeName.replace(/_/g, ' ')}</span>
										<span class="font-medium">{typeCount.count}</span>
									</div>
								{/each}
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader class="pb-2">
							<CardDescription>By Severity</CardDescription>
						</CardHeader>
						<CardContent>
							<div class="space-y-2">
								{#each stats.bySeverity as sevCount}
									<div class="flex justify-between text-sm">
										<Badge variant={getSeverityVariant(sevCount.severity)}>
											{sevCount.severity}
										</Badge>
										<span class="font-medium">{sevCount.count}</span>
									</div>
								{/each}
							</div>
						</CardContent>
					</Card>
				</div>
			{/if}

			<!-- Batch Actions -->
			{#if discrepancies.length > 0 && discrepancies.some((d: { isResolved: boolean }) => !d.isResolved)}
				<Card>
					<CardContent class="pt-6">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-3">
								<Button onclick={selectAll} variant="outline" size="sm">
									<CheckSquare class="h-4 w-4 mr-2" />
									Select All
								</Button>
								<Button onclick={deselectAll} variant="outline" size="sm">
									<XCircle class="h-4 w-4 mr-2" />
									Deselect All
								</Button>
								{#if selectedDiscrepancies.size > 0}
									<span class="text-sm text-muted-foreground">
										{selectedDiscrepancies.size} selected
									</span>
								{/if}
							</div>
							{#if selectedDiscrepancies.size > 0}
								<Button onclick={resolveSelected} disabled={resolvingDiscrepancy}>
									{#if resolvingDiscrepancy}
										<RefreshCw class="h-4 w-4 mr-2 animate-spin" />
										Resolving...
									{:else}
										<CheckCircle2 class="h-4 w-4 mr-2" />
										Mark Selected as Resolved
									{/if}
								</Button>
							{/if}
						</div>
					</CardContent>
				</Card>
			{/if}

			<!-- Discrepancies List -->
			<Card>
				<CardHeader>
					<CardTitle>Discrepancies</CardTitle>
					<CardDescription>Detailed list of data mismatches and missing records</CardDescription>
				</CardHeader>
				<CardContent>
					{#if discrepancies.length === 0}
						<div class="text-center py-12 text-muted-foreground">
							<CheckCircle2 class="h-12 w-12 mx-auto mb-3 text-green-500" />
							<p class="font-medium">No discrepancies found</p>
							<p class="text-sm">All data is in sync</p>
						</div>
					{:else}
						<div class="space-y-3">
							{#each discrepancies as discrepancy}
								<div
									class="border rounded-lg p-4 {discrepancy.isResolved
										? 'bg-muted/30'
										: 'bg-background'}"
								>
									<div class="flex items-start gap-3">
										{#if !discrepancy.isResolved}
											<Checkbox
												checked={selectedDiscrepancies.has(discrepancy.id)}
												onCheckedChange={() => toggleDiscrepancy(discrepancy.id)}
												class="mt-1"
											/>
										{/if}
										<div class="flex-1">
											<div class="flex items-center gap-2 mb-1">
												<Badge variant={getSeverityVariant(discrepancy.severity)}>
													{discrepancy.severity}
												</Badge>
												<Badge variant="outline" class="capitalize">
													{discrepancy.discrepancyType.replace(/_/g, ' ')}
												</Badge>
												{#if discrepancy.isResolved}
													<Badge variant="default" class="bg-green-600">
														<CheckCircle2 class="h-3 w-3 mr-1" />
														Resolved
													</Badge>
												{/if}
											</div>
											<p class="text-sm font-medium">{discrepancy.description}</p>
											<p class="text-xs text-muted-foreground mt-1">
												{discrepancy.entityType} • {discrepancy.entityId}
												{#if discrepancy.fieldName}
													• Field: {discrepancy.fieldName}
												{/if}
											</p>
										</div>
										<Button
											onclick={() => openDetailModal(discrepancy)}
											variant="outline"
											size="sm"
										>
											<Eye class="h-4 w-4 mr-2" />
											Details
										</Button>
									</div>

									{#if discrepancy.localValue || discrepancy.remoteValue}
										<div class="grid grid-cols-2 gap-4 mt-3 text-sm">
											{#if discrepancy.localValue}
												<div>
													<span class="text-muted-foreground text-xs">Local Value:</span>
													<p class="font-mono text-xs mt-1 p-2 bg-muted rounded">
														{discrepancy.localValue}
													</p>
												</div>
											{/if}
											{#if discrepancy.remoteValue}
												<div>
													<span class="text-muted-foreground text-xs">Remote Value:</span>
													<p class="font-mono text-xs mt-1 p-2 bg-muted rounded">
														{discrepancy.remoteValue}
													</p>
												</div>
											{/if}
										</div>
									{/if}

									{#if discrepancy.suggestedAction}
										<div class="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
											<p class="font-medium text-blue-900">Suggested Action:</p>
											<p class="text-blue-800 mt-1">{discrepancy.suggestedAction}</p>
										</div>
									{/if}

									{#if discrepancy.isResolved && discrepancy.resolutionNotes}
										<div class="mt-3 text-xs text-muted-foreground">
											<p>
												Resolved by: {discrepancy.resolvedBy || 'System'}
												• {formatDate(discrepancy.resolvedAt)}
											</p>
											<p class="mt-1">{discrepancy.resolutionNotes}</p>
										</div>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</CardContent>
			</Card>
		</div>
	{:else}
		<!-- Reports List View -->
		<Card>
			<CardHeader>
				<CardTitle>Recent Reconciliation Reports</CardTitle>
				<CardDescription>Historical data consistency checks</CardDescription>
			</CardHeader>
			<CardContent>
				{#if reports.length === 0}
					<div class="text-center py-12 text-muted-foreground">
						<FileText class="h-12 w-12 mx-auto mb-3" />
						<p class="font-medium">No reconciliation reports</p>
						<p class="text-sm">Click "Run Reconciliation" to start your first data consistency check</p>
					</div>
				{:else}
					<div class="space-y-3">
						{#each reports as report}
							<button
								onclick={() => viewReport(report.id)}
								class="w-full text-left border rounded-lg p-4 hover:bg-muted/30 transition-colors"
							>
								<div class="flex items-start justify-between mb-2">
									<div class="flex-1">
										<div class="flex items-center gap-2 mb-1">
											<p class="font-medium capitalize">{report.entityType} Reconciliation</p>
											<div
												class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border {getStatusColor(
													report.status
												)}"
											>
												{report.status}
											</div>
										</div>
										<p class="text-sm text-muted-foreground">
											{formatDate(report.createdAt)}
											{#if report.triggeredByEmail}
												• Triggered by {report.triggeredByEmail}
											{/if}
										</p>
									</div>
									<div class="text-right">
										{#each [calculateConsistencyScore(report)] as score}
											<p class="text-2xl font-bold {score >= 90 ? 'text-green-600' : score >= 70 ? 'text-yellow-600' : 'text-red-600'}">
												{score.toFixed(0)}%
											</p>
										{/each}
										<p class="text-xs text-muted-foreground">Consistency</p>
									</div>
								</div>

								<div class="grid grid-cols-4 gap-4 mt-3 text-sm">
									<div>
										<span class="text-muted-foreground">Matched:</span>
										<span class="ml-1 font-medium text-green-600">{report.totalMatched}</span>
									</div>
									<div>
										<span class="text-muted-foreground">Discrepancies:</span>
										<span class="ml-1 font-medium text-red-600"
											>{report.totalDiscrepancies}</span
										>
									</div>
									<div>
										<span class="text-muted-foreground">Missing Local:</span>
										<span class="ml-1 font-medium text-orange-600">{report.missingInLocal}</span>
									</div>
									<div>
										<span class="text-muted-foreground">Missing Remote:</span>
										<span class="ml-1 font-medium text-orange-600"
											>{report.missingInRemote}</span
										>
									</div>
								</div>

								{#if report.errorMessage}
									<div class="mt-3 flex items-center gap-2 text-sm text-red-600">
										<XCircle class="h-4 w-4" />
										<span>{report.errorMessage}</span>
									</div>
								{/if}
							</button>
						{/each}
					</div>
				{/if}
			</CardContent>
		</Card>
	{/if}
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
				<!-- Severity and Type -->
				<div class="flex items-center gap-2">
					<Badge variant={getSeverityVariant(detailDiscrepancy.severity)}>
						{detailDiscrepancy.severity}
					</Badge>
					<Badge variant="outline" class="capitalize">
						{detailDiscrepancy.discrepancyType.replace(/_/g, ' ')}
					</Badge>
				</div>

				<!-- Description -->
				<div>
					<Label class="text-sm font-medium">Description</Label>
					<p class="text-sm mt-1">{detailDiscrepancy.description}</p>
				</div>

				<!-- Entity Info -->
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

				<!-- Value Comparison -->
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

				<!-- Suggested Action -->
				{#if detailDiscrepancy.suggestedAction}
					<div class="p-4 bg-blue-50 border border-blue-200 rounded">
						<Label class="text-sm font-medium text-blue-900">Suggested Action</Label>
						<p class="text-sm text-blue-800 mt-1">{detailDiscrepancy.suggestedAction}</p>
					</div>
				{/if}

				<!-- Resolution Status -->
				{#if detailDiscrepancy.isResolved}
					<div class="p-4 bg-green-50 border border-green-200 rounded">
						<div class="flex items-center gap-2 mb-2">
							<CheckCircle2 class="h-4 w-4 text-green-600" />
							<Label class="text-sm font-medium text-green-900">Resolved</Label>
						</div>
						<p class="text-sm text-green-800">
							{#if detailDiscrepancy.resolvedAt}
								Resolved {formatDate(detailDiscrepancy.resolvedAt)} by {detailDiscrepancy.resolvedBy || 'System'}
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
						onclick={() => detailDiscrepancy && resolveDiscrepancy(detailDiscrepancy.id, 'Manually resolved from detail view')}
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
