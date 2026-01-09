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
		AlertCircle,
		ChevronDown,
		ChevronRight,
		RefreshCw,
		Search,
		User,
		Database,
		Clock,
		ArrowLeftRight,
		CheckCircle2,
		XCircle,
		AlertTriangle,
		FileText,
		Filter,
		Shield
	} from '@lucide/svelte';
	import { invalidate, goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { createUrqlClient } from '$lib/graphql/client';

	// GraphQL queries
	const VERIFY_AUDIT_INTEGRITY_QUERY = `
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

	const AUDIT_COMPLIANCE_SUMMARY_QUERY = `
		query AuditComplianceSummary($from: DateTime!, $to: DateTime!) {
			audit {
				auditComplianceSummary(from: $from, to: $to) {
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
	let showVerificationModal = $state(false);
	let showComplianceModal = $state(false);

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

	// Calculate stats
	let stats = $derived({
		totalLogs: total,
		successCount: logs.filter((l: any) => l.status === 'success').length,
		failedCount: logs.filter((l: any) => l.status === 'failed').length,
		partialCount: logs.filter((l: any) => l.status === 'partial').length,
		successRate: total > 0 ? ((logs.filter((l: any) => l.status === 'success').length / total) * 100).toFixed(1) : '0.0'
	});

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
			// Calculate date range (last 30 days)
			const to = new Date();
			const from = new Date();
			from.setDate(from.getDate() - 30);

			// Create GraphQL client
			const client = createUrqlClient(fetch);

			// Execute query
			const result = await client
				.query(VERIFY_AUDIT_INTEGRITY_QUERY, {
					from: from.toISOString(),
					to: to.toISOString()
				})
				.toPromise();

			if (result.error) {
				throw new Error(result.error.message || 'Failed to verify audit integrity');
			}

			verificationResult = result.data?.audit?.verifyAuditIntegrity || {
				valid: false,
				totalEntries: 0,
				issuesFound: 0,
				issues: ['Failed to retrieve verification results']
			};

			showVerificationModal = true;
		} catch (error) {
			console.error('Error verifying audit chain:', error);
			verificationResult = {
				valid: false,
				totalEntries: 0,
				issuesFound: 1,
				issues: [error instanceof Error ? error.message : 'Unknown error occurred']
			};
			showVerificationModal = true;
		} finally {
			verifying = false;
		}
	}

	async function generateComplianceReport() {
		if (!browser) return;

		generatingReport = true;
		complianceReport = null;

		try {
			// Calculate date range (last 30 days)
			const to = new Date();
			const from = new Date();
			from.setDate(from.getDate() - 30);

			// Create GraphQL client
			const client = createUrqlClient(fetch);

			// Execute query
			const result = await client
				.query(AUDIT_COMPLIANCE_SUMMARY_QUERY, {
					from: from.toISOString(),
					to: to.toISOString()
				})
				.toPromise();

			if (result.error) {
				throw new Error(result.error.message || 'Failed to generate compliance report');
			}

			complianceReport = result.data?.audit?.auditComplianceSummary || {
				startDate: from.toISOString(),
				endDate: to.toISOString(),
				totalActions: 0,
				dataModifications: 0,
				failedOperations: 0,
				userActivity: []
			};

			showComplianceModal = true;
		} catch (error) {
			console.error('Error generating compliance report:', error);
			complianceReport = {
				startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
				endDate: new Date().toISOString(),
				totalActions: 0,
				dataModifications: 0,
				failedOperations: 0,
				userActivity: [],
				error: error instanceof Error ? error.message : 'Unknown error occurred'
			};
			showComplianceModal = true;
		} finally {
			generatingReport = false;
		}
	}
</script>

<div class="flex flex-col h-full overflow-hidden bg-background">
	<!-- Toolbar -->
	<header class="flex-shrink-0 flex items-center justify-between h-14 px-4 border-b bg-background z-20">
		<div class="flex items-center gap-4">
			<h1 class="text-sm font-semibold tracking-tight">Audit Trail</h1>
			<div class="h-4 w-px bg-border"></div>
			<div class="flex items-center gap-2 text-xs text-muted-foreground">
				<Shield class="h-3.5 w-3.5" />
				<span>QuickBooks Sync Activity</span>
			</div>
		</div>
		<div class="flex gap-2">
			<button
				onclick={verifyAuditIntegrity}
				disabled={verifying}
				class="flex items-center gap-1.5 h-8 px-3 rounded-sm border border-input bg-background text-xs hover:bg-accent transition-colors disabled:opacity-50"
			>
				<RefreshCw class="h-3.5 w-3.5 {verifying ? 'animate-spin' : ''}" />
				{verifying ? 'Verifying...' : 'Verify Integrity'}
			</button>
			<button
				onclick={generateComplianceReport}
				disabled={generatingReport}
				class="flex items-center gap-1.5 h-8 px-3 rounded-sm border border-input bg-background text-xs hover:bg-accent transition-colors disabled:opacity-50"
			>
				<Database class="h-3.5 w-3.5 {generatingReport ? 'animate-spin' : ''}" />
				{generatingReport ? 'Generating...' : 'Compliance Report'}
			</button>
			<button
				onclick={refreshAuditLogs}
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
			<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium border border-destructive/20">
				{data.error}
			</div>
		</div>
	{/if}

	<div class="flex-1 overflow-auto bg-muted/5">
		<!-- KPI Grid -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border-b">
			<!-- Total Logs -->
			<div class="p-6 border-r last:border-r-0 bg-background flex flex-col justify-between h-32">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Logs</span>
					<FileText class="h-4 w-4 text-muted-foreground" />
				</div>
				<div>
					<div class="text-3xl font-bold tracking-tight">{stats.totalLogs}</div>
					<div class="mt-1 text-xs text-muted-foreground">Showing {filteredLogs.length}</div>
				</div>
			</div>

			<!-- Success Rate -->
			<div class="p-6 border-r last:border-r-0 bg-background flex flex-col justify-between h-32">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Success Rate</span>
					<CheckCircle2 class="h-4 w-4 text-muted-foreground" />
				</div>
				<div>
					<div class="text-3xl font-bold tracking-tight text-green-600">{stats.successRate}%</div>
					<div class="mt-1 text-xs text-muted-foreground">{stats.successCount} successful</div>
				</div>
			</div>

			<!-- Failed Operations -->
			<div class="p-6 border-r last:border-r-0 bg-background flex flex-col justify-between h-32">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Failed</span>
					<XCircle class="h-4 w-4 text-muted-foreground" />
				</div>
				<div>
					<div class="text-3xl font-bold tracking-tight text-red-600">{stats.failedCount}</div>
					<div class="mt-1 text-xs text-muted-foreground">
						{stats.partialCount > 0 ? `${stats.partialCount} partial` : 'Require attention'}
					</div>
				</div>
			</div>

			<!-- Active Filters -->
			<div class="p-6 bg-background flex flex-col justify-between h-32">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Filters</span>
					<Filter class="h-4 w-4 text-muted-foreground" />
				</div>
				<div>
					<div class="text-lg font-bold tracking-tight">
						{selectedCategory !== 'all' || selectedEntityType !== 'all' ? 'Active' : 'None'}
					</div>
					<div class="mt-1 text-xs text-muted-foreground">
						{selectedCategory !== 'all' || selectedEntityType !== 'all'
							? `${selectedCategory !== 'all' ? selectedCategory : ''}${selectedCategory !== 'all' && selectedEntityType !== 'all' ? ' • ' : ''}${selectedEntityType !== 'all' ? selectedEntityType : ''}`
							: 'All records'}
					</div>
				</div>
			</div>
		</div>

		<!-- Search and Filters Bar -->
		<div class="p-4 border-b bg-background">
			<div class="grid grid-cols-1 md:grid-cols-3 gap-3">
				<!-- Search -->
				<div class="relative">
					<Search class="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
					<input
						type="text"
						placeholder="Search logs..."
						bind:value={searchQuery}
						class="h-8 w-full pl-9 pr-3 text-xs rounded-sm border border-input bg-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
					/>
				</div>

				<!-- Category Filter -->
				<select
					bind:value={selectedCategory}
					onchange={applyFilters}
					class="h-8 px-3 text-xs rounded-sm border border-input bg-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
				>
					{#each eventCategories as category}
						<option value={category.value}>{category.label}</option>
					{/each}
				</select>

				<!-- Entity Type Filter -->
				<select
					bind:value={selectedEntityType}
					onchange={applyFilters}
					class="h-8 px-3 text-xs rounded-sm border border-input bg-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
				>
					{#each entityTypes as entityType}
						<option value={entityType.value}>{entityType.label}</option>
					{/each}
				</select>
			</div>
		</div>

		<!-- Audit Logs List -->
		{#if filteredLogs.length === 0}
			<div class="px-4 py-12 text-center text-muted-foreground bg-background">
				<Database class="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
				<p class="font-medium text-sm">No audit logs found</p>
				<p class="text-xs mt-1">
					{searchQuery
						? 'Try adjusting your search or filters'
						: 'Audit logs will appear here as sync operations occur'}
				</p>
			</div>
		{:else}
			<div class="bg-background p-4 space-y-2">
				{#each filteredLogs as log}
					{@const isExpanded = expandedLogs.has(log.id)}
					{@const oldValues = parseJsonSafely(log.oldValues)}
					{@const newValues = parseJsonSafely(log.newValues)}
					<div class="border rounded-sm overflow-hidden">
						<!-- Log Header (Always Visible) -->
						<button
							onclick={() => toggleLogExpansion(log.id)}
							class="w-full p-3 hover:bg-muted/30 transition-colors text-left"
						>
							<div class="flex items-start gap-3">
								<div class="mt-0.5">
									{#if isExpanded}
										<ChevronDown class="h-4 w-4 text-muted-foreground" />
									{:else}
										<ChevronRight class="h-4 w-4 text-muted-foreground" />
									{/if}
								</div>

								<div class="flex-1 min-w-0">
									<!-- Title Row -->
									<div class="flex items-start justify-between gap-2 mb-1.5">
										<div class="flex-1">
											<p class="font-medium text-xs">
												{log.description || log.eventType}
											</p>
											<p class="text-[10px] text-muted-foreground mt-0.5">
												{log.eventType}
												{#if log.entityType}
													• {log.entityType}
												{/if}
												{#if log.entityId}
													• ID: {log.entityId}
												{/if}
											</p>
										</div>
										<div class="flex items-center gap-1.5 flex-shrink-0">
											{#if log.action}
												<Badge variant={getActionBadgeVariant(log.action)} class="text-[10px]">
													{log.action}
												</Badge>
											{/if}
											{#if log.status}
												<div
													class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border {getStatusColor(
														log.status
													)}"
												>
													{#if log.status === 'success'}
														<CheckCircle2 class="h-2.5 w-2.5 mr-0.5" />
													{:else if log.status === 'failed'}
														<XCircle class="h-2.5 w-2.5 mr-0.5" />
													{:else if log.status === 'partial'}
														<AlertTriangle class="h-2.5 w-2.5 mr-0.5" />
													{/if}
													{log.status}
												</div>
											{/if}
										</div>
									</div>

									<!-- Metadata Row -->
									<div class="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
										{#if log.userEmail}
											<span class="flex items-center gap-0.5">
												<User class="h-2.5 w-2.5" />
												{log.userEmail}
											</span>
										{/if}
										<span class="flex items-center gap-0.5">
											<Clock class="h-2.5 w-2.5" />
											{formatDate(log.createdAt)}
										</span>
										{#if log.syncDirection}
											<span class="flex items-center gap-0.5">
												<ArrowLeftRight class="h-2.5 w-2.5" />
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
							<div class="border-t bg-muted/20 p-3 space-y-3">
								<!-- Changes Summary -->
								{#if log.changesSummary}
									<div>
										<h4 class="text-xs font-medium mb-1">Changes Summary</h4>
										<p class="text-xs text-muted-foreground">{log.changesSummary}</p>
									</div>
								{/if}

								<!-- Old vs New Values -->
								{#if oldValues || newValues}
									<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
										{#if oldValues}
											<div>
												<h4 class="text-xs font-medium mb-1 text-red-600">Old Values</h4>
												<pre
													class="text-[10px] bg-background border rounded p-2 overflow-auto max-h-32">{JSON.stringify(
														oldValues,
														null,
														2
													)}</pre>
											</div>
										{/if}
										{#if newValues}
											<div>
												<h4 class="text-xs font-medium mb-1 text-green-600">New Values</h4>
												<pre
													class="text-[10px] bg-background border rounded p-2 overflow-auto max-h-32">{JSON.stringify(
														newValues,
														null,
														2
													)}</pre>
											</div>
										{/if}
									</div>
								{/if}

								<!-- Additional Details -->
								<div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
									{#if log.ipAddress}
										<div>
											<span class="text-muted-foreground text-[10px]">IP Address:</span>
											<p class="font-medium">{log.ipAddress}</p>
										</div>
									{/if}
									{#if log.source}
										<div>
											<span class="text-muted-foreground text-[10px]">Source:</span>
											<p class="font-medium">{log.source}</p>
										</div>
									{/if}
									{#if log.userId}
										<div>
											<span class="text-muted-foreground text-[10px]">User ID:</span>
											<p class="font-medium">{log.userId}</p>
										</div>
									{/if}
									{#if log.eventCategory}
										<div>
											<span class="text-muted-foreground text-[10px]">Category:</span>
											<p class="font-medium">{log.eventCategory}</p>
										</div>
									{/if}
								</div>

								<!-- Error Message -->
								{#if log.errorMessage}
									<div class="p-2 bg-destructive/10 border border-destructive/20 rounded">
										<div class="flex items-start gap-1.5">
											<AlertCircle class="h-3 w-3 text-destructive mt-0.5 flex-shrink-0" />
											<div class="flex-1 min-w-0">
												<span class="font-medium text-xs text-destructive">Error:</span>
												<p class="text-xs text-destructive mt-0.5">{log.errorMessage}</p>
											</div>
										</div>
									</div>
								{/if}
							</div>
						{/if}
					</div>
				{/each}
			</div>

			<!-- Pagination -->
			{#if totalPages > 1}
				<div class="p-4 border-t bg-background flex items-center justify-between">
					<div class="text-xs text-muted-foreground">
						Page {currentPage} of {totalPages}
					</div>
					<div class="flex items-center gap-2">
						<button
							disabled={!hasPrevPage}
							onclick={() => changePage(currentPage - 1)}
							class="h-8 px-3 text-xs rounded-sm border border-input bg-background hover:bg-accent transition-colors disabled:opacity-50"
						>
							Previous
						</button>
						<div class="flex items-center gap-1">
							{#each Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
								const startPage = Math.max(1, currentPage - 2);
								return startPage + i;
							}).filter((p) => p <= totalPages) as pageNum}
								<button
									onclick={() => changePage(pageNum)}
									class="h-8 w-8 text-xs rounded-sm border {pageNum === currentPage
										? 'bg-primary text-primary-foreground border-primary'
										: 'bg-background border-input hover:bg-accent'} transition-colors"
								>
									{pageNum}
								</button>
							{/each}
						</div>
						<button
							disabled={!hasNextPage}
							onclick={() => changePage(currentPage + 1)}
							class="h-8 px-3 text-xs rounded-sm border border-input bg-background hover:bg-accent transition-colors disabled:opacity-50"
						>
							Next
						</button>
					</div>
				</div>
			{/if}
		{/if}
	</div>
</div>

<!-- Verification Result Modal -->
<Dialog open={showVerificationModal} onOpenChange={(open) => (showVerificationModal = open)}>
	<DialogContent class="max-w-2xl">
		<DialogHeader>
			<DialogTitle class="flex items-center gap-2">
				{#if verificationResult?.valid}
					<CheckCircle2 class="h-5 w-5 text-green-600" />
					Audit Chain Verified
				{:else}
					<XCircle class="h-5 w-5 text-red-600" />
					Audit Chain Issues Detected
				{/if}
			</DialogTitle>
			<DialogDescription>
				Integrity check for last 30 days
			</DialogDescription>
		</DialogHeader>

		{#if verificationResult}
			<div class="space-y-4">
				<div class="grid grid-cols-3 gap-4">
					<div class="p-4 border rounded">
						<p class="text-xs text-muted-foreground mb-1">Total Entries</p>
						<p class="text-2xl font-bold">{verificationResult.totalEntries}</p>
					</div>
					<div class="p-4 border rounded">
						<p class="text-xs text-muted-foreground mb-1">Issues Found</p>
						<p class="text-2xl font-bold {verificationResult.issuesFound > 0 ? 'text-red-600' : 'text-green-600'}">
							{verificationResult.issuesFound}
						</p>
					</div>
					<div class="p-4 border rounded">
						<p class="text-xs text-muted-foreground mb-1">Status</p>
						<Badge variant={verificationResult.valid ? 'default' : 'destructive'}>
							{verificationResult.valid ? 'Valid' : 'Invalid'}
						</Badge>
					</div>
				</div>

				{#if verificationResult.issues && verificationResult.issues.length > 0}
					<div class="p-3 border rounded bg-muted/50">
						<h4 class="text-sm font-medium mb-2">Issues Detected:</h4>
						<ul class="space-y-1">
							{#each verificationResult.issues as issue}
								<li class="text-xs text-muted-foreground">• {issue}</li>
							{/each}
						</ul>
					</div>
				{/if}

				{#if verificationResult.message}
					<div class="p-3 bg-blue-50 border border-blue-200 rounded">
						<p class="text-sm text-blue-800">{verificationResult.message}</p>
					</div>
				{/if}

				{#if verificationResult.error}
					<div class="p-3 bg-red-50 border border-red-200 rounded">
						<p class="text-sm text-red-800">{verificationResult.error}</p>
					</div>
				{/if}
			</div>
		{/if}

		<DialogFooter>
			<Button variant="ghost" onclick={() => (showVerificationModal = false)}>
				Close
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>

<!-- Compliance Report Modal -->
<Dialog open={showComplianceModal} onOpenChange={(open) => (showComplianceModal = open)}>
	<DialogContent class="max-w-2xl">
		<DialogHeader>
			<DialogTitle>Compliance Report</DialogTitle>
			<DialogDescription>
				{#if complianceReport}
					{new Date(complianceReport.startDate).toLocaleDateString()} - {new Date(complianceReport.endDate).toLocaleDateString()}
				{/if}
			</DialogDescription>
		</DialogHeader>

		{#if complianceReport}
			<div class="space-y-4">
				<!-- Summary Stats -->
				<div class="grid grid-cols-3 gap-4">
					<div class="p-4 border rounded">
						<p class="text-xs text-muted-foreground mb-1">Total Actions</p>
						<p class="text-2xl font-bold">{complianceReport.totalActions}</p>
					</div>
					<div class="p-4 border rounded">
						<p class="text-xs text-muted-foreground mb-1">Data Modifications</p>
						<p class="text-2xl font-bold">{complianceReport.dataModifications}</p>
					</div>
					<div class="p-4 border rounded">
						<p class="text-xs text-muted-foreground mb-1">Failed Operations</p>
						<p class="text-2xl font-bold text-red-600">{complianceReport.failedOperations}</p>
					</div>
				</div>

				<!-- User Activity Table -->
				{#if complianceReport.userActivity && complianceReport.userActivity.length > 0}
					<div>
						<h4 class="text-sm font-medium mb-2">User Activity Summary</h4>
						<div class="border rounded overflow-hidden">
							<table class="w-full text-sm">
								<thead class="bg-muted/40">
									<tr>
										<th class="px-3 py-2 text-left text-xs font-medium">User</th>
										<th class="px-3 py-2 text-right text-xs font-medium">Total Actions</th>
										<th class="px-3 py-2 text-right text-xs font-medium">Failed Actions</th>
										<th class="px-3 py-2 text-right text-xs font-medium">Data Changes</th>
									</tr>
								</thead>
								<tbody class="divide-y">
									{#each complianceReport.userActivity as activity}
										<tr>
											<td class="px-3 py-2 text-xs">{activity.userEmail}</td>
											<td class="px-3 py-2 text-xs text-right">{activity.totalActions}</td>
											<td class="px-3 py-2 text-xs text-right {activity.failedActions > 0 ? 'text-red-600 font-medium' : ''}">
												{activity.failedActions}
											</td>
											<td class="px-3 py-2 text-xs text-right">{activity.dataChanges}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				{/if}

				{#if complianceReport.message}
					<div class="p-3 bg-blue-50 border border-blue-200 rounded">
						<p class="text-sm text-blue-800">{complianceReport.message}</p>
					</div>
				{/if}

				{#if complianceReport.error}
					<div class="p-3 bg-red-50 border border-red-200 rounded">
						<p class="text-sm text-red-800">{complianceReport.error}</p>
					</div>
				{/if}
			</div>
		{/if}

		<DialogFooter>
			<Button variant="ghost" onclick={() => (showComplianceModal = false)}>
				Close
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>
