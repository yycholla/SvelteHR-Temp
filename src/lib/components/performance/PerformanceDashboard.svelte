<!--
  Performance Dashboard Component

  Comprehensive real-time performance monitoring dashboard for SvelteHR.
  Displays performance metrics, alerts, and recommendations with live updates.

  Features:
  - Real-time performance metrics visualization
  - Core Web Vitals monitoring
  - Memory usage tracking
  - GraphQL operation performance
  - Performance alerts and recommendations
  - Exportable performance reports
-->

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { writable } from 'svelte/store';
  import {
    metricsStore,
    alertsStore,
    coreWebVitalsStore,
    memoryUsageStore,
    statisticsStore,
    PERFORMANCE_BUDGET,
    performanceMonitor,
    type PerformanceMetric,
    type PerformanceAlert,
    type CoreWebVitals,
    type MemoryUsage
  } from '$lib/performance/client-monitor.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert/index.js';
  import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs/index.js';
  import { Progress } from '$lib/components/ui/progress/index.js';
  import { AlertTriangle, Activity, MemoryStick, Zap, TrendingUp, Download, RefreshCw } from 'lucide-svelte';

  // Component props
  export let expanded = false;
  export let refreshInterval = 5000; // 5 seconds

  // Local state
  let refreshTimer: number;
  let activeTab = 'overview';
  let showDetailed = false;

  // Reactive data
  $: metrics = $metricsStore;
  $: alerts = $alertsStore;
  $: webVitals = $coreWebVitalsStore;
  $: memoryUsage = $memoryUsageStore;
  $: statistics = $statisticsStore;

  // Computed values
  $: recentMetrics = metrics.slice(-50); // Last 50 metrics
  $: recentAlerts = alerts.slice(-10); // Last 10 alerts
  $: latestMemory = memoryUsage[memoryUsage.length - 1];

  // Performance score calculation
  $: performanceScore = calculatePerformanceScore(metrics, webVitals);
  $: scoreColor = performanceScore >= 90 ? 'bg-green-500' :
                 performanceScore >= 70 ? 'bg-yellow-500' : 'bg-red-500';

  // Memory chart data (simplified)
  $: memoryChartData = memoryUsage.slice(-20).map(usage => ({
    timestamp: new Date(usage.timestamp).toLocaleTimeString(),
    memory: Math.round(usage.usedJSHeapSize / 1024 / 1024) // MB
  }));

  function calculatePerformanceScore(metrics: PerformanceMetric[], vitals: CoreWebVitals): number {
    let score = 100;

    // Deduct points for budget violations
    const violationsCount = metrics.filter(m =>
      m.status === 'warning' || m.status === 'error'
    ).length;
    score -= Math.min(violationsCount * 2, 40); // Max 40 points deduction

    // Core Web Vitals scoring
    if (vitals.lcp && vitals.lcp > 2500) score -= 15; // LCP > 2.5s
    if (vitals.fid && vitals.fid > 100) score -= 10; // FID > 100ms
    if (vitals.cls && vitals.cls > 0.1) score -= 10; // CLS > 0.1
    if (vitals.fcp && vitals.fcp > 1800) score -= 10; // FCP > 1.8s

    // Memory usage scoring
    if (latestMemory && latestMemory.usedJSHeapSize > PERFORMANCE_BUDGET.memoryLimit * 0.8) {
      score -= 15; // Memory usage > 80% of budget
    }

    return Math.max(0, Math.min(100, score));
  }

  function formatDuration(ms: number): string {
    if (ms < 1) return '<1ms';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  }

  function formatBytes(bytes: number): string {
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(1)}MB`;
  }

  function getBadgeVariant(status: string) {
    switch (status) {
      case 'success': return 'default';
      case 'warning': return 'secondary';
      case 'error': return 'destructive';
      default: return 'outline';
    }
  }

  function getAlertVariant(severity: string) {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'default';
      default: return 'default';
    }
  }

  function exportPerformanceReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: $statisticsStore,
      metrics: recentMetrics,
      alerts: recentAlerts,
      webVitals: $webVitals,
      memoryUsage: latestMemory,
      performanceScore
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function refreshData() {
    // Force refresh of performance data
    // The stores are already reactive, so this mainly triggers UI updates
    console.log('📊 Performance dashboard refreshed');
  }

  function clearData() {
    performanceMonitor.reset();
    console.log('🗑️ Performance data cleared');
  }

  onMount(() => {
    if (refreshInterval > 0) {
      refreshTimer = window.setInterval(refreshData, refreshInterval);
    }
  });

  onDestroy(() => {
    if (refreshTimer) {
      clearInterval(refreshTimer);
    }
  });
</script>

<div class="performance-dashboard {expanded ? 'expanded' : 'compact'}">
  <div class="dashboard-header">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <Activity class="h-6 w-6 text-blue-600" />
        <h2 class="text-2xl font-bold">Performance Monitor</h2>
        <Badge variant="outline" class="ml-2">
          Real-time
        </Badge>
      </div>

      <div class="flex items-center gap-2">
        <div class="performance-score flex items-center gap-2">
          <span class="text-sm text-muted-foreground">Score:</span>
          <div class="score-badge px-3 py-1 rounded-full text-white text-sm font-semibold {scoreColor}">
            {performanceScore}
          </div>
        </div>

        <Button variant="outline" size="sm" on:click={refreshData}>
          <RefreshCw class="h-4 w-4" />
        </Button>

        <Button variant="outline" size="sm" on:click={exportPerformanceReport}>
          <Download class="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>
    </div>
  </div>

  <div class="dashboard-content mt-6">
    <!-- Quick Stats Overview -->
    <div class="stats-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader class="pb-3">
          <CardTitle class="text-sm font-medium">Page Load</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {formatDuration($statisticsStore.averagePageLoad)}
          </div>
          <p class="text-xs text-muted-foreground mt-1">
            Target: {formatDuration(PERFORMANCE_BUDGET.pageLoad)}
          </p>
          <Progress
            value={Math.min(100, ($statisticsStore.averagePageLoad / PERFORMANCE_BUDGET.pageLoad) * 100)}
            class="mt-2"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="pb-3">
          <CardTitle class="text-sm font-medium">GraphQL</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {formatDuration($statisticsStore.averageGraphQLResponse)}
          </div>
          <p class="text-xs text-muted-foreground mt-1">
            Target: {formatDuration(PERFORMANCE_BUDGET.graphqlResponse)}
          </p>
          <Progress
            value={Math.min(100, ($statisticsStore.averageGraphQLResponse / PERFORMANCE_BUDGET.graphqlResponse) * 100)}
            class="mt-2"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="pb-3">
          <CardTitle class="text-sm font-medium">Memory Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {latestMemory ? formatBytes(latestMemory.usedJSHeapSize) : '0MB'}
          </div>
          <p class="text-xs text-muted-foreground mt-1">
            Limit: {formatBytes(PERFORMANCE_BUDGET.memoryLimit)}
          </p>
          <Progress
            value={latestMemory ? Math.min(100, (latestMemory.usedJSHeapSize / PERFORMANCE_BUDGET.memoryLimit) * 100) : 0}
            class="mt-2"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="pb-3">
          <CardTitle class="text-sm font-medium">Issues</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {$statisticsStore.budgetExceededCount}
          </div>
          <p class="text-xs text-muted-foreground mt-1">
            Budget violations
          </p>
          <div class="flex gap-1 mt-2">
            {#each recentAlerts.slice(0, 3) as alert}
              <div class="w-2 h-2 rounded-full {
                alert.severity === 'critical' ? 'bg-red-500' :
                alert.severity === 'high' ? 'bg-orange-500' :
                alert.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
              }"></div>
            {/each}
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Detailed Tabs -->
    <Tabs bind:value={activeTab} class="dashboard-tabs">
      <TabsList class="grid w-full grid-cols-5">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="metrics">Metrics</TabsTrigger>
        <TabsTrigger value="vitals">Core Vitals</TabsTrigger>
        <TabsTrigger value="memory">Memory</TabsTrigger>
        <TabsTrigger value="alerts">Alerts</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" class="mt-4">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Recent Metrics -->
          <Card>
            <CardHeader>
              <CardTitle>Recent Operations</CardTitle>
              <CardDescription>Last {recentMetrics.length} performance measurements</CardDescription>
            </CardHeader>
            <CardContent>
              <div class="space-y-2 max-h-64 overflow-y-auto">
                {#each recentMetrics.slice(-10) as metric}
                  <div class="flex items-center justify-between p-2 rounded-lg border">
                    <div class="flex items-center gap-2">
                      <Badge variant={getBadgeVariant(metric.status)}>
                        {metric.type}
                      </Badge>
                      <span class="text-sm font-medium truncate max-w-32">
                        {metric.name}
                      </span>
                    </div>
                    <div class="text-sm text-muted-foreground">
                      {formatDuration(metric.duration)}
                    </div>
                  </div>
                {/each}
              </div>
            </CardContent>
          </Card>

          <!-- Active Alerts -->
          <Card>
            <CardHeader>
              <CardTitle class="flex items-center gap-2">
                <AlertTriangle class="h-5 w-5" />
                Active Alerts
              </CardTitle>
              <CardDescription>{recentAlerts.length} recent performance issues</CardDescription>
            </CardHeader>
            <CardContent>
              <div class="space-y-3 max-h-64 overflow-y-auto">
                {#each recentAlerts.slice(0, 5) as alert}
                  <Alert variant={getAlertVariant(alert.severity)}>
                    <AlertTriangle class="h-4 w-4" />
                    <AlertTitle class="text-sm">{alert.type.replace('_', ' ').toUpperCase()}</AlertTitle>
                    <AlertDescription class="text-xs mt-1">
                      {alert.message}
                    </AlertDescription>
                    <div class="mt-2">
                      <Badge variant="outline" class="text-xs">
                        {alert.severity}
                      </Badge>
                      <span class="text-xs text-muted-foreground ml-2">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </Alert>
                {/each}
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="metrics" class="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
            <CardDescription>
              Detailed breakdown of all performance measurements
              <Button
                variant="ghost"
                size="sm"
                class="ml-2"
                on:click={() => showDetailed = !showDetailed}
              >
                {showDetailed ? 'Hide' : 'Show'} Details
              </Button>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div class="space-y-4">
              {#each ['page-load', 'graphql', 'component', 'real-time', 'export'] as metricType}
                {@const typeMetrics = metrics.filter(m => m.type === metricType)}
                {#if typeMetrics.length > 0}
                  <div class="metric-group">
                    <div class="flex items-center justify-between mb-2">
                      <h4 class="font-semibold capitalize">{metricType.replace('-', ' ')}</h4>
                      <Badge variant="outline">{typeMetrics.length} operations</Badge>
                    </div>

                    {#if showDetailed}
                      <div class="grid gap-2">
                        {#each typeMetrics.slice(-5) as metric}
                          <div class="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div>
                              <div class="font-medium text-sm">{metric.name}</div>
                              <div class="text-xs text-muted-foreground">
                                {new Date(metric.timestamp).toLocaleString()}
                              </div>
                            </div>
                            <div class="text-right">
                              <div class="font-semibold">{formatDuration(metric.duration)}</div>
                              <Badge variant={getBadgeVariant(metric.status)} class="text-xs">
                                {metric.status}
                              </Badge>
                            </div>
                          </div>
                        {/each}
                      </div>
                    {:else}
                      <div class="text-sm text-muted-foreground">
                        Average: {formatDuration(typeMetrics.reduce((sum, m) => sum + m.duration, 0) / typeMetrics.length)}
                      </div>
                    {/if}
                  </div>
                {/if}
              {/each}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="vitals" class="mt-4">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle class="text-sm">Largest Contentful Paint</CardTitle>
            </CardHeader>
            <CardContent>
              <div class="text-2xl font-bold">
                {webVitals.lcp ? formatDuration(webVitals.lcp) : 'N/A'}
              </div>
              <div class="text-xs text-muted-foreground mt-1">
                Good: &lt;2.5s, Poor: &gt;4.0s
              </div>
              {#if webVitals.lcp}
                <Progress
                  value={Math.min(100, (webVitals.lcp / 4000) * 100)}
                  class="mt-2"
                />
              {/if}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle class="text-sm">First Input Delay</CardTitle>
            </CardHeader>
            <CardContent>
              <div class="text-2xl font-bold">
                {webVitals.fid ? formatDuration(webVitals.fid) : 'N/A'}
              </div>
              <div class="text-xs text-muted-foreground mt-1">
                Good: &lt;100ms, Poor: &gt;300ms
              </div>
              {#if webVitals.fid}
                <Progress
                  value={Math.min(100, (webVitals.fid / 300) * 100)}
                  class="mt-2"
                />
              {/if}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle class="text-sm">Cumulative Layout Shift</CardTitle>
            </CardHeader>
            <CardContent>
              <div class="text-2xl font-bold">
                {webVitals.cls ? webVitals.cls.toFixed(3) : 'N/A'}
              </div>
              <div class="text-xs text-muted-foreground mt-1">
                Good: &lt;0.1, Poor: &gt;0.25
              </div>
              {#if webVitals.cls}
                <Progress
                  value={Math.min(100, (webVitals.cls / 0.25) * 100)}
                  class="mt-2"
                />
              {/if}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle class="text-sm">First Contentful Paint</CardTitle>
            </CardHeader>
            <CardContent>
              <div class="text-2xl font-bold">
                {webVitals.fcp ? formatDuration(webVitals.fcp) : 'N/A'}
              </div>
              <div class="text-xs text-muted-foreground mt-1">
                Good: &lt;1.8s, Poor: &gt;3.0s
              </div>
              {#if webVitals.fcp}
                <Progress
                  value={Math.min(100, (webVitals.fcp / 3000) * 100)}
                  class="mt-2"
                />
              {/if}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle class="text-sm">Time to First Byte</CardTitle>
            </CardHeader>
            <CardContent>
              <div class="text-2xl font-bold">
                {webVitals.ttfb ? formatDuration(webVitals.ttfb) : 'N/A'}
              </div>
              <div class="text-xs text-muted-foreground mt-1">
                Good: &lt;800ms, Poor: &gt;1800ms
              </div>
              {#if webVitals.ttfb}
                <Progress
                  value={Math.min(100, (webVitals.ttfb / 1800) * 100)}
                  class="mt-2"
                />
              {/if}
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="memory" class="mt-4">
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <MemoryStick class="h-5 w-5" />
              Memory Usage Tracking
            </CardTitle>
            <CardDescription>JavaScript heap memory consumption over time</CardDescription>
          </CardHeader>
          <CardContent>
            {#if latestMemory}
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div class="text-center p-4 bg-muted rounded-lg">
                  <div class="text-2xl font-bold text-blue-600">
                    {formatBytes(latestMemory.usedJSHeapSize)}
                  </div>
                  <div class="text-sm text-muted-foreground">Used Heap</div>
                </div>
                <div class="text-center p-4 bg-muted rounded-lg">
                  <div class="text-2xl font-bold text-green-600">
                    {formatBytes(latestMemory.totalJSHeapSize)}
                  </div>
                  <div class="text-sm text-muted-foreground">Total Heap</div>
                </div>
                <div class="text-center p-4 bg-muted rounded-lg">
                  <div class="text-2xl font-bold text-purple-600">
                    {formatBytes(latestMemory.jsHeapSizeLimit)}
                  </div>
                  <div class="text-sm text-muted-foreground">Heap Limit</div>
                </div>
              </div>

              <!-- Simple memory chart -->
              {#if memoryChartData.length > 0}
                <div class="memory-chart bg-muted/50 p-4 rounded-lg">
                  <h4 class="text-sm font-semibold mb-3">Memory Usage Timeline</h4>
                  <div class="flex items-end justify-between h-32 gap-1">
                    {#each memoryChartData as point, i}
                      <div class="flex flex-col items-center flex-1">
                        <div
                          class="bg-blue-500 rounded-t min-w-[2px] transition-all duration-300"
                          style="height: {Math.max(4, (point.memory / 100) * 100)}px"
                          title="{point.memory}MB at {point.timestamp}"
                        ></div>
                        {#if i % 4 === 0}
                          <div class="text-xs text-muted-foreground mt-1 rotate-45">
                            {point.timestamp.split(':').slice(0, 2).join(':')}
                          </div>
                        {/if}
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}
            {:else}
              <div class="text-center py-8 text-muted-foreground">
                Memory usage data not available
              </div>
            {/if}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="alerts" class="mt-4">
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <AlertTriangle class="h-5 w-5" />
              Performance Alerts & Recommendations
            </CardTitle>
            <CardDescription>
              Issues detected and suggested optimizations
              <Button variant="ghost" size="sm" class="ml-2" on:click={clearData}>
                Clear Data
              </Button>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div class="space-y-4">
              {#each alerts as alert}
                <Alert variant={getAlertVariant(alert.severity)} class="relative">
                  <AlertTriangle class="h-4 w-4" />
                  <div class="flex-1">
                    <AlertTitle>
                      {alert.type.replace(/[_-]/g, ' ').toUpperCase()}
                      <Badge variant="outline" class="ml-2 text-xs">
                        {alert.severity}
                      </Badge>
                    </AlertTitle>
                    <AlertDescription class="mt-2">
                      {alert.message}
                    </AlertDescription>

                    {#if alert.recommendations.length > 0}
                      <div class="mt-3">
                        <p class="text-xs font-semibold mb-2">Recommendations:</p>
                        <ul class="text-xs space-y-1 list-disc list-inside text-muted-foreground">
                          {#each alert.recommendations as recommendation}
                            <li>{recommendation}</li>
                          {/each}
                        </ul>
                      </div>
                    {/if}
                  </div>

                  <div class="absolute top-2 right-2 text-xs text-muted-foreground">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </div>
                </Alert>
              {/each}

              {#if alerts.length === 0}
                <div class="text-center py-8 text-muted-foreground">
                  <Zap class="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No performance alerts. Great job!
                </div>
              {/if}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  </div>
</div>

<style>
  .performance-dashboard {
    @apply w-full max-w-7xl mx-auto p-4;
  }

  .dashboard-header {
    @apply border-b pb-4;
  }

  .performance-score .score-badge {
    transition: background-color 0.3s ease;
  }

  .stats-grid {
    animation: fadeIn 0.5s ease-in-out;
  }

  .memory-chart {
    position: relative;
  }

  .metric-group:not(:last-child) {
    @apply border-b pb-4 mb-4;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .compact {
    @apply max-h-96 overflow-y-auto;
  }

  .expanded {
    @apply min-h-screen;
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .stats-grid {
      @apply grid-cols-1 gap-3;
    }

    .dashboard-header .flex {
      @apply flex-col gap-3;
    }

    .performance-dashboard {
      @apply p-2;
    }
  }
</style>