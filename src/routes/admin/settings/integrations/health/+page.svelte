<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import {
		Activity,
		AlertCircle,
		CheckCircle2,
		Clock,
		TrendingUp,
		AlertTriangle,
		RefreshCw,
		Search,
		Check
	} from '@lucide/svelte';
	import { invalidate } from '$app/navigation';
	import { createUrqlClient } from '$lib/graphql/client';
	import { browser } from '$app/environment';
	import { enhance } from '$app/forms';

	interface DiagnosticSyncResult {
		employeeNumber: string | null;
		employeeId: string | null;
		employeeName: string | null;
		employeeEmail: string | null;
		success: boolean;
		error: string | null;
	}

	interface DiagnosticSyncSummary {
		total?: number;
		succeeded?: number;
		failed?: number;
		summary?: string;
		results?: DiagnosticSyncResult[];
		error?: string;
	}

	type DiagnosticState = DiagnosticSyncSummary | null;

	let { data } = $props();
	let health = $derived(data.healthStatus);
	let alerts = $derived(data.alerts);
	let metrics = $derived(data.metrics);

	let refreshing = $state(false);
	let diagnosticRunning = $state(false);
	let diagnosticResults = $state<DiagnosticState>(null);
	let dismissingAlerts = $state<Set<string>>(new Set());
	let runningHealthCheck = $state(false);

	async function refreshHealth() {
		refreshing = true;
		await invalidate('app:sync-health');
		refreshing = false;
	}

	async function runTestHealthCheck() {
		if (!browser) return;
		runningHealthCheck = true;

		const client = createUrqlClient(fetch);
		const CREATE_TEST_ALERT_MUTATION = `
			mutation CreateTestAlert {
				syncHealth {
					createTestAlert {
						success
						message
						alertId
					}
				}
			}
		`;

		try {
			const result = await client.mutation(CREATE_TEST_ALERT_MUTATION, {}).toPromise();
			if (result.error) {
				console.error('Create test alert error:', result.error);
			} else {
				const data = result.data?.syncHealth?.createTestAlert;
				console.log('Test alert created:', data);
			}
		} catch (err) {
			console.error('Create test alert error:', err);
		} finally {
			runningHealthCheck = false;
			await refreshHealth();
		}
	}

	async function runDiagnosticSync() {
		if (!browser) return;
		diagnosticRunning = true;
		diagnosticResults = null;

		const client = createUrqlClient(fetch);
		const DIAGNOSTIC_SYNC_MUTATION = `
			mutation SyncEmployeesIndividually {
				intuit {
					syncEmployeesIndividually {
						total
						succeeded
						failed
						summary
						results {
							employeeNumber
							employeeId
							employeeName
							employeeEmail
							success
							error
						}
					}
				}
			}
		`;

		try {
			const result = await client.mutation(DIAGNOSTIC_SYNC_MUTATION, {}).toPromise();
			if (result.error) {
				console.error('Diagnostic sync error:', result.error);
				diagnosticResults = {
					error: result.error.message
				};
			} else {
				diagnosticResults = result.data?.intuit?.syncEmployeesIndividually;
			}
		} catch (err) {
			console.error('Diagnostic sync error:', err);
			diagnosticResults = {
				error: String(err)
			};
		} finally {
			diagnosticRunning = false;
			await refreshHealth(); // Refresh health after diagnostic sync
		}
	}

	function getStatusColor(status: string): string {
		switch (status.toLowerCase()) {
			case 'healthy':
				return 'text-green-600 bg-green-50 border-green-200';
			case 'degraded':
				return 'text-yellow-600 bg-yellow-50 border-yellow-200';
			case 'down':
				return 'text-red-600 bg-red-50 border-red-200';
			default:
				return 'text-gray-600 bg-gray-50 border-gray-200';
		}
	}

	function getSeverityColor(severity: string): 'default' | 'outline' | 'secondary' | 'destructive' {
		switch (severity.toLowerCase()) {
			case 'critical':
				return 'destructive';
			case 'error':
				return 'destructive';
			case 'warning':
				return 'secondary';
			case 'info':
				return 'outline';
			default:
				return 'outline';
		}
	}

	function formatDuration(ms: number): string {
		if (ms < 1000) return `${ms}ms`;
		const seconds = Math.floor(ms / 1000);
		if (seconds < 60) return `${seconds}s`;
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return `${minutes}m ${remainingSeconds}s`;
	}

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return 'Never';
		const date = new Date(dateStr);
		return date.toLocaleString();
	}

	function formatPercentage(value: number): string {
		return `${(value * 100).toFixed(1)}%`;
	}
</script>

<svelte:head>
	<title>Sync Health Monitoring - MountainHR Admin</title>
</svelte:head>

<div class="flex flex-col h-full overflow-hidden bg-background">
	<!-- Toolbar -->
	<header
		class="flex-shrink-0 flex items-center justify-between h-14 px-4 border-b bg-background z-20"
	>
		<div class="flex items-center gap-4">
			<h1 class="text-sm font-semibold tracking-tight">Sync Health Monitoring</h1>
			<div class="h-4 w-px bg-border"></div>
			<div class="flex items-center gap-2 text-xs text-muted-foreground">
				<Activity class="h-3.5 w-3.5" />
				<span>Real-time QuickBooks Sync Performance</span>
			</div>
		</div>
		<div class="flex items-center gap-2">
			<Button
				variant="outline"
				size="sm"
				onclick={runDiagnosticSync}
				disabled={diagnosticRunning}
				class="h-8 gap-1.5"
			>
				<Search class="h-3.5 w-3.5 {diagnosticRunning ? 'animate-pulse' : ''}" />
				<span class="text-xs">{diagnosticRunning ? 'Syncing...' : 'Diagnostic Sync'}</span>
			</Button>
			<Button
				variant="outline"
				size="sm"
				onclick={runTestHealthCheck}
				disabled={runningHealthCheck}
				class="h-8 gap-1.5"
				title="Run health check and trigger alerts based on current metrics"
			>
				<AlertTriangle class="h-3.5 w-3.5 {runningHealthCheck ? 'animate-pulse' : ''}" />
				<span class="text-xs">{runningHealthCheck ? 'Checking...' : 'Test Alerts'}</span>
			</Button>
			<Button
				variant="ghost"
				size="sm"
				onclick={refreshHealth}
				disabled={refreshing}
				class="h-8 w-8 p-0"
			>
				<RefreshCw class="h-4 w-4 {refreshing ? 'animate-spin' : ''}" />
			</Button>
		</div>
	</header>

	<div class="flex-1 overflow-auto bg-muted/5">
		{#if health}
			<!-- KPI Grid -->
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border-b">
				<!-- Current Status -->
				<div class="p-6 border-r last:border-r-0 bg-background flex flex-col justify-between h-32">
					<div class="flex items-center justify-between">
						<span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
							>Current Status</span
						>
						<Activity class="h-4 w-4 text-muted-foreground" />
					</div>
					<div>
						<div class="flex items-center gap-2">
							<div
								class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border {getStatusColor(
									health.currentStatus
								)}"
							>
								{health.currentStatus}
							</div>
						</div>
						<div class="mt-1 text-xs text-muted-foreground">
							Uptime: {health.uptimePercentage.toFixed(1)}%
						</div>
					</div>
				</div>

				<!-- Success Rate -->
				<div class="p-6 border-r last:border-r-0 bg-background flex flex-col justify-between h-32">
					<div class="flex items-center justify-between">
						<span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
							>Success Rate (24h)</span
						>
						<CheckCircle2 class="h-4 w-4 text-muted-foreground" />
					</div>
					<div>
						<div class="text-3xl font-bold tracking-tight">
							{formatPercentage(health.successRate)}
						</div>
						<div class="mt-1 text-xs text-muted-foreground">
							{health.totalSyncs24H} syncs
						</div>
					</div>
				</div>

				<!-- Average Duration -->
				<div class="p-6 border-r last:border-r-0 bg-background flex flex-col justify-between h-32">
					<div class="flex items-center justify-between">
						<span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
							>Avg Sync Duration</span
						>
						<Clock class="h-4 w-4 text-muted-foreground" />
					</div>
					<div>
						<div class="text-3xl font-bold tracking-tight">
							{formatDuration(health.avgSyncDurationMs)}
						</div>
						<div class="mt-1 text-xs text-muted-foreground">
							Last: {formatDate(health.lastSuccessfulSync)}
						</div>
					</div>
				</div>

				<!-- Active Alerts -->
				<div class="p-6 bg-background flex flex-col justify-between h-32">
					<div class="flex items-center justify-between">
						<span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
							>Active Alerts</span
						>
						{#if health.activeAlertsCount > 0}
							<AlertTriangle class="h-4 w-4 text-muted-foreground" />
						{:else}
							<CheckCircle2 class="h-4 w-4 text-muted-foreground" />
						{/if}
					</div>
					<div>
						<div class="text-3xl font-bold tracking-tight">{health.activeAlertsCount}</div>
						<div class="mt-1 text-xs text-muted-foreground">
							Error rate: {formatPercentage(health.errorRate)}
						</div>
					</div>
				</div>
			</div>

			<!-- Two-column layout for Recent Alerts and Sync Performance -->
			<div class="grid grid-cols-1 lg:grid-cols-2 border-b">
				<!-- Recent Alerts Section -->
				<div class="border-r last:border-r-0 bg-background">
					<div class="p-6">
						<h2 class="text-sm font-semibold mb-4 flex items-center gap-2">
							<AlertCircle class="h-4 w-4 text-primary" />
							Recent Alerts
						</h2>
						{#if alerts.length === 0}
							<div class="text-center py-8 text-muted-foreground">
								<CheckCircle2 class="h-12 w-12 mx-auto mb-3 text-green-500" />
								<p class="text-sm font-medium">No alerts</p>
								<p class="text-xs">All systems operating normally</p>
							</div>
						{:else}
							<div class="border rounded-lg overflow-hidden">
								<table class="w-full text-sm">
									<thead class="sticky top-0 z-10 bg-muted/40 backdrop-blur-sm border-b">
										<tr>
											<th
												class="px-3 py-1.5 border-r last:border-r-0 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-20"
												>Severity</th
											>
											<th
												class="px-3 py-1.5 border-r last:border-r-0 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
												>Message</th
											>
											<th
												class="px-3 py-1.5 border-r last:border-r-0 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-32"
												>Type</th
											>
											<th
												class="px-3 py-1.5 border-r last:border-r-0 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-40"
												>Time</th
											>
											<th
												class="px-3 py-1.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground w-16"
											></th>
										</tr>
									</thead>
									<tbody class="divide-y">
										{#each alerts as alert}
											<tr class="hover:bg-muted/10">
												<td class="px-3 py-1.5 border-r last:border-r-0">
													<Badge variant={getSeverityColor(alert.severity)} class="text-xs">
														{alert.severity}
													</Badge>
												</td>
												<td class="px-3 py-1.5 border-r last:border-r-0">
													<div class="flex items-center gap-2">
														<AlertCircle
															class="h-4 w-4 flex-shrink-0 {alert.severity === 'critical' ||
															alert.severity === 'error'
																? 'text-red-500'
																: alert.severity === 'warning'
																	? 'text-yellow-500'
																	: 'text-blue-500'}"
														/>
														<span class="text-xs font-medium">{alert.message}</span>
													</div>
												</td>
												<td
													class="px-3 py-1.5 border-r last:border-r-0 text-xs text-muted-foreground"
												>
													{alert.alertType.replace(/_/g, ' ')}
													{#if alert.entityType}
														<br /><span class="text-xs">• {alert.entityType}</span>
													{/if}
												</td>
												<td
													class="px-3 py-1.5 border-r last:border-r-0 text-xs text-muted-foreground"
												>
													{new Date(alert.triggeredAt).toLocaleTimeString()}
												</td>
												<td class="px-3 py-1.5 text-center">
													<form
														method="POST"
														action="?/resolveAlert"
														use:enhance={() => {
															dismissingAlerts.add(alert.id);
															return async ({ update }) => {
																await update();
																dismissingAlerts.delete(alert.id);
															};
														}}
													>
														<input type="hidden" name="alertId" value={alert.id} />
														<Button
															type="submit"
															variant="ghost"
															size="sm"
															disabled={dismissingAlerts.has(alert.id)}
															class="h-6 w-6 p-0 hover:bg-green-500/10 hover:text-green-600 transition-colors"
															title="Dismiss alert"
														>
															<Check class="h-3.5 w-3.5" />
														</Button>
													</form>
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						{/if}
					</div>
				</div>

				<!-- Sync Performance Section -->
				<div class="bg-background">
					<div class="p-6">
						<h2 class="text-sm font-semibold mb-4 flex items-center gap-2">
							<TrendingUp class="h-4 w-4 text-primary" />
							Sync Performance (24h)
						</h2>
						{#if metrics.length === 0}
							<div class="text-center py-8 text-muted-foreground">
								<TrendingUp class="h-12 w-12 mx-auto mb-3" />
								<p class="text-sm font-medium">No metrics data available</p>
								<p class="text-xs">Performance data will appear here once syncs occur</p>
							</div>
						{:else}
							<div class="border rounded-lg overflow-hidden">
								<table class="w-full text-sm">
									<thead class="sticky top-0 z-10 bg-muted/40 backdrop-blur-sm border-b">
										<tr>
											<th
												class="px-3 py-1.5 border-r last:border-r-0 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
												>Time</th
											>
											<th
												class="px-3 py-1.5 border-r last:border-r-0 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
												>Status</th
											>
											<th
												class="px-3 py-1.5 border-r last:border-r-0 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground"
												>Duration</th
											>
											<th
												class="px-3 py-1.5 border-r last:border-r-0 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground"
												>Records</th
											>
											<th
												class="px-3 py-1.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground"
												>Errors</th
											>
										</tr>
									</thead>
									<tbody class="divide-y">
										{#each metrics.slice(0, 10) as metric}
											<tr class="hover:bg-muted/10">
												<td class="px-3 py-1.5 border-r last:border-r-0 text-xs">
													{new Date(metric.recordedAt).toLocaleTimeString()}
												</td>
												<td class="px-3 py-1.5 border-r last:border-r-0 text-xs">
													<Badge
														variant={metric.connectionStatus === 'healthy'
															? 'outline'
															: 'secondary'}
														class="text-xs"
													>
														{metric.connectionStatus}
													</Badge>
												</td>
												<td
													class="px-3 py-1.5 border-r last:border-r-0 text-xs text-right font-mono"
												>
													{formatDuration(metric.syncDurationMs || 0)}
												</td>
												<td
													class="px-3 py-1.5 border-r last:border-r-0 text-xs text-right font-mono"
												>
													{metric.recordsProcessed || 0}
												</td>
												<td
													class="px-3 py-1.5 text-xs text-right font-mono {metric.errorsCount > 0
														? 'text-red-600 font-medium'
														: ''}"
												>
													{metric.errorsCount}
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>

							{#if metrics.length > 10}
								<p class="text-center text-xs text-muted-foreground mt-4">
									Showing 10 of {metrics.length} metrics
								</p>
							{/if}
						{/if}
					</div>
				</div>
			</div>

			<!-- Diagnostic Sync Results -->
			{#if diagnosticResults}
				<div class="border-b bg-background">
					<div class="p-6">
						<h2 class="text-sm font-semibold mb-4 flex items-center gap-2">
							<Search class="h-4 w-4 text-primary" />
							Diagnostic Sync Results
						</h2>

						{#if diagnosticResults.error}
							<div class="bg-red-50 border border-red-200 rounded-lg p-4">
								<div class="flex items-start gap-3">
									<AlertCircle class="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
									<div>
										<p class="font-medium text-sm text-red-900">Sync Error</p>
										<p class="text-sm text-red-700 mt-1">{diagnosticResults.error}</p>
									</div>
								</div>
							</div>
						{:else}
							<!-- Summary Stats -->
							<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
								<div class="bg-muted/30 rounded-lg p-4">
									<div
										class="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2"
									>
										Total Processed
									</div>
									<div class="text-2xl font-bold">{diagnosticResults.total}</div>
								</div>
								<div class="bg-green-50 rounded-lg p-4">
									<div class="text-xs font-semibold uppercase tracking-wider text-green-700 mb-2">
										Succeeded
									</div>
									<div class="text-2xl font-bold text-green-700">{diagnosticResults.succeeded}</div>
								</div>
								<div class="bg-red-50 rounded-lg p-4">
									<div class="text-xs font-semibold uppercase tracking-wider text-red-700 mb-2">
										Failed
									</div>
									<div class="text-2xl font-bold text-red-700">{diagnosticResults.failed}</div>
								</div>
							</div>

							<!-- Summary Message -->
							<div class="mb-4 p-3 bg-muted/20 rounded-lg border">
								<p class="text-sm text-muted-foreground">{diagnosticResults.summary}</p>
							</div>

							<!-- Individual Results -->
							{#if diagnosticResults.results && diagnosticResults.results.length > 0}
								<div class="border rounded-lg overflow-hidden">
									<table class="w-full text-sm">
										<thead class="sticky top-0 z-10 bg-muted/40 backdrop-blur-sm border-b">
											<tr>
												<th
													class="px-3 py-2 border-r text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-16"
													>#</th
												>
												<th
													class="px-3 py-2 border-r text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
													>Name</th
												>
												<th
													class="px-3 py-2 border-r text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
													>Email</th
												>
												<th
													class="px-3 py-2 border-r text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
													>QB ID</th
												>
												<th
													class="px-3 py-2 border-r text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground w-24"
													>Status</th
												>
												<th
													class="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
													>Error</th
												>
											</tr>
										</thead>
										<tbody class="divide-y">
											{#each diagnosticResults.results as result}
												<tr class="hover:bg-muted/10 {!result.success ? 'bg-red-50/30' : ''}">
													<td class="px-3 py-2 border-r text-xs font-mono text-muted-foreground">
														{result.employeeNumber}
													</td>
													<td class="px-3 py-2 border-r text-xs font-medium">
														{result.employeeName}
													</td>
													<td class="px-3 py-2 border-r text-xs text-muted-foreground">
														{result.employeeEmail || '-'}
													</td>
													<td class="px-3 py-2 border-r text-xs font-mono text-muted-foreground">
														{result.employeeId || '-'}
													</td>
													<td class="px-3 py-2 border-r text-center">
														{#if result.success}
															<div class="inline-flex items-center gap-1 text-green-600">
																<CheckCircle2 class="h-4 w-4" />
																<span class="text-xs font-medium">Success</span>
															</div>
														{:else}
															<div class="inline-flex items-center gap-1 text-red-600">
																<AlertCircle class="h-4 w-4" />
																<span class="text-xs font-medium">Failed</span>
															</div>
														{/if}
													</td>
													<td class="px-3 py-2 text-xs">
														{#if result.error}
															<span class="text-red-700 font-medium">{result.error}</span>
														{:else}
															<span class="text-muted-foreground">-</span>
														{/if}
													</td>
												</tr>
											{/each}
										</tbody>
									</table>
								</div>
							{/if}
						{/if}
					</div>
				</div>
			{/if}
		{:else}
			<div class="bg-background p-12">
				<div class="text-center text-muted-foreground">
					<Activity class="h-12 w-12 mx-auto mb-3" />
					<p class="text-sm font-medium">No health data available</p>
					<p class="text-xs">Sync health monitoring will appear here once sync operations begin</p>
				</div>
			</div>
		{/if}
	</div>
</div>
