<!--
	Performance Testing Component for Svelte 5 Runes Migration
	
	Interactive performance testing component that runs benchmarks comparing
	Svelte 5 runes performance against traditional Svelte patterns.
	
	Features:
	- Real-time performance benchmarks
	- Statistical analysis with visualizations
	- Memory usage monitoring
	- Performance recommendations
	- Exportable results for analysis
-->

<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Progress } from '$lib/components/ui/progress';
	import { 
		PerformanceBenchmark, 
		createRunesPerformanceSuite,
		analyzeMemoryUsage,
		generateRecommendations,
		type PerformanceResult 
	} from '$lib/utils/performance-analysis.svelte';
	import { globalState } from '$lib/stores/global-state.svelte';
	import { 
		Play, 
		Download, 
		Trash2, 
		Activity, 
		Zap, 
		TrendingUp, 
		TrendingDown,
		Clock,
		BarChart3,
		AlertTriangle,
		CheckCircle
	} from 'lucide-svelte';

	// Component state
	let benchmark = $state(new PerformanceBenchmark());
	let isRunning = $state(false);
	let currentTest = $state('');
	let progress = $state(0);
	let results: PerformanceResult[] = $state([]);
	let recommendations: string[] = $state([]);
	let memoryInfo = $state<ReturnType<typeof analyzeMemoryUsage>>(null);
	let showRawResults = $state(false);

	// Performance summary computations
	const performanceSummary = $derived(() => {
		if (results.length === 0) return null;

		const totalTests = results.length;
		const averageTime = results.reduce((sum, r) => sum + r.averageTime, 0) / totalTests;
		const totalOps = results.reduce((sum, r) => sum + r.operationsPerSecond, 0);
		const fastestTest = results.reduce((min, r) => r.averageTime < min.averageTime ? r : min);
		const slowestTest = results.reduce((max, r) => r.averageTime > max.averageTime ? r : max);

		return {
			totalTests,
			averageTime,
			totalOps,
			fastestTest,
			slowestTest
		};
	});

	// Run the complete performance suite
	async function runPerformanceSuite() {
		if (isRunning) return;

		isRunning = true;
		progress = 0;
		currentTest = 'Initializing...';
		results = [];

		try {
			// Add notification
			globalState.addNotification({
				type: 'info',
				title: 'Performance Testing Started',
				message: 'Running comprehensive performance benchmarks...'
			});

			const suite = createRunesPerformanceSuite();
			const totalTests = suite.tests.length;

			// Clear previous results
			benchmark.clearResults();

			// Run each test with progress updates
			for (let i = 0; i < suite.tests.length; i++) {
				const test = suite.tests[i];
				currentTest = test.name;
				progress = (i / totalTests) * 100;

				// Small delay to allow UI updates
				await new Promise(resolve => setTimeout(resolve, 50));

				const result = await benchmark.runTest(test);
				results = [...results, result];
			}

			// Generate recommendations
			recommendations = generateRecommendations(results);

			// Get memory info
			memoryInfo = analyzeMemoryUsage();

			// Success notification
			globalState.addNotification({
				type: 'success',
				title: 'Performance Testing Complete',
				message: `Completed ${totalTests} performance tests successfully`
			});

			currentTest = 'Completed';
			progress = 100;

		} catch (error) {
			globalState.addNotification({
				type: 'error',
				title: 'Performance Testing Failed',
				message: error instanceof Error ? error.message : 'Unknown error occurred'
			});
		} finally {
			isRunning = false;
		}
	}

	// Export results as JSON file
	function exportResults() {
		const exportData = {
			timestamp: new Date().toISOString(),
			summary: performanceSummary,
			results: results,
			recommendations: recommendations,
			memoryInfo: memoryInfo,
			environment: {
				userAgent: navigator.userAgent,
				platform: navigator.platform,
				language: navigator.language,
				cookieEnabled: navigator.cookieEnabled,
				onLine: navigator.onLine
			}
		};

		const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `svelteHR-performance-${new Date().toISOString().split('T')[0]}.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);

		globalState.addNotification({
			type: 'success',
			title: 'Results Exported',
			message: 'Performance results have been downloaded as JSON'
		});
	}

	// Clear all results
	function clearResults() {
		results = [];
		recommendations = [];
		memoryInfo = null;
		progress = 0;
		currentTest = '';
		benchmark.clearResults();

		globalState.addNotification({
			type: 'info',
			title: 'Results Cleared',
			message: 'All performance test results have been cleared'
		});
	}

	// Format time for display
	function formatTime(ms: number): string {
		if (ms < 1) {
			return `${(ms * 1000).toFixed(1)}μs`;
		} else if (ms < 1000) {
			return `${ms.toFixed(2)}ms`;
		} else {
			return `${(ms / 1000).toFixed(2)}s`;
		}
	}

	// Get performance badge variant
	function getPerformanceBadge(averageTime: number) {
		if (averageTime < 1) return { variant: 'default' as const, text: 'Excellent' };
		if (averageTime < 5) return { variant: 'secondary' as const, text: 'Good' };
		if (averageTime < 10) return { variant: 'outline' as const, text: 'Fair' };
		return { variant: 'destructive' as const, text: 'Poor' };
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h2 class="text-2xl font-bold">Performance Testing Suite</h2>
			<p class="text-muted-foreground">
				Benchmark Svelte 5 runes performance against traditional patterns
			</p>
		</div>
		
		{#if memoryInfo}
			<div class="text-right text-sm">
				<div class="font-medium">Memory Usage</div>
				<div class="text-muted-foreground">{memoryInfo.formatted.used} / {memoryInfo.formatted.limit}</div>
			</div>
		{/if}
	</div>

	<!-- Controls -->
	<div class="flex items-center gap-4">
		<Button onclick={runPerformanceSuite} disabled={isRunning} size="lg">
			{#if isRunning}
				<Activity class="h-4 w-4 mr-2 animate-spin" />
				Running Tests...
			{:else}
				<Play class="h-4 w-4 mr-2" />
				Run Performance Suite
			{/if}
		</Button>

		{#if results.length > 0}
			<Button variant="outline" onclick={exportResults}>
				<Download class="h-4 w-4 mr-2" />
				Export Results
			</Button>

			<Button variant="outline" onclick={clearResults}>
				<Trash2 class="h-4 w-4 mr-2" />
				Clear Results
			</Button>
		{/if}

		<div class="flex-1"></div>

		<Button 
			variant="ghost" 
			size="sm" 
			onclick={() => showRawResults = !showRawResults}
		>
			{showRawResults ? 'Hide' : 'Show'} Raw Data
		</Button>
	</div>

	<!-- Progress -->
	{#if isRunning}
		<div class="space-y-2">
			<div class="flex items-center justify-between text-sm">
				<span>Current Test: {currentTest}</span>
				<span>{progress.toFixed(0)}%</span>
			</div>
			<Progress value={progress} class="h-3" />
		</div>
	{/if}

	<!-- Performance Summary -->
	{#if performanceSummary}
		<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
			<div class="p-4 border rounded-lg text-center">
				<div class="text-2xl font-bold text-primary">{performanceSummary.totalTests}</div>
				<div class="text-sm text-muted-foreground">Tests Completed</div>
			</div>
			
			<div class="p-4 border rounded-lg text-center">
				<div class="text-2xl font-bold text-green-600">{formatTime(performanceSummary.averageTime)}</div>
				<div class="text-sm text-muted-foreground">Average Time</div>
			</div>
			
			<div class="p-4 border rounded-lg text-center">
				<div class="text-2xl font-bold text-blue-600">{performanceSummary.totalOps.toFixed(0)}</div>
				<div class="text-sm text-muted-foreground">Total Ops/Sec</div>
			</div>
			
			<div class="p-4 border rounded-lg text-center">
				<div class="text-2xl font-bold text-purple-600">{formatTime(performanceSummary.fastestTest.averageTime)}</div>
				<div class="text-sm text-muted-foreground">Fastest Test</div>
			</div>
		</div>
	{/if}

	<!-- Recommendations -->
	{#if recommendations.length > 0}
		<div class="space-y-3">
			<h3 class="text-lg font-semibold flex items-center gap-2">
				<BarChart3 class="h-5 w-5" />
				Performance Analysis & Recommendations
			</h3>
			
			<div class="space-y-2">
				{#each recommendations as recommendation}
					<div class="p-3 rounded-lg border-l-4 {
						recommendation.includes('✨') || recommendation.includes('✅') ? 'bg-green-50 border-green-400' :
						recommendation.includes('⚠️') || recommendation.includes('💾') ? 'bg-yellow-50 border-yellow-400' :
						'bg-blue-50 border-blue-400'
					}">
						<p class="text-sm">{recommendation}</p>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Test Results -->
	{#if results.length > 0}
		<div class="space-y-4">
			<h3 class="text-lg font-semibold flex items-center gap-2">
				<Clock class="h-5 w-5" />
				Test Results ({results.length})
			</h3>
			
			<div class="grid gap-4">
				{#each results as result}
					{@const badge = getPerformanceBadge(result.averageTime)}
					<div class="p-4 border rounded-lg space-y-3">
						<div class="flex items-center justify-between">
							<h4 class="font-medium text-sm">{result.name}</h4>
							<Badge variant={badge.variant}>{badge.text}</Badge>
						</div>
						
						<div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
							<div>
								<div class="font-medium">Average Time</div>
								<div class="text-muted-foreground">{formatTime(result.averageTime)}</div>
							</div>
							
							<div>
								<div class="font-medium">Operations/sec</div>
								<div class="text-muted-foreground">{result.operationsPerSecond.toFixed(0)}</div>
							</div>
							
							<div>
								<div class="font-medium">Range</div>
								<div class="text-muted-foreground">
									{formatTime(result.minTime)} - {formatTime(result.maxTime)}
								</div>
							</div>
							
							<div>
								<div class="font-medium">Std Deviation</div>
								<div class="text-muted-foreground">±{formatTime(result.standardDeviation)}</div>
							</div>
						</div>

						{#if result.memoryUsage}
							<div class="text-xs text-muted-foreground">
								Memory Impact: {(result.memoryUsage / 1024).toFixed(1)} KB
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Raw Results (Collapsible) -->
	{#if showRawResults && results.length > 0}
		<details class="space-y-3">
			<summary class="cursor-pointer font-medium">Raw Performance Data</summary>
			<pre class="p-4 bg-muted rounded-lg text-xs overflow-auto max-h-96">
{JSON.stringify({ 
	summary: performanceSummary,
	results,
	recommendations,
	memoryInfo 
}, null, 2)}
			</pre>
		</details>
	{/if}

	<!-- Performance Tips -->
	<div class="p-4 bg-blue-50 border border-blue-200 rounded-lg">
		<h4 class="font-medium text-blue-900 mb-2">Performance Testing Tips</h4>
		<ul class="text-sm text-blue-800 space-y-1">
			<li>• Close other browser tabs and applications for more accurate results</li>
			<li>• Run tests multiple times to account for browser optimizations</li>
			<li>• Results may vary between different devices and browsers</li>
			<li>• Use Chrome DevTools Performance tab for detailed analysis</li>
			<li>• Memory measurements require Chrome or Chromium-based browsers</li>
		</ul>
	</div>
</div>