/**
 * Server-side Performance Monitor for SvelteHR
 *
 * Monitors server-side performance including:
 * - GraphQL query execution times
 * - Database query performance
 * - API endpoint response times
 * - Memory usage on the server
 * - Request/response analysis
 *
 * Refactored: Moved to src/lib/performance/server/
 */

import { ServerPerformanceMonitor } from './server/monitor';

export * from './server/types';
export * from './server/config';
export * from './server/analysis';
export * from './server/wrappers';
export * from './server/monitor';
export * from './server/index';

export default ServerPerformanceMonitor;
