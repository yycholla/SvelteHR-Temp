/**
 * GraphQL operation factories
 *
 * Factory functions for generating standardized GraphQL operations
 * with consistent error handling and data extraction patterns.
 */

export { createCRUDOperations, createCRUDOperationsWithCustomNames } from './crud-factory';
export type { CRUDOperationsConfig, CRUDOperations } from './crud-factory';
