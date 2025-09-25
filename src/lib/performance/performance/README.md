# SvelteHR Performance Monitoring System

A comprehensive performance monitoring solution designed to ensure SvelteHR meets strict performance requirements: **<200ms GraphQL responses**, **<1 second page loads**, **<100ms real-time updates**, and **<100MB memory usage**.

## 🎯 Performance Targets

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| GraphQL Response (P95) | <150ms | <200ms | <300ms |
| Page Load Time (P95) | <800ms | <1000ms | <2000ms |
| Real-time Updates | <50ms | <100ms | <250ms |
| Memory Usage | <80MB | <100MB | <150MB |
| Export Operations | <3s | <5s | <10s |
| Component Render | <16ms | <32ms | <100ms |

## 🏗️ Architecture

### Client-Side Monitoring (`client-monitor.ts`)
- **Real-time performance tracking** with automatic metric collection
- **Core Web Vitals** monitoring (LCP, FID, CLS, FCP, TTFB)
- **Memory usage** tracking with leak detection
- **Component performance** measurement
- **Performance alerts** with actionable recommendations

### Server-Side Monitoring (`server-monitor.ts`)
- **Request/response timing** for all endpoints
- **GraphQL operation** performance tracking
- **Database query** performance monitoring
- **Memory and CPU** usage tracking
- **Error rate** and reliability metrics

### GraphQL Performance Exchange (`graphql-performance-exchange.ts`)
- **Automatic GraphQL** operation timing via Urql exchange
- **Query complexity** analysis and alerts
- **Cache performance** tracking
- **Performance testing** utilities
- **Budget validation** for GraphQL operations

### Performance Budgets (`performance-budgets.ts`)
- **Strict budget enforcement** with configurable thresholds
- **Automated validation** against performance targets
- **Recommendation engine** for optimization suggestions
- **Score calculation** and trend analysis

## 🚀 Quick Start

### 1. Basic Setup
```typescript
import { performanceMonitor } from '$lib/performance/client-monitor.js';
import { serverPerformanceMonitor } from '$lib/performance/server-monitor.js';

// Client-side - automatically starts monitoring
performanceMonitor.trackPageLoad('dashboard', loadTime);

// Server-side - integrate with SvelteKit hooks
export const handle = serverPerformanceMonitor.createHandle();
```

### 2. GraphQL Integration
```typescript
import { createPerformanceExchange } from '$lib/performance/graphql-performance-exchange.js';

const client = createUrqlClient([
  cacheExchange,
  createPerformanceExchange({
    slowQueryThreshold: 200, // 200ms budget
    enableComplexityAnalysis: true
  }),
  fetchExchange
]);
```

### 3. Performance Dashboard
```svelte
<script>
  import PerformanceDashboard from '$lib/components/performance/PerformanceDashboard.svelte';
</script>

<PerformanceDashboard expanded={true} />
```

## 📊 Usage Examples

### Track Custom Operations
```typescript
import { performanceMonitor } from '$lib/performance/client-monitor.js';

// Time a function
const result = await performanceMonitor.timeFunction(
  'DataProcessing',
  'component',
  async () => {
    // Your operation here
    return processLargeDataset();
  },
  ['data', 'processing']
);

// Track specific metrics
performanceMonitor.trackExportOperation('CSV', 1000, duration, fileSize);
performanceMonitor.trackRealTimeUpdate('ChatMessage', latency);
```

### Validate Performance Budgets
```typescript
import { budgetValidator } from '$lib/performance/performance-budgets.js';

const metrics = {
  'GraphQL Response Time (Average)': 180,
  'Page Load Time (P95)': 950,
  'Memory Usage': 85 * 1024 * 1024
};

const validation = budgetValidator.validateMetrics(metrics);

if (!validation.overallPassed) {
  console.warn('Performance budget violations:', validation.violations);

  const recommendations = budgetValidator.generateRecommendations(validation.violations);
  console.log('Recommendations:', recommendations);
}
```

### GraphQL Performance Testing
```typescript
import { graphqlPerformanceTester } from '$lib/performance/graphql-performance-exchange.js';

const testResults = await graphqlPerformanceTester.testOperation(
  'GetEmployees',
  () => executeGraphQLQuery(GET_EMPLOYEES_QUERY),
  {
    iterations: 20,
    warmupIterations: 5,
    maxDuration: 200
  }
);

console.log(`Average: ${testResults.averageDuration}ms`);
console.log(`P95: ${testResults.p95Duration}ms`);
```

## 🔧 API Endpoints

### Performance Statistics
```bash
# Current performance stats
GET /api/performance?endpoint=stats

# Recent metrics (last 100)
GET /api/performance?endpoint=metrics&limit=100

# Comprehensive report
GET /api/performance?endpoint=report

# Health check
GET /api/performance?endpoint=health
```

### Performance Testing
```bash
# Clear metrics
POST /api/performance?action=clear

# Record custom metric
POST /api/performance?action=record-metric
{
  "type": "api",
  "path": "/custom-endpoint",
  "duration": 150,
  "status": 200
}

# Run performance test
POST /api/performance?action=test
{
  "operationName": "TestOp",
  "duration": 100,
  "iterations": 10
}
```

## 📈 Dashboard Features

The **PerformanceDashboard** component provides:

- **Real-time metrics** with live updates
- **Core Web Vitals** visualization
- **Memory usage charts** with leak detection
- **Performance alerts** with recommendations
- **Budget compliance** scoring
- **Exportable reports** in JSON format

## 🧪 Testing

### Unit Tests
```bash
npm run test:performance:graphql    # GraphQL performance tests
npm run test:performance:integration # Integration tests
```

### E2E Performance Tests
```bash
npm run test:performance:e2e        # Playwright performance tests
npm run test:e2e:performance        # Full performance validation
```

### Performance Audits
```bash
npm run test:e2e -- --project=chromium-performance
```

## ⚡ Optimization Guidelines

### GraphQL Optimization
1. **Query Complexity**: Keep complexity scores <500
2. **Field Selection**: Only request needed fields
3. **Caching**: Implement query result caching
4. **Batching**: Use query batching for multiple operations

### Page Load Optimization
1. **Code Splitting**: Implement route-based splitting
2. **Lazy Loading**: Load components on demand
3. **Image Optimization**: Use responsive images
4. **Critical CSS**: Inline critical styles

### Memory Optimization
1. **Component Cleanup**: Implement proper cleanup in `onDestroy`
2. **Event Listeners**: Remove listeners on component unmount
3. **Large Objects**: Clear references to prevent leaks
4. **Reactive Statements**: Optimize reactive dependencies

### Real-time Performance
1. **WebSocket Optimization**: Batch messages when possible
2. **Update Debouncing**: Debounce high-frequency updates
3. **Selective Rendering**: Only update changed components
4. **Connection Pooling**: Reuse connections efficiently

## 🚨 Alerting

The system automatically generates alerts for:

- **Budget violations** exceeding warning thresholds
- **Memory leaks** with sustained growth patterns
- **Performance degradation** over time
- **Error rate spikes** above acceptable limits

Alerts include:
- Severity level (low/medium/high/critical)
- Specific recommendations for resolution
- Historical context and trends
- Links to relevant documentation

## 📊 Monitoring Best Practices

### Production Monitoring
1. **Sample Rate**: Use 10% sampling in production
2. **Data Retention**: Keep 30 days of detailed metrics
3. **Alerting Thresholds**: Set appropriate warning levels
4. **Regular Reviews**: Weekly performance reviews

### Development Monitoring
1. **Full Monitoring**: Monitor 100% of operations
2. **Budget Enforcement**: Strict budget validation
3. **Continuous Testing**: Run performance tests in CI/CD
4. **Developer Feedback**: Immediate feedback on violations

### Performance Culture
1. **Performance Budgets**: Enforce budgets in CI/CD
2. **Regular Audits**: Monthly performance audits
3. **Team Training**: Performance awareness training
4. **Tooling Integration**: IDE integration for real-time feedback

## 🔗 Integration

### CI/CD Pipeline
```yaml
- name: Performance Tests
  run: |
    npm run test:performance
    npm run test:performance:e2e

- name: Performance Budget Check
  run: |
    npm run build
    npm run test:e2e:performance
```

### Monitoring Services
- **Grafana** dashboard integration
- **Prometheus** metrics export
- **DataDog** APM integration
- **New Relic** browser monitoring

## 📋 Troubleshooting

### Common Issues

**Q: GraphQL operations are slow**
- Check query complexity with the performance dashboard
- Review database indexes for queried fields
- Implement query result caching
- Consider query optimization or splitting

**Q: Memory usage keeps increasing**
- Check for event listener leaks
- Review component cleanup in `onDestroy`
- Use browser DevTools memory profiler
- Check for circular references

**Q: Page loads are slow**
- Enable code splitting for routes
- Optimize image loading and compression
- Review bundle size and dependencies
- Implement service worker caching

**Q: Performance alerts are noisy**
- Adjust alert thresholds in budget configuration
- Implement alert rate limiting
- Filter out known performance variations
- Focus on critical performance paths

## 🔄 Updates and Maintenance

- **Budget Updates**: Review and adjust budgets quarterly
- **Threshold Tuning**: Fine-tune alert thresholds based on data
- **Feature Updates**: Add monitoring for new features
- **Cleanup**: Regular cleanup of old metrics and reports