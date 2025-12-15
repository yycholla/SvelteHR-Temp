/**
 * User Type Mapper
 *
 * Handles conversion between GraphQL API snake_case properties and client-side camelCase properties.
 * This mapper resolves the ~100+ errors caused by property naming mismatches.
 * Refactored: Moved to src/lib/types/mappers/
 */

export * from './mappers/types';
export * from './mappers/job-info';
export * from './mappers/contact-info';
export * from './mappers/entities';