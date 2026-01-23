<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import {
		AlertCircle,
		AlertTriangle,
		CheckCircle2,
		RefreshCw,
		Link as LinkIcon,
		Unlink,
		Clock,
		RotateCcw,
		Lock,
		TrendingUp,
		TrendingDown
	} from '@lucide/svelte';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { invalidate } from '$app/navigation';
	import { errorStore, showSuccess } from '$lib/stores/error.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { disconnectIntuit } from '$lib/graphql/intuit-oauth/operations';

	const { data } = $props();

	// Check for OAuth callback success/error
	onMount(() => {
		const urlParams = new URLSearchParams(window.location.search);
		const success = urlParams.get('success');
		const error = urlParams.get('error');

		if (success === 'connected') {
			showSuccess('Successfully connected to QuickBooks!');
			// Clear query params
			window.history.replaceState({}, '', window.location.pathname);
			// Refresh data
			invalidate('app:integrations');
		} else if (success === 'reconnected') {
			showSuccess('Successfully reconnected to QuickBooks!');
			window.history.replaceState({}, '', window.location.pathname);
			invalidate('app:integrations');
		} else if (error) {
			errorStore.add({
				message: decodeURIComponent(error),
				type: 'error'
			});
			window.history.replaceState({}, '', window.location.pathname);
		}
	});

	// Derive metrics with safe defaults
	const metrics = $derived(
		data.metrics || {
			uptimePercentage: 0,
			totalSyncs24h: 0,
			successRate: 0,
			errorRate: 0,
			activeAlertsCount: 0
		}
	);

	const alerts = $derived(data.alerts || []);

	// Compute derived metrics
	const hasErrors = $derived(metrics.errorRate > 5);
	const hasAlerts = $derived(metrics.activeAlertsCount > 0);
	const healthStatus = $derived(
		metrics.successRate >= 95 ? 'healthy' : metrics.successRate >= 80 ? 'warning' : 'critical'
	);

	// Sync permissions from server
	const perms = $derived(
		data.syncPermissions || {
			canTriggerEmployeeSync: false,
			canTriggerDepartmentSync: false,
			canPushToQuickBooks: false,
			canTriggerBidirectionalSync: false,
			canForceFullSync: false,
			canCancelSync: false,
			canViewConflicts: false,
			canResolveConflicts: false,
			canBulkResolveConflicts: false,
			canViewHistory: false,
			canViewMetrics: false,
			canViewAuditTrail: false,
			canExportData: false,
			canManageIntegrations: false,
			canManagePermissions: false
		}
	);

	let disconnecting = $state(false);
	let resettingForTest = $state(false);

	// Dialog states
	let bidirectionalSyncDialogOpen = $state(false);
	let resetTestDialogOpen = $state(false);
	let disconnectDialogOpen = $state(false);
	let pendingBidirectionalSync = $state<'EMPLOYEE' | 'DEPARTMENT' | 'ALL' | null>(null);

	// Two-way sync state
	let syncingBidirectional = $state(false);
	let selectedConflictStrategy = $state('LAST_WRITE_WINS');
	let selectedSyncMode = $state('AUTO');
	let selectedEntityType = $state<'EMPLOYEE' | 'DEPARTMENT' | 'ALL' | null>(null);

	// Check if we're in development mode
	const isDev = import.meta.env.DEV;

	function openBidirectionalSyncDialog(entityType: 'EMPLOYEE' | 'DEPARTMENT' | 'ALL') {
		pendingBidirectionalSync = entityType;
		bidirectionalSyncDialogOpen = true;
	}

	async function confirmBidirectionalSync() {
		if (!pendingBidirectionalSync) return;

		bidirectionalSyncDialogOpen = false;
		const entityType = pendingBidirectionalSync;
		pendingBidirectionalSync = null;

		syncingBidirectional = true;
		selectedEntityType = entityType;

		try {
			if (entityType === 'ALL') {
				// Sync both employees and departments sequentially
				let totalPushed = 0;
				let totalPulled = 0;
				let totalConflicts = 0;
				let totalDetected = 0;
				let totalProcessed = 0;
				let allErrors: any[] = [];

				// Sync employees first
				const employeeResponse = await fetch('/api/intuit/sync-bidirectional', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						entityType: 'EMPLOYEE',
						conflictStrategy: selectedConflictStrategy,
						syncMode: selectedSyncMode
					})
				});

				const employeeResult = await employeeResponse.json();
				if (employeeResponse.ok) {
					totalPushed += employeeResult.pushed_count || 0;
					totalPulled += employeeResult.pulled_count || 0;
					totalConflicts += employeeResult.conflicts_resolved || 0;
					totalDetected += employeeResult.changes_detected || 0;
					totalProcessed += employeeResult.changes_processed || 0;
					allErrors = [...allErrors, ...(employeeResult.errors || [])];
				}

				// Sync departments
				const deptResponse = await fetch('/api/intuit/sync-bidirectional', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						entityType: 'DEPARTMENT',
						conflictStrategy: selectedConflictStrategy,
						syncMode: selectedSyncMode
					})
				});

				const deptResult = await deptResponse.json();
				if (deptResponse.ok) {
					totalPushed += deptResult.pushed_count || 0;
					totalPulled += deptResult.pulled_count || 0;
					totalConflicts += deptResult.conflicts_resolved || 0;
					totalDetected += deptResult.changes_detected || 0;
					totalProcessed += deptResult.changes_processed || 0;
					allErrors = [...allErrors, ...(deptResult.errors || [])];
				}

				if (!employeeResponse.ok || !deptResponse.ok) {
					errorStore.add({
						message: 'Some syncs failed. Check the results below.',
						type: 'error',
						details: { employeeResult, deptResult }
					});
				} else {
					showSuccess(
						`Sync completed: ${totalDetected} detected, ${totalProcessed} processed (${totalPushed} pushed, ${totalPulled} pulled, ${totalConflicts} conflicts resolved)`
					);

					if (allErrors.length > 0) {
						console.warn('Sync errors:', allErrors);
						errorStore.add({
							message: `Completed with ${allErrors.length} error(s). Check console for details.`,
							type: 'error',
							details: allErrors
						});
					}

					await invalidate('app:integrations');
				}
			} else {
				// Single entity type sync
				const response = await fetch('/api/intuit/sync-bidirectional', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						entityType,
						conflictStrategy: selectedConflictStrategy,
						syncMode: selectedSyncMode
					})
				});

				const result = await response.json();

				if (!response.ok) {
					errorStore.add({
						message: result.message || result.error || 'Failed to perform bidirectional sync',
						type: 'error',
						details: result
					});
				} else {
					const {
						pushed_count = 0,
						pulled_count = 0,
						conflicts_resolved = 0,
						errors = [],
						sync_mode = 'unknown',
						changes_detected = 0,
						changes_processed = 0
					} = result;
					showSuccess(
						`${sync_mode.toUpperCase()} sync completed: ${changes_detected} detected, ${changes_processed} processed (${pushed_count} pushed, ${pulled_count} pulled, ${conflicts_resolved} conflicts resolved)`
					);

					if (errors.length > 0) {
						console.warn('Sync errors:', errors);
						errorStore.add({
							message: `Completed with ${errors.length} error(s). Check console for details.`,
							type: 'error',
							details: errors
						});
					}

					// Reload page after a delay to show the message
					await invalidate('app:integrations');
				}
			}
		} catch (error: any) {
			errorStore.add({
				message: 'Failed to perform bidirectional sync',
				type: 'error',
				details: error
			});
		} finally {
			syncingBidirectional = false;
			selectedEntityType = null;
		}
	}

	function openResetTestDialog() {
		resetTestDialogOpen = true;
	}

	async function confirmResetTest() {
		resetTestDialogOpen = false;
		resettingForTest = true;

		try {
			const response = await fetch('/api/intuit/reset-test', { method: 'POST' });
			const result = await response.json();

			if (!response.ok) {
				errorStore.add({
					message: result.message || result.error || 'Failed to reset for testing',
					type: 'error',
					details: result
				});
			} else {
				showSuccess(
					result.message ||
						`Reset ${result.resetCount || 0} item(s) for testing. You can now re-push them.`
				);
			}
		} catch (error: any) {
			errorStore.add({
				message: 'Failed to reset sync status',
				type: 'error',
				details: error
			});
		} finally {
			resettingForTest = false;
		}
	}

	function openDisconnectDialog() {
		disconnectDialogOpen = true;
	}

	async function confirmDisconnect() {
		disconnectDialogOpen = false;
		disconnecting = true;

		try {
			const result = await disconnectIntuit();

			if (!result.success) {
				errorStore.add({
					message: result.error || 'Failed to disconnect',
					type: 'error'
				});
			} else {
				showSuccess('Successfully disconnected from QuickBooks');
				await invalidate('app:integrations');
			}
		} catch (error: any) {
			errorStore.add({
				message: 'Failed to disconnect from QuickBooks',
				type: 'error',
				details: error
			});
		} finally {
			disconnecting = false;
		}
	}
</script>

{#if data.intuitConnected}
	<div class="flex flex-col h-full overflow-hidden bg-background">
		<!-- Toolbar Header -->
		<header
			class="flex-shrink-0 flex items-center justify-between h-14 px-4 border-b bg-background z-20"
		>
			<div class="flex items-center gap-4">
				<h1 class="text-sm font-semibold tracking-tight">QuickBooks Integration</h1>
				<div class="h-4 w-px bg-border"></div>
				<div class="flex items-center gap-2 text-xs text-muted-foreground">
					<CheckCircle2 class="h-3.5 w-3.5 text-green-600" />
					<span>Connected to {data.intuitCompanyName || 'QuickBooks'}</span>
				</div>
			</div>
			<div class="flex items-center gap-2">
				{#if perms.canManageIntegrations}
					<Button
						variant="ghost"
						size="sm"
						onclick={openDisconnectDialog}
						disabled={disconnecting}
						class="h-8 text-xs"
					>
						{#if disconnecting}
							<RefreshCw class="h-3.5 w-3.5 mr-1.5 animate-spin" />
							Disconnecting...
						{:else}
							<Unlink class="h-3.5 w-3.5 mr-1.5" />
							Disconnect
						{/if}
					</Button>
				{/if}
			</div>
		</header>

		{#if data.error}
			<div class="flex-shrink-0 p-2 border-b bg-destructive/10">
				<div class="flex items-center gap-2 text-xs text-destructive">
					<AlertCircle class="h-3.5 w-3.5" />
					<span>{data.error}</span>
				</div>
			</div>
		{/if}

		<div class="flex-1 overflow-auto bg-muted/5">
			<!-- Metrics Overview -->
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 border-b">
				<div class="p-6 border-r last:border-r-0 bg-background flex flex-col justify-between h-32">
					<div class="flex items-center justify-between">
						<span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
							>Success Rate</span
						>
						{#if healthStatus === 'healthy'}
							<CheckCircle2 class="h-4 w-4 text-green-600" />
						{:else if healthStatus === 'warning'}
							<AlertTriangle class="h-4 w-4 text-yellow-600" />
						{:else}
							<AlertCircle class="h-4 w-4 text-red-600" />
						{/if}
					</div>
					<div>
						<div
							class="text-3xl font-bold tracking-tight"
							class:text-green-600={healthStatus === 'healthy'}
							class:text-yellow-600={healthStatus === 'warning'}
							class:text-red-600={healthStatus === 'critical'}
						>
							{Math.round(metrics.successRate)}%
						</div>
						<div class="mt-1 text-xs text-muted-foreground flex items-center gap-1">
							{#if metrics.totalSyncs24h > 0}
								<span>{metrics.totalSyncs24h} syncs / 24h</span>
							{:else}
								<span>No recent syncs</span>
							{/if}
						</div>
					</div>
				</div>

				<div class="p-6 border-r last:border-r-0 bg-background flex flex-col justify-between h-32">
					<div class="flex items-center justify-between">
						<span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
							>Uptime</span
						>
						<TrendingUp class="h-4 w-4 text-muted-foreground" />
					</div>
					<div>
						<div class="text-3xl font-bold tracking-tight">
							{Math.round(metrics.uptimePercentage)}%
						</div>
						<div class="mt-1 text-xs text-muted-foreground">Last 24 hours</div>
					</div>
				</div>

				<div class="p-6 border-r last:border-r-0 bg-background flex flex-col justify-between h-32">
					<div class="flex items-center justify-between">
						<span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
							>Errors</span
						>
						{#if hasErrors}
							<AlertCircle class="h-4 w-4 text-red-600" />
						{:else}
							<CheckCircle2 class="h-4 w-4 text-green-600" />
						{/if}
					</div>
					<div>
						<div class="text-3xl font-bold tracking-tight" class:text-red-600={hasErrors}>
							{Math.round(metrics.errorRate)}%
						</div>
						<div class="mt-1 text-xs text-muted-foreground">Error rate</div>
					</div>
				</div>

				<div class="p-6 border-r last:border-r-0 bg-background flex flex-col justify-between h-32">
					<div class="flex items-center justify-between">
						<span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
							>Active Alerts</span
						>
						{#if hasAlerts}
							<AlertTriangle class="h-4 w-4 text-orange-600" />
						{:else}
							<CheckCircle2 class="h-4 w-4 text-green-600" />
						{/if}
					</div>
					<div>
						<div class="text-3xl font-bold tracking-tight" class:text-orange-600={hasAlerts}>
							{metrics.activeAlertsCount}
						</div>
						<div class="mt-1 text-xs text-muted-foreground">Require attention</div>
					</div>
				</div>

				<div class="p-6 bg-background flex flex-col justify-between h-32">
					<div class="flex items-center justify-between">
						<span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
							>Last Sync</span
						>
						<Clock class="h-4 w-4 text-muted-foreground" />
					</div>
					<div>
						<div class="text-2xl font-bold tracking-tight">
							{#if data.intuitLastSync}
								{new Date(data.intuitLastSync).toLocaleDateString('en-US', {
									month: 'short',
									day: 'numeric'
								})}
							{:else}
								Never
							{/if}
						</div>
						<div class="mt-1 text-xs text-muted-foreground">
							{#if data.intuitLastSync}
								{new Date(data.intuitLastSync).toLocaleTimeString('en-US', {
									hour: 'numeric',
									minute: '2-digit'
								})}
							{:else}
								Run a sync
							{/if}
						</div>
					</div>
				</div>
			</div>

			<!-- Primary Sync Actions -->
			{#if perms.canTriggerBidirectionalSync}
				<div class="border-b bg-background p-6">
					<div class="flex items-center justify-between mb-4">
						<div>
							<h2 class="text-sm font-semibold flex items-center gap-2">
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
									/>
								</svg>
								Sync Data
							</h2>
							<p class="text-xs text-muted-foreground mt-1">
								Two-way synchronization between HR system and QuickBooks
							</p>
						</div>
					</div>

					<div class="flex flex-wrap gap-3">
						<Button
							onclick={() => openBidirectionalSyncDialog('ALL')}
							disabled={syncingBidirectional}
							size="sm"
							class="bg-blue-600 hover:bg-blue-700 h-9"
						>
							{#if syncingBidirectional && selectedEntityType === 'ALL'}
								<RefreshCw class="h-3.5 w-3.5 mr-1.5 animate-spin" />
								Syncing All...
							{:else}
								<RefreshCw class="h-3.5 w-3.5 mr-1.5" />
								Sync All
							{/if}
						</Button>

						<Button
							onclick={() => openBidirectionalSyncDialog('EMPLOYEE')}
							disabled={syncingBidirectional}
							size="sm"
							variant="outline"
							class="h-9"
						>
							{#if syncingBidirectional && selectedEntityType === 'EMPLOYEE'}
								<RefreshCw class="h-3.5 w-3.5 mr-1.5 animate-spin" />
								Syncing Employees...
							{:else}
								<RefreshCw class="h-3.5 w-3.5 mr-1.5" />
								Sync Employees
							{/if}
						</Button>

						<Button
							onclick={() => openBidirectionalSyncDialog('DEPARTMENT')}
							disabled={syncingBidirectional}
							size="sm"
							variant="outline"
							class="h-9"
						>
							{#if syncingBidirectional && selectedEntityType === 'DEPARTMENT'}
								<RefreshCw class="h-3.5 w-3.5 mr-1.5 animate-spin" />
								Syncing Departments...
							{:else}
								<RefreshCw class="h-3.5 w-3.5 mr-1.5" />
								Sync Departments
							{/if}
						</Button>

						{#if isDev}
							<Button
								onclick={openResetTestDialog}
								disabled={resettingForTest}
								variant="outline"
								size="sm"
								class="h-9 border-orange-300 text-orange-700"
							>
								{#if resettingForTest}
									<RefreshCw class="h-3.5 w-3.5 mr-1.5 animate-spin" />
									Resetting...
								{:else}
									<RotateCcw class="h-3.5 w-3.5 mr-1.5" />
									Reset Test Data
								{/if}
							</Button>
						{/if}
					</div>

					<div class="mt-4 text-xs text-muted-foreground bg-muted/50 p-3 rounded border">
						<strong>Note:</strong> Automatically detects changes on both sides and resolves conflicts
						using the most recent change.
					</div>
				</div>
			{/if}

			<!-- Feature Grid -->
			<div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 border-b">
				<!-- Monitoring & Health -->
				<div class="border-r border-b md:border-b-0 bg-muted/20 p-4">
					<h3 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
						Monitoring
					</h3>
					<div class="space-y-2">
						<a
							href="/admin/settings/integrations/sync-status"
							class="block p-3 rounded border bg-background hover:bg-accent/50 transition-colors"
						>
							<div class="flex items-center gap-2 mb-1">
								<svg
									class="h-3.5 w-3.5 text-primary"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
									/>
								</svg>
								<span class="text-xs font-medium">Sync Dashboard</span>
							</div>
							<p class="text-xs text-muted-foreground">View history & stats</p>
						</a>

						<a
							href="/admin/settings/integrations/health"
							class="block p-3 rounded border bg-background hover:bg-accent/50 transition-colors"
						>
							<div class="flex items-center gap-2 mb-1">
								<svg
									class="h-3.5 w-3.5 text-primary"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
									/>
								</svg>
								<span class="text-xs font-medium">Health Monitor</span>
								{#if hasAlerts}
									<Badge variant="destructive" class="h-4 px-1 text-[10px] ml-auto"
										>{metrics.activeAlertsCount}</Badge
									>
								{/if}
							</div>
							<p class="text-xs text-muted-foreground">System health & alerts</p>
						</a>

						<a
							href="/admin/settings/integrations/audit"
							class="block p-3 rounded border bg-background hover:bg-accent/50 transition-colors"
						>
							<div class="flex items-center gap-2 mb-1">
								<svg
									class="h-3.5 w-3.5 text-primary"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
									/>
								</svg>
								<span class="text-xs font-medium">Audit Trail</span>
							</div>
							<p class="text-xs text-muted-foreground">Integration activities</p>
						</a>
					</div>
				</div>

				<!-- Data Operations -->
				<div class="border-r border-b md:border-b-0 bg-muted/20 p-4">
					<h3 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
						Data Operations
					</h3>
					<div class="space-y-2">
						<a
							href="/admin/settings/integrations/reconciliation"
							class="block p-3 rounded border bg-background hover:bg-accent/50 transition-colors"
						>
							<div class="flex items-center gap-2 mb-1">
								<RefreshCw class="h-3.5 w-3.5 text-primary" />
								<span class="text-xs font-medium">Reconciliation</span>
							</div>
							<p class="text-xs text-muted-foreground">Compare & resolve differences</p>
						</a>

						<a
							href="/admin/settings/integrations/validation"
							class="block p-3 rounded border bg-background hover:bg-accent/50 transition-colors"
						>
							<div class="flex items-center gap-2 mb-1">
								<CheckCircle2 class="h-3.5 w-3.5 text-primary" />
								<span class="text-xs font-medium">Validation</span>
							</div>
							<p class="text-xs text-muted-foreground">Data quality rules</p>
						</a>

						<a
							href="/admin/settings/integrations/batches"
							class="block p-3 rounded border bg-background hover:bg-accent/50 transition-colors"
						>
							<div class="flex items-center gap-2 mb-1">
								<svg
									class="h-3.5 w-3.5 text-primary"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
									/>
								</svg>
								<span class="text-xs font-medium">Batch Operations</span>
							</div>
							<p class="text-xs text-muted-foreground">Bulk processing</p>
						</a>
					</div>
				</div>

				<!-- Error Management -->
				<div class="border-r border-b md:border-b-0 lg:border-b-0 bg-muted/20 p-4">
					<h3 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
						Error Management
					</h3>
					<div class="space-y-2">
						<a
							href="/admin/settings/integrations/errors"
							class="block p-3 rounded border bg-background hover:bg-accent/50 transition-colors"
						>
							<div class="flex items-center gap-2 mb-1">
								<AlertCircle class="h-3.5 w-3.5 text-primary" />
								<span class="text-xs font-medium">Error Recovery</span>
								{#if hasErrors}
									<Badge variant="destructive" class="h-4 px-1 text-[10px] ml-auto">
										{Math.round(metrics.errorRate)}%
									</Badge>
								{/if}
							</div>
							<p class="text-xs text-muted-foreground">Retry failed operations</p>
						</a>

						<a
							href="/admin/settings/integrations/conflicts"
							class="block p-3 rounded border bg-background hover:bg-accent/50 transition-colors"
						>
							<div class="flex items-center gap-2 mb-1">
								<AlertTriangle class="h-3.5 w-3.5 text-primary" />
								<span class="text-xs font-medium">Conflicts</span>
							</div>
							<p class="text-xs text-muted-foreground">Resolve sync conflicts</p>
						</a>

						<a
							href="/admin/settings/integrations/rollback"
							class="block p-3 rounded border bg-background hover:bg-accent/50 transition-colors"
						>
							<div class="flex items-center gap-2 mb-1">
								<svg
									class="h-3.5 w-3.5 text-primary"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
									/>
								</svg>
								<span class="text-xs font-medium">Rollback</span>
							</div>
							<p class="text-xs text-muted-foreground">Undo sync operations</p>
						</a>
					</div>
				</div>

				<!-- Advanced Features -->
				<div class="bg-muted/20 p-4">
					<h3 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
						Advanced
					</h3>
					<div class="space-y-2">
						<a
							href="/admin/settings/integrations/webhooks"
							class="block p-3 rounded border bg-background hover:bg-accent/50 transition-colors"
						>
							<div class="flex items-center gap-2 mb-1">
								<svg
									class="h-3.5 w-3.5 text-primary"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M13 10V3L4 14h7v7l9-11h-7z"
									/>
								</svg>
								<span class="text-xs font-medium">Webhooks</span>
							</div>
							<p class="text-xs text-muted-foreground">Event notifications</p>
						</a>

						<a
							href="/admin/settings/integrations/compliance"
							class="block p-3 rounded border bg-background hover:bg-accent/50 transition-colors"
						>
							<div class="flex items-center gap-2 mb-1">
								<svg
									class="h-3.5 w-3.5 text-primary"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
									/>
								</svg>
								<span class="text-xs font-medium">Compliance</span>
							</div>
							<p class="text-xs text-muted-foreground">Reports & audits</p>
						</a>

						<a
							href="/admin/settings/integrations/schedules"
							class="block p-3 rounded border bg-background hover:bg-accent/50 transition-colors"
						>
							<div class="flex items-center gap-2 mb-1">
								<Clock class="h-3.5 w-3.5 text-primary" />
								<span class="text-xs font-medium">Schedules</span>
							</div>
							<p class="text-xs text-muted-foreground">Automated sync</p>
						</a>
					</div>
				</div>
			</div>
		</div>
	</div>
{:else}
	<!-- Not Connected State -->
	<div class="flex flex-col h-full overflow-hidden bg-background">
		<header
			class="flex-shrink-0 flex items-center justify-between h-14 px-4 border-b bg-background z-20"
		>
			<div class="flex items-center gap-4">
				<h1 class="text-sm font-semibold tracking-tight">QuickBooks Integration</h1>
				<div class="h-4 w-px bg-border"></div>
				<div class="flex items-center gap-2 text-xs text-muted-foreground">
					<AlertCircle class="h-3.5 w-3.5 text-orange-600" />
					<span>Not Connected</span>
				</div>
			</div>
		</header>

		<div class="flex-1 overflow-auto bg-muted/5 flex items-center justify-center p-6">
			<div class="max-w-2xl w-full bg-background border rounded-lg p-8">
				<div class="flex items-center gap-3 mb-4">
					<svg class="h-8 w-8" viewBox="0 0 24 24" fill="none">
						<rect width="24" height="24" rx="4" fill="#2CA01C" />
						<path d="M8 6h8v12H8V6z" fill="white" />
					</svg>
					<div>
						<h2 class="text-xl font-semibold">Connect to QuickBooks</h2>
						<p class="text-sm text-muted-foreground">Sync employee data and payroll information</p>
					</div>
				</div>

				<div class="space-y-4 mb-6">
					<p class="text-sm font-medium">Connect QuickBooks to:</p>
					<ul class="space-y-2 text-sm text-muted-foreground">
						<li class="flex items-center gap-2">
							<div class="h-1.5 w-1.5 rounded-full bg-primary"></div>
							Automatically sync employee data to payroll
						</li>
						<li class="flex items-center gap-2">
							<div class="h-1.5 w-1.5 rounded-full bg-primary"></div>
							New hires auto-created in QuickBooks
						</li>
						<li class="flex items-center gap-2">
							<div class="h-1.5 w-1.5 rounded-full bg-primary"></div>
							PTO requests sync to payroll
						</li>
						<li class="flex items-center gap-2">
							<div class="h-1.5 w-1.5 rounded-full bg-primary"></div>
							Employees can view pay stubs in HR portal
						</li>
					</ul>
				</div>

				{#if perms.canManageIntegrations}
					<a
						href="/api/intuit/connect"
						class="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
					>
						<LinkIcon class="h-4 w-4 mr-2" />
						Connect to QuickBooks
					</a>
				{:else}
					<div class="p-4 bg-muted/50 rounded-md border">
						<p class="text-sm text-muted-foreground flex items-center gap-2">
							<Lock class="h-4 w-4" />
							You do not have permission to connect integrations. Contact your administrator.
						</p>
					</div>
				{/if}

				<Alert class="mt-4">
					<AlertCircle class="h-4 w-4" />
					<AlertDescription class="text-xs">
						You'll be redirected to QuickBooks to authorize access. This is secure and you can
						revoke access at any time.
					</AlertDescription>
				</Alert>
			</div>
		</div>
	</div>
{/if}

<!-- Bidirectional Sync Confirmation Dialog -->
<Dialog.Root bind:open={bidirectionalSyncDialogOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Confirm Sync</Dialog.Title>
			<Dialog.Description>
				{#if pendingBidirectionalSync}
					<p class="mb-3">
						{#if pendingBidirectionalSync === 'ALL'}
							This will synchronize <strong>all employees and departments</strong> between your HR system
							and QuickBooks.
						{:else}
							This will synchronize <strong>{pendingBidirectionalSync.toLowerCase()}s</strong> between
							your HR system and QuickBooks.
						{/if}
					</p>
					<div class="p-3 bg-blue-50 border border-blue-200 rounded text-sm">
						<p class="text-blue-900">
							<strong>Two-way sync</strong> detects changes on both sides and automatically resolves conflicts
							using the most recent change.
						</p>
						{#if pendingBidirectionalSync === 'ALL'}
							<p class="text-blue-900 mt-2">
								Employees will be synced first, followed by departments.
							</p>
						{/if}
					</div>
				{/if}
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer class="gap-2">
			<Button variant="outline" onclick={() => (bidirectionalSyncDialogOpen = false)}>
				Cancel
			</Button>
			<Button onclick={confirmBidirectionalSync} class="bg-blue-600 hover:bg-blue-700"
				>Start Sync</Button
			>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Reset Test Confirmation Dialog -->
<Dialog.Root bind:open={resetTestDialogOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Confirm Reset for Testing</Dialog.Title>
			<Dialog.Description>
				<p>
					This will reset QuickBooks IDs for <strong>all departments</strong> and up to{' '}
					<strong>5 employees</strong> so they can be re-synced.
				</p>
				<div class="mt-3 p-3 bg-orange-50 border border-orange-200 rounded text-sm">
					<p class="text-orange-900 font-medium mb-1">🔧 Development Tool</p>
					<p class="text-orange-800">
						This is a testing utility. The affected records will be marked as "not synced" and can
						be pushed to QuickBooks again.
					</p>
				</div>
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer class="gap-2">
			<Button variant="outline" onclick={() => (resetTestDialogOpen = false)}>Cancel</Button>
			<Button
				onclick={confirmResetTest}
				variant="outline"
				class="border-orange-300 text-orange-700"
			>
				Reset for Testing
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Disconnect Confirmation Dialog -->
<Dialog.Root bind:open={disconnectDialogOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Disconnect from QuickBooks?</Dialog.Title>
			<Dialog.Description>
				<p>Are you sure you want to disconnect from QuickBooks?</p>
				<div class="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm">
					<p class="text-red-900 font-medium mb-1">⚠️ Warning</p>
					<p class="text-red-800">
						This will stop all data synchronization between your system and QuickBooks. You'll need
						to reconnect and re-authorize to resume syncing.
					</p>
				</div>
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer class="gap-2">
			<Button variant="outline" onclick={() => (disconnectDialogOpen = false)}>Cancel</Button>
			<Button onclick={confirmDisconnect} variant="destructive">Disconnect</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
