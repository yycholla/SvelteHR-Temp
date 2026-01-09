/**
 * Server-side route loader utilities
 *
 * Provides base classes and helpers for +page.server.ts files to eliminate
 * RBAC, session, and GraphQL boilerplate across all routes.
 */

export { BaseRouteLoader } from './base-loader';
export { RBACDataLoader, quickLoad } from './rbac-data-loader';
