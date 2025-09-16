import { metricsService } from '$lib/services/metricsService';
import { page } from '$app/stores';

/**
 * Client-side hooks for performance monitoring and GraphQL instrumentation
 */

// Initialize performance monitoring
metricsService.mark('app_start');

// Track page navigation performance
let navigationStart: number;

if (typeof window !== 'undefined') {
  // Track initial page load
  window.addEventListener('load', () => {
    metricsService.mark('page_loaded');
    metricsService.measure('initial_page_load', 'app_start', 'page_loaded');
    metricsService.trackPageLoad(window.location.pathname);
  });

  // Track SPA navigation
  window.addEventListener('popstate', () => {
    navigationStart = performance.now();
  });

  // Track route changes via page store
  let previousRoute: string;
  
  page.subscribe(($page) => {
    // Safely access route properties with null checking
    const currentRoute = $page?.route?.id || 'unknown';
    
    if (previousRoute && previousRoute !== currentRoute) {
      const navigationEnd = performance.now();
      const duration = navigationEnd - (navigationStart || navigationEnd);
      
      metricsService.trackNavigation(
        currentRoute,
        duration,
        'route'
      );
    }
    
    previousRoute = currentRoute;
    navigationStart = performance.now();
  });
}

// TODO: Implement GraphQL client instrumentation for PostGraphile

// Extract operation name from GraphQL query/mutation
function extractOperationName(query: any): string {
  if (typeof query === 'string') {
    const match = query.match(/(?:query|mutation)\s+(\w+)/);
    return match ? match[1] : 'unknown_operation';
  }
  
  if (query?.definitions?.[0]?.name?.value) {
    return query.definitions[0].name.value;
  }
  
  return 'unknown_operation';
}

// Track long tasks (> 50ms)
if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) {
          metricsService.trackMetric({
            name: 'long_task',
            value: entry.duration,
            tags: { metric_type: 'performance' },
            metadata: {
              name: entry.name,
              startTime: entry.startTime
            }
          });
        }
      }
    });

    observer.observe({ entryTypes: ['longtask'] });
  } catch (error) {
    console.warn('Long task observer not supported:', error);
  }
}

// Track memory usage periodically
if (typeof window !== 'undefined' && 'performance' in window && 'memory' in performance) {
  const trackMemoryUsage = () => {
    const memory = (performance as any).memory;
    if (memory) {
      metricsService.trackMetric({
        name: 'memory_usage',
        value: memory.usedJSHeapSize,
        tags: { metric_type: 'system' },
        metadata: {
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
          usagePercent: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
        }
      });
    }
  };

  // Track memory usage every 30 seconds
  setInterval(trackMemoryUsage, 30000);
  
  // Track initial memory usage
  trackMemoryUsage();
}

// Enhanced error tracking
if (typeof window !== 'undefined') {
  const originalConsoleError = console.error;
  
  console.error = function(...args) {
    // Track console errors
    metricsService.trackError(
      new Error(args.join(' ')),
      'console_error',
      { arguments: args }
    );
    
    return originalConsoleError.apply(console, args);
  };
}

console.log('🚀 Client performance monitoring initialized');