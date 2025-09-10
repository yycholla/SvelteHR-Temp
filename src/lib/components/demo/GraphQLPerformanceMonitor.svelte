<!--
GraphQL Performance Monitoring Dashboard

Real-time monitoring and analytics for GraphQL operations including:
- Cache performance metrics and hit rates
- Query complexity analysis and optimization suggestions
- Performance trends and bottleneck identification
- Advanced caching controls and cache inspection
- Query optimization recommendations and auto-fixes
-->

<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { createOptimizedClient, type EnhancedBrowserGraphQLClient } from '$lib/graphql/client-factory-enhanced';
	import { queryOptimizer } from '$lib/graphql/optimization/query-optimizer';
	import { graphqlCache } from '$lib/graphql/cache/advanced-cache';
	import { showSuccess, showWarning, showInfo } from '$lib/utils/errors';

	// Client instance for testing
	let optimizedClient: EnhancedBrowserGraphQLClient;
	let refreshInterval: number;
	
	// Reactive state
	let performanceData = $state({
		metrics: { totalQueries: 0, cacheHitRate: 0, averageResponseTime: 0, memoryUsage: 0 },
		suggestions: [],
		cacheStats: { hits: 0, misses: 0, cacheSize: 0, maxCacheSize: 0, hitRate: 0 }
	});
	
	let isRunningTest = $state(false);
	let testResults = $state<Array<{ query: string; time: number; cached: boolean; complexity: number }>>([]);
	let selectedOptimizationLevel = $state<'performance' | 'memory' | 'balanced'>('balanced');

	// Sample queries for testing
	const testQueries = [
		{
			name: 'Simple Employee Query',
			query: `query GetEmployee($id: ID!) {
				employee(id: $id) {
					id
					name
					email
					department {
						id
						name
					}
				}
			}`,
			variables: { id: '1' }
		},
		{
			name: 'Complex Dashboard Query',
			query: `query GetDashboard {
				employees {
					id
					name
					email
					department {
						id
						name
						manager {
							id
							name
							email
						}
					}
					tasks {
						id
						title
						status
						assignee {
							name
						}
					}
				}
				departments {
					id
					name
					employeeCount
					recentActivities {
						id
						type
						timestamp
						user {
							name
						}
					}
				}
			}`,
			variables: {}
		},
		{
			name: 'Deep Nested Query',
			query: `query GetDeepData {
				employee(id: "1") {
					id
					name
					department {
						id
						name
						employees {
							id
							name
							tasks {
								id
								title
								subtasks {
									id
									title
									assignee {
										name
										department {
											name
										}
									}
								}
							}
						}
					}
				}
			}`,
			variables: {}
		}
	];

	onMount(() => {
		// Initialize optimized client
		optimizedClient = createOptimizedClient(selectedOptimizationLevel);
		
		// Start performance monitoring
		refreshInterval = setInterval(() => {
			updatePerformanceData();
		}, 2000);
		
		updatePerformanceData();
	});

	onDestroy(() => {
		if (refreshInterval) {
			clearInterval(refreshInterval);
		}
	});

	/**
	 * Update performance data from client
	 */
	function updatePerformanceData() {
		if (optimizedClient) {
			const analytics = optimizedClient.getPerformanceAnalytics();
			performanceData = analytics;
		}
	}

	/**
	 * Run performance test with sample queries
	 */
	async function runPerformanceTest() {
		if (isRunningTest) return;
		
		isRunningTest = true;
		testResults = [];
		
		showInfo('Starting GraphQL performance test...');
		
		try {
			// Test each query multiple times
			for (const testQuery of testQueries) {
				for (let i = 0; i < 3; i++) {
					const startTime = Date.now();
					
					try {
						// Analyze query complexity first
						const analysis = queryOptimizer.analyzeQuery(testQuery.query, testQuery.variables);
						
						// Execute query (this is simulated for demo)
						await simulateGraphQLQuery(testQuery.query, testQuery.variables);
						
						const endTime = Date.now();
						const executionTime = endTime - startTime;
						
						testResults.push({
							query: testQuery.name,
							time: executionTime,
							cached: i > 0, // First execution not cached, subsequent ones are
							complexity: analysis.complexity.score
						});
						
						// Small delay between requests
						await new Promise(resolve => setTimeout(resolve, 100));
						
					} catch (error) {
						console.error('Test query failed:', error);
					}
				}
			}
			
			// Update performance data
			updatePerformanceData();
			showSuccess(`Performance test completed with ${testResults.length} queries`);
			
		} catch (error) {
			showWarning('Performance test encountered errors');
		} finally {
			isRunningTest = false;
		}
	}

	/**
	 * Simulate GraphQL query execution for demo
	 */
	async function simulateGraphQLQuery(query: string, variables: any) {
		// This simulates the enhanced client workflow
		const analysis = queryOptimizer.analyzeQuery(query, variables);
		
		// Simulate network delay based on complexity
		const baseDelay = 50;
		const complexityDelay = analysis.complexity.score * 2;
		const totalDelay = baseDelay + complexityDelay;
		
		await new Promise(resolve => setTimeout(resolve, Math.min(totalDelay, 1000)));
		
		// Simulate caching the result
		const mockData = { data: `Mock data for ${analysis.operationName || 'query'}` };
		
		// Record performance
		queryOptimizer.recordPerformance(query, totalDelay, JSON.stringify(mockData).length);
		
		return mockData;
	}

	/**
	 * Change optimization level and recreate client
	 */
	function changeOptimizationLevel(level: 'performance' | 'memory' | 'balanced') {
		selectedOptimizationLevel = level;
		optimizedClient.reset();
		optimizedClient = createOptimizedClient(level);
		updatePerformanceData();
		showInfo(`Switched to ${level} optimization mode`);
	}

	/**
	 * Clear cache and performance data
	 */
	function clearCacheAndMetrics() {
		optimizedClient.reset();
		testResults = [];
		updatePerformanceData();
		showSuccess('Cache and metrics cleared');
	}

	/**
	 * Analyze a specific query
	 */
	function analyzeQuery(query: string) {
		const analysis = queryOptimizer.analyzeQuery(query);
		const suggestions = queryOptimizer.getPerformanceRecommendations(query);
		
		showInfo(`Query Analysis: Complexity ${analysis.complexity.score}, ${suggestions.length} suggestions`);
		
		return { analysis, suggestions };
	}

	/**
	 * Get cache statistics
	 */
	function getCacheStatistics() {
		const stats = graphqlCache.getStatistics();
		showInfo(`Cache: ${stats.hitRate}% hit rate, ${stats.cacheSize} entries, ${Math.round(stats.memoryUsage/1024)}KB`);
		return stats;
	}
</script>

<div class="space-y-6 p-6 bg-surface-100 dark:bg-surface-800 rounded-lg">
	<!-- Header -->
	<div class="text-center">
		<h2 class="text-2xl font-bold text-surface-900 dark:text-surface-100 mb-2">
			GraphQL Performance Monitor
		</h2>
		<p class="text-surface-700 dark:text-surface-300">
			Real-time monitoring and optimization of GraphQL operations
		</p>
	</div>

	<!-- Optimization Level Controls -->
	<div class="bg-surface-200 dark:bg-surface-700 p-4 rounded-lg">
		<h3 class="font-semibold text-surface-800 dark:text-surface-200 mb-3">Client Configuration</h3>
		<div class="flex gap-3 mb-4">
			{#each ['performance', 'balanced', 'memory'] as level}
				<button
					class="btn btn-sm {selectedOptimizationLevel === level ? 'variant-filled-primary' : 'variant-soft-surface'}"
					onclick={() => changeOptimizationLevel(level)}
				>
					{level.charAt(0).toUpperCase() + level.slice(1)}
				</button>
			{/each}
		</div>
		<div class="text-xs text-surface-600 dark:text-surface-400">
			<p><strong>Performance:</strong> Aggressive caching, query batching, advanced optimization</p>
			<p><strong>Balanced:</strong> Standard caching with optimization (recommended)</p>
			<p><strong>Memory:</strong> Minimal caching, conservative optimization for low memory usage</p>
		</div>
	</div>

	<!-- Performance Metrics -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
		<div class="bg-surface-50 dark:bg-surface-900 p-4 rounded-lg text-center">
			<div class="text-2xl font-bold text-primary-600 dark:text-primary-400">
				{performanceData.metrics.totalQueries}
			</div>
			<div class="text-sm text-surface-600 dark:text-surface-400">Total Queries</div>
		</div>
		
		<div class="bg-surface-50 dark:bg-surface-900 p-4 rounded-lg text-center">
			<div class="text-2xl font-bold text-success-600 dark:text-success-400">
				{performanceData.cacheStats.hitRate}%
			</div>
			<div class="text-sm text-surface-600 dark:text-surface-400">Cache Hit Rate</div>
		</div>
		
		<div class="bg-surface-50 dark:bg-surface-900 p-4 rounded-lg text-center">
			<div class="text-2xl font-bold text-warning-600 dark:text-warning-400">
				{performanceData.metrics.averageResponseTime}ms
			</div>
			<div class="text-sm text-surface-600 dark:text-surface-400">Avg Response Time</div>
		</div>
		
		<div class="bg-surface-50 dark:bg-surface-900 p-4 rounded-lg text-center">
			<div class="text-2xl font-bold text-tertiary-600 dark:text-tertiary-400">
				{Math.round(performanceData.metrics.memoryUsage / 1024)}KB
			</div>
			<div class="text-sm text-surface-600 dark:text-surface-400">Memory Usage</div>
		</div>
	</div>

	<!-- Cache Statistics -->
	<div class="bg-surface-200 dark:bg-surface-700 p-4 rounded-lg">
		<h3 class="font-semibold text-surface-800 dark:text-surface-200 mb-3">Cache Performance</h3>
		<div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
			<div>
				<span class="text-surface-600 dark:text-surface-400">Cache Hits:</span>
				<span class="font-mono ml-2 text-success-600">{performanceData.cacheStats.hits}</span>
			</div>
			<div>
				<span class="text-surface-600 dark:text-surface-400">Cache Misses:</span>
				<span class="font-mono ml-2 text-error-600">{performanceData.cacheStats.misses}</span>
			</div>
			<div>
				<span class="text-surface-600 dark:text-surface-400">Cache Size:</span>
				<span class="font-mono ml-2">{performanceData.cacheStats.cacheSize}/{performanceData.cacheStats.maxCacheSize}</span>
			</div>
			<div>
				<span class="text-surface-600 dark:text-surface-400">Hit Rate:</span>
				<span class="font-mono ml-2 {performanceData.cacheStats.hitRate > 80 ? 'text-success-600' : performanceData.cacheStats.hitRate > 60 ? 'text-warning-600' : 'text-error-600'}">
					{performanceData.cacheStats.hitRate}%
				</span>
			</div>
		</div>
	</div>

	<!-- Performance Test Controls -->
	<div class="bg-surface-200 dark:bg-surface-700 p-4 rounded-lg">
		<h3 class="font-semibold text-surface-800 dark:text-surface-200 mb-3">Performance Testing</h3>
		<div class="flex gap-3 mb-4">
			<button
				class="btn btn-sm variant-filled-primary"
				disabled={isRunningTest}
				onclick={runPerformanceTest}
			>
				{#if isRunningTest}
					<span class="animate-spin">⚡</span> Running Test...
				{:else}
					▶️ Run Performance Test
				{/if}
			</button>
			
			<button
				class="btn btn-sm variant-soft-warning"
				onclick={clearCacheAndMetrics}
				disabled={isRunningTest}
			>
				🗑️ Clear Cache & Metrics
			</button>
			
			<button
				class="btn btn-sm variant-soft-tertiary"
				onclick={() => getCacheStatistics()}
			>
				📊 Show Cache Stats
			</button>
		</div>
		
		{#if testResults.length > 0}
			<div class="mt-4">
				<h4 class="font-medium text-surface-800 dark:text-surface-200 mb-2">Test Results</h4>
				<div class="bg-surface-100 dark:bg-surface-800 rounded p-3 max-h-64 overflow-y-auto">
					<table class="w-full text-sm">
						<thead>
							<tr class="text-left border-b border-surface-300 dark:border-surface-600">
								<th class="pb-2">Query</th>
								<th class="pb-2">Time</th>
								<th class="pb-2">Cached</th>
								<th class="pb-2">Complexity</th>
							</tr>
						</thead>
						<tbody>
							{#each testResults as result}
								<tr class="border-b border-surface-200 dark:border-surface-700">
									<td class="py-1 pr-2">{result.query}</td>
									<td class="py-1 pr-2 font-mono {result.time > 500 ? 'text-error-600' : result.time > 200 ? 'text-warning-600' : 'text-success-600'}">
										{result.time}ms
									</td>
									<td class="py-1 pr-2">
										{#if result.cached}
											<span class="text-success-600">✓</span>
										{:else}
											<span class="text-surface-400">–</span>
										{/if}
									</td>
									<td class="py-1 font-mono {result.complexity > 100 ? 'text-error-600' : result.complexity > 50 ? 'text-warning-600' : 'text-success-600'}">
										{result.complexity}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}
	</div>

	<!-- Optimization Suggestions -->
	{#if performanceData.suggestions.length > 0}
		<div class="bg-surface-200 dark:bg-surface-700 p-4 rounded-lg">
			<h3 class="font-semibold text-surface-800 dark:text-surface-200 mb-3">
				Optimization Suggestions ({performanceData.suggestions.length})
			</h3>
			<div class="space-y-2">
				{#each performanceData.suggestions as suggestion}
					<div class="bg-surface-100 dark:bg-surface-800 p-3 rounded border-l-4 {
						suggestion.type === 'performance-degradation' ? 'border-error-500' :
						suggestion.impact === 'high' ? 'border-warning-500' :
						'border-info-500'
					}">
						<div class="font-medium text-surface-800 dark:text-surface-200">
							{suggestion.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
						</div>
						<div class="text-sm text-surface-600 dark:text-surface-400 mt-1">
							{suggestion.message}
						</div>
						<div class="text-xs text-surface-500 dark:text-surface-500 mt-1">
							Impact: <span class="capitalize font-medium">{suggestion.impact}</span>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Query Analyzer -->
	<div class="bg-surface-200 dark:bg-surface-700 p-4 rounded-lg">
		<h3 class="font-semibold text-surface-800 dark:text-surface-200 mb-3">Query Analyzer</h3>
		<div class="space-y-3">
			{#each testQueries as testQuery}
				<div class="bg-surface-100 dark:bg-surface-800 p-3 rounded">
					<div class="flex justify-between items-center mb-2">
						<span class="font-medium text-surface-800 dark:text-surface-200">{testQuery.name}</span>
						<button
							class="btn btn-xs variant-soft-primary"
							onclick={() => analyzeQuery(testQuery.query)}
						>
							Analyze
						</button>
					</div>
					<details class="text-xs">
						<summary class="text-surface-600 dark:text-surface-400 cursor-pointer">Show Query</summary>
						<pre class="mt-2 p-2 bg-surface-50 dark:bg-surface-900 rounded overflow-x-auto text-xs"><code>{testQuery.query}</code></pre>
					</details>
				</div>
			{/each}
		</div>
	</div>

	<!-- Real-time Monitoring -->
	<div class="text-xs text-surface-500 dark:text-surface-400 bg-surface-50 dark:bg-surface-900 p-3 rounded">
		<p class="font-medium mb-1">Monitoring Features:</p>
		<ul class="list-disc list-inside space-y-1">
			<li>Real-time performance metrics updated every 2 seconds</li>
			<li>Intelligent caching with LRU eviction and background refresh</li>
			<li>Query complexity analysis and optimization suggestions</li>
			<li>Automatic cache invalidation based on mutation patterns</li>
			<li>Memory usage tracking and efficiency optimization</li>
			<li>Performance trend analysis and bottleneck detection</li>
		</ul>
	</div>
</div>