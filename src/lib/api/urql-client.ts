/**
 * Compatibility file for urql client
 *
 * This file re-exports the urql client from the correct location
 * to maintain compatibility with existing imports.
 *
 * @deprecated Use `import { client } from '$lib/graphql/client'` instead
 */

import { client, createUrqlClient } from '$lib/graphql/client';

// Export as urqlClient for backwards compatibility
export const urqlClient = client;

// Re-export the create function
export { createUrqlClient };

// Re-export everything else from the main client
export * from '$lib/graphql/client';
