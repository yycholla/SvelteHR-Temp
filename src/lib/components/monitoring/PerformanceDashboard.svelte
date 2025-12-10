<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { metricsService } from '$lib/services/metricsService';
	import Card from '../base/Card.svelte';
	import Button from '../base/Button.svelte';
	import Badge from '../base/Badge.svelte';

	// State
	let metrics: any = null;
	let loading = true;
	let error: string | null = null;
	let autoRefresh = true;
	let refreshInterval: NodeJS.Timeout | null = null;

	// Performance thresholds
	const THRESHOLDS = {
		navigation: { good: 1000, poor: 2500 },
		graphql: { good: 200, poor: 1000 },
		api: { good: 500, poor: 2000 },
		lcp: { good: 2500, poor: 4000 },
		fid: { good: 100, poor: 300 }
	};

	// Load metrics from API
	async function loadMetrics() {
		try {
			loading = true;
			error = null;

			const response = await fetch('/api/metrics?aggregated=true');
			if (!response.ok) {
				throw new Error('Failed to load metrics');
			}

			metrics = await response.json();
		} catch (err: any) {
			error = err.message;
			console.error('Failed to load performance metrics:', err);
		} finally {
			loading = false;
		}
	}

	// Get performance status based on value and thresholds
	function getPerformanceStatus(
		value: number,
		type: keyof typeof THRESHOLDS
	): 'good' | 'needs-improvement' | 'poor' {
		const threshold = THRESHOLDS[type];
		if (value <= threshold.good) return 'good';
		if (value <= threshold.poor) return 'needs-improvement';
		return 'poor';
	}

	// Get badge variant for performance status
	function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
		switch (status) {
			case 'good':
				return 'default';
			case 'needs-improvement':
				return 'outline';
			case 'poor':
				return 'destructive';
			default:
				return 'secondary';
		}
	}

	// Format duration
	function formatDuration(ms: number): string {
		if (ms < 1000) return `${Math.round(ms)}ms`;
		return `${(ms / 1000).toFixed(1)}s`;
	}

	// Format percentage
	function formatPercent(value: number): string {
		return `${(value * 100).toFixed(1)}%`;
	}

	// Toggle auto refresh
	function toggleAutoRefresh() {
		autoRefresh = !autoRefresh;

		if (autoRefresh) {
			startAutoRefresh();
		} else {
			stopAutoRefresh();
		}
	}

	// Start auto refresh
	function startAutoRefresh() {
		if (refreshInterval) return;

		refreshInterval = setInterval(() => {
			loadMetrics();
		}, 30000); // Refresh every 30 seconds
	}

	// Stop auto refresh
	function stopAutoRefresh() {
		if (refreshInterval) {
			clearInterval(refreshInterval);
			refreshInterval = null;
		}
	}

	// Component lifecycle
	onMount(() => {
		loadMetrics();
		if (autoRefresh) {
			startAutoRefresh();
		}
	});

	onDestroy(() => {
		stopAutoRefresh();
	});
</script>

<div class="performance-dashboard">
	<!-- Header -->
	<div class="dashboard-header">
		<div class="header-content">
			<h2 class="dashboard-title">Performance Monitoring</h2>
			<p class="dashboard-subtitle">Real-time application performance metrics and diagnostics</p>
		</div>

		<div class="header-actions">
			<Button
				variant={autoRefresh ? 'primary' : 'secondary'}
				size="sm"
				leftIcon={autoRefresh ? 'pause' : 'play'}
				onclick={toggleAutoRefresh}
			>
				{autoRefresh ? 'Pause' : 'Start'} Auto-refresh
			</Button>

			<Button variant="ghost" size="sm" leftIcon="refresh-cw" onclick={loadMetrics} {loading}>
				Refresh
			</Button>
		</div>
	</div>

	{#if loading && !metrics}
		<div class="loading-state">
			<div class="loading-spinner"></div>
			<p>Loading performance metrics...</p>
		</div>
	{:else if error}
		<Card padding="md" class="error-card">
			<div class="error-content">
				<i class="icon-alert-circle error-icon"></i>
				<div>
					<h3>Failed to Load Metrics</h3>
					<p>{error}</p>
					<Button variant="secondary" size="sm" onclick={loadMetrics}>Try Again</Button>
				</div>
			</div>
		</Card>
	{:else if metrics}
		<!-- Summary Stats -->
		<div class="summary-grid">
			<Card padding="md">
				<div class="summary-stat">
					<div class="stat-icon stat-icon--primary">
						<i class="icon-activity"></i>
					</div>
					<div class="stat-content">
						<div class="stat-value">{metrics.summary.totalMetrics.toLocaleString()}</div>
						<div class="stat-label">Total Metrics</div>
					</div>
				</div>
			</Card>

			<Card padding="md">
				<div class="summary-stat">
					<div class="stat-icon stat-icon--success">
						<i class="icon-users"></i>
					</div>
					<div class="stat-content">
						<div class="stat-value">{metrics.summary.uniqueSessions}</div>
						<div class="stat-label">Active Sessions</div>
					</div>
				</div>
			</Card>

			<Card padding="md">
				<div class="summary-stat">
					<div class="stat-icon stat-icon--danger">
						<i class="icon-alert-triangle"></i>
					</div>
					<div class="stat-content">
						<div class="stat-value">{metrics.errors.total}</div>
						<div class="stat-label">Errors (1h)</div>
					</div>
				</div>
			</Card>

			<Card padding="md">
				<div class="summary-stat">
					<div class="stat-icon stat-icon--warning">
						<i class="icon-clock"></i>
					</div>
					<div class="stat-content">
						<div class="stat-value">
							{formatDuration(metrics.performance.navigation.average)}
						</div>
						<div class="stat-label">Avg Page Load</div>
					</div>
				</div>
			</Card>
		</div>

		<!-- Performance Metrics -->
		<div class="metrics-grid">
			<!-- Navigation Performance -->
			<Card padding="md">
				<div class="metric-card">
					<h3 class="metric-title">
						<i class="icon-navigation"></i>
						Page Navigation
					</h3>

					{#if metrics.performance.navigation.count > 0}
						<div class="metric-stats">
							<div class="metric-row">
								<span>Average:</span>
								<Badge
									variant={getStatusVariant(
										getPerformanceStatus(metrics.performance.navigation.average, 'navigation')
									)}
								>
									{formatDuration(metrics.performance.navigation.average)}
								</Badge>
							</div>
							<div class="metric-row">
								<span>95th Percentile:</span>
								<Badge
									variant={getStatusVariant(
										getPerformanceStatus(metrics.performance.navigation.p95, 'navigation')
									)}
								>
									{formatDuration(metrics.performance.navigation.p95)}
								</Badge>
							</div>
							<div class="metric-row">
								<span>Count:</span>
								<span class="metric-count">{metrics.performance.navigation.count}</span>
							</div>
						</div>
					{:else}
						<div class="no-data">No navigation data available</div>
					{/if}
				</div>
			</Card>

			<!-- GraphQL Performance -->
			<Card padding="md">
				<div class="metric-card">
					<h3 class="metric-title">
						<i class="icon-database"></i>
						GraphQL Queries
					</h3>

					{#if metrics.performance.graphqlQueries.count > 0}
						<div class="metric-stats">
							<div class="metric-row">
								<span>Average:</span>
								<Badge
									variant={getStatusVariant(
										getPerformanceStatus(metrics.performance.graphqlQueries.average, 'graphql')
									)}
								>
									{formatDuration(metrics.performance.graphqlQueries.average)}
								</Badge>
							</div>
							<div class="metric-row">
								<span>95th Percentile:</span>
								<Badge
									variant={getStatusVariant(
										getPerformanceStatus(metrics.performance.graphqlQueries.p95, 'graphql')
									)}
								>
									{formatDuration(metrics.performance.graphqlQueries.p95)}
								</Badge>
							</div>
							<div class="metric-row">
								<span>Count:</span>
								<span class="metric-count">{metrics.performance.graphqlQueries.count}</span>
							</div>
						</div>
					{:else}
						<div class="no-data">No GraphQL data available</div>
					{/if}
				</div>
			</Card>

			<!-- Web Vitals -->
			<Card padding="md">
				<div class="metric-card">
					<h3 class="metric-title">
						<i class="icon-zap"></i>
						Web Vitals
					</h3>

					<div class="metric-stats">
						{#if metrics.performance.webVitals.lcp.count > 0}
							<div class="metric-row">
								<span>LCP (Largest Contentful Paint):</span>
								<Badge
									variant={getStatusVariant(
										getPerformanceStatus(metrics.performance.webVitals.lcp.average, 'lcp')
									)}
								>
									{formatDuration(metrics.performance.webVitals.lcp.average)}
								</Badge>
							</div>
						{/if}

						{#if metrics.performance.webVitals.fid.count > 0}
							<div class="metric-row">
								<span>FID (First Input Delay):</span>
								<Badge
									variant={getStatusVariant(
										getPerformanceStatus(metrics.performance.webVitals.fid.average, 'fid')
									)}
								>
									{formatDuration(metrics.performance.webVitals.fid.average)}
								</Badge>
							</div>
						{/if}

						{#if metrics.performance.webVitals.lcp.count === 0 && metrics.performance.webVitals.fid.count === 0}
							<div class="no-data">No Web Vitals data available</div>
						{/if}
					</div>
				</div>
			</Card>

			<!-- Error Summary -->
			<Card padding="md">
				<div class="metric-card">
					<h3 class="metric-title">
						<i class="icon-alert-triangle"></i>
						Error Summary
					</h3>

					{#if metrics.errors.total > 0}
						<div class="metric-stats">
							<div class="metric-row">
								<span>Total Errors:</span>
								<Badge variant="destructive">{metrics.errors.total}</Badge>
							</div>

							<div class="error-breakdown">
								<h4>By Type:</h4>
								{#each Object.entries(metrics.errors.byType).slice(0, 3) as [type, count]}
									<div class="error-item">
										<span class="error-type">{type}</span>
										<Badge variant="secondary" size="sm">{count}</Badge>
									</div>
								{/each}
							</div>
						</div>
					{:else}
						<div class="no-data success">
							<i class="icon-check-circle"></i>
							No errors detected
						</div>
					{/if}
				</div>
			</Card>
		</div>

		<!-- Top Routes -->
		{#if metrics.business.topRoutes.length > 0}
			<Card padding="md">
				<div class="routes-section">
					<h3 class="section-title">
						<i class="icon-trending-up"></i>
						Top Routes (1 hour)
					</h3>

					<div class="routes-list">
						{#each metrics.business.topRoutes.slice(0, 5) as route}
							<div class="route-item">
								<div class="route-path">{route.route}</div>
								<div class="route-stats">
									<Badge variant="default" size="sm">{route.count} visits</Badge>
									<Badge variant="secondary" size="sm">
										{formatDuration(route.avgDuration)} avg
									</Badge>
								</div>
							</div>
						{/each}
					</div>
				</div>
			</Card>
		{/if}

		<!-- Slowest Operations -->
		{#if metrics.business.slowestOperations.length > 0}
			<Card padding="md">
				<div class="operations-section">
					<h3 class="section-title">
						<i class="icon-clock"></i>
						Slowest Operations
					</h3>

					<div class="operations-list">
						{#each metrics.business.slowestOperations.slice(0, 5) as operation}
							<div class="operation-item">
								<div class="operation-info">
									<div class="operation-name">{operation.operation}</div>
									<div class="operation-type">{operation.type}</div>
								</div>
								<Badge variant="outline">
									{formatDuration(operation.duration)}
								</Badge>
							</div>
						{/each}
					</div>
				</div>
			</Card>
		{/if}
	{/if}
</div>
