<script lang="ts">
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Input } from '$lib/components/ui/input';
	import {
		Select,
		SelectContent,
		SelectItem,
		SelectTrigger,
		SelectValue
	} from '$lib/components/ui/select';
	import {
		AlertCircle,
		ChevronDown,
		ChevronRight,
		Filter,
		RefreshCw,
		Search,
		User,
		Database,
		Clock,
		ArrowLeftRight,
		CheckCircle2,
		XCircle,
		AlertTriangle
	} from '@lucide/svelte';
	import { invalidate, goto } from '$app/navigation';
	import { page } from '$app/stores';

	let { data } = $props();
	let logs = $derived(data.logs);
	let total = $derived(data.total);
	let currentPage = $derived(data.page);
	let limit = $derived(data.limit);
	let filters = $derived(data.filters);

	let refreshing = $state(false);
	let searchQuery = $state('');
	let expandedLogs = $state<Set<string>>(new Set());
	let verifying = $state(false);
	let generatingReport = $state(false);
	let verificationResult = $state<any>(null);
	let complianceReport = $state<any>(null);

	// Initialize from URL filters
	let selectedCategory = $state('all');
	let selectedEntityType = $state('all');

	$effect(() => {
		if (filters?.eventCategory) selectedCategory = filters.eventCategory;
		if (filters?.entityType) selectedEntityType = filters.entityType;
	});

	// Filter logs by search query
	let filteredLogs = $derived(
		searchQuery.trim()
			? logs.filter(
					(log: any) =>
						log.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
						log.eventType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
						log.action?.toLowerCase().includes(searchQuery.toLowerCase()) ||
						log.userEmail?.toLowerCase().includes(searchQuery.toLowerCase())
				)
			: logs
	);

	// Pagination calculations
	let totalPages = $derived(Math.ceil(total / limit));
	let hasNextPage = $derived(currentPage < totalPages);
	let hasPrevPage = $derived(currentPage > 1);

	// Event categories for filter
	const eventCategories = [
		{ value: 'all', label: 'All Categories' },
		{ value: 'sync', label: 'Sync Operations' },
		{ value: 'validation', label: 'Validation' },
		{ value: 'permission', label: 'Permissions' },
		{ value: 'reconciliation', label: 'Reconciliation' },
		{ value: 'webhook', label: 'Webhooks' },
		{ value: 'batch', label: 'Batch Operations' },
		{ value: 'rollback', label: 'Rollback' },
		{ value: 'system', label: 'System' }
	];

	// Entity types for filter
	const entityTypes = [
		{ value: 'all', label: 'All Entities' },
		{ value: 'employee', label: 'Employees' },
		{ value: 'department', label: 'Departments' },
		{ value: 'sync_job', label: 'Sync Jobs' },
		{ value: 'connection', label: 'Connections' },
		{ value: 'validation_rule', label: 'Validation Rules' },
		{ value: 'webhook_subscription', label: 'Webhooks' }
	];

	async function refreshAuditLogs() {
		refreshing = true;
		await invalidate('app:audit-trail');
		refreshing = false;
	}

	function toggleLogExpansion(logId: string) {
		if (expandedLogs.has(logId)) {
			expandedLogs.delete(logId);
		} else {
			expandedLogs.add(logId);
		}
		expandedLogs = new Set(expandedLogs); // Trigger reactivity
	}

	function getStatusColor(status: string | null): string {
		if (!status) return 'text-gray-600 bg-gray-50 border-gray-200';
		switch (status.toLowerCase()) {
			case 'success':
				return 'text-green-600 bg-green-50 border-green-200';
			case 'failed':
				return 'text-red-600 bg-red-50 border-red-200';
			case 'partial':
				return 'text-yellow-600 bg-yellow-50 border-yellow-200';
			case 'pending':
				return 'text-blue-600 bg-blue-50 border-blue-200';
			default:
				return 'text-gray-600 bg-gray-50 border-gray-200';
		}
	}

	function getActionBadgeVariant(
		action: string | null
	): 'default' | 'outline' | 'secondary' | 'destructive' {
		if (!action) return 'outline';
		switch (action.toLowerCase()) {
			case 'create':
				return 'default';
			case 'delete':
				return 'destructive';
			case 'update':
				return 'secondary';
			default:
				return 'outline';
		}
	}

	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toLocaleString();
	}

	function applyFilters() {
		const params = new URLSearchParams();
		if (selectedCategory !== 'all') params.set('category', selectedCategory);
		if (selectedEntityType !== 'all') params.set('entityType', selectedEntityType);
		params.set('page', '1'); // Reset to first page on filter change
		goto(`?${params.toString()}`);
	}

	function changePage(newPage: number) {
		const params = new URLSearchParams($page.url.searchParams);
		params.set('page', newPage.toString());
		goto(`?${params.toString()}`);
	}

	function parseJsonSafely(jsonStr: string | null): any {
		if (!jsonStr) return null;
		try {
			return JSON.parse(jsonStr);
		} catch {
			return null;
		}
	}

	async function verifyAuditIntegrity() {
		if (!browser) return;

		verifying = true;
		verificationResult = null;

		try {
			const thirtyDaysAgo = new Date();
			thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
			const now = new Date();

			const VERIFY_INTEGRITY_QUERY = `
				query VerifyAuditIntegrity($from: DateTime!, $to: DateTime!) {
					audit {
						verifyAuditIntegrity(from: $from, to: $to) {
							valid
							totalEntries
							issuesFound
							issues
						}
					}
				}
			`;

			const client = createUrqlClient(fetch);
			const result = await client
				.query(VERIFY_INTEGRITY_QUERY, {
					from: thirtyDaysAgo.toISOString(),
					to: now.toISOString()
				})
				.toPromise();

			if (result.error) {
				console.error('Verification failed:', result.error);
			} else {
				verificationResult = result.data?.audit?.verifyAuditIntegrity;
			}
		} catch (error) {
			console.error('Error verifying audit chain:', error);
		} finally {
			verifying = false;
		}
	}

	async function generateComplianceReport() {
		if (!browser) return;

		generatingReport = true;
		complianceReport = null;

		try {
			const thirtyDaysAgo = new Date();
			thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
			const now = new Date();

			const COMPLIANCE_REPORT_QUERY = `
				query ComplianceReport($from: DateTime!, $to: DateTime!) {
					audit {
						complianceReport(from: $from, to: $to) {
							startDate
							endDate
							totalActions
							dataModifications
							failedOperations
							userActivity {
								userEmail
								totalActions
								failedActions
								dataChanges
							}
						}
					}
				}
			`;

			const client = createUrqlClient(fetch);
			const result = await client
				.query(COMPLIANCE_REPORT_QUERY, {
					from: thirtyDaysAgo.toISOString(),
					to: now.toISOString()
				})
				.toPromise();

			if (result.error) {
				console.error('Report generation failed:', result.error);
			} else {
				complianceReport = result.data?.audit?.complianceReport;
			}
		} catch (error) {
			console.error('Error generating compliance report:', error);
		} finally {
			generatingReport = false;
		}
	}

	import { browser } from '$app/environment';
	import { createUrqlClient } from '$lib/graphql/client';
</script>

<div class="container mx-auto py-8 px-4">
	<div class="mb-6 flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold">Audit Trail</h1>
			<p class="text-sm text-muted-foreground mt-1">
				Comprehensive activity log for QuickBooks sync operations
			</p>
		</div>
		<div class="flex gap-2">
			<Button onclick={verifyAuditIntegrity} disabled={verifying} variant="outline" size="sm">
				<RefreshCw class="h-4 w-4 mr-2 {verifying ? 'animate-spin' : ''}" />
				{verifying ? 'Verifying...' : 'Verify Integrity'}
			</Button>
			<Button
				onclick={generateComplianceReport}
				disabled={generatingReport}
				variant="outline"
				size="sm"
			>
				<Database class="h-4 w-4 mr-2 {generatingReport ? 'animate-spin' : ''}" />
				{generatingReport ? 'Generating...' : 'Compliance Report'}
			</Button>
			<Button onclick={refreshAuditLogs} disabled={refreshing} variant="outline" size="sm">
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

	<!-- Verification Result -->
	{#if verificationResult}
		<Card class="mb-6">
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					{#if verificationResult.valid}
						<CheckCircle2 class="h-5 w-5 text-green-600" />
						Audit Chain Verified
					{:else}
						<XCircle class="h-5 w-5 text-red-600" />
						Audit Chain Issues Detected
					{/if}
				</CardTitle>
				<CardDescription>
					Integrity check for last 30 days
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div class="grid grid-cols-3 gap-4 mb-4">
					<div>
						<p class="text-sm text-muted-foreground">Total Entries</p>
						<p class="text-2xl font-bold">{verificationResult.totalEntries}</p>
					</div>
					<div>
						<p class="text-sm text-muted-foreground">Issues Found</p>
						<p class="text-2xl font-bold {verificationResult.issuesFound > 0 ? 'text-red-600' : 'text-green-600'}">
							{verificationResult.issuesFound}
						</p>
					</div>
					<div>
						<p class="text-sm text-muted-foreground">Status</p>
						<Badge variant={verificationResult.valid ? 'default' : 'destructive'}>
							{verificationResult.valid ? 'Valid' : 'Invalid'}
						</Badge>
					</div>
				</div>

				{#if verificationResult.issues && verificationResult.issues.length > 0}
					<div class="mt-4 p-4 border rounded-lg bg-muted/50">
						<h4 class="text-sm font-medium mb-2">Issues Detected:</h4>
						<ul class="space-y-1">
							{#each verificationResult.issues as issue}
								<li class="text-sm text-muted-foreground">• {issue}</li>
							{/each}
						</ul>
					</div>
				{/if}

				<div class="mt-4 flex justify-end">
					<Button variant="ghost" size="sm" onclick={() => (verificationResult = null)}>
						Dismiss
					</Button>
				</div>
			</CardContent>
		</Card>
	{/if}

	<!-- Compliance Report -->
	{#if complianceReport}
		<Card class="mb-6">
			<CardHeader>
				<div class="flex items-center justify-between">
					<div>
						<CardTitle>Compliance Report</CardTitle>
						<CardDescription>
							{new Date(complianceReport.startDate).toLocaleDateString()} - {new Date(complianceReport.endDate).toLocaleDateString()}
						</CardDescription>
					</div>
					<Button variant="ghost" size="sm" onclick={() => (complianceReport = null)}>
						Dismiss
					</Button>
				</div>
			</CardHeader>
			<CardContent>
				<!-- Summary Stats -->
				<div class="grid grid-cols-3 gap-4 mb-6">
					<div class="p-4 border rounded-lg">
						<p class="text-sm text-muted-foreground mb-1">Total Actions</p>
						<p class="text-2xl font-bold">{complianceReport.totalActions}</p>
					</div>
					<div class="p-4 border rounded-lg">
						<p class="text-sm text-muted-foreground mb-1">Data Modifications</p>
						<p class="text-2xl font-bold">{complianceReport.dataModifications}</p>
					</div>
					<div class="p-4 border rounded-lg">
						<p class="text-sm text-muted-foreground mb-1">Failed Operations</p>
						<p class="text-2xl font-bold text-red-600">{complianceReport.failedOperations}</p>
					</div>
				</div>

				<!-- User Activity Table -->
				{#if complianceReport.userActivity && complianceReport.userActivity.length > 0}
					<div>
						<h4 class="text-sm font-medium mb-3">User Activity Summary</h4>
						<div class="border rounded-lg overflow-hidden">
							<table class="w-full">
								<thead class="bg-muted">
									<tr>
										<th class="px-4 py-2 text-left text-sm font-medium">User</th>
										<th class="px-4 py-2 text-right text-sm font-medium">Total Actions</th>
										<th class="px-4 py-2 text-right text-sm font-medium">Failed Actions</th>
										<th class="px-4 py-2 text-right text-sm font-medium">Data Changes</th>
									</tr>
								</thead>
								<tbody>
									{#each complianceReport.userActivity as activity}
										<tr class="border-t">
											<td class="px-4 py-2 text-sm">{activity.userEmail}</td>
											<td class="px-4 py-2 text-sm text-right">{activity.totalActions}</td>
											<td class="px-4 py-2 text-sm text-right {activity.failedActions > 0 ? 'text-red-600 font-medium' : ''}">
												{activity.failedActions}
											</td>
											<td class="px-4 py-2 text-sm text-right">{activity.dataChanges}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				{/if}
			</CardContent>
		</Card>
	{/if}

	<!-- Filters and Search -->
	<Card class="mb-6">
		<CardHeader>
			<CardTitle class="flex items-center gap-2">
				<Filter class="h-5 w-5" />
				Filters & Search
			</CardTitle>
		</CardHeader>
		<CardContent>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				<!-- Search -->
				<div class="relative">
					<Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						type="text"
						placeholder="Search logs..."
						bind:value={searchQuery}
						class="pl-10"
					/>
				</div>

				<!-- Category Filter -->
				<!-- svelte-ignore a11y_label_has_associated_control -->
				<Select
					type="single"
					value={selectedCategory as any}
					onValueChange={(value: any) => {
						selectedCategory = value;
						applyFilters();
					}}
				>
					<SelectTrigger>
						<SelectValue placeholder="Select category" />
					</SelectTrigger>
					<SelectContent>
						{#each eventCategories as category}
							<SelectItem value={category.value}>{category.label}</SelectItem>
						{/each}
					</SelectContent>
				</Select>

				<!-- Entity Type Filter -->
				<!-- svelte-ignore a11y_label_has_associated_control -->
				<Select
					type="single"
					value={selectedEntityType as any}
					onValueChange={(value: any) => {
						selectedEntityType = value;
						applyFilters();
					}}
				>
					<SelectTrigger>
						<SelectValue placeholder="Select entity type" />
					</SelectTrigger>
					<SelectContent>
						{#each entityTypes as entityType}
							<SelectItem value={entityType.value}>{entityType.label}</SelectItem>
						{/each}
					</SelectContent>
				</Select>
			</div>

			<div class="mt-4 text-sm text-muted-foreground">
				Showing {filteredLogs.length} of {total} total records
				{#if selectedCategory !== 'all' || selectedEntityType !== 'all'}
					• Filters applied
				{/if}
			</div>
		</CardContent>
	</Card>

	<!-- Audit Logs List -->
	<Card>
		<CardHeader>
			<CardTitle>Audit Logs</CardTitle>
			<CardDescription>Detailed activity records with change tracking</CardDescription>
		</CardHeader>
		<CardContent>
			{#if filteredLogs.length === 0}
				<div class="text-center py-12 text-muted-foreground">
					<Database class="h-12 w-12 mx-auto mb-3" />
					<p class="font-medium">No audit logs found</p>
					<p class="text-sm">
						{searchQuery
							? 'Try adjusting your search or filters'
							: 'Audit logs will appear here as sync operations occur'}
					</p>
				</div>
			{:else}
				<div class="space-y-3">
					{#each filteredLogs as log}
						{@const isExpanded = expandedLogs.has(log.id)}
						{@const oldValues = parseJsonSafely(log.oldValues)}
						{@const newValues = parseJsonSafely(log.newValues)}
						<div class="border rounded-lg overflow-hidden">
							<!-- Log Header (Always Visible) -->
							<button
								onclick={() => toggleLogExpansion(log.id)}
								class="w-full p-4 hover:bg-muted/30 transition-colors text-left"
							>
								<div class="flex items-start gap-3">
									<div class="mt-1">
										{#if isExpanded}
											<ChevronDown class="h-5 w-5 text-muted-foreground" />
										{:else}
											<ChevronRight class="h-5 w-5 text-muted-foreground" />
										{/if}
									</div>

									<div class="flex-1 min-w-0">
										<!-- Title Row -->
										<div class="flex items-start justify-between gap-2 mb-2">
											<div class="flex-1">
												<p class="font-medium text-sm">
													{log.description || log.eventType}
												</p>
												<p class="text-xs text-muted-foreground mt-0.5">
													{log.eventType}
													{#if log.entityType}
														• {log.entityType}
													{/if}
													{#if log.entityId}
														• ID: {log.entityId}
													{/if}
												</p>
											</div>
											<div class="flex items-center gap-2 flex-shrink-0">
												{#if log.action}
													<Badge variant={getActionBadgeVariant(log.action)}>
														{log.action}
													</Badge>
												{/if}
												{#if log.status}
													<div
														class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border {getStatusColor(
															log.status
														)}"
													>
														{#if log.status === 'success'}
															<CheckCircle2 class="h-3 w-3 mr-1" />
														{:else if log.status === 'failed'}
															<XCircle class="h-3 w-3 mr-1" />
														{:else if log.status === 'partial'}
															<AlertTriangle class="h-3 w-3 mr-1" />
														{/if}
														{log.status}
													</div>
												{/if}
											</div>
										</div>

										<!-- Metadata Row -->
										<div class="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
											{#if log.userEmail}
												<span class="flex items-center gap-1">
													<User class="h-3 w-3" />
													{log.userEmail}
												</span>
											{/if}
											<span class="flex items-center gap-1">
												<Clock class="h-3 w-3" />
												{formatDate(log.createdAt)}
											</span>
											{#if log.syncDirection}
												<span class="flex items-center gap-1">
													<ArrowLeftRight class="h-3 w-3" />
													{log.syncDirection}
												</span>
											{/if}
											{#if log.syncJobId}
												<span>Job: {log.syncJobId}</span>
											{/if}
										</div>
									</div>
								</div>
							</button>

							<!-- Expanded Details -->
							{#if isExpanded}
								<div class="border-t bg-muted/20 p-4 space-y-4">
									<!-- Changes Summary -->
									{#if log.changesSummary}
										<div>
											<h4 class="text-sm font-medium mb-2">Changes Summary</h4>
											<p class="text-sm text-muted-foreground">{log.changesSummary}</p>
										</div>
									{/if}

									<!-- Old vs New Values -->
									{#if oldValues || newValues}
										<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
											{#if oldValues}
												<div>
													<h4 class="text-sm font-medium mb-2 text-red-600">Old Values</h4>
													<pre
														class="text-xs bg-background border rounded p-3 overflow-auto max-h-48">{JSON.stringify(
															oldValues,
															null,
															2
														)}</pre>
												</div>
											{/if}
											{#if newValues}
												<div>
													<h4 class="text-sm font-medium mb-2 text-green-600">New Values</h4>
													<pre
														class="text-xs bg-background border rounded p-3 overflow-auto max-h-48">{JSON.stringify(
															newValues,
															null,
															2
														)}</pre>
												</div>
											{/if}
										</div>
									{/if}

									<!-- Additional Details -->
									<div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
										{#if log.ipAddress}
											<div>
												<span class="text-muted-foreground">IP Address:</span>
												<p class="font-medium">{log.ipAddress}</p>
											</div>
										{/if}
										{#if log.source}
											<div>
												<span class="text-muted-foreground">Source:</span>
												<p class="font-medium">{log.source}</p>
											</div>
										{/if}
										{#if log.userId}
											<div>
												<span class="text-muted-foreground">User ID:</span>
												<p class="font-medium">{log.userId}</p>
											</div>
										{/if}
										{#if log.eventCategory}
											<div>
												<span class="text-muted-foreground">Category:</span>
												<p class="font-medium">{log.eventCategory}</p>
											</div>
										{/if}
									</div>

									<!-- Error Message -->
									{#if log.errorMessage}
										<Alert variant="destructive">
											<AlertCircle class="h-4 w-4" />
											<AlertDescription>
												<span class="font-medium">Error:</span>
												{log.errorMessage}
											</AlertDescription>
										</Alert>
									{/if}
								</div>
							{/if}
						</div>
					{/each}
				</div>

				<!-- Pagination -->
				{#if totalPages > 1}
					<div class="mt-6 flex items-center justify-between">
						<div class="text-sm text-muted-foreground">
							Page {currentPage} of {totalPages}
						</div>
						<div class="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								disabled={!hasPrevPage}
								onclick={() => changePage(currentPage - 1)}
							>
								Previous
							</Button>
							<div class="flex items-center gap-1">
								{#each Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
									const startPage = Math.max(1, currentPage - 2);
									return startPage + i;
								}).filter((p) => p <= totalPages) as pageNum}
									<Button
										variant={pageNum === currentPage ? 'default' : 'outline'}
										size="sm"
										onclick={() => changePage(pageNum)}
										class="w-10"
									>
										{pageNum}
									</Button>
								{/each}
							</div>
							<Button
								variant="outline"
								size="sm"
								disabled={!hasNextPage}
								onclick={() => changePage(currentPage + 1)}
							>
								Next
							</Button>
						</div>
					</div>
				{/if}
			{/if}
		</CardContent>
	</Card>
</div>
