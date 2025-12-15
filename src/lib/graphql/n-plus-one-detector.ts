/**
 * N+1 Query Detection and Prevention for GraphQL
 *
 * Advanced tools for detecting and preventing N+1 query problems in GraphQL operations.
 * Provides analysis, monitoring, and automated optimization suggestions for PostGraphile.
 *
 * Refactored: Moved to src/lib/graphql/n-plus-one/
 */

import { NPlusOneDetector } from './n-plus-one/detector';

export * from './n-plus-one/types';
export * from './n-plus-one/config';
export * from './n-plus-one/patterns';
export * from './n-plus-one/suggestions';
export * from './n-plus-one/complexity';
export * from './n-plus-one/detector';

export default NPlusOneDetector;