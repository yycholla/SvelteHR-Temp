<script lang="ts">
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import {
		Activity,
		AlertCircle,
		CheckCircle2,
		Clock,
		TrendingUp,
		AlertTriangle,
		RefreshCw
	} from '@lucide/svelte';
	import { invalidate } from '$app/navigation';

	let { data } = $props();
	let health = $derived(data.health);
	let alerts = $derived(data.alerts);
	let metrics = $derived(data.metrics);

	let refreshing = $state(false);

	async function refreshHealth() {
		refreshing = true;
		await invalidate('app:sync-health');
		refreshing = false;
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

	function getSeverityColor(
		severity: string
	): 'default' | 'outline' | 'secondary' | 'destructive' {
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

<div class="container mx-auto py-8 px-4">
	<div class="mb-6 flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold">Sync Health Monitoring</h1>
			<p class="text-sm text-muted-foreground mt-1">
				Real-time monitoring of QuickBooks synchronization performance
			</p>
		</div>
		<Button onclick={refreshHealth} disabled={refreshing} variant="outline" size="sm">
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

	{#if health}
		<!-- Status Overview -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
			<!-- Current Status -->
			<Card>
				<CardHeader class="pb-2">
					<CardDescription>Current Status</CardDescription>
				</CardHeader>
				<CardContent>
					<div class="flex items-center justify-between">
						<div>
							<div
								class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border {getStatusColor(
									health.currentStatus
								)}"
							>
								<Activity class="h-4 w-4 mr-2" />
								{health.currentStatus}
							</div>
							<p class="text-xs text-muted-foreground mt-2">
								Uptime: {formatPercentage(health.uptimePercentage)}
							</p>
						</div>
					</div>
				</CardContent>
			</Card>

			<!-- Success Rate -->
			<Card>
				<CardHeader class="pb-2">
					<CardDescription>Success Rate (24h)</CardDescription>
				</CardHeader>
				<CardContent>
					<div class="flex items-center justify-between">
						<div>
							<p class="text-3xl font-bold">{formatPercentage(health.successRate)}</p>
							<p class="text-sm text-muted-foreground mt-1">
								{health.totalSyncs24h} syncs
							</p>
						</div>
						<CheckCircle2 class="h-10 w-10 text-green-500" />
					</div>
				</CardContent>
			</Card>

			<!-- Average Duration -->
			<Card>
				<CardHeader class="pb-2">
					<CardDescription>Avg Sync Duration</CardDescription>
				</CardHeader>
				<CardContent>
					<div class="flex items-center justify-between">
						<div>
							<p class="text-3xl font-bold">{formatDuration(health.avgSyncDurationMs)}</p>
							<p class="text-sm text-muted-foreground mt-1">
								Last: {formatDate(health.lastSuccessfulSync)}
							</p>
						</div>
						<Clock class="h-10 w-10 text-blue-500" />
					</div>
				</CardContent>
			</Card>

			<!-- Active Alerts -->
			<Card>
				<CardHeader class="pb-2">
					<CardDescription>Active Alerts</CardDescription>
				</CardHeader>
				<CardContent>
					<div class="flex items-center justify-between">
						<div>
							<p class="text-3xl font-bold">{health.activeAlertsCount}</p>
							<p class="text-sm text-muted-foreground mt-1">
								Error rate: {formatPercentage(health.errorRate)}
							</p>
						</div>
						{#if health.activeAlertsCount > 0}
							<AlertTriangle class="h-10 w-10 text-yellow-500" />
						{:else}
							<CheckCircle2 class="h-10 w-10 text-green-500" />
						{/if}
					</div>
				</CardContent>
			</Card>
		</div>

		<!-- Recent Alerts -->
		<Card class="mb-6">
			<CardHeader>
				<CardTitle>Recent Alerts</CardTitle>
				<CardDescription>Latest sync health alerts and notifications</CardDescription>
			</CardHeader>
			<CardContent>
				{#if alerts.length === 0}
					<div class="text-center py-8 text-muted-foreground">
						<CheckCircle2 class="h-12 w-12 mx-auto mb-3 text-green-500" />
						<p class="font-medium">No alerts</p>
						<p class="text-sm">All systems operating normally</p>
					</div>
				{:else}
					<div class="space-y-3">
						{#each alerts as alert}
							<div
								class="flex items-start gap-3 p-3 rounded-lg border {alert.resolvedAt
									? 'bg-muted/30'
									: 'bg-background'}"
							>
								<AlertCircle
									class="h-5 w-5 mt-0.5 flex-shrink-0 {alert.severity === 'critical' ||
									alert.severity === 'error'
										? 'text-red-500'
										: alert.severity === 'warning'
											? 'text-yellow-500'
											: 'text-blue-500'}"
								/>
								<div class="flex-1 min-w-0">
									<div class="flex items-start justify-between gap-2 mb-1">
										<div>
											<p class="font-medium text-sm">
												{alert.message}
											</p>
											<p class="text-xs text-muted-foreground mt-0.5">
												{alert.alertType.replace(/_/g, ' ')}
												{#if alert.entityType}
													• {alert.entityType}
												{/if}
											</p>
										</div>
										<Badge variant={getSeverityColor(alert.severity)} class="ml-2 flex-shrink-0">
											{alert.severity}
										</Badge>
									</div>
									<div class="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
										<span>
											Triggered: {formatDate(alert.triggeredAt)}
										</span>
										{#if alert.resolvedAt}
											<span class="text-green-600">
												✓ Resolved: {formatDate(alert.resolvedAt)}
											</span>
										{/if}
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</CardContent>
		</Card>

		<!-- Metrics Chart -->
		<Card>
			<CardHeader>
				<CardTitle>Sync Performance (24h)</CardTitle>
				<CardDescription>Duration and success rate over time</CardDescription>
			</CardHeader>
			<CardContent>
				{#if metrics.length === 0}
					<div class="text-center py-8 text-muted-foreground">
						<TrendingUp class="h-12 w-12 mx-auto mb-3" />
						<p>No metrics data available</p>
					</div>
				{:else}
					<div class="space-y-2">
						{#each metrics.slice(0, 10) as metric}
							<div class="flex items-center gap-3 py-2 border-b last:border-0">
								<div class="flex-1 min-w-0">
									<div class="flex items-center justify-between">
										<span class="text-sm font-medium">
											{new Date(metric.recordedAt).toLocaleTimeString()}
										</span>
										<Badge variant={metric.connectionStatus === 'healthy' ? 'outline' : 'secondary'}>
											{metric.connectionStatus}
										</Badge>
									</div>
									<div class="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
										<span>Duration: {formatDuration(metric.syncDurationMs || 0)}</span>
										<span>Records: {metric.recordsProcessed || 0}</span>
										<span>Errors: {metric.errorsCount}</span>
										{#if metric.successRate}
											<span>Success: {formatPercentage(metric.successRate)}</span>
										{/if}
									</div>
								</div>
							</div>
						{/each}
					</div>

					{#if metrics.length > 10}
						<p class="text-center text-sm text-muted-foreground mt-4">
							Showing 10 of {metrics.length} metrics
						</p>
					{/if}
				{/if}
			</CardContent>
		</Card>
	{:else}
		<Card>
			<CardContent class="py-12">
				<div class="text-center text-muted-foreground">
					<Activity class="h-12 w-12 mx-auto mb-3" />
					<p class="font-medium">No health data available</p>
					<p class="text-sm">Sync health monitoring will appear here once sync operations begin</p>
				</div>
			</CardContent>
		</Card>
	{/if}
</div>
