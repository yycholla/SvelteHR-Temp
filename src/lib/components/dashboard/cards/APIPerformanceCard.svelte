<script lang="ts">
	import { Activity, TrendingUp, TrendingDown, Clock, Database } from 'lucide-svelte';
	import Progress from '$lib/components/ui/progress/progress.svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import { createPerformanceMonitor, createDebouncedDerived, createAsyncDerived } from '$lib/utils/reactivity.svelte';
	import { globalState } from '$lib/stores/global-state.svelte';
	import type { CardProps } from '../types.js';

	let { instance, metadata, data }: CardProps = $props();

	// Create performance monitor for this widget
	const widgetMonitor = createPerformanceMonitor('APIPerformanceCard');

	// Mock API performance data - enhanced with real-time simulation
	let baseData = $state({
		requestsPerMinute: 145,
		averageLatency: 23,
		errorRate: 0.2,
		uptime: 99.9,
		topEndpoints: [
			{ path: '/api/v1/employees', count: 45, avgLatency: 18 },
			{ path: '/api/v1/tasks', count: 32, avgLatency: 25 },
			{ path: '/api/v1/auth/profile', count: 28, avgLatency: 12 }
		],
		responseTimeDistribution: {
			fast: 75, // < 50ms
			medium: 20, // 50-200ms
			slow: 5 // > 200ms
		},
		lastUpdated: Date.now()
	});

	// Simulated real-time data updates with debounced processing
	const liveMetrics = createDebouncedDerived(() => {
		return widgetMonitor.monitor(() => {
			// Simulate fluctuating metrics
			const now = Date.now();
			const variance = Math.sin(now / 10000) * 0.1; // 10% variance over time
			
			return {
				...baseData,
				requestsPerMinute: Math.round(baseData.requestsPerMinute * (1 + variance)),
				averageLatency: Math.round(baseData.averageLatency * (1 + variance * 0.5)),
				errorRate: Math.max(0, baseData.errorRate * (1 + variance * 0.2)),
				lastUpdated: now
			};
		});
	}, 1000); // Debounce updates to once per second

	// Async endpoint health check simulation
	const endpointHealth = createAsyncDerived(async () => {
		// Simulate API health check
		await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
		
		const healthyEndpoints = liveMetrics().topEndpoints.map(endpoint => ({
			...endpoint,
			status: Math.random() > 0.05 ? 'healthy' : 'degraded',
			responseTime: endpoint.avgLatency + (Math.random() * 10 - 5)
		}));
		
		return healthyEndpoints;
	}, []);

	// Performance score with optimized calculation
	const performanceScore = $derived(() => {
		const metrics = liveMetrics();
		let score = 100;
		
		if (metrics.averageLatency > 100) score -= 20;
		else if (metrics.averageLatency > 50) score -= 10;
		
		if (metrics.errorRate > 1) score -= 30;
		else if (metrics.errorRate > 0.5) score -= 15;
		
		// Factor in global performance metrics
		const globalMetrics = globalState.performanceMetrics();
		if (globalMetrics.cacheHits > 0) {
			const hitRate = globalMetrics.cacheHits / (globalMetrics.cacheHits + globalMetrics.cacheMisses);
			score += hitRate * 5; // Bonus for good cache performance
		}
		
		return Math.max(Math.min(score, 100), 0);
	});

	// Performance trend calculation
	const performanceTrend = $derived(() => {
		const current = performanceScore();
		const historical = 85; // Mock historical average
		return current - historical;
	});

	// Real-time update simulation
	$effect(() => {
		const interval = setInterval(() => {
			// Update global performance metrics
			globalState.incrementApiCall();
			
			if (Math.random() > 0.7) {
				globalState.incrementCacheHit();
			} else {
				globalState.incrementCacheMiss();
			}
			
			// Trigger data refresh
			baseData = {
				...baseData,
				lastUpdated: Date.now()
			};
		}, 5000);

		return () => clearInterval(interval);
	});

	function getPerformanceColor(score: number): string {
		if (score >= 90) return 'text-green-600';
		if (score >= 70) return 'text-yellow-600';
		return 'text-red-600';
	}

	function formatLatency(latency: number): string {
		return latency < 1000 ? `${Math.round(latency)}ms` : `${(latency / 1000).toFixed(1)}s`;
	}
</script>

<div class="h-full space-y-4 overflow-y-auto">
	<!-- Key Metrics with Live Updates -->
	<div class="grid grid-cols-2 gap-6">
		<div class="text-center">
			<div class="text-3xl font-bold text-primary">{liveMetrics().requestsPerMinute}</div>
			<div class="mt-1 text-sm text-muted-foreground">Requests/min</div>
			{#if globalState.performanceMetrics().apiCalls > 0}
				<div class="text-xs text-muted-foreground">
					({globalState.performanceMetrics().apiCalls} total calls)
				</div>
			{/if}
		</div>

		<div class="text-center">
			<div class="text-3xl font-bold text-primary">{formatLatency(liveMetrics().averageLatency)}</div>
			<div class="mt-1 text-sm text-muted-foreground">Avg Latency</div>
			{#if widgetMonitor.getStats().count > 0}
				<div class="text-xs text-muted-foreground">
					Widget: {widgetMonitor.getStats().lastTime.toFixed(1)}ms
				</div>
			{/if}
		</div>
	</div>

	<!-- Performance Score with Trend -->
	<div class="space-y-3">
		<div class="flex items-center justify-between">
			<span class="text-sm font-medium">Performance</span>
			<div class="flex items-center gap-2">
				<span class="text-lg font-bold {getPerformanceColor(performanceScore())}"
					>{performanceScore()}%</span
				>
				{#if performanceTrend() > 0}
					<TrendingUp class="h-4 w-4 text-green-600" />
					<span class="text-xs text-green-600">+{performanceTrend().toFixed(1)}%</span>
				{:else if performanceTrend() < 0}
					<TrendingDown class="h-4 w-4 text-red-600" />
					<span class="text-xs text-red-600">{performanceTrend().toFixed(1)}%</span>
				{:else}
					<Activity class="h-4 w-4 text-muted-foreground" />
				{/if}
			</div>
		</div>
		<Progress value={performanceScore()} class="h-3" />
	</div>

	<!-- Health Indicators with Cache Performance -->
	<div class="grid grid-cols-2 gap-4 text-sm">
		<div class="flex items-center justify-between">
			<span class="text-muted-foreground">Error Rate</span>
			<Badge variant={liveMetrics().errorRate < 0.5 ? 'default' : 'destructive'}>
				{liveMetrics().errorRate.toFixed(2)}%
			</Badge>
		</div>

		<div class="flex items-center justify-between">
			<span class="text-muted-foreground">Uptime</span>
			<Badge variant="default">{liveMetrics().uptime}%</Badge>
		</div>

		{#if globalState.performanceMetrics().cacheHits + globalState.performanceMetrics().cacheMisses > 0}
			{@const hitRate = globalState.performanceMetrics().cacheHits / (globalState.performanceMetrics().cacheHits + globalState.performanceMetrics().cacheMisses) * 100}
			<div class="flex items-center justify-between col-span-2">
				<span class="text-muted-foreground">Cache Hit Rate</span>
				<Badge variant={hitRate > 80 ? 'default' : hitRate > 50 ? 'secondary' : 'destructive'}>
					{hitRate.toFixed(1)}%
				</Badge>
			</div>
		{/if}
	</div>

	<!-- Top Endpoints with Health Status -->
	{#if endpointHealth.value()}
		<div class="space-y-2">
			<h4 class="text-sm font-medium text-muted-foreground">Top Endpoints</h4>
			<div class="space-y-1">
				{#each endpointHealth.value().slice(0, 3) as endpoint}
					<div class="flex items-center justify-between text-xs">
						<div class="flex items-center gap-2">
							<div class="h-2 w-2 rounded-full bg-{endpoint.status === 'healthy' ? 'green' : 'yellow'}-500"></div>
							<span class="font-mono text-muted-foreground truncate">{endpoint.path}</span>
						</div>
						<div class="flex items-center gap-2 text-right">
							<span class="font-medium">{endpoint.count}</span>
							<span class="text-muted-foreground">{formatLatency(endpoint.responseTime)}</span>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{:else if endpointHealth.loading()}
		<div class="flex items-center justify-center py-4">
			<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
			<span class="ml-2 text-xs text-muted-foreground">Checking endpoint health...</span>
		</div>
	{/if}

	<!-- Real-time Update Indicator -->
	<div class="text-xs text-muted-foreground text-center border-t pt-2">
		Last updated: {new Date(liveMetrics().lastUpdated).toLocaleTimeString()}
	</div>
</div>
