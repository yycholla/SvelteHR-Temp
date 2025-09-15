<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
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
  function getPerformanceStatus(value: number, type: keyof typeof THRESHOLDS): 'good' | 'needs-improvement' | 'poor' {
    const threshold = THRESHOLDS[type];
    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  }

  // Get badge variant for performance status
  function getStatusVariant(status: string): string {
    switch (status) {
      case 'good': return 'success';
      case 'needs-improvement': return 'warning';
      case 'poor': return 'danger';
      default: return 'secondary';
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
      <p class="dashboard-subtitle">
        Real-time application performance metrics and diagnostics
      </p>
    </div>

    <div class="header-actions">
      <Button
        variant={autoRefresh ? 'primary' : 'secondary'}
        size="sm"
        leftIcon={autoRefresh ? 'pause' : 'play'}
        on:click={toggleAutoRefresh}
      >
        {autoRefresh ? 'Pause' : 'Start'} Auto-refresh
      </Button>

      <Button
        variant="ghost"
        size="sm"
        leftIcon="refresh-cw"
        on:click={loadMetrics}
        loading={loading}
      >
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
          <Button variant="secondary" size="sm" on:click={loadMetrics}>
            Try Again
          </Button>
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
                <Badge variant={getStatusVariant(getPerformanceStatus(metrics.performance.navigation.average, 'navigation'))}>
                  {formatDuration(metrics.performance.navigation.average)}
                </Badge>
              </div>
              <div class="metric-row">
                <span>95th Percentile:</span>
                <Badge variant={getStatusVariant(getPerformanceStatus(metrics.performance.navigation.p95, 'navigation'))}>
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
                <Badge variant={getStatusVariant(getPerformanceStatus(metrics.performance.graphqlQueries.average, 'graphql'))}>
                  {formatDuration(metrics.performance.graphqlQueries.average)}
                </Badge>
              </div>
              <div class="metric-row">
                <span>95th Percentile:</span>
                <Badge variant={getStatusVariant(getPerformanceStatus(metrics.performance.graphqlQueries.p95, 'graphql'))}>
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
                <Badge variant={getStatusVariant(getPerformanceStatus(metrics.performance.webVitals.lcp.average, 'lcp'))}>
                  {formatDuration(metrics.performance.webVitals.lcp.average)}
                </Badge>
              </div>
            {/if}
            
            {#if metrics.performance.webVitals.fid.count > 0}
              <div class="metric-row">
                <span>FID (First Input Delay):</span>
                <Badge variant={getStatusVariant(getPerformanceStatus(metrics.performance.webVitals.fid.average, 'fid'))}>
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
                <Badge variant="danger">{metrics.errors.total}</Badge>
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
                  <Badge variant="primary" size="sm">{route.count} visits</Badge>
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
                <Badge variant="warning">
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

<style lang="postcss">
  .performance-dashboard {
    @apply space-y-6;
  }

  /* Header */
  .dashboard-header {
    @apply flex items-start justify-between;
  }

  .header-content {
    @apply space-y-1;
  }

  .dashboard-title {
    @apply text-2xl font-bold text-gray-900;
  }

  .dashboard-subtitle {
    @apply text-gray-600;
  }

  .header-actions {
    @apply flex items-center space-x-3;
  }

  /* Loading State */
  .loading-state {
    @apply flex flex-col items-center justify-center py-12 text-gray-500;
  }

  .loading-spinner {
    @apply w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4;
  }

  /* Error Card */
  .error-content {
    @apply flex items-start space-x-3;
  }

  .error-icon {
    @apply w-5 h-5 text-red-500 flex-shrink-0 mt-0.5;
  }

  /* Summary Grid */
  .summary-grid {
    @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4;
  }

  .summary-stat {
    @apply flex items-center space-x-3;
  }

  .stat-icon {
    @apply w-10 h-10 rounded-lg flex items-center justify-center;
  }

  .stat-icon--primary {
    @apply bg-blue-100 text-blue-600;
  }

  .stat-icon--success {
    @apply bg-green-100 text-green-600;
  }

  .stat-icon--danger {
    @apply bg-red-100 text-red-600;
  }

  .stat-icon--warning {
    @apply bg-yellow-100 text-yellow-600;
  }

  .stat-icon i {
    @apply w-5 h-5;
  }

  .stat-content {
    @apply flex-1;
  }

  .stat-value {
    @apply text-2xl font-bold text-gray-900;
  }

  .stat-label {
    @apply text-sm text-gray-500;
  }

  /* Metrics Grid */
  .metrics-grid {
    @apply grid grid-cols-1 lg:grid-cols-2 gap-6;
  }

  .metric-card {
    @apply space-y-4;
  }

  .metric-title {
    @apply flex items-center space-x-2 text-lg font-semibold text-gray-900;
  }

  .metric-title i {
    @apply w-5 h-5 text-gray-400;
  }

  .metric-stats {
    @apply space-y-3;
  }

  .metric-row {
    @apply flex items-center justify-between;
  }

  .metric-count {
    @apply text-sm text-gray-500 font-medium;
  }

  .no-data {
    @apply text-sm text-gray-500 py-4 text-center;
  }

  .no-data.success {
    @apply text-green-600;
  }

  .no-data i {
    @apply w-4 h-4 inline mr-1;
  }

  /* Error Breakdown */
  .error-breakdown {
    @apply space-y-2 pt-2;
  }

  .error-breakdown h4 {
    @apply text-sm font-medium text-gray-700;
  }

  .error-item {
    @apply flex items-center justify-between;
  }

  .error-type {
    @apply text-sm text-gray-600 truncate;
  }

  /* Routes Section */
  .routes-section, .operations-section {
    @apply space-y-4;
  }

  .section-title {
    @apply flex items-center space-x-2 text-lg font-semibold text-gray-900;
  }

  .section-title i {
    @apply w-5 h-5 text-gray-400;
  }

  .routes-list {
    @apply space-y-3;
  }

  .route-item {
    @apply flex items-center justify-between p-3 bg-gray-50 rounded-lg;
  }

  .route-path {
    @apply font-mono text-sm text-gray-900 truncate mr-4;
  }

  .route-stats {
    @apply flex items-center space-x-2;
  }

  /* Operations Section */
  .operations-list {
    @apply space-y-3;
  }

  .operation-item {
    @apply flex items-center justify-between p-3 bg-gray-50 rounded-lg;
  }

  .operation-info {
    @apply flex-1 mr-4;
  }

  .operation-name {
    @apply font-medium text-sm text-gray-900 truncate;
  }

  .operation-type {
    @apply text-xs text-gray-500 uppercase tracking-wide;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .dashboard-header {
      @apply flex-col items-start space-y-4;
    }

    .header-actions {
      @apply w-full justify-start;
    }

    .summary-grid {
      @apply grid-cols-1;
    }

    .metrics-grid {
      @apply grid-cols-1;
    }
  }
</style>