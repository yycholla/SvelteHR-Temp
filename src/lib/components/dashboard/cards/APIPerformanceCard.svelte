<script lang="ts">
	import { Activity, TrendingUp, TrendingDown, Clock, Database } from 'lucide-svelte';
	import Progress from '$lib/components/ui/progress/progress.svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import type { CardProps } from '../types.js';
	
	let { instance, metadata, data }: CardProps = $props();
	
	// Mock API performance data - in real app this would come from props.data
	const mockData = {
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
		}
	};
	
	// Calculate performance score
	const performanceScore = $derived(() => {
		let score = 100;
		if (mockData.averageLatency > 100) score -= 20;
		else if (mockData.averageLatency > 50) score -= 10;
		if (mockData.errorRate > 1) score -= 30;
		else if (mockData.errorRate > 0.5) score -= 15;
		return Math.max(score, 0);
	});
	
	function getPerformanceColor(score: number): string {
		if (score >= 90) return 'text-green-600';
		if (score >= 70) return 'text-yellow-600';
		return 'text-red-600';
	}
</script>

<div class="space-y-4 h-full overflow-y-auto">
	<!-- Key Metrics -->
	<div class="grid grid-cols-2 gap-6">
		<div class="text-center">
			<div class="text-3xl font-bold text-primary">{mockData.requestsPerMinute}</div>
			<div class="text-sm text-muted-foreground mt-1">Requests/min</div>
		</div>
		
		<div class="text-center">
			<div class="text-3xl font-bold text-primary">{mockData.averageLatency}ms</div>
			<div class="text-sm text-muted-foreground mt-1">Avg Latency</div>
		</div>
	</div>
	
	<!-- Performance Score -->
	<div class="space-y-3">
		<div class="flex items-center justify-between">
			<span class="text-sm font-medium">Performance</span>
			<span class="text-lg font-bold {getPerformanceColor(performanceScore())}">{performanceScore()}%</span>
		</div>
		<Progress value={performanceScore()} class="h-3" />
	</div>
	
	<!-- Health Indicators -->
	<div class="grid grid-cols-2 gap-4 text-sm">
		<div class="flex items-center justify-between">
			<span class="text-muted-foreground">Error Rate</span>
			<span class="font-medium text-green-600">{mockData.errorRate}%</span>
		</div>
		
		<div class="flex items-center justify-between">
			<span class="text-muted-foreground">Uptime</span>
			<span class="font-medium text-green-600">{mockData.uptime}%</span>
		</div>
	</div>
</div>