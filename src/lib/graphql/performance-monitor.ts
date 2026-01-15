/**
 * GraphQL Performance Monitor
 *
 * Comprehensive performance monitoring system for GraphQL operations with PostGraphile.
 * Tracks execution times, query complexity, cache performance, and provides optimization
 * recommendations for maintaining <200ms response targets.
 *
 * Refactored: Moved to src/lib/graphql/performance/
 */

import { GraphQLPerformanceMonitor } from './performance/monitor';

export * from './performance/types';
export * from './performance/config';
export * from './performance/metrics';
export * from './performance/alerts';
export * from './performance/reports';
export * from './performance/monitor';

export default GraphQLPerformanceMonitor;
