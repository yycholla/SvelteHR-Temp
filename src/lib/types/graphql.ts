/**
 * GraphQL Type Re-exports
 *
 * This file re-exports commonly used GraphQL types from the generated schema.
 * This provides a cleaner import path for components.
 */

// Re-export common GraphQL types from generated schema
export type { Department, User, Maybe, InputMaybe, Scalars } from '$lib/generated/graphql';

// Re-export all types for comprehensive access
export * from '$lib/generated/graphql';
