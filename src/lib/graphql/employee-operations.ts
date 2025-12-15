/**
 * Employee/User Operations - Migrated to Rust Idiomatic GraphQL
 *
 * Backend uses "users" terminology, but we maintain "employee" naming in frontend
 * for consistency with existing UI. All PostGraphile patterns removed.
 *
 * Refactored: Moved to src/lib/graphql/employees/
 */

export * from './employees/index';