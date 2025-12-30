<script lang="ts">
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
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
		TrendingUp
	} from '@lucide/svelte';
	import { invalidate, goto } from '$app/navigation';
	import { page } from '$app/stores';

	let { data } = $props();
	let reports = $derived(data.reports);
	let selectedReport = $derived(data.selectedReport);
	let discrepancies = $derived(data.discrepancies);
	let stats = $derived(data.stats);

	let refreshing = $state(false);

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

	function getStatusColor(status: string): string {
		switch (status.toLowerCase()) {
			case 'completed':
				return 'text-green-600 bg-green-50 border-green-200';
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
							<p class="text-sm text-muted-foreground">Match Rate</p>
							<p class="text-2xl font-bold">
								{calculateMatchRate(
									selectedReport.totalMatched,
									Math.max(selectedReport.totalLocal, selectedReport.totalRemote)
								).toFixed(1)}%
							</p>
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
									<div class="flex items-start justify-between mb-2">
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
						<p class="text-sm">Reports will appear here after running data reconciliation</p>
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
										<p class="text-2xl font-bold">
											{calculateMatchRate(
												report.totalMatched,
												Math.max(report.totalLocal, report.totalRemote)
											).toFixed(0)}%
										</p>
										<p class="text-xs text-muted-foreground">Match Rate</p>
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
